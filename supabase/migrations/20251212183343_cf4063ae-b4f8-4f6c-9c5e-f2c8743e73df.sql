-- Add new columns to reseller_applications for enhanced verification
ALTER TABLE public.reseller_applications 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS id_front_photo_url text,
ADD COLUMN IF NOT EXISTS id_back_photo_url text,
ADD COLUMN IF NOT EXISTS face_photo_url text,
ADD COLUMN IF NOT EXISTS face_descriptor jsonb;

-- Update products with real AliExpress URLs
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005006429720445.html' WHERE name ILIKE '%Wireless Bluetooth Earbuds%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005892441822.html' WHERE name ILIKE '%Smart Watch%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005006008055569.html' WHERE name ILIKE '%Power Bank%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005168584923.html' WHERE name ILIKE '%USB-C Hub%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005003893890680.html' WHERE name ILIKE '%Ring Light%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005004296280504.html' WHERE name ILIKE '%Wireless Mouse%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005004878116879.html' WHERE name ILIKE '%Mechanical%Keyboard%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005183738155.html' WHERE name ILIKE '%Webcam%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005756627282.html' WHERE name ILIKE '%Bluetooth Speaker%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005485346859.html' WHERE name ILIKE '%Gaming Headset%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005006152891684.html' WHERE name ILIKE '%Projector%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005895741647.html' WHERE name ILIKE '%Action Camera%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005037392595.html' WHERE name ILIKE '%Tablet Stand%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005599314138.html' WHERE name ILIKE '%USB Microphone%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005759890245.html' WHERE name ILIKE '%VR Headset%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005839265413.html' WHERE name ILIKE '%Sneakers%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005004926893459.html' WHERE name ILIKE '%Wallet%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005614295693.html' WHERE name ILIKE '%Sunglasses%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005004887926125.html' WHERE name ILIKE '%Baseball Cap%';
UPDATE public.products SET aliexpress_url = 'https://www.aliexpress.com/item/1005005496584234.html' WHERE name ILIKE '%Backpack%';