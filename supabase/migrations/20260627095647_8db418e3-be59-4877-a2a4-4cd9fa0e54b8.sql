ALTER TABLE public.seller_stores ADD COLUMN IF NOT EXISTS has_tin boolean NOT NULL DEFAULT false;
ALTER TABLE public.seller_stores ADD COLUMN IF NOT EXISTS tin_number text;