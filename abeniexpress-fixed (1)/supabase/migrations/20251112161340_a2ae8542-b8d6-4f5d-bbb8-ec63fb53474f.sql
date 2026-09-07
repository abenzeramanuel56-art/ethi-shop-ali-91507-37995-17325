-- Fix critical security issue: Wallet balance manipulation
-- Remove the dangerous "System can update wallets" policy that allows anyone to update
DROP POLICY IF EXISTS "System can update wallets" ON reseller_wallets;

-- Create a secure policy that only allows admins to update wallets
CREATE POLICY "Only admins can update wallets" 
ON reseller_wallets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure storage buckets exist and are configured correctly
-- ID photos bucket (private)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'id-photos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'id-photos',
      'id-photos',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/jpg']
    );
  ELSE
    UPDATE storage.buckets 
    SET public = false, 
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg']
    WHERE id = 'id-photos';
  END IF;
END $$;

-- Payment proofs bucket (private)
UPDATE storage.buckets 
SET public = false
WHERE id = 'payment-proofs';