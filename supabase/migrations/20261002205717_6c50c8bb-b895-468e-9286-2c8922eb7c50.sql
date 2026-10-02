ALTER TABLE public.digital_products ADD COLUMN IF NOT EXISTS preview_url text;

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  subject text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, seller_id),
  CHECK (buyer_id <> seller_id)
);
GRANT SELECT, INSERT, UPDATE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants view" ON public.chat_conversations FOR SELECT TO authenticated USING (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "buyer starts" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "participants update" ON public.chat_conversations FOR UPDATE TO authenticated USING (auth.uid() IN (buyer_id, seller_id));

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read msgs" ON public.chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.buyer_id, c.seller_id)));
CREATE POLICY "participants send msgs" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.buyer_id, c.seller_id)));

CREATE OR REPLACE FUNCTION public.touch_conversation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.chat_conversations SET last_message_at = now() WHERE id = NEW.conversation_id; RETURN NEW; END; $$;
CREATE TRIGGER chat_touch AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;