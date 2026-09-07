
-- =========================================
-- 1. APP SETTINGS (maintenance mode etc.)
-- =========================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_settings (key, value)
VALUES 
  ('maintenance_mode', '{"enabled": false, "message": "We are upgrading AbeniExpress. Coming back soon!"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================
-- 2. DIGITAL PRODUCTS
-- =========================================
CREATE TABLE IF NOT EXISTS public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  store_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('code', 'file')),
  file_url text NOT NULL,
  file_name text,
  file_size_bytes bigint,
  price_etb numeric NOT NULL CHECK (price_etb > 0),
  ai_verification_status text NOT NULL DEFAULT 'pending' CHECK (ai_verification_status IN ('pending','approved','rejected')),
  ai_verification_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved digital products" ON public.digital_products;
CREATE POLICY "Anyone can view approved digital products" ON public.digital_products
  FOR SELECT USING (ai_verification_status = 'approved' AND is_active = true);

DROP POLICY IF EXISTS "Sellers manage own digital products" ON public.digital_products;
CREATE POLICY "Sellers manage own digital products" ON public.digital_products
  FOR ALL USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins manage all digital products" ON public.digital_products;
CREATE POLICY "Admins manage all digital products" ON public.digital_products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- 3. DIGITAL PRODUCT ORDERS
-- =========================================
CREATE TABLE IF NOT EXISTS public.digital_product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id uuid NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  price_etb numeric NOT NULL,
  payment_method text,
  payment_proof_url text,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','payment_verified','completed','cancelled')),
  download_code text,
  download_count integer DEFAULT 0,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.digital_product_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers view own digital orders" ON public.digital_product_orders;
CREATE POLICY "Buyers view own digital orders" ON public.digital_product_orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Buyers create digital orders" ON public.digital_product_orders;
CREATE POLICY "Buyers create digital orders" ON public.digital_product_orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update download count" ON public.digital_product_orders;
CREATE POLICY "Buyers can update download count" ON public.digital_product_orders
  FOR UPDATE USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Admins manage digital orders" ON public.digital_product_orders;
CREATE POLICY "Admins manage digital orders" ON public.digital_product_orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- 4. STORAGE BUCKET FOR DIGITAL PRODUCTS
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Sellers upload own digital products" ON storage.objects;
CREATE POLICY "Sellers upload own digital products" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Sellers read own digital products" ON storage.objects;
CREATE POLICY "Sellers read own digital products" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'digital-products' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

DROP POLICY IF EXISTS "Buyers can read purchased digital products" ON storage.objects;
CREATE POLICY "Buyers can read purchased digital products" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'digital-products' AND EXISTS (
      SELECT 1 FROM public.digital_product_orders dpo
      JOIN public.digital_products dp ON dp.id = dpo.digital_product_id
      WHERE dpo.buyer_id = auth.uid()
        AND dpo.status = 'completed'
        AND dp.file_url LIKE '%' || name || '%'
    )
  );

DROP POLICY IF EXISTS "Sellers can delete own digital products" ON storage.objects;
CREATE POLICY "Sellers can delete own digital products" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================================
-- 5. DRIVER LIVE TRACKING COLUMNS
-- =========================================
ALTER TABLE public.driver_orders 
  ADD COLUMN IF NOT EXISTS current_latitude numeric,
  ADD COLUMN IF NOT EXISTS current_longitude numeric,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

ALTER TABLE public.driver_wallets
  ADD COLUMN IF NOT EXISTS last_latitude numeric,
  ADD COLUMN IF NOT EXISTS last_longitude numeric,
  ADD COLUMN IF NOT EXISTS last_location_updated_at timestamptz;

-- Allow customer to view driver location for their own active orders
DROP POLICY IF EXISTS "Customers can view driver location for their orders" ON public.driver_orders;
CREATE POLICY "Customers can view driver location for their orders" ON public.driver_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = driver_orders.order_id AND o.customer_id = auth.uid()
    )
  );

-- =========================================
-- 6. DIGITAL PRODUCT PAYMENT VERIFICATION TRIGGER
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_digital_order_payment_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_platform_fee numeric;
  v_seller_earning numeric;
  v_product_title text;
BEGIN
  IF NEW.status = 'payment_verified' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Generate 8-char code
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    NEW.download_code := v_code;
    NEW.status := 'completed';

    v_platform_fee := NEW.price_etb * 0.10;
    v_seller_earning := NEW.price_etb - v_platform_fee;

    -- Pay seller
    INSERT INTO public.seller_wallets (user_id, current_balance_etb, total_earned_etb)
    VALUES (NEW.seller_id, v_seller_earning, v_seller_earning)
    ON CONFLICT (user_id) DO UPDATE SET
      current_balance_etb = seller_wallets.current_balance_etb + v_seller_earning,
      total_earned_etb = seller_wallets.total_earned_etb + v_seller_earning,
      updated_at = now();

    SELECT title INTO v_product_title FROM public.digital_products WHERE id = NEW.digital_product_id;

    -- Notify buyer with download code
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.buyer_id,
      'Download Ready! 🎉',
      'Your purchase of "' || COALESCE(v_product_title,'Digital Product') || '" is confirmed. Your download code is: ' || v_code || '. Use it on the order page to download.',
      'success'
    );

    -- Notify seller
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.seller_id,
      'Digital Product Sold! 💰',
      'Someone bought "' || COALESCE(v_product_title,'your product') || '". You earned ' || v_seller_earning || ' ETB.',
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_digital_order_payment_verified ON public.digital_product_orders;
CREATE TRIGGER trg_digital_order_payment_verified
BEFORE UPDATE ON public.digital_product_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_digital_order_payment_verified();

-- =========================================
-- 7. ADMIN ORDER STATUS ADVANCE RPC
-- =========================================
CREATE OR REPLACE FUNCTION public.admin_advance_order_status(
  p_order_id uuid,
  p_new_status order_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.orders SET status = p_new_status, updated_at = now() WHERE id = p_order_id;
END;
$$;

-- =========================================
-- 8. FACTORY RESET (transactional only)
-- =========================================
CREATE OR REPLACE FUNCTION public.admin_factory_reset_transactional()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  DELETE FROM public.driver_orders;
  DELETE FROM public.pending_driver_orders;
  DELETE FROM public.order_items;
  DELETE FROM public.refund_requests;
  DELETE FROM public.orders;
  DELETE FROM public.service_orders;
  DELETE FROM public.digital_product_orders;
  DELETE FROM public.notifications;
  DELETE FROM public.withdrawal_requests;
  DELETE FROM public.wallet_deductions;
  UPDATE public.seller_wallets SET current_balance_etb = 0, total_earned_etb = 0;
  UPDATE public.driver_wallets SET current_balance_etb = 0, total_earned_etb = 0;
END;
$$;

-- =========================================
-- 9. DRIVER LOCATION UPDATE RPC
-- =========================================
CREATE OR REPLACE FUNCTION public.driver_update_location(
  p_driver_order_id uuid,
  p_lat numeric,
  p_lng numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.driver_orders
  SET current_latitude = p_lat,
      current_longitude = p_lng,
      location_updated_at = now()
  WHERE id = p_driver_order_id AND driver_id = auth.uid();

  UPDATE public.driver_wallets
  SET last_latitude = p_lat,
      last_longitude = p_lng,
      last_location_updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- =========================================
-- 10. REALTIME for digital products & driver location
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_product_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
