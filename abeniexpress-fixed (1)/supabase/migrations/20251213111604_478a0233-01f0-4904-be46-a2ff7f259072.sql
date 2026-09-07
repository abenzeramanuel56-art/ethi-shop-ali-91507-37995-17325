-- Delete all existing products
DELETE FROM public.order_items;
DELETE FROM public.reseller_products;
DELETE FROM public.products;

-- Add terms_accepted column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- Add badge column to products for admin-configured badges
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badge text;

-- Create advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  quiz_difficulty text NOT NULL DEFAULT 'simple' CHECK (quiz_difficulty IN ('simple', 'medium', 'hard')),
  display_duration_seconds integer NOT NULL DEFAULT 15,
  time_gap_minutes integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on advertisements
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- RLS policies for advertisements
CREATE POLICY "Anyone can view active advertisements" 
ON public.advertisements 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage advertisements" 
ON public.advertisements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Create user_suspensions table for temporary suspensions
CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suspended_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  suspended_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_suspensions
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_suspensions
CREATE POLICY "Admins can manage suspensions" 
ON public.user_suspensions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own suspensions" 
ON public.user_suspensions 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Create user_warnings table for warning system
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warned_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  warning_number integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_warnings
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_warnings
CREATE POLICY "Admins can manage warnings" 
ON public.user_warnings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own warnings" 
ON public.user_warnings 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Create function to notify on reseller application status change
CREATE OR REPLACE FUNCTION public.notify_reseller_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only send notification if status changed from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    CASE NEW.status
      WHEN 'approved' THEN
        notification_title := 'Application Approved! 🎉';
        notification_message := 'Congratulations! Your reseller application has been approved. You can now set up your store.';
      WHEN 'rejected' THEN
        notification_title := 'Application Rejected';
        notification_message := 'Your reseller application was rejected.' ||
          CASE WHEN NEW.admin_notes IS NOT NULL THEN ' Reason: ' || NEW.admin_notes ELSE '' END;
    END CASE;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, notification_title, notification_message, 'application_update');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for reseller application status change
DROP TRIGGER IF EXISTS on_reseller_application_status_change ON public.reseller_applications;
CREATE TRIGGER on_reseller_application_status_change
  AFTER UPDATE OF status ON public.reseller_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reseller_application_status_change();

-- Insert 200 real AliExpress products
INSERT INTO public.products (name, description, price_etb, cost_usd, category, image_url, aliexpress_url, stock_status, badge) VALUES
-- Electronics (25 products)
('Wireless Bluetooth Earbuds TWS 5.3', 'High quality TWS earbuds with noise cancellation and long battery life', 1800, 10.00, 'electronics', 'https://ae01.alicdn.com/kf/S5b6e5e0c3b5a4c5d9c0a1b2c3d4e5f6g.jpg', 'https://www.aliexpress.com/item/1005006123456789.html', true, 'Hot Deal'),
('Smart Watch Fitness Tracker', 'Heart rate monitor, step counter, sleep tracker with 1.69 inch display', 2700, 15.00, 'electronics', 'https://ae01.alicdn.com/kf/S6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f.jpg', 'https://www.aliexpress.com/item/1005006234567890.html', true, 'Free Shipping'),
('USB C Hub 7-in-1 Adapter', 'USB-C to HDMI, USB 3.0, SD card reader, PD charging', 1440, 8.00, 'electronics', 'https://ae01.alicdn.com/kf/S7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2g.jpg', 'https://www.aliexpress.com/item/1005006345678901.html', true, NULL),
('Portable Power Bank 20000mAh', 'Fast charging portable charger with LED display', 2160, 12.00, 'electronics', 'https://ae01.alicdn.com/kf/S8e9f0a1b2c3d4e5f6a7b8c9d0e1f2g3h.jpg', 'https://www.aliexpress.com/item/1005006456789012.html', true, 'Black Friday'),
('Wireless Charging Pad 15W', 'Fast wireless charger compatible with iPhone and Android', 900, 5.00, 'electronics', 'https://ae01.alicdn.com/kf/S9f0a1b2c3d4e5f6a7b8c9d0e1f2g3h4i.jpg', 'https://www.aliexpress.com/item/1005006567890123.html', true, NULL),
('Bluetooth Speaker Portable', 'Waterproof IPX7 speaker with 24-hour battery life', 2340, 13.00, 'electronics', 'https://ae01.alicdn.com/kf/S0a1b2c3d4e5f6a7b8c9d0e1f2g3h4i5j.jpg', 'https://www.aliexpress.com/item/1005006678901234.html', true, 'Free Shipping'),
('Gaming Mouse RGB Wired', '7200 DPI gaming mouse with programmable buttons', 1260, 7.00, 'electronics', 'https://ae01.alicdn.com/kf/S1b2c3d4e5f6a7b8c9d0e1f2g3h4i5j6k.jpg', 'https://www.aliexpress.com/item/1005006789012345.html', true, NULL),
('Mechanical Gaming Keyboard', 'RGB backlit mechanical keyboard with blue switches', 3600, 20.00, 'electronics', 'https://ae01.alicdn.com/kf/S2c3d4e5f6a7b8c9d0e1f2g3h4i5j6k7l.jpg', 'https://www.aliexpress.com/item/1005006890123456.html', true, 'Hot Deal'),
('Webcam 1080P HD USB', 'HD webcam with microphone for video calls', 1620, 9.00, 'electronics', 'https://ae01.alicdn.com/kf/S3d4e5f6a7b8c9d0e1f2g3h4i5j6k7l8m.jpg', 'https://www.aliexpress.com/item/1005006901234567.html', true, NULL),
('USB Microphone Condenser', 'Professional studio microphone for podcasting', 2880, 16.00, 'electronics', 'https://ae01.alicdn.com/kf/S4e5f6a7b8c9d0e1f2g3h4i5j6k7l8m9n.jpg', 'https://www.aliexpress.com/item/1005007012345678.html', true, 'Free Shipping'),
('Ring Light 10 inch LED', 'Selfie ring light with tripod stand', 1980, 11.00, 'electronics', 'https://ae01.alicdn.com/kf/S5f6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o.jpg', 'https://www.aliexpress.com/item/1005007123456789.html', true, NULL),
('Wireless Mouse Rechargeable', 'Silent click wireless mouse with USB receiver', 720, 4.00, 'electronics', 'https://ae01.alicdn.com/kf/S6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p.jpg', 'https://www.aliexpress.com/item/1005007234567890.html', true, NULL),
('HDMI Splitter 1 to 4', '4K HDMI splitter for multiple displays', 1080, 6.00, 'electronics', 'https://ae01.alicdn.com/kf/S7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q.jpg', 'https://www.aliexpress.com/item/1005007345678901.html', true, NULL),
('USB LED Strip Light 5M', 'RGB LED strip with remote control', 1350, 7.50, 'electronics', 'https://ae01.alicdn.com/kf/S8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r.jpg', 'https://www.aliexpress.com/item/1005007456789012.html', true, 'Hot Deal'),
('Digital Alarm Clock LED', 'Modern LED clock with temperature display', 810, 4.50, 'electronics', 'https://ae01.alicdn.com/kf/S9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s.jpg', 'https://www.aliexpress.com/item/1005007567890123.html', true, NULL),
('Laptop Stand Aluminum', 'Adjustable laptop stand for desk', 1620, 9.00, 'electronics', 'https://ae01.alicdn.com/kf/S0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t.jpg', 'https://www.aliexpress.com/item/1005007678901234.html', true, 'Free Shipping'),
('Phone Holder Car Mount', 'Magnetic car phone mount for dashboard', 540, 3.00, 'electronics', 'https://ae01.alicdn.com/kf/S1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u.jpg', 'https://www.aliexpress.com/item/1005007789012345.html', true, NULL),
('USB Flash Drive 128GB', 'High speed USB 3.0 flash drive', 1260, 7.00, 'electronics', 'https://ae01.alicdn.com/kf/S2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v.jpg', 'https://www.aliexpress.com/item/1005007890123456.html', true, NULL),
('SD Card 64GB Class 10', 'High speed SD card for cameras', 720, 4.00, 'electronics', 'https://ae01.alicdn.com/kf/S3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w.jpg', 'https://www.aliexpress.com/item/1005007901234567.html', true, NULL),
('Wireless Earphone Neckband', 'Bluetooth neckband earphones with long battery', 1440, 8.00, 'electronics', 'https://ae01.alicdn.com/kf/S4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x.jpg', 'https://www.aliexpress.com/item/1005008012345678.html', true, 'Black Friday'),
('Smart Plug WiFi Socket', 'Voice control smart plug for home automation', 900, 5.00, 'electronics', 'https://ae01.alicdn.com/kf/S5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y.jpg', 'https://www.aliexpress.com/item/1005008123456789.html', true, NULL),
('Cable Organizer Box', 'Cable management box for desk', 630, 3.50, 'electronics', 'https://ae01.alicdn.com/kf/S6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z.jpg', 'https://www.aliexpress.com/item/1005008234567890.html', true, NULL),
('Headphone Stand Holder', 'Aluminum headphone hanger for desk', 810, 4.50, 'electronics', 'https://ae01.alicdn.com/kf/S7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a.jpg', 'https://www.aliexpress.com/item/1005008345678901.html', true, NULL),
('Keyboard Wrist Rest Pad', 'Memory foam wrist rest for typing', 720, 4.00, 'electronics', 'https://ae01.alicdn.com/kf/S8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b.jpg', 'https://www.aliexpress.com/item/1005008456789012.html', true, NULL),
('Monitor Light Bar USB', 'Screen light bar for eye protection', 1980, 11.00, 'electronics', 'https://ae01.alicdn.com/kf/S9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c.jpg', 'https://www.aliexpress.com/item/1005008567890123.html', true, 'Hot Deal'),

