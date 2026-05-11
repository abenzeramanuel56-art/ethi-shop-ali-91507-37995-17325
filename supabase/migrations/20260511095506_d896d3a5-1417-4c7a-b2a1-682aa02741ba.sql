
-- 1. Vehicle preference on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preferred_vehicle_type text DEFAULT 'any';
ALTER TABLE public.pending_driver_orders ADD COLUMN IF NOT EXISTS preferred_vehicle_type text DEFAULT 'any';
ALTER TABLE public.driver_wallets ADD COLUMN IF NOT EXISTS vehicle_type text;

-- 2. Attachments on support
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.ticket_replies ADD COLUMN IF NOT EXISTS attachment_url text;
-- Add a sender label column for chat-bubble rendering (customer / agent / admin)
ALTER TABLE public.ticket_replies ADD COLUMN IF NOT EXISTS sender_label text;

-- 3. Agent instructions table (admin-issued live knowledge for the AI agent)
CREATE TABLE IF NOT EXISTS public.agent_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  instruction text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_instructions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage agent instructions" ON public.agent_instructions;
CREATE POLICY "Admins manage agent instructions"
ON public.agent_instructions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone authenticated can read instructions" ON public.agent_instructions;
CREATE POLICY "Anyone authenticated can read instructions"
ON public.agent_instructions FOR SELECT
TO authenticated
USING (true);

-- 4. New bucket for support attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies — admins can read all sensitive buckets; owners manage their own folder
DROP POLICY IF EXISTS "Admins read id photos" ON storage.objects;
CREATE POLICY "Admins read id photos" ON storage.objects FOR SELECT
USING (bucket_id = 'id-photos' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners read own id photos" ON storage.objects;
CREATE POLICY "Owners read own id photos" ON storage.objects FOR SELECT
USING (bucket_id = 'id-photos' AND auth.uid()::text = (storage.foldername(name))[2]);

DROP POLICY IF EXISTS "Authenticated upload id photos" ON storage.objects;
CREATE POLICY "Authenticated upload id photos" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-photos');

DROP POLICY IF EXISTS "Admins read payment proofs" ON storage.objects;
CREATE POLICY "Admins read payment proofs" ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated upload payment proofs" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Owners read own payment proofs" ON storage.objects;
CREATE POLICY "Owners read own payment proofs" ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND owner = auth.uid());

-- support-attachments policies
DROP POLICY IF EXISTS "Admins read support attachments" ON storage.objects;
CREATE POLICY "Admins read support attachments" ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated upload support attachments" ON storage.objects;
CREATE POLICY "Authenticated upload support attachments" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS "Owners read own support attachments" ON storage.objects;
CREATE POLICY "Owners read own support attachments" ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments' AND owner = auth.uid());
