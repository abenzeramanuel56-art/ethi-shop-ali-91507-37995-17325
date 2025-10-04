-- Make payment-proofs bucket public so admins can view payment proofs in dashboard
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';