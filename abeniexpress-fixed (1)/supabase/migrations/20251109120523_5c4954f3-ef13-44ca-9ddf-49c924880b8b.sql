-- Add aliexpress_url to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS aliexpress_url text;

-- Insert 1000 sample products from AliExpress categories
-- Electronics & Gadgets (200 products)
INSERT INTO public.products (name, description, price_etb, cost_usd, category, image_url, aliexpress_url, stock_status)
SELECT 
  'Product ' || generate_series || ' - ' || 
  CASE (random() * 5)::int
    WHEN 0 THEN 'Wireless Earbuds'
    WHEN 1 THEN 'Smart Watch'
    WHEN 2 THEN 'Phone Case'
    WHEN 3 THEN 'USB Cable'
    WHEN 4 THEN 'Power Bank'
    ELSE 'Bluetooth Speaker'
  END,
  'High quality imported product. Fast shipping available. Premium quality guaranteed.',
  (5 + random() * 95)::numeric(10,2) * 180, -- Price in Birr (5-100 USD range)
  (5 + random() * 95)::numeric(10,2), -- Cost in USD
  'electronics',
  'https://placeholder.lovable.app/placeholder.svg',
  'https://www.aliexpress.com/item/' || (1000000000 + random() * 9000000000)::bigint || '.html',
  true
FROM generate_series(1, 200);

-- Fashion & Accessories (200 products)
INSERT INTO public.products (name, description, price_etb, cost_usd, category, image_url, aliexpress_url, stock_status)
SELECT 
  'Fashion ' || generate_series || ' - ' || 
  CASE (random() * 5)::int
    WHEN 0 THEN 'Leather Wallet'
    WHEN 1 THEN 'Sunglasses'
    WHEN 2 THEN 'Watch Band'
    WHEN 3 THEN 'Bracelet'
    WHEN 4 THEN 'Necklace'
    ELSE 'Ring Set'
  END,
  'Trendy fashion accessory. Premium quality. Latest style.',
  (3 + random() * 47)::numeric(10,2) * 180,
  (3 + random() * 47)::numeric(10,2),
  'fashion',
  'https://placeholder.lovable.app/placeholder.svg',
  'https://www.aliexpress.com/item/' || (1000000000 + random() * 9000000000)::bigint || '.html',
  true
FROM generate_series(1, 200);

-- Home & Garden (200 products)
INSERT INTO public.products (name, description, price_etb, cost_usd, category, image_url, aliexpress_url, stock_status)
SELECT 
  'Home ' || generate_series || ' - ' || 
  CASE (random() * 5)::int
    WHEN 0 THEN 'LED Strip Light'
    WHEN 1 THEN 'Storage Box'
    WHEN 2 THEN 'Kitchen Gadget'
    WHEN 3 THEN 'Wall Decor'
    WHEN 4 THEN 'Plant Pot'
    ELSE 'Organizer'
  END,
  'Perfect for your home. High quality materials. Modern design.',
  (2 + random() * 28)::numeric(10,2) * 180,
  (2 + random() * 28)::numeric(10,2),
  'home',
  'https://placeholder.lovable.app/placeholder.svg',
  'https://www.aliexpress.com/item/' || (1000000000 + random() * 9000000000)::bigint || '.html',
  true
FROM generate_series(1, 200);

-- Beauty & Health (200 products)
INSERT INTO public.products (name, description, price_etb, cost_usd, category, image_url, aliexpress_url, stock_status)
SELECT 
  'Beauty ' || generate_series || ' - ' || 
  CASE (random() * 5)::int
    WHEN 0 THEN 'Makeup Brush Set'
    WHEN 1 THEN 'Face Mask'
    WHEN 2 THEN 'Hair Clip'
    WHEN 3 THEN 'Nail Art Kit'
    WHEN 4 THEN 'Skin Care Tool'
    ELSE 'Makeup Organizer'
  END,
  'Professional beauty product. Safe and tested. Premium quality.',
  (2 + random() * 23)::numeric(10,2) * 180,
  (2 + random() * 23)::numeric(10,2),
  'beauty',
  'https://placeholder.lovable.app/placeholder.svg',
  'https://www.aliexpress.com/item/' || (1000000000 + random() * 9000000000)::bigint || '.html',
  true
FROM generate_series(1, 200);

-- Sports & Outdoors (200 products)
INSERT INTO public.products (name, description, price_etb, cost_usd, category, image_url, aliexpress_url, stock_status)
SELECT 
  'Sports ' || generate_series || ' - ' || 
  CASE (random() * 5)::int
    WHEN 0 THEN 'Yoga Mat'
    WHEN 1 THEN 'Resistance Band'
    WHEN 2 THEN 'Water Bottle'
    WHEN 3 THEN 'Gym Gloves'
    WHEN 4 THEN 'Jump Rope'
    ELSE 'Sports Bag'
  END,
  'Perfect for sports and fitness. Durable and comfortable. Professional grade.',
  (3 + random() * 37)::numeric(10,2) * 180,
  (3 + random() * 37)::numeric(10,2),
  'sports',
  'https://placeholder.lovable.app/placeholder.svg',
  'https://www.aliexpress.com/item/' || (1000000000 + random() * 9000000000)::bigint || '.html',
  true
FROM generate_series(1, 200)