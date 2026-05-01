-- Add category to digital products
ALTER TABLE public.digital_products
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- Add ad trigger fields
ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'on_interval',
  ADD COLUMN IF NOT EXISTS trigger_path text;

-- Extend store_reports for product reporting
ALTER TABLE public.store_reports
  ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'store',
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS digital_product_id uuid;

-- Allow store_id to be nullable since some reports may target products without a seller store
ALTER TABLE public.store_reports ALTER COLUMN store_id DROP NOT NULL;