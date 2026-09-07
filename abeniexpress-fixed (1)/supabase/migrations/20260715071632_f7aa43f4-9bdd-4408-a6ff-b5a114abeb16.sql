
-- Add telegram_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Create telegram_verifications table
CREATE TABLE IF NOT EXISTS public.telegram_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  telegram_username TEXT,
  verification_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_verifications_code ON public.telegram_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_telegram_verifications_expires ON public.telegram_verifications(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_verifications TO authenticated;
GRANT ALL ON public.telegram_verifications TO service_role;

ALTER TABLE public.telegram_verifications ENABLE ROW LEVEL SECURITY;

-- Only service role handles inserts/deletes (via edge functions). No user-level access needed.
CREATE POLICY "No direct client access to telegram_verifications"
  ON public.telegram_verifications FOR SELECT TO authenticated USING (false);

-- RPC to verify a telegram code and link telegram_id to authenticated user
CREATE OR REPLACE FUNCTION public.verify_telegram_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_record
  FROM public.telegram_verifications
  WHERE verification_code = p_code
    AND expires_at > now()
  LIMIT 1;

  IF v_record IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET telegram_id = v_record.telegram_id, updated_at = now()
  WHERE id = auth.uid();

  DELETE FROM public.telegram_verifications WHERE telegram_id = v_record.telegram_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_telegram_code(TEXT) TO authenticated;

-- Enable realtime on notifications (idempotent-safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
