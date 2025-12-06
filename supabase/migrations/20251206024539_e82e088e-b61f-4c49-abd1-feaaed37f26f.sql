-- Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL,
  reason TEXT NOT NULL,
  amount_etb NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Customers can create refund requests for their orders
CREATE POLICY "Customers can create refund requests"
ON public.refund_requests
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Customers can view their own refund requests
CREATE POLICY "Customers can view their refund requests"
ON public.refund_requests
FOR SELECT
USING (auth.uid() = customer_id OR has_role(auth.uid(), 'admin'));

-- Admins can manage all refund requests
CREATE POLICY "Admins can manage refund requests"
ON public.refund_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'));