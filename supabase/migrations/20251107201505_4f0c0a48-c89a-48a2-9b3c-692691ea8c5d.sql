-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reseller applications table
CREATE TABLE public.reseller_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  uid TEXT NOT NULL,
  age INTEGER NOT NULL,
  phone TEXT NOT NULL,
  id_photo_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_applications ENABLE ROW LEVEL SECURITY;

-- Support tickets policies
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Reseller applications policies
CREATE POLICY "Users can create their own application"
ON public.reseller_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own application"
ON public.reseller_applications FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
ON public.reseller_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for ID photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-photos', 'id-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ID photos
CREATE POLICY "Users can upload their own ID"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'id-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own ID"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'id-photos' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'))
);