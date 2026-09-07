-- Fix seller_applications RLS - restrict to applicant and admins only
DROP POLICY IF EXISTS "Anyone can read seller applications" ON public.seller_applications;
DROP POLICY IF EXISTS "Users can read their own seller application" ON public.seller_applications;

-- Only allow users to read their own application
CREATE POLICY "Users can read their own seller application"
ON public.seller_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to read all applications
CREATE POLICY "Admins can read all seller applications"
ON public.seller_applications
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Fix seller_stores RLS - restrict contact info to authenticated users
DROP POLICY IF EXISTS "Anyone can read seller stores" ON public.seller_stores;
DROP POLICY IF EXISTS "Public can view seller stores" ON public.seller_stores;

-- Allow authenticated users to read seller stores
CREATE POLICY "Authenticated users can read seller stores"
ON public.seller_stores
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow store owners to manage their own stores
CREATE POLICY "Store owners can update their own stores"
ON public.seller_stores
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "Admins can manage all seller stores"
ON public.seller_stores
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));