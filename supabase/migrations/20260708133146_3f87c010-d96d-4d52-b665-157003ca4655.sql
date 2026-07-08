
-- Add affiliate role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- Affiliate stores
CREATE TABLE public.affiliate_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  contact_phone TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_stores TO authenticated;
GRANT SELECT ON public.affiliate_stores TO anon;
GRANT ALL ON public.affiliate_stores TO service_role;
ALTER TABLE public.affiliate_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active affiliate stores" ON public.affiliate_stores FOR SELECT USING (is_active = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own affiliate store" ON public.affiliate_stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own affiliate store" ON public.affiliate_stores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage affiliate stores" ON public.affiliate_stores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Affiliate products
CREATE TABLE public.affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_store_id UUID NOT NULL REFERENCES public.affiliate_stores(id) ON DELETE CASCADE,
  original_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_price_etb NUMERIC NOT NULL,
  custom_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  click_count INTEGER NOT NULL DEFAULT 0,
  sale_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (affiliate_store_id, original_product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_products TO authenticated;
GRANT SELECT ON public.affiliate_products TO anon;
GRANT ALL ON public.affiliate_products TO service_role;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active affiliate products" ON public.affiliate_products FOR SELECT USING (
  is_active = true OR EXISTS (SELECT 1 FROM public.affiliate_stores s WHERE s.id = affiliate_store_id AND s.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Owner manages affiliate products" ON public.affiliate_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliate_stores s WHERE s.id = affiliate_store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliate_stores s WHERE s.id = affiliate_store_id AND s.user_id = auth.uid()));
CREATE POLICY "Admins manage affiliate products" ON public.affiliate_products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Affiliate orders
CREATE TABLE public.affiliate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_store_id UUID NOT NULL REFERENCES public.affiliate_stores(id) ON DELETE CASCADE,
  affiliate_product_id UUID NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  original_product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  sold_price_etb NUMERIC NOT NULL,
  base_price_etb NUMERIC NOT NULL,
  affiliate_profit_etb NUMERIC NOT NULL,
  platform_earning_etb NUMERIC NOT NULL,
  total_etb NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_proof_url TEXT,
  shipping_address TEXT,
  phone TEXT,
  city TEXT,
  customer_latitude NUMERIC,
  customer_longitude NUMERIC,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_orders TO authenticated;
GRANT ALL ON public.affiliate_orders TO service_role;
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer views own affiliate orders" ON public.affiliate_orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Affiliate views own store orders" ON public.affiliate_orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.affiliate_stores s WHERE s.id = affiliate_store_id AND s.user_id = auth.uid())
);
CREATE POLICY "Anyone can create affiliate order" ON public.affiliate_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage affiliate orders" ON public.affiliate_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Affiliate wallets
CREATE TABLE public.affiliate_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance_etb NUMERIC NOT NULL DEFAULT 0,
  total_earned_etb NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_wallets TO authenticated;
GRANT ALL ON public.affiliate_wallets TO service_role;
ALTER TABLE public.affiliate_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own affiliate wallet" ON public.affiliate_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all affiliate wallets" ON public.affiliate_wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage affiliate wallets" ON public.affiliate_wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update triggers
CREATE TRIGGER trg_affiliate_stores_updated BEFORE UPDATE ON public.affiliate_stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_affiliate_products_updated BEFORE UPDATE ON public.affiliate_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_affiliate_orders_updated BEFORE UPDATE ON public.affiliate_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_affiliate_wallets_updated BEFORE UPDATE ON public.affiliate_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function: create affiliate store and assign role
CREATE OR REPLACE FUNCTION public.create_affiliate_store(p_store_name TEXT, p_store_slug TEXT, p_contact_phone TEXT, p_bio TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.affiliate_stores WHERE store_slug = p_store_slug) THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;
  INSERT INTO public.affiliate_stores (user_id, store_name, store_slug, contact_phone, bio)
  VALUES (auth.uid(), p_store_name, p_store_slug, p_contact_phone, p_bio)
  RETURNING id INTO v_store_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'affiliate') ON CONFLICT DO NOTHING;
  INSERT INTO public.affiliate_wallets (user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  RETURN v_store_id;
END;
$$;

-- Function: verify affiliate order payment (admin) — pays affiliate on verification
CREATE OR REPLACE FUNCTION public.admin_verify_affiliate_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_affiliate_user_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO v_order FROM public.affiliate_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'invalid_status'; END IF;

  UPDATE public.affiliate_orders SET status = 'payment_verified', updated_at = now() WHERE id = p_order_id;

  SELECT user_id INTO v_affiliate_user_id FROM public.affiliate_stores WHERE id = v_order.affiliate_store_id;

  INSERT INTO public.affiliate_wallets (user_id, current_balance_etb, total_earned_etb)
  VALUES (v_affiliate_user_id, v_order.affiliate_profit_etb, v_order.affiliate_profit_etb)
  ON CONFLICT (user_id) DO UPDATE SET
    current_balance_etb = affiliate_wallets.current_balance_etb + v_order.affiliate_profit_etb,
    total_earned_etb = affiliate_wallets.total_earned_etb + v_order.affiliate_profit_etb,
    updated_at = now();

  UPDATE public.affiliate_products SET sale_count = sale_count + 1 WHERE id = v_order.affiliate_product_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_affiliate_user_id, 'Affiliate Sale Confirmed! 💰',
    'You earned ' || v_order.affiliate_profit_etb || ' ETB from an affiliate sale.', 'success');

  IF v_order.buyer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_order.buyer_id, 'Payment Verified',
      'Your affiliate purchase has been confirmed and will be processed by Abeni Express.', 'success');
  END IF;
END;
$$;

-- Function: increment click counter (public)
CREATE OR REPLACE FUNCTION public.affiliate_product_click(p_product_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.affiliate_products SET click_count = click_count + 1 WHERE id = p_product_id;
$$;
