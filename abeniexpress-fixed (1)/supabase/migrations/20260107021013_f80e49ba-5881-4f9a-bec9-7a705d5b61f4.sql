-- Fix the permissive INSERT policy on pending_driver_orders
DROP POLICY IF EXISTS "Allow insert pending driver orders" ON public.pending_driver_orders;

-- Only admins can insert pending driver orders
CREATE POLICY "Admins can insert pending driver orders"
ON public.pending_driver_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);