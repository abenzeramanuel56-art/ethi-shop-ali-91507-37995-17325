-- First, add 'driver' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Delete all existing data as requested
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.reseller_products CASCADE;
TRUNCATE TABLE public.reseller_wallets CASCADE;
TRUNCATE TABLE public.reseller_stores CASCADE;
TRUNCATE TABLE public.reseller_applications CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.quote_requests CASCADE;
TRUNCATE TABLE public.withdrawal_requests CASCADE;
TRUNCATE TABLE public.wallet_deductions CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.advertisements CASCADE;
TRUNCATE TABLE public.user_warnings CASCADE;
TRUNCATE TABLE public.user_suspensions CASCADE;
TRUNCATE TABLE public.user_bans CASCADE;
TRUNCATE TABLE public.store_reports CASCADE;
TRUNCATE TABLE public.support_tickets CASCADE;
TRUNCATE TABLE public.ticket_replies CASCADE;
TRUNCATE TABLE public.refund_requests CASCADE;

-- Rename reseller tables to seller
ALTER TABLE public.reseller_stores RENAME TO seller_stores;
ALTER TABLE public.reseller_products RENAME TO seller_products;
ALTER TABLE public.reseller_wallets RENAME TO seller_wallets;
ALTER TABLE public.reseller_applications RENAME TO seller_applications;

-- Update column names in seller_products
ALTER TABLE public.seller_products RENAME COLUMN reseller_price_etb TO seller_price_etb;

-- Add seller_id to products table (products now belong to sellers)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.seller_stores(id);

-- Add location columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_updated_at timestamp with time zone;

-- Create driver_applications table
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  age integer NOT NULL,
  id_front_photo_url text NOT NULL,
  id_back_photo_url text NOT NULL,
  vehicle_type text, -- bicycle, motorcycle, car
  license_plate text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone
);

-- Create driver_wallets table
CREATE TABLE IF NOT EXISTS public.driver_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance_etb numeric NOT NULL DEFAULT 0,
  total_earned_etb numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create driver_orders table (assignment of drivers to orders)
CREATE TABLE IF NOT EXISTS public.driver_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, picked_up, delivered
  seller_confirmed_pickup boolean DEFAULT false,
  customer_confirmed_delivery boolean DEFAULT false,
  distance_km numeric,
  driver_earning_etb numeric,
  pickup_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add driver-related columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.seller_stores(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_assigned boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_notified boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee_etb numeric DEFAULT 0;

-- Create settings for driver rate if not exists
INSERT INTO public.settings (key, value) 
VALUES ('driver_rate_per_km', '25')
ON CONFLICT (key) DO UPDATE SET value = '25';

-- Enable RLS on new tables
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for driver_applications
CREATE POLICY "Users can create their own driver application"
ON public.driver_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own driver application"
ON public.driver_applications FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update driver applications"
ON public.driver_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for driver_wallets
CREATE POLICY "Drivers can view their own wallet"
ON public.driver_wallets FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all driver wallets"
ON public.driver_wallets FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for driver_orders
CREATE POLICY "Drivers can view their orders"
ON public.driver_orders FOR SELECT
USING (auth.uid() = driver_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can update their orders"
ON public.driver_orders FOR UPDATE
USING (auth.uid() = driver_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create driver orders"
ON public.driver_orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update products RLS to allow sellers to manage their products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins and sellers can manage products"
ON public.products FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  (seller_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.seller_stores 
    WHERE id = products.seller_id AND user_id = auth.uid()
  ))
);

-- Function to notify driver application status change
CREATE OR REPLACE FUNCTION public.notify_driver_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    CASE NEW.status
      WHEN 'approved' THEN
        notification_title := 'Driver Application Approved! 🎉';
        notification_message := 'Congratulations! Your driver application has been approved. You can now start accepting delivery orders.';
      WHEN 'rejected' THEN
        notification_title := 'Driver Application Rejected';
        notification_message := 'Your driver application was rejected.' ||
          CASE WHEN NEW.admin_notes IS NOT NULL THEN ' Reason: ' || NEW.admin_notes ELSE '' END;
    END CASE;
    
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, notification_title, notification_message, 'application_update');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for driver application status
CREATE TRIGGER on_driver_application_status_change
  AFTER UPDATE ON public.driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_application_status_change();

-- Function to pay seller when driver picks up
CREATE OR REPLACE FUNCTION public.pay_seller_on_pickup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_total numeric;
  seller_user_id uuid;
BEGIN
  IF NEW.seller_confirmed_pickup = true AND OLD.seller_confirmed_pickup = false THEN
    -- Get order total and seller
    SELECT o.total_etb, ss.user_id INTO order_total, seller_user_id
    FROM public.orders o
    JOIN public.seller_stores ss ON ss.id = o.seller_id
    WHERE o.id = NEW.order_id;
    
    -- Update seller wallet
    INSERT INTO public.seller_wallets (user_id, current_balance_etb, total_earned_etb)
    VALUES (seller_user_id, order_total, order_total)
    ON CONFLICT (user_id) 
    DO UPDATE SET
      current_balance_etb = seller_wallets.current_balance_etb + order_total,
      total_earned_etb = seller_wallets.total_earned_etb + order_total,
      updated_at = now();
    
    -- Notify seller
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (seller_user_id, 'Payment Received!', 'You have received ' || order_total || ' ETB for your order.', 'payment');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_driver_pickup_confirmed
  AFTER UPDATE ON public.driver_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.pay_seller_on_pickup();

-- Function to pay driver when customer confirms delivery
CREATE OR REPLACE FUNCTION public.pay_driver_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_confirmed_delivery = true AND OLD.customer_confirmed_delivery = false THEN
    -- Update driver wallet
    INSERT INTO public.driver_wallets (user_id, current_balance_etb, total_earned_etb)
    VALUES (NEW.driver_id, NEW.driver_earning_etb, NEW.driver_earning_etb)
    ON CONFLICT (user_id) 
    DO UPDATE SET
      current_balance_etb = driver_wallets.current_balance_etb + NEW.driver_earning_etb,
      total_earned_etb = driver_wallets.total_earned_etb + NEW.driver_earning_etb,
      updated_at = now();
    
    -- Notify driver
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.driver_id, 'Delivery Completed!', 'You earned ' || NEW.driver_earning_etb || ' ETB for this delivery.', 'payment');
    
    -- Update order status
    UPDATE public.orders SET status = 'delivered' WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_customer_delivery_confirmed
  AFTER UPDATE ON public.driver_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.pay_driver_on_delivery();