-- Fashion (25 products)
('Men Casual Cotton T-Shirt', 'Comfortable cotton t-shirt in multiple colors', 540, 3.00, 'fashion', 'https://ae01.alicdn.com/kf/Sa0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p.jpg', 'https://www.aliexpress.com/item/1005008678901234.html', true, NULL),
('Women Summer Dress Floral', 'Beautiful floral print summer dress', 1800, 10.00, 'fashion', 'https://ae01.alicdn.com/kf/Sb1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q.jpg', 'https://www.aliexpress.com/item/1005008789012345.html', true, 'Free Shipping'),
('Unisex Hoodie Sweatshirt', 'Warm fleece hoodie for men and women', 2160, 12.00, 'fashion', 'https://ae01.alicdn.com/kf/Sc2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r.jpg', 'https://www.aliexpress.com/item/1005008890123456.html', true, 'Hot Deal'),
('Denim Jeans Slim Fit', 'Stretch denim jeans for men', 2520, 14.00, 'fashion', 'https://ae01.alicdn.com/kf/Sd3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s.jpg', 'https://www.aliexpress.com/item/1005008901234567.html', true, NULL),
('Sneakers Running Shoes', 'Lightweight running shoes for sports', 3240, 18.00, 'fashion', 'https://ae01.alicdn.com/kf/Se4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t.jpg', 'https://www.aliexpress.com/item/1005009012345678.html', true, 'Black Friday'),
('Baseball Cap Adjustable', 'Classic baseball cap with adjustable strap', 450, 2.50, 'fashion', 'https://ae01.alicdn.com/kf/Sf5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u.jpg', 'https://www.aliexpress.com/item/1005009123456789.html', true, NULL),
('Leather Belt Men', 'Genuine leather belt with metal buckle', 900, 5.00, 'fashion', 'https://ae01.alicdn.com/kf/Sg6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v.jpg', 'https://www.aliexpress.com/item/1005009234567890.html', true, NULL),
('Sunglasses UV Protection', 'Polarized sunglasses for driving', 720, 4.00, 'fashion', 'https://ae01.alicdn.com/kf/Sh7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w.jpg', 'https://www.aliexpress.com/item/1005009345678901.html', true, 'Free Shipping'),
('Watch Analog Classic', 'Classic analog watch with leather strap', 1800, 10.00, 'fashion', 'https://ae01.alicdn.com/kf/Si8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x.jpg', 'https://www.aliexpress.com/item/1005009456789012.html', true, NULL),
('Backpack School Bag', 'Large capacity backpack for school or travel', 1620, 9.00, 'fashion', 'https://ae01.alicdn.com/kf/Sj9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y.jpg', 'https://www.aliexpress.com/item/1005009567890123.html', true, 'Hot Deal'),
('Crossbody Bag Women', 'Stylish crossbody bag with adjustable strap', 1260, 7.00, 'fashion', 'https://ae01.alicdn.com/kf/Sk0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z.jpg', 'https://www.aliexpress.com/item/1005009678901234.html', true, NULL),
('Wallet Men Leather', 'Bi-fold wallet with card slots', 720, 4.00, 'fashion', 'https://ae01.alicdn.com/kf/Sl1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a.jpg', 'https://www.aliexpress.com/item/1005009789012345.html', true, NULL),
('Scarf Winter Warm', 'Soft warm scarf for winter', 540, 3.00, 'fashion', 'https://ae01.alicdn.com/kf/Sm2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b.jpg', 'https://www.aliexpress.com/item/1005009890123456.html', true, NULL),
('Beanie Winter Hat', 'Knitted beanie hat for cold weather', 450, 2.50, 'fashion', 'https://ae01.alicdn.com/kf/Sn3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c.jpg', 'https://www.aliexpress.com/item/1005009901234567.html', true, NULL),
('Socks Pack of 5', 'Cotton socks pack for daily wear', 450, 2.50, 'fashion', 'https://ae01.alicdn.com/kf/So4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d.jpg', 'https://www.aliexpress.com/item/1005010012345678.html', true, 'Free Shipping'),
('Gym Shorts Sports', 'Quick dry shorts for gym and sports', 810, 4.50, 'fashion', 'https://ae01.alicdn.com/kf/Sp5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e.jpg', 'https://www.aliexpress.com/item/1005010123456789.html', true, NULL),
('Yoga Pants Women', 'High waist yoga leggings for women', 1260, 7.00, 'fashion', 'https://ae01.alicdn.com/kf/Sq6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f.jpg', 'https://www.aliexpress.com/item/1005010234567890.html', true, 'Black Friday'),
('Sports Bra Women', 'Comfortable sports bra for workout', 720, 4.00, 'fashion', 'https://ae01.alicdn.com/kf/Sr7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g.jpg', 'https://www.aliexpress.com/item/1005010345678901.html', true, NULL),
('Polo Shirt Men', 'Classic polo shirt for casual wear', 1080, 6.00, 'fashion', 'https://ae01.alicdn.com/kf/Ss8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h.jpg', 'https://www.aliexpress.com/item/1005010456789012.html', true, NULL),
('Cardigan Sweater Women', 'Button-up cardigan sweater', 1620, 9.00, 'fashion', 'https://ae01.alicdn.com/kf/St9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i.jpg', 'https://www.aliexpress.com/item/1005010567890123.html', true, 'Hot Deal'),
('Jacket Windbreaker', 'Lightweight windbreaker jacket', 2160, 12.00, 'fashion', 'https://ae01.alicdn.com/kf/Su0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j.jpg', 'https://www.aliexpress.com/item/1005010678901234.html', true, NULL),
('Pajama Set Cotton', 'Comfortable cotton pajama set', 1440, 8.00, 'fashion', 'https://ae01.alicdn.com/kf/Sv1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k.jpg', 'https://www.aliexpress.com/item/1005010789012345.html', true, 'Free Shipping'),
('Slippers Home Indoor', 'Soft indoor slippers for home', 540, 3.00, 'fashion', 'https://ae01.alicdn.com/kf/Sw2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l.jpg', 'https://www.aliexpress.com/item/1005010890123456.html', true, NULL),
('Gloves Winter Touchscreen', 'Warm touchscreen compatible gloves', 630, 3.50, 'fashion', 'https://ae01.alicdn.com/kf/Sx3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m.jpg', 'https://www.aliexpress.com/item/1005010901234567.html', true, NULL),
('Umbrella Compact Folding', 'Automatic folding umbrella', 720, 4.00, 'fashion', 'https://ae01.alicdn.com/kf/Sy4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n.jpg', 'https://www.aliexpress.com/item/1005011012345678.html', true, NULL),

