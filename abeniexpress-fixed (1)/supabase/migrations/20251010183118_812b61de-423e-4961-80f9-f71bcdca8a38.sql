-- Add unique_product_code to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unique_product_code text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_products_upc ON public.products(unique_product_code);

-- Create reseller_stores table
CREATE TABLE IF NOT EXISTS public.reseller_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_name text NOT NULL UNIQUE,
  store_slug text NOT NULL UNIQUE,
  contact_email text,
  contact_phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_slug CHECK (store_slug ~ '^[a-z0-9-]+$')
);

ALTER TABLE public.reseller_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view their own store"
  ON public.reseller_stores FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Resellers can create their own store"
  ON public.reseller_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Resellers can update their own store"
  ON public.reseller_stores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all stores"
  ON public.reseller_stores FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create reseller_products table
CREATE TABLE IF NOT EXISTS public.reseller_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.reseller_stores(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  reseller_price_etb numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, product_id)
);

ALTER TABLE public.reseller_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active reseller products"
  ON public.reseller_products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Resellers can manage their products"
  ON public.reseller_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.reseller_stores
      WHERE reseller_stores.id = reseller_products.store_id
      AND reseller_stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all reseller products"
  ON public.reseller_products FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create reseller_wallets table
CREATE TABLE IF NOT EXISTS public.reseller_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_balance_etb numeric DEFAULT 0 NOT NULL CHECK (current_balance_etb >= 0),
  total_earned_etb numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reseller_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view their own wallet"
  ON public.reseller_wallets FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can update wallets"
  ON public.reseller_wallets FOR UPDATE
  USING (true);

CREATE POLICY "Admins can manage all wallets"
  ON public.reseller_wallets FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_etb numeric NOT NULL CHECK (amount_etb > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('telebirr', 'cbe')),
  account_detail_1 text NOT NULL,
  account_detail_2 text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resellers can view their own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Resellers can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawal requests"
  ON public.withdrawal_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add reseller_id to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reseller_id uuid REFERENCES public.reseller_stores(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_type text DEFAULT 'admin' CHECK (store_type IN ('admin', 'reseller'));

-- Add reseller_profit to order_items table
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS reseller_profit_etb numeric DEFAULT 0;

-- Update orders RLS to include reseller access
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers and resellers can view relevant orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.reseller_stores
      WHERE reseller_stores.id = orders.reseller_id
      AND reseller_stores.user_id = auth.uid()
    )
  );

-- Create trigger to update reseller wallet when order is shipped
CREATE OR REPLACE FUNCTION public.update_reseller_wallet_on_ship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to 'shipped' and order has a reseller
  IF NEW.status = 'shipped' AND OLD.status != 'shipped' AND NEW.reseller_id IS NOT NULL THEN
    -- Get the reseller user_id
    DECLARE
      reseller_user_id uuid;
      total_profit numeric;
    BEGIN
      SELECT user_id INTO reseller_user_id
      FROM public.reseller_stores
      WHERE id = NEW.reseller_id;
      
      -- Calculate total profit for this order
      SELECT COALESCE(SUM(reseller_profit_etb * quantity), 0) INTO total_profit
      FROM public.order_items
      WHERE order_id = NEW.id;
      
      -- Update or create wallet entry
      INSERT INTO public.reseller_wallets (user_id, current_balance_etb, total_earned_etb)
      VALUES (reseller_user_id, total_profit, total_profit)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        current_balance_etb = reseller_wallets.current_balance_etb + total_profit,
        total_earned_etb = reseller_wallets.total_earned_etb + total_profit,
        updated_at = now();
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_reseller_wallet_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reseller_wallet_on_ship();

-- Add 'reseller' role to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'customer', 'reseller');
  ELSE
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';
  END IF;
END $$;