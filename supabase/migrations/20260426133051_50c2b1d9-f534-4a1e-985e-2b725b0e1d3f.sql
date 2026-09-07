-- Fix search_path warning by re-asserting on functions (was already set, but linter may flag pre-existing ones).
-- Confirm bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'digital-products';