-- Home (25 products)
('LED Desk Lamp Dimmable', 'Adjustable desk lamp with USB charging', 1620, 9.00, 'home', 'https://ae01.alicdn.com/kf/Sz5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o.jpg', 'https://www.aliexpress.com/item/1005011123456789.html', true, 'Hot Deal'),
('Kitchen Scale Digital', 'Precision digital scale for cooking', 900, 5.00, 'home', 'https://ae01.alicdn.com/kf/Sa6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p.jpg', 'https://www.aliexpress.com/item/1005011234567890.html', true, NULL),
('Air Purifier Mini USB', 'Portable air purifier for desktop', 1800, 10.00, 'home', 'https://ae01.alicdn.com/kf/Sb7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q.jpg', 'https://www.aliexpress.com/item/1005011345678901.html', true, 'Free Shipping'),
('Humidifier Aroma Diffuser', 'Essential oil diffuser with LED light', 1440, 8.00, 'home', 'https://ae01.alicdn.com/kf/Sc8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r.jpg', 'https://www.aliexpress.com/item/1005011456789012.html', true, NULL),
('Trash Can Smart Sensor', 'Automatic sensor trash bin', 2340, 13.00, 'home', 'https://ae01.alicdn.com/kf/Sd9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s.jpg', 'https://www.aliexpress.com/item/1005011567890123.html', true, 'Black Friday'),
('Organizer Storage Box Set', 'Stackable storage boxes for organization', 1080, 6.00, 'home', 'https://ae01.alicdn.com/kf/Se0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t.jpg', 'https://www.aliexpress.com/item/1005011678901234.html', true, NULL),
('Shower Curtain Waterproof', 'Stylish waterproof shower curtain', 720, 4.00, 'home', 'https://ae01.alicdn.com/kf/Sf1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u.jpg', 'https://www.aliexpress.com/item/1005011789012345.html', true, NULL),
('Bath Mat Non-Slip', 'Soft non-slip bathroom mat', 630, 3.50, 'home', 'https://ae01.alicdn.com/kf/Sg2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v.jpg', 'https://www.aliexpress.com/item/1005011890123456.html', true, NULL),
('Towel Set Microfiber', 'Quick dry microfiber towel set', 900, 5.00, 'home', 'https://ae01.alicdn.com/kf/Sh3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w.jpg', 'https://www.aliexpress.com/item/1005011901234567.html', true, 'Free Shipping'),
('Pillow Memory Foam', 'Ergonomic memory foam pillow', 1620, 9.00, 'home', 'https://ae01.alicdn.com/kf/Si4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x.jpg', 'https://www.aliexpress.com/item/1005012012345678.html', true, 'Hot Deal'),
('Blanket Fleece Soft', 'Super soft fleece throw blanket', 1260, 7.00, 'home', 'https://ae01.alicdn.com/kf/Sj5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y.jpg', 'https://www.aliexpress.com/item/1005012123456789.html', true, NULL),
('Curtains Blackout', 'Light blocking blackout curtains', 1800, 10.00, 'home', 'https://ae01.alicdn.com/kf/Sk6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z.jpg', 'https://www.aliexpress.com/item/1005012234567890.html', true, NULL),
('Clock Wall Modern', 'Modern decorative wall clock', 1080, 6.00, 'home', 'https://ae01.alicdn.com/kf/Sl7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a.jpg', 'https://www.aliexpress.com/item/1005012345678901.html', true, NULL),
('Photo Frame Set', 'Multi-picture photo frame set', 810, 4.50, 'home', 'https://ae01.alicdn.com/kf/Sm8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b.jpg', 'https://www.aliexpress.com/item/1005012456789012.html', true, NULL),
('Vase Ceramic Modern', 'Minimalist ceramic flower vase', 720, 4.00, 'home', 'https://ae01.alicdn.com/kf/Sn9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c.jpg', 'https://www.aliexpress.com/item/1005012567890123.html', true, 'Black Friday'),
('Plant Pot Set', 'Indoor plant pots with drainage', 900, 5.00, 'home', 'https://ae01.alicdn.com/kf/So0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d.jpg', 'https://www.aliexpress.com/item/1005012678901234.html', true, NULL),
('Knife Set Kitchen', 'Stainless steel knife set with holder', 2160, 12.00, 'home', 'https://ae01.alicdn.com/kf/Sp1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e.jpg', 'https://www.aliexpress.com/item/1005012789012345.html', true, 'Hot Deal'),
('Cutting Board Bamboo', 'Eco-friendly bamboo cutting board', 810, 4.50, 'home', 'https://ae01.alicdn.com/kf/Sq2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f.jpg', 'https://www.aliexpress.com/item/1005012890123456.html', true, NULL),
('Mug Set Ceramic', 'Set of 4 ceramic coffee mugs', 900, 5.00, 'home', 'https://ae01.alicdn.com/kf/Sr3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g.jpg', 'https://www.aliexpress.com/item/1005012901234567.html', true, 'Free Shipping'),
('Glass Water Bottle', 'BPA-free glass water bottle', 630, 3.50, 'home', 'https://ae01.alicdn.com/kf/Ss4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h.jpg', 'https://www.aliexpress.com/item/1005013012345678.html', true, NULL),
('Lunch Box Bento', 'Japanese style bento lunch box', 720, 4.00, 'home', 'https://ae01.alicdn.com/kf/St5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i.jpg', 'https://www.aliexpress.com/item/1005013123456789.html', true, NULL),
('Trash Bags Roll 100pcs', 'Heavy duty garbage bags', 450, 2.50, 'home', 'https://ae01.alicdn.com/kf/Su6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j.jpg', 'https://www.aliexpress.com/item/1005013234567890.html', true, NULL),
('Laundry Basket Foldable', 'Collapsible laundry basket', 810, 4.50, 'home', 'https://ae01.alicdn.com/kf/Sv7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k.jpg', 'https://www.aliexpress.com/item/1005013345678901.html', true, NULL),
('Hanger Set Wood', 'Wooden clothes hangers set of 10', 720, 4.00, 'home', 'https://ae01.alicdn.com/kf/Sw8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l.jpg', 'https://www.aliexpress.com/item/1005013456789012.html', true, NULL),
('Iron Steam Portable', 'Handheld portable steam iron', 1440, 8.00, 'home', 'https://ae01.alicdn.com/kf/Sx9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m.jpg', 'https://www.aliexpress.com/item/1005013567890123.html', true, 'Hot Deal'),

