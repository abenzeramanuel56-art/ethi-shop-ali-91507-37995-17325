
DROP POLICY IF EXISTS "Customers and resellers can view relevant orders" ON public.orders;
CREATE POLICY "Customers sellers resellers admin can view orders"
ON public.orders FOR SELECT
USING (
  auth.uid() = customer_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.seller_stores
    WHERE seller_stores.user_id = auth.uid()
      AND (seller_stores.id = orders.reseller_id OR seller_stores.id = orders.seller_id)
  )
);

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evc_email ON public.email_verification_codes (email);
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.email_verification_codes TO service_role;
