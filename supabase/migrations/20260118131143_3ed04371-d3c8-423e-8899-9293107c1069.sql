-- 1) Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  custom_category TEXT,
  price_etb NUMERIC NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'fixed',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2) Create service_orders table
CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id),
  customer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  quantity INTEGER DEFAULT 1,
  hours INTEGER,
  total_etb NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_proof_url TEXT,
  payment_method TEXT,
  verification_code TEXT,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  admin_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3) Enable RLS on services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 4) RLS policies for services
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Sellers can manage their own services"
  ON public.services FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.seller_stores
    WHERE seller_stores.id = services.seller_id
    AND seller_stores.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all services"
  ON public.services FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) Enable RLS on service_orders
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- 6) RLS policies for service_orders
CREATE POLICY "Customers can create service orders"
  ON public.service_orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their service orders"
  ON public.service_orders FOR SELECT
  USING (auth.uid() = customer_id OR has_role(auth.uid(), 'admin'::app_role) OR 
         EXISTS (SELECT 1 FROM public.seller_stores WHERE seller_stores.id = service_orders.seller_id AND seller_stores.user_id = auth.uid()));

CREATE POLICY "Customers can update their pending service orders"
  ON public.service_orders FOR UPDATE
  USING (auth.uid() = customer_id AND status = 'pending_payment');

CREATE POLICY "Admins can manage all service orders"
  ON public.service_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can view their service orders"
  ON public.service_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.seller_stores WHERE seller_stores.id = service_orders.seller_id AND seller_stores.user_id = auth.uid()));