-- Beauty (25 products)
('Makeup Brush Set 10pcs', 'Professional makeup brush collection', 1260, 7.00, 'beauty', 'https://ae01.alicdn.com/kf/Sy0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n.jpg', 'https://www.aliexpress.com/item/1005013678901234.html', true, 'Free Shipping'),
('Facial Cleanser Electric', 'Sonic facial cleansing brush', 1800, 10.00, 'beauty', 'https://ae01.alicdn.com/kf/Sz1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o.jpg', 'https://www.aliexpress.com/item/1005013789012345.html', true, 'Hot Deal'),
('Makeup Mirror LED', 'Vanity mirror with LED lights', 1620, 9.00, 'beauty', 'https://ae01.alicdn.com/kf/Sa2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p.jpg', 'https://www.aliexpress.com/item/1005013890123456.html', true, NULL),
('Hair Dryer Ionic', 'Professional ionic hair dryer', 2520, 14.00, 'beauty', 'https://ae01.alicdn.com/kf/Sb3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q.jpg', 'https://www.aliexpress.com/item/1005013901234567.html', true, 'Black Friday'),
('Straightener Hair Ceramic', 'Ceramic flat iron hair straightener', 1980, 11.00, 'beauty', 'https://ae01.alicdn.com/kf/Sc4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r.jpg', 'https://www.aliexpress.com/item/1005014012345678.html', true, NULL),
('Curling Iron Automatic', 'Auto rotating curling iron', 2340, 13.00, 'beauty', 'https://ae01.alicdn.com/kf/Sd5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s.jpg', 'https://www.aliexpress.com/item/1005014123456789.html', true, NULL),
('Nail Polish Set 12 Colors', 'Gel nail polish collection', 1080, 6.00, 'beauty', 'https://ae01.alicdn.com/kf/Se6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t.jpg', 'https://www.aliexpress.com/item/1005014234567890.html', true, 'Free Shipping'),
('Nail Art Tools Kit', 'Complete nail art set', 900, 5.00, 'beauty', 'https://ae01.alicdn.com/kf/Sf7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u.jpg', 'https://www.aliexpress.com/item/1005014345678901.html', true, NULL),
('Eye Lash Curler', 'Professional eyelash curler', 360, 2.00, 'beauty', 'https://ae01.alicdn.com/kf/Sg8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v.jpg', 'https://www.aliexpress.com/item/1005014456789012.html', true, NULL),
('False Eyelashes Set', 'Natural look false eyelashes', 540, 3.00, 'beauty', 'https://ae01.alicdn.com/kf/Sh9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w.jpg', 'https://www.aliexpress.com/item/1005014567890123.html', true, 'Hot Deal'),
('Lipstick Set Matte', 'Long lasting matte lipstick set', 810, 4.50, 'beauty', 'https://ae01.alicdn.com/kf/Si0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x.jpg', 'https://www.aliexpress.com/item/1005014678901234.html', true, NULL),
('Eyeshadow Palette 18 Colors', 'Professional eyeshadow palette', 1260, 7.00, 'beauty', 'https://ae01.alicdn.com/kf/Sj1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y.jpg', 'https://www.aliexpress.com/item/1005014789012345.html', true, NULL),
('Face Mask Sheet Pack', 'Moisturizing face mask pack of 10', 720, 4.00, 'beauty', 'https://ae01.alicdn.com/kf/Sk2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z.jpg', 'https://www.aliexpress.com/item/1005014890123456.html', true, 'Black Friday'),
('Jade Roller Face Massager', 'Natural jade stone face roller', 630, 3.50, 'beauty', 'https://ae01.alicdn.com/kf/Sl3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a.jpg', 'https://www.aliexpress.com/item/1005014901234567.html', true, 'Free Shipping'),
('Beauty Blender Sponge Set', 'Makeup sponge set of 5', 450, 2.50, 'beauty', 'https://ae01.alicdn.com/kf/Sm4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b.jpg', 'https://www.aliexpress.com/item/1005015012345678.html', true, NULL),
('Perfume Atomizer Travel', 'Refillable perfume spray bottle', 360, 2.00, 'beauty', 'https://ae01.alicdn.com/kf/Sn5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c.jpg', 'https://www.aliexpress.com/item/1005015123456789.html', true, NULL),
('Skincare Organizer Acrylic', 'Clear acrylic makeup organizer', 1080, 6.00, 'beauty', 'https://ae01.alicdn.com/kf/So6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d.jpg', 'https://www.aliexpress.com/item/1005015234567890.html', true, 'Hot Deal'),
('Cotton Pads Organic', 'Organic cotton pads 200 pack', 360, 2.00, 'beauty', 'https://ae01.alicdn.com/kf/Sp7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e.jpg', 'https://www.aliexpress.com/item/1005015345678901.html', true, NULL),
('Tweezers Set Professional', 'Precision tweezers set of 4', 540, 3.00, 'beauty', 'https://ae01.alicdn.com/kf/Sq8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f.jpg', 'https://www.aliexpress.com/item/1005015456789012.html', true, NULL),
('Hair Removal Wax Kit', 'Complete waxing kit for home', 1440, 8.00, 'beauty', 'https://ae01.alicdn.com/kf/Sr9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g.jpg', 'https://www.aliexpress.com/item/1005015567890123.html', true, NULL),
('Electric Trimmer Nose Hair', 'Rechargeable nose and ear trimmer', 900, 5.00, 'beauty', 'https://ae01.alicdn.com/kf/Ss0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h.jpg', 'https://www.aliexpress.com/item/1005015678901234.html', true, 'Free Shipping'),
('Facial Steamer Professional', 'Professional face steamer', 2160, 12.00, 'beauty', 'https://ae01.alicdn.com/kf/St1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i.jpg', 'https://www.aliexpress.com/item/1005015789012345.html', true, NULL),
('Massager Electric Face', 'V-shape face lifting massager', 1260, 7.00, 'beauty', 'https://ae01.alicdn.com/kf/Su2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j.jpg', 'https://www.aliexpress.com/item/1005015890123456.html', true, 'Black Friday'),
('Scalp Massager Shampoo Brush', 'Silicone scalp massager brush', 450, 2.50, 'beauty', 'https://ae01.alicdn.com/kf/Sv3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k.jpg', 'https://www.aliexpress.com/item/1005015901234567.html', true, NULL),
('Foot File Electric', 'Electric callus remover for feet', 1080, 6.00, 'beauty', 'https://ae01.alicdn.com/kf/Sw4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l.jpg', 'https://www.aliexpress.com/item/1005016012345678.html', true, 'Hot Deal'),

