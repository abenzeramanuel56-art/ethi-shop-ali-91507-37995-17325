-- ============================================================
-- Proper receipt-style notifications on payment verification
-- Replaces plain "your order has been verified" messages with
-- a formatted receipt: company name, store name, date, payment
-- type, product name/type, and order/product ID.
-- These messages feed BOTH the in-app notification center AND
-- the Telegram bot (via the existing trg_notify_telegram_mirror
-- trigger on the notifications table), so fixing the message
-- text here fixes both places at once.
-- ============================================================

-- 1) PRODUCT ORDERS (public.orders)
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  v_store_name TEXT;
  v_products TEXT;
  v_order_date TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'payment_verified' THEN
        -- Store name (seller or reseller, whichever is set)
        SELECT store_name INTO v_store_name FROM public.seller_stores WHERE id = NEW.seller_id;
        IF v_store_name IS NULL THEN
          SELECT store_name INTO v_store_name FROM public.reseller_stores WHERE id = NEW.reseller_id;
        END IF;

        -- Comma-separated product names from order_items
        SELECT string_agg(product_name || ' x' || quantity, ', ')
          INTO v_products
          FROM public.order_items
          WHERE order_id = NEW.id;

        v_order_date := to_char(NEW.updated_at, 'Mon DD, YYYY HH12:MI AM');

        notification_title := '🧾 Payment Verified — Receipt';
        notification_message :=
          'AbeniExpress Receipt' || E'\n' ||
          'Order: #' || SUBSTRING(NEW.id::TEXT, 1, 8) || E'\n' ||
          'Date: ' || v_order_date || E'\n' ||
          'Store: ' || COALESCE(v_store_name, 'AbeniExpress Marketplace') || E'\n' ||
          'Product(s): ' || COALESCE(v_products, 'N/A') || E'\n' ||
          'Payment method: ' || COALESCE(UPPER(NEW.payment_method), 'N/A') || E'\n' ||
          'Amount: ' || NEW.total_etb || ' ETB' || E'\n' ||
          'Status: Payment Verified ✅' || E'\n' ||
          'Your order is now being processed.';
      WHEN 'ordered_on_aliexpress' THEN
        notification_title := 'Order Placed';
        notification_message := 'Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been placed with our supplier.';
      WHEN 'shipped' THEN
        notification_title := 'Order Shipped!';
        notification_message := 'Great news! Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been shipped.' ||
          CASE WHEN NEW.tracking_number IS NOT NULL THEN ' Tracking: ' || NEW.tracking_number ELSE '' END;
      WHEN 'delivered' THEN
        notification_title := 'Order Delivered';
        notification_message := 'Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been delivered. Thank you for your purchase!';
      ELSE
        notification_title := 'Order Update';
        notification_message := 'Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' status has been updated to: ' || NEW.status;
    END CASE;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.customer_id, notification_title, notification_message, 'order_update', '/account');
  END IF;

  RETURN NEW;
END;
$$;

-- 2) SERVICE ORDERS (public.service_orders)
CREATE OR REPLACE FUNCTION public.notify_service_order_payment_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_title TEXT;
  v_store_name TEXT;
  v_order_date TEXT;
BEGIN
  IF (NEW.status = 'payment_verified' OR NEW.status = 'in_progress')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.verification_code IS NOT NULL THEN

    SELECT s.title, ss.store_name
      INTO service_title, v_store_name
      FROM public.services s
      LEFT JOIN public.seller_stores ss ON ss.id = s.seller_id
      WHERE s.id = NEW.service_id;

    v_order_date := to_char(NEW.updated_at, 'Mon DD, YYYY HH12:MI AM');

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.customer_id,
      '🧾 Payment Verified — Receipt',
      'AbeniExpress Receipt' || E'\n' ||
      'Order: #' || SUBSTRING(NEW.id::TEXT, 1, 8) || E'\n' ||
      'Date: ' || v_order_date || E'\n' ||
      'Store: ' || COALESCE(v_store_name, 'AbeniExpress Marketplace') || E'\n' ||
      'Service: ' || COALESCE(service_title, 'Service') || E'\n' ||
      'Payment method: ' || COALESCE(UPPER(NEW.payment_method), 'N/A') || E'\n' ||
      'Amount: ' || NEW.total_etb || ' ETB' || E'\n' ||
      'Verification code: ' || NEW.verification_code || E'\n' ||
      'Share this code with the provider ONLY after the service is complete.',
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3) DIGITAL PRODUCT ORDERS (public.digital_product_orders)
CREATE OR REPLACE FUNCTION public.handle_digital_order_payment_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_platform_fee numeric;
  v_seller_earning numeric;
  v_product_title text;
  v_product_type text;
  v_store_name text;
  v_order_date text;
BEGIN
  IF NEW.status = 'payment_verified' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    NEW.download_code := v_code;
    NEW.status := 'completed';

    v_platform_fee := NEW.price_etb * 0.10;
    v_seller_earning := NEW.price_etb - v_platform_fee;

    INSERT INTO public.seller_wallets (user_id, current_balance_etb, total_earned_etb)
    VALUES (NEW.seller_id, v_seller_earning, v_seller_earning)
    ON CONFLICT (user_id) DO UPDATE SET
      current_balance_etb = seller_wallets.current_balance_etb + v_seller_earning,
      total_earned_etb = seller_wallets.total_earned_etb + v_seller_earning,
      updated_at = now();

    SELECT dp.title, dp.product_type, ss.store_name
      INTO v_product_title, v_product_type, v_store_name
      FROM public.digital_products dp
      LEFT JOIN public.seller_stores ss ON ss.id = dp.seller_id
      WHERE dp.id = NEW.digital_product_id;

    v_order_date := to_char(now(), 'Mon DD, YYYY HH12:MI AM');

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.buyer_id,
      '🧾 Payment Verified — Receipt',
      'AbeniExpress Receipt' || E'\n' ||
      'Order: #' || SUBSTRING(NEW.id::TEXT, 1, 8) || E'\n' ||
      'Date: ' || v_order_date || E'\n' ||
      'Store: ' || COALESCE(v_store_name, 'AbeniExpress Marketplace') || E'\n' ||
      'Product: ' || COALESCE(v_product_title, 'Digital Product') || E'\n' ||
      'Type: ' || COALESCE(INITCAP(v_product_type), 'N/A') || E'\n' ||
      'Product ID: ' || SUBSTRING(NEW.digital_product_id::TEXT, 1, 8) || E'\n' ||
      'Payment method: ' || COALESCE(UPPER(NEW.payment_method), 'N/A') || E'\n' ||
      'Amount: ' || NEW.price_etb || ' ETB' || E'\n' ||
      'Download code: ' || v_code || E'\n' ||
      'Use it on the order page to download your purchase.',
      'success'
    );

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.seller_id,
      'Digital Product Sold! 💰',
      'Someone bought "' || COALESCE(v_product_title,'your product') || '". You earned ' || v_seller_earning || ' ETB.',
      'success'
    );
  END IF;
  RETURN NEW;
END;
$$;
