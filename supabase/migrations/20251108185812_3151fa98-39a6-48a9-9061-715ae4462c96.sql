-- Create ticket replies table for conversation between customers and admins
CREATE TABLE public.ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies for their own tickets
CREATE POLICY "Users can view replies for their tickets"
ON public.ticket_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
    AND (support_tickets.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Users can create replies for their own tickets
CREATE POLICY "Users can create replies for their tickets"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = ticket_replies.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Admins can create replies for any ticket
CREATE POLICY "Admins can create replies"
ON public.ticket_replies
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  auth.uid() = user_id
);

-- Create index for better performance
CREATE INDEX idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);
CREATE INDEX idx_ticket_replies_created_at ON public.ticket_replies(created_at);