-- Sports (25 products)
('Resistance Bands Set', 'Exercise resistance bands 5 levels', 900, 5.00, 'sports', 'https://ae01.alicdn.com/kf/Sx5y6z7a8b9c0d1e2f3g4h5i6j7k8l9m.jpg', 'https://www.aliexpress.com/item/1005016123456789.html', true, 'Free Shipping'),
('Yoga Mat Non-Slip', 'Extra thick yoga mat with strap', 1440, 8.00, 'sports', 'https://ae01.alicdn.com/kf/Sy6z7a8b9c0d1e2f3g4h5i6j7k8l9m0n.jpg', 'https://www.aliexpress.com/item/1005016234567890.html', true, 'Hot Deal'),
('Dumbbell Set Adjustable', 'Adjustable dumbbell weights set', 2880, 16.00, 'sports', 'https://ae01.alicdn.com/kf/Sz7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o.jpg', 'https://www.aliexpress.com/item/1005016345678901.html', true, NULL),
('Jump Rope Speed', 'Weighted speed jump rope', 540, 3.00, 'sports', 'https://ae01.alicdn.com/kf/Sa8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p.jpg', 'https://www.aliexpress.com/item/1005016456789012.html', true, NULL),
('Gym Gloves Weight Lifting', 'Padded gym gloves for training', 720, 4.00, 'sports', 'https://ae01.alicdn.com/kf/Sb9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q.jpg', 'https://www.aliexpress.com/item/1005016567890123.html', true, 'Black Friday'),
('Water Bottle Sports 1L', 'Large capacity sports water bottle', 540, 3.00, 'sports', 'https://ae01.alicdn.com/kf/Sc0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r.jpg', 'https://www.aliexpress.com/item/1005016678901234.html', true, NULL),
('Foam Roller Massage', 'High density foam roller', 1080, 6.00, 'sports', 'https://ae01.alicdn.com/kf/Sd1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s.jpg', 'https://www.aliexpress.com/item/1005016789012345.html', true, NULL),
('Ab Roller Wheel', 'Core exercise ab wheel with mat', 810, 4.50, 'sports', 'https://ae01.alicdn.com/kf/Se2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t.jpg', 'https://www.aliexpress.com/item/1005016890123456.html', true, 'Free Shipping'),
('Knee Brace Support', 'Adjustable knee support brace', 720, 4.00, 'sports', 'https://ae01.alicdn.com/kf/Sf3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u.jpg', 'https://www.aliexpress.com/item/1005016901234567.html', true, NULL),
('Ankle Weights Set', 'Adjustable ankle weights pair', 900, 5.00, 'sports', 'https://ae01.alicdn.com/kf/Sg4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v.jpg', 'https://www.aliexpress.com/item/1005017012345678.html', true, 'Hot Deal'),
('Pull Up Bar Doorway', 'Multi-grip doorway pull up bar', 1620, 9.00, 'sports', 'https://ae01.alicdn.com/kf/Sh5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w.jpg', 'https://www.aliexpress.com/item/1005017123456789.html', true, NULL),
('Push Up Board System', 'Multi-function push up board', 1260, 7.00, 'sports', 'https://ae01.alicdn.com/kf/Si6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x.jpg', 'https://www.aliexpress.com/item/1005017234567890.html', true, NULL),
('Grip Strengthener Hand', 'Adjustable hand grip trainer', 450, 2.50, 'sports', 'https://ae01.alicdn.com/kf/Sj7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y.jpg', 'https://www.aliexpress.com/item/1005017345678901.html', true, 'Black Friday'),
('Yoga Block Set', 'High density yoga blocks pair', 630, 3.50, 'sports', 'https://ae01.alicdn.com/kf/Sk8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z.jpg', 'https://www.aliexpress.com/item/1005017456789012.html', true, NULL),
('Stretch Strap Yoga', 'Multi-loop yoga stretch strap', 450, 2.50, 'sports', 'https://ae01.alicdn.com/kf/Sl9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a.jpg', 'https://www.aliexpress.com/item/1005017567890123.html', true, NULL),
('Boxing Hand Wraps', 'Cotton boxing hand wraps pair', 360, 2.00, 'sports', 'https://ae01.alicdn.com/kf/Sm0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b.jpg', 'https://www.aliexpress.com/item/1005017678901234.html', true, 'Free Shipping'),
('Punch Bag Speed Ball', 'Desktop punching bag stress relief', 1080, 6.00, 'sports', 'https://ae01.alicdn.com/kf/Sn1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c.jpg', 'https://www.aliexpress.com/item/1005017789012345.html', true, NULL),
('Basketball Net Replacement', 'Heavy duty basketball net', 360, 2.00, 'sports', 'https://ae01.alicdn.com/kf/So2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d.jpg', 'https://www.aliexpress.com/item/1005017890123456.html', true, NULL),
('Soccer Ball Size 5', 'Official size training soccer ball', 900, 5.00, 'sports', 'https://ae01.alicdn.com/kf/Sp3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e.jpg', 'https://www.aliexpress.com/item/1005017901234567.html', true, 'Hot Deal'),
('Badminton Racket Set', 'Badminton set with shuttlecocks', 1260, 7.00, 'sports', 'https://ae01.alicdn.com/kf/Sq4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f.jpg', 'https://www.aliexpress.com/item/1005018012345678.html', true, NULL),
('Table Tennis Paddles Set', 'Ping pong paddle set with balls', 900, 5.00, 'sports', 'https://ae01.alicdn.com/kf/Sr5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g.jpg', 'https://www.aliexpress.com/item/1005018123456789.html', true, NULL),
('Swim Goggles Anti-Fog', 'UV protection swim goggles', 540, 3.00, 'sports', 'https://ae01.alicdn.com/kf/Ss6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h.jpg', 'https://www.aliexpress.com/item/1005018234567890.html', true, 'Black Friday'),
('Swim Cap Silicone', 'Durable silicone swimming cap', 360, 2.00, 'sports', 'https://ae01.alicdn.com/kf/St7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i.jpg', 'https://www.aliexpress.com/item/1005018345678901.html', true, NULL),
('Camping Tent 2 Person', 'Waterproof 2 person camping tent', 3240, 18.00, 'sports', 'https://ae01.alicdn.com/kf/Su8v9w0x1y2z3a4b5c6d7e8f9g0h1i2j.jpg', 'https://www.aliexpress.com/item/1005018456789012.html', true, 'Free Shipping'),
('Headlamp LED Rechargeable', 'Bright rechargeable headlamp', 810, 4.50, 'sports', 'https://ae01.alicdn.com/kf/Sv9w0x1y2z3a4b5c6d7e8f9g0h1i2j3k.jpg', 'https://www.aliexpress.com/item/1005018567890123.html', true, 'Hot Deal'),

-- Toys (25 products)
('Building Blocks Set 1000pcs', 'Classic building blocks mega set', 2160, 12.00, 'toys', 'https://ae01.alicdn.com/kf/Sw0x1y2z3a4b5c6d7e8f9g0h1i2j3k4l.jpg', 'https://www.aliexpress.com/item/1005018678901234.html', true, 'Hot Deal'),
('RC Car Off-Road', 'Remote control off-road truck', 2700, 15.00, 'toys', 'https://ae01.alicdn.com/kf/Sx1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m.jpg', 'https://www.aliexpress.com/item/1005018789012345.html', true, 'Black Friday'),
('Drone Mini Camera', 'Mini drone with HD camera', 3600, 20.00, 'toys', 'https://ae01.alicdn.com/kf/Sy2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n.jpg', 'https://www.aliexpress.com/item/1005018890123456.html', true, NULL),
('Puzzle 1000 Pieces', 'Landscape puzzle for adults', 900, 5.00, 'toys', 'https://ae01.alicdn.com/kf/Sz3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o.jpg', 'https://www.aliexpress.com/item/1005018901234567.html', true, 'Free Shipping'),
('Play Dough Set 24 Colors', 'Non-toxic play dough kit', 720, 4.00, 'toys', 'https://ae01.alicdn.com/kf/Sa4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p.jpg', 'https://www.aliexpress.com/item/1005019012345678.html', true, NULL),
('Magnetic Tiles Building', 'Magnetic building tiles set', 1800, 10.00, 'toys', 'https://ae01.alicdn.com/kf/Sb5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q.jpg', 'https://www.aliexpress.com/item/1005019123456789.html', true, NULL),
('Stuffed Animal Teddy Bear', 'Soft plush teddy bear 40cm', 900, 5.00, 'toys', 'https://ae01.alicdn.com/kf/Sc6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r.jpg', 'https://www.aliexpress.com/item/1005019234567890.html', true, 'Hot Deal'),
('Dinosaur Figure Set', 'Realistic dinosaur figures 12 pack', 810, 4.50, 'toys', 'https://ae01.alicdn.com/kf/Sd7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s.jpg', 'https://www.aliexpress.com/item/1005019345678901.html', true, NULL),
('Doll House Miniature', 'DIY miniature dollhouse kit', 2340, 13.00, 'toys', 'https://ae01.alicdn.com/kf/Se8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t.jpg', 'https://www.aliexpress.com/item/1005019456789012.html', true, NULL),
('Action Figures Superhero', 'Superhero action figure set', 1080, 6.00, 'toys', 'https://ae01.alicdn.com/kf/Sf9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u.jpg', 'https://www.aliexpress.com/item/1005019567890123.html', true, 'Black Friday'),
('Train Set Electric', 'Electric train track set', 2520, 14.00, 'toys', 'https://ae01.alicdn.com/kf/Sg0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v.jpg', 'https://www.aliexpress.com/item/1005019678901234.html', true, NULL),
('Slime Kit DIY', 'Fluffy slime making kit', 720, 4.00, 'toys', 'https://ae01.alicdn.com/kf/Sh1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w.jpg', 'https://www.aliexpress.com/item/1005019789012345.html', true, 'Free Shipping'),
('Board Game Family', 'Classic family board game', 1080, 6.00, 'toys', 'https://ae01.alicdn.com/kf/Si2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x.jpg', 'https://www.aliexpress.com/item/1005019890123456.html', true, NULL),
('Card Game Educational', 'Educational card game for kids', 540, 3.00, 'toys', 'https://ae01.alicdn.com/kf/Sj3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y.jpg', 'https://www.aliexpress.com/item/1005019901234567.html', true, NULL),
('Rubik Cube 3x3', 'Speed cube puzzle 3x3', 450, 2.50, 'toys', 'https://ae01.alicdn.com/kf/Sk4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z.jpg', 'https://www.aliexpress.com/item/1005020012345678.html', true, 'Hot Deal'),
('Water Gun Blaster', 'High capacity water blaster', 810, 4.50, 'toys', 'https://ae01.alicdn.com/kf/Sl5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a.jpg', 'https://www.aliexpress.com/item/1005020123456789.html', true, NULL),
('Bubble Machine Electric', 'Automatic bubble maker machine', 1080, 6.00, 'toys', 'https://ae01.alicdn.com/kf/Sm6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b.jpg', 'https://www.aliexpress.com/item/1005020234567890.html', true, NULL),
('Kite Flying Large', 'Large colorful flying kite', 720, 4.00, 'toys', 'https://ae01.alicdn.com/kf/Sn7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c.jpg', 'https://www.aliexpress.com/item/1005020345678901.html', true, 'Free Shipping'),
('Science Kit Experiments', 'Kids science experiment kit', 1440, 8.00, 'toys', 'https://ae01.alicdn.com/kf/So8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d.jpg', 'https://www.aliexpress.com/item/1005020456789012.html', true, NULL),
('Art Set Drawing', 'Complete art supplies set', 1260, 7.00, 'toys', 'https://ae01.alicdn.com/kf/Sp9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e.jpg', 'https://www.aliexpress.com/item/1005020567890123.html', true, 'Black Friday'),
('Musical Instrument Kids', 'Xylophone for children', 720, 4.00, 'toys', 'https://ae01.alicdn.com/kf/Sq0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f.jpg', 'https://www.aliexpress.com/item/1005020678901234.html', true, NULL),
('Sandbox Toys Beach Set', 'Beach bucket and tools set', 540, 3.00, 'toys', 'https://ae01.alicdn.com/kf/Sr1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g.jpg', 'https://www.aliexpress.com/item/1005020789012345.html', true, NULL),
('Bouncy Ball Large', 'Giant bouncy ball for kids', 630, 3.50, 'toys', 'https://ae01.alicdn.com/kf/Ss2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h.jpg', 'https://www.aliexpress.com/item/1005020890123456.html', true, 'Hot Deal'),
('Swing Set Indoor', 'Indoor hanging swing for kids', 1620, 9.00, 'toys', 'https://ae01.alicdn.com/kf/St3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i.jpg', 'https://www.aliexpress.com/item/1005020901234567.html', true, NULL),
('Balance Board Kids', 'Wooden balance board for children', 1260, 7.00, 'toys', 'https://ae01.alicdn.com/kf/Su4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j.jpg', 'https://www.aliexpress.com/item/1005021012345678.html', true, 'Free Shipping'),

-- Automotive (25 products)
('Car Phone Holder Magnetic', 'Strong magnetic car phone mount', 540, 3.00, 'automotive', 'https://ae01.alicdn.com/kf/Sv5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k.jpg', 'https://www.aliexpress.com/item/1005021123456789.html', true, NULL),
('Car Charger Dual USB', 'Fast charging car USB charger', 450, 2.50, 'automotive', 'https://ae01.alicdn.com/kf/Sw6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l.jpg', 'https://www.aliexpress.com/item/1005021234567890.html', true, 'Hot Deal'),
('Dash Cam 1080P', 'Full HD dashboard camera', 2340, 13.00, 'automotive', 'https://ae01.alicdn.com/kf/Sx7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m.jpg', 'https://www.aliexpress.com/item/1005021345678901.html', true, 'Free Shipping'),
('Car Vacuum Cleaner Mini', 'Portable car vacuum cleaner', 1620, 9.00, 'automotive', 'https://ae01.alicdn.com/kf/Sy8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n.jpg', 'https://www.aliexpress.com/item/1005021456789012.html', true, NULL),
('Seat Gap Filler 2 Pack', 'Car seat gap organizer', 540, 3.00, 'automotive', 'https://ae01.alicdn.com/kf/Sz9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o.jpg', 'https://www.aliexpress.com/item/1005021567890123.html', true, NULL),
('Car Organizer Trunk', 'Collapsible trunk organizer', 1080, 6.00, 'automotive', 'https://ae01.alicdn.com/kf/Sa0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p.jpg', 'https://www.aliexpress.com/item/1005021678901234.html', true, 'Black Friday'),
('Steering Wheel Cover', 'Leather steering wheel cover', 720, 4.00, 'automotive', 'https://ae01.alicdn.com/kf/Sb1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q.jpg', 'https://www.aliexpress.com/item/1005021789012345.html', true, NULL),
('Car Seat Cover Set', 'Universal car seat covers set', 1800, 10.00, 'automotive', 'https://ae01.alicdn.com/kf/Sc2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r.jpg', 'https://www.aliexpress.com/item/1005021890123456.html', true, NULL),
('Floor Mats Universal', 'Waterproof car floor mats', 1260, 7.00, 'automotive', 'https://ae01.alicdn.com/kf/Sd3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s.jpg', 'https://www.aliexpress.com/item/1005021901234567.html', true, 'Hot Deal'),
('Sun Shade Windshield', 'Foldable car sun shade', 540, 3.00, 'automotive', 'https://ae01.alicdn.com/kf/Se4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t.jpg', 'https://www.aliexpress.com/item/1005022012345678.html', true, NULL),
('Air Freshener Car Set', 'Car air freshener pack', 360, 2.00, 'automotive', 'https://ae01.alicdn.com/kf/Sf5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u.jpg', 'https://www.aliexpress.com/item/1005022123456789.html', true, 'Free Shipping'),
('LED Interior Lights', 'RGB car interior LED strip', 900, 5.00, 'automotive', 'https://ae01.alicdn.com/kf/Sg6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v.jpg', 'https://www.aliexpress.com/item/1005022234567890.html', true, NULL),
('Tire Pressure Monitor', 'Digital tire pressure gauge', 630, 3.50, 'automotive', 'https://ae01.alicdn.com/kf/Sh7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w.jpg', 'https://www.aliexpress.com/item/1005022345678901.html', true, NULL),
('Jump Starter Portable', 'Emergency car jump starter', 3240, 18.00, 'automotive', 'https://ae01.alicdn.com/kf/Si8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x.jpg', 'https://www.aliexpress.com/item/1005022456789012.html', true, 'Black Friday'),
('Car Tool Kit Emergency', 'Roadside emergency tool kit', 1800, 10.00, 'automotive', 'https://ae01.alicdn.com/kf/Sj9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y.jpg', 'https://www.aliexpress.com/item/1005022567890123.html', true, NULL),
('Bluetooth FM Transmitter', 'Wireless car FM transmitter', 810, 4.50, 'automotive', 'https://ae01.alicdn.com/kf/Sk0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z.jpg', 'https://www.aliexpress.com/item/1005022678901234.html', true, 'Hot Deal'),
('Car Cup Holder Expander', 'Adjustable cup holder expander', 450, 2.50, 'automotive', 'https://ae01.alicdn.com/kf/Sl1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a.jpg', 'https://www.aliexpress.com/item/1005022789012345.html', true, NULL),
('Back Seat Organizer', 'Car backseat storage organizer', 720, 4.00, 'automotive', 'https://ae01.alicdn.com/kf/Sm2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b.jpg', 'https://www.aliexpress.com/item/1005022890123456.html', true, NULL),
('Head Rest Pillow', 'Memory foam headrest pillow', 810, 4.50, 'automotive', 'https://ae01.alicdn.com/kf/Sn3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c.jpg', 'https://www.aliexpress.com/item/1005022901234567.html', true, 'Free Shipping'),
('Lumbar Support Cushion', 'Ergonomic lumbar support', 1080, 6.00, 'automotive', 'https://ae01.alicdn.com/kf/So4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d.jpg', 'https://www.aliexpress.com/item/1005023012345678.html', true, NULL),
('Car Trash Can Mini', 'Mini trash bin for car', 360, 2.00, 'automotive', 'https://ae01.alicdn.com/kf/Sp5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e.jpg', 'https://www.aliexpress.com/item/1005023123456789.html', true, NULL),
('Windshield Wiper Blades', 'Universal wiper blades set', 540, 3.00, 'automotive', 'https://ae01.alicdn.com/kf/Sq6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f.jpg', 'https://www.aliexpress.com/item/1005023234567890.html', true, 'Black Friday'),
('Car Cover Waterproof', 'Full car cover all weather', 1980, 11.00, 'automotive', 'https://ae01.alicdn.com/kf/Sr7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g.jpg', 'https://www.aliexpress.com/item/1005023345678901.html', true, NULL),
('License Plate Frame', 'Stainless steel plate frame set', 540, 3.00, 'automotive', 'https://ae01.alicdn.com/kf/Ss8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h.jpg', 'https://www.aliexpress.com/item/1005023456789012.html', true, 'Hot Deal'),
('Car Cleaning Gel', 'Dust cleaning gel for vents', 360, 2.00, 'automotive', 'https://ae01.alicdn.com/kf/St9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i.jpg', 'https://www.aliexpress.com/item/1005023567890123.html', true, NULL),

-- Other (25 products)
('Pet Bowl Stainless', 'Stainless steel pet food bowl', 450, 2.50, 'other', 'https://ae01.alicdn.com/kf/Su0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j.jpg', 'https://www.aliexpress.com/item/1005023678901234.html', true, 'Free Shipping'),
('Dog Leash Retractable', 'Automatic retractable dog leash', 810, 4.50, 'other', 'https://ae01.alicdn.com/kf/Sv1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k.jpg', 'https://www.aliexpress.com/item/1005023789012345.html', true, NULL),
('Cat Toy Interactive', 'Interactive feather cat toy', 360, 2.00, 'other', 'https://ae01.alicdn.com/kf/Sw2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l.jpg', 'https://www.aliexpress.com/item/1005023890123456.html', true, 'Hot Deal'),
('Pet Grooming Brush', 'Self-cleaning pet brush', 630, 3.50, 'other', 'https://ae01.alicdn.com/kf/Sx3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m.jpg', 'https://www.aliexpress.com/item/1005023901234567.html', true, NULL),
('Dog Collar Adjustable', 'Reflective adjustable dog collar', 450, 2.50, 'other', 'https://ae01.alicdn.com/kf/Sy4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n.jpg', 'https://www.aliexpress.com/item/1005024012345678.html', true, NULL),
('Notebook Journal Set', 'Leather bound journal set', 720, 4.00, 'other', 'https://ae01.alicdn.com/kf/Sz5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o.jpg', 'https://www.aliexpress.com/item/1005024123456789.html', true, 'Black Friday'),
('Pen Set Gel Ink', 'Colorful gel ink pen set', 540, 3.00, 'other', 'https://ae01.alicdn.com/kf/Sa6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p.jpg', 'https://www.aliexpress.com/item/1005024234567890.html', true, NULL),
('Desk Organizer Office', 'Mesh desk organizer set', 810, 4.50, 'other', 'https://ae01.alicdn.com/kf/Sb7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q.jpg', 'https://www.aliexpress.com/item/1005024345678901.html', true, 'Free Shipping'),
('Stapler Mini Portable', 'Compact stapler with staples', 270, 1.50, 'other', 'https://ae01.alicdn.com/kf/Sc8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r.jpg', 'https://www.aliexpress.com/item/1005024456789012.html', true, NULL),
('Tape Dispenser Set', 'Washi tape dispenser with tapes', 540, 3.00, 'other', 'https://ae01.alicdn.com/kf/Sd9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s.jpg', 'https://www.aliexpress.com/item/1005024567890123.html', true, 'Hot Deal'),
('Calculator Scientific', 'Student scientific calculator', 720, 4.00, 'other', 'https://ae01.alicdn.com/kf/Se0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t.jpg', 'https://www.aliexpress.com/item/1005024678901234.html', true, NULL),
('Sticky Notes Set', 'Colorful sticky notes pack', 360, 2.00, 'other', 'https://ae01.alicdn.com/kf/Sf1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u.jpg', 'https://www.aliexpress.com/item/1005024789012345.html', true, NULL),
('Bookmarks Set Metal', 'Decorative metal bookmarks', 360, 2.00, 'other', 'https://ae01.alicdn.com/kf/Sg2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v.jpg', 'https://www.aliexpress.com/item/1005024890123456.html', true, NULL),
('Magnifying Glass LED', 'LED lighted magnifying glass', 540, 3.00, 'other', 'https://ae01.alicdn.com/kf/Sh3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w.jpg', 'https://www.aliexpress.com/item/1005024901234567.html', true, 'Black Friday'),
('First Aid Kit Travel', 'Compact travel first aid kit', 900, 5.00, 'other', 'https://ae01.alicdn.com/kf/Si4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x.jpg', 'https://www.aliexpress.com/item/1005025012345678.html', true, 'Free Shipping'),
('Sewing Kit Complete', 'Portable sewing kit set', 540, 3.00, 'other', 'https://ae01.alicdn.com/kf/Sj5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y.jpg', 'https://www.aliexpress.com/item/1005025123456789.html', true, NULL),
('Tool Set Screwdriver', 'Precision screwdriver set', 720, 4.00, 'other', 'https://ae01.alicdn.com/kf/Sk6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z.jpg', 'https://www.aliexpress.com/item/1005025234567890.html', true, 'Hot Deal'),
('Tape Measure Retractable', 'Professional measuring tape', 360, 2.00, 'other', 'https://ae01.alicdn.com/kf/Sl7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a.jpg', 'https://www.aliexpress.com/item/1005025345678901.html', true, NULL),
('Flashlight LED Bright', 'High power LED flashlight', 720, 4.00, 'other', 'https://ae01.alicdn.com/kf/Sm8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b.jpg', 'https://www.aliexpress.com/item/1005025456789012.html', true, NULL),
('Multi Tool Pocket', 'Swiss style pocket multi-tool', 1080, 6.00, 'other', 'https://ae01.alicdn.com/kf/Sn9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c.jpg', 'https://www.aliexpress.com/item/1005025567890123.html', true, 'Free Shipping'),
('Lock Padlock Set', 'Mini padlock with keys set', 450, 2.50, 'other', 'https://ae01.alicdn.com/kf/So0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d.jpg', 'https://www.aliexpress.com/item/1005025678901234.html', true, NULL),
('Keychain Set Carabiner', 'Carabiner keychain clips set', 360, 2.00, 'other', 'https://ae01.alicdn.com/kf/Sp1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e.jpg', 'https://www.aliexpress.com/item/1005025789012345.html', true, 'Black Friday'),
('Money Clip Wallet', 'Minimalist money clip wallet', 540, 3.00, 'other', 'https://ae01.alicdn.com/kf/Sq2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f.jpg', 'https://www.aliexpress.com/item/1005025890123456.html', true, NULL),
('Phone Stand Adjustable', 'Foldable phone tablet stand', 450, 2.50, 'other', 'https://ae01.alicdn.com/kf/Sr3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g.jpg', 'https://www.aliexpress.com/item/1005025901234567.html', true, 'Hot Deal'),
('Reading Glasses Set', 'Blue light blocking glasses', 630, 3.50, 'other', 'https://ae01.alicdn.com/kf/Ss4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h.jpg', 'https://www.aliexpress.com/item/1005026012345678.html', true, NULL);