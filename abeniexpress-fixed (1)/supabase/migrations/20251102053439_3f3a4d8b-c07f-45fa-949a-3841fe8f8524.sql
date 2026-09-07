-- Create a helper function to fetch reseller store by slug accessible to public
CREATE OR REPLACE FUNCTION public.get_store_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  store_name text,
  store_slug text,
  contact_email text,
  contact_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, store_name, store_slug, contact_email, contact_phone
  FROM public.reseller_stores
  WHERE store_slug = p_slug
$$;