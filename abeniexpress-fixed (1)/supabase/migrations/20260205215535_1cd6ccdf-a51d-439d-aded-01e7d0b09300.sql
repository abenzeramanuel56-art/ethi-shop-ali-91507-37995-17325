-- Add location fields to service_orders if not exists
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS customer_latitude numeric;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS customer_longitude numeric;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS seller_confirmed boolean DEFAULT false;

-- Add awaiting_customer_confirmation to order_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'awaiting_customer_confirmation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')) THEN
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'awaiting_customer_confirmation';
  END IF;
END $$;

-- Create function to notify customer when service payment is verified
CREATE OR REPLACE FUNCTION public.notify_service_order_payment_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_title TEXT;
BEGIN
  -- Only notify when status changes to payment_verified or in_progress
  IF (NEW.status = 'payment_verified' OR NEW.status = 'in_progress') 
     AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.verification_code IS NOT NULL THEN
    
    -- Get service title
    SELECT title INTO service_title FROM services WHERE id = NEW.service_id;
    
    -- Notify customer with verification code
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.customer_id,
      'Payment Verified! 🎉',
      'Your payment for "' || COALESCE(service_title, 'Service') || '" has been verified. Your verification code is: ' || NEW.verification_code || '. Share this code with the service provider ONLY after the service is complete to release their payment.',
      'success'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for service order payment verification notification
DROP TRIGGER IF EXISTS notify_service_payment_verified ON service_orders;
CREATE TRIGGER notify_service_payment_verified
  AFTER UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_service_order_payment_verified();

-- Create function to notify seller when a new service order is created
CREATE OR REPLACE FUNCTION public.notify_seller_new_service_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  service_title TEXT;
  seller_user_id UUID;
  customer_name TEXT;
BEGIN
  -- Get service title and seller user_id
  SELECT s.title, ss.user_id INTO service_title, seller_user_id
  FROM services s
  JOIN seller_stores ss ON ss.id = s.seller_id
  WHERE s.id = NEW.service_id;
  
  -- Get customer name
  SELECT full_name INTO customer_name FROM profiles WHERE id = NEW.customer_id;
  
  IF seller_user_id IS NOT NULL THEN
    -- Notify seller about new order
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      seller_user_id,
      'New Service Order! 📋',
      'You have a new order for "' || COALESCE(service_title, 'Service') || '" from ' || COALESCE(customer_name, 'a customer') || '. Please review and confirm the order.',
      'order'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new service order notification
DROP TRIGGER IF EXISTS notify_new_service_order ON service_orders;
CREATE TRIGGER notify_new_service_order
  AFTER INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_new_service_order();

-- Create function for seller to confirm service order
CREATE OR REPLACE FUNCTION public.seller_confirm_service_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_seller_store_id UUID;
  v_customer_name TEXT;
  v_service_title TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get order details
  SELECT * INTO v_order FROM service_orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Verify seller owns this order's store
  SELECT id INTO v_seller_store_id FROM seller_stores WHERE id = v_order.seller_id AND user_id = auth.uid();
  
  IF v_seller_store_id IS NULL THEN
    RAISE EXCEPTION 'not_seller';
  END IF;

  -- Update order to confirmed
  UPDATE service_orders 
  SET seller_confirmed = true, updated_at = now() 
  WHERE id = p_order_id;

  -- Get customer name and service title for notification
  SELECT full_name INTO v_customer_name FROM profiles WHERE id = v_order.customer_id;
  SELECT title INTO v_service_title FROM services WHERE id = v_order.service_id;

  -- Notify customer that seller confirmed
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_order.customer_id,
    'Order Confirmed! ✓',
    'The service provider has confirmed your order for "' || COALESCE(v_service_title, 'Service') || '". They will contact you shortly at ' || v_order.customer_phone || '.',
    'success'
  );
END;
$$;

-- Update pending driver orders trigger to calculate distance and earnings
CREATE OR REPLACE FUNCTION public.queue_verified_order_for_drivers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_seller_lat numeric;
  v_seller_lng numeric;
  v_seller_phone text;
  v_store_id uuid;
  v_distance_km numeric;
  v_driver_earning numeric;
  v_platform_fee numeric;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'payment_verified'
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    IF NOT EXISTS (SELECT 1 FROM public.pending_driver_orders p WHERE p.order_id = NEW.id)
       AND NOT EXISTS (SELECT 1 FROM public.driver_orders d WHERE d.order_id = NEW.id)
       AND COALESCE(NEW.driver_assigned, false) = false
    THEN
      v_store_id := COALESCE(NEW.seller_id, NEW.reseller_id);

      IF v_store_id IS NOT NULL THEN
        SELECT s.latitude, s.longitude, s.contact_phone
          INTO v_seller_lat, v_seller_lng, v_seller_phone
        FROM public.seller_stores s
        WHERE s.id = v_store_id
        LIMIT 1;
      END IF;

      -- Calculate distance using Haversine formula if both locations available
      IF v_seller_lat IS NOT NULL AND v_seller_lng IS NOT NULL 
         AND NEW.customer_latitude IS NOT NULL AND NEW.customer_longitude IS NOT NULL THEN
        v_distance_km := 6371 * acos(
          cos(radians(v_seller_lat)) * cos(radians(NEW.customer_latitude)) *
          cos(radians(NEW.customer_longitude) - radians(v_seller_lng)) +
          sin(radians(v_seller_lat)) * sin(radians(NEW.customer_latitude))
        );
        -- Minimum 1 km
        v_distance_km := GREATEST(v_distance_km, 1);
      ELSE
        -- Default distance if locations not available
        v_distance_km := 5;
      END IF;

      -- Calculate driver earning (25 ETB per km)
      v_driver_earning := v_distance_km * 25;

      INSERT INTO public.pending_driver_orders (
        order_id,
        seller_id,
        seller_latitude,
        seller_longitude,
        seller_phone,
        customer_latitude,
        customer_longitude,
        customer_phone,
        shipping_address,
        city,
        distance_km,
        estimated_earning_etb
      ) VALUES (
        NEW.id,
        v_store_id,
        v_seller_lat,
        v_seller_lng,
        v_seller_phone,
        NEW.customer_latitude,
        NEW.customer_longitude,
        NEW.phone,
        NEW.shipping_address,
        NEW.city,
        ROUND(v_distance_km, 2),
        ROUND(v_driver_earning, 2)
      );
      
      -- Update delivery fee on the order
      UPDATE public.orders SET delivery_fee_etb = ROUND(v_driver_earning, 2) WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix customer_confirm_delivery to handle all valid statuses
CREATE OR REPLACE FUNCTION public.customer_confirm_delivery(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_driver_order RECORD;
  v_platform_fee NUMERIC;
  v_seller_earning NUMERIC;
  v_seller_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND customer_id = auth.uid();

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Allow confirmation for shipped, awaiting_customer_confirmation, or picked_up status
  IF v_order.status NOT IN ('shipped', 'awaiting_customer_confirmation') THEN
    RAISE EXCEPTION 'invalid_order_status';
  END IF;

  UPDATE orders SET status = 'delivered', updated_at = now() WHERE id = p_order_id;

  SELECT * INTO v_driver_order FROM driver_orders WHERE order_id = p_order_id;

  IF v_driver_order IS NOT NULL THEN
    UPDATE driver_orders SET customer_confirmed_delivery = true, delivered_at = now(), status = 'delivered', updated_at = now() WHERE order_id = p_order_id;

    IF v_driver_order.driver_earning_etb IS NOT NULL AND v_driver_order.driver_earning_etb > 0 THEN
      INSERT INTO driver_wallets (user_id, current_balance_etb, total_earned_etb)
      VALUES (v_driver_order.driver_id, v_driver_order.driver_earning_etb, v_driver_order.driver_earning_etb)
      ON CONFLICT (user_id) DO UPDATE SET
        current_balance_etb = driver_wallets.current_balance_etb + v_driver_order.driver_earning_etb,
        total_earned_etb = driver_wallets.total_earned_etb + v_driver_order.driver_earning_etb,
        updated_at = now();

      INSERT INTO notifications (user_id, title, message, type)
      VALUES (v_driver_order.driver_id, 'Delivery Completed! 💰', 'You earned ' || v_driver_order.driver_earning_etb || ' ETB for completing delivery.', 'success');
    END IF;
  END IF;

  IF v_order.seller_id IS NOT NULL THEN
    SELECT user_id INTO v_seller_user_id FROM seller_stores WHERE id = v_order.seller_id;
    
    IF v_seller_user_id IS NOT NULL THEN
      -- Calculate 10% platform fee
      v_platform_fee := v_order.total_etb * 0.10;
      v_seller_earning := v_order.total_etb - v_platform_fee - COALESCE(v_order.delivery_fee_etb, 0);

      IF v_seller_earning > 0 THEN
        INSERT INTO seller_wallets (user_id, current_balance_etb, total_earned_etb)
        VALUES (v_seller_user_id, v_seller_earning, v_seller_earning)
        ON CONFLICT (user_id) DO UPDATE SET
          current_balance_etb = seller_wallets.current_balance_etb + v_seller_earning,
          total_earned_etb = seller_wallets.total_earned_etb + v_seller_earning,
          updated_at = now();

        INSERT INTO notifications (user_id, title, message, type)
        VALUES (v_seller_user_id, 'Order Completed! 💰', 'You earned ' || v_seller_earning || ' ETB (after 10% platform fee) for order #' || LEFT(p_order_id::TEXT, 8), 'success');
      END IF;
    END IF;
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_order.customer_id, 'Delivery Confirmed ✓', 'Your order has been marked as delivered. Thank you for shopping with us!', 'success');
END;
$$;