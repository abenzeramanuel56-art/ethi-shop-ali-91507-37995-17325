-- Add location columns to seller_stores
ALTER TABLE public.seller_stores 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Add customer destination location to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS customer_longitude DECIMAL(11, 8);

-- Add seller and customer location to driver_orders for reference
ALTER TABLE public.driver_orders
ADD COLUMN IF NOT EXISTS seller_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS seller_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS customer_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS customer_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS seller_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Create pending_driver_orders table for orders awaiting driver acceptance
CREATE TABLE IF NOT EXISTS public.pending_driver_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.seller_stores(id),
  seller_latitude DECIMAL(10, 8),
  seller_longitude DECIMAL(11, 8),
  seller_phone TEXT,
  customer_latitude DECIMAL(10, 8),
  customer_longitude DECIMAL(11, 8),
  customer_phone TEXT,
  shipping_address TEXT,
  city TEXT,
  distance_km DECIMAL(10, 2),
  estimated_earning_etb DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on pending_driver_orders
ALTER TABLE public.pending_driver_orders ENABLE ROW LEVEL SECURITY;

-- Drivers can view pending orders
CREATE POLICY "Drivers can view pending driver orders"
ON public.pending_driver_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'driver'
  )
  AND accepted_by IS NULL
);

-- Drivers can accept orders (update)
CREATE POLICY "Drivers can accept pending orders"
ON public.pending_driver_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'driver'
  )
  AND accepted_by IS NULL
)
WITH CHECK (accepted_by = auth.uid());

-- Admins can manage pending orders
CREATE POLICY "Admins can manage pending driver orders"
ON public.pending_driver_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow inserting pending orders (for admin approval flow)
CREATE POLICY "Allow insert pending driver orders"
ON public.pending_driver_orders
FOR INSERT
WITH CHECK (true);

-- Update seller_stores RLS to allow location updates
CREATE POLICY "Sellers can update their own store location"
ON public.seller_stores
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add realtime for pending_driver_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_driver_orders;