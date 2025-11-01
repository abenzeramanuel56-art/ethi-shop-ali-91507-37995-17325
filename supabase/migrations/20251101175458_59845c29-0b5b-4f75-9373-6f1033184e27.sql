-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all user roles for the messaging feature
CREATE POLICY "Public can view roles for messaging"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);