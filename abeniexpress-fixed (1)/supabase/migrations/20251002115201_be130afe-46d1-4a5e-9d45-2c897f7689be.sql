-- Add payment_method column to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_method text;

COMMENT ON COLUMN public.orders.payment_method IS 'Payment method selected by customer (cbe or telebirr)';