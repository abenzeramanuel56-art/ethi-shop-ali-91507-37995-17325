-- Drop existing function first
DROP FUNCTION IF EXISTS public.customer_confirm_delivery(UUID);

-- Recreate customer_confirm_delivery with correct signature
CREATE OR REPLACE FUNCTION public.customer_confirm_delivery(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_order.status NOT IN ('awaiting_customer_confirmation'::order_status, 'picked_up'::order_status) THEN
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
      VALUES (v_driver_order.driver_id, 'Delivery Completed!', 'You earned ' || v_driver_order.driver_earning_etb || ' ETB for completing delivery.', 'success');
    END IF;
  END IF;

  IF v_order.seller_id IS NOT NULL THEN
    SELECT user_id INTO v_seller_user_id FROM seller_stores WHERE id = v_order.seller_id;
    
    IF v_seller_user_id IS NOT NULL THEN
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
        VALUES (v_seller_user_id, 'Order Completed!', 'You earned ' || v_seller_earning || ' ETB for order #' || LEFT(p_order_id::TEXT, 8), 'success');
      END IF;
    END IF;
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_order.customer_id, 'Delivery Confirmed', 'Your order has been marked as delivered. Thank you for shopping with us!', 'success');
END;
$$;

-- Function for admin to approve seller application and assign role
CREATE OR REPLACE FUNCTION public.admin_approve_seller_application(p_application_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT user_id INTO v_user_id FROM seller_applications WHERE id = p_application_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  UPDATE seller_applications SET status = 'approved', admin_notes = p_admin_notes, reviewed_at = now() WHERE id = p_application_id;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'reseller'::app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_user_id, 'Application Approved!', 'Your reseller application has been approved. You can now create your store!', 'success');
END;
$$;

-- Function for admin to approve driver application and assign role
CREATE OR REPLACE FUNCTION public.admin_approve_driver_application(p_application_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT user_id INTO v_user_id FROM driver_applications WHERE id = p_application_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  UPDATE driver_applications SET status = 'approved', admin_notes = p_admin_notes, reviewed_at = now() WHERE id = p_application_id;

  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'driver'::app_role)
  ON CONFLICT DO NOTHING;

  INSERT INTO driver_wallets (user_id, current_balance_etb, total_earned_etb)
  VALUES (v_user_id, 0, 0)
  ON CONFLICT DO NOTHING;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_user_id, 'Driver Application Approved!', 'Your driver application has been approved. You can now start accepting delivery orders!', 'success');
END;
$$;

-- Function for seller to complete service with verification code
CREATE OR REPLACE FUNCTION public.complete_service_order(p_order_id UUID, p_verification_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_seller_store_id UUID;
  v_platform_fee NUMERIC;
  v_seller_earning NUMERIC;
  v_seller_user_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_order FROM service_orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  SELECT id, user_id INTO v_seller_store_id, v_seller_user_id FROM seller_stores WHERE id = v_order.seller_id AND user_id = auth.uid();
  
  IF v_seller_store_id IS NULL THEN
    RAISE EXCEPTION 'not_seller';
  END IF;

  IF v_order.status != 'in_progress' THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF v_order.verification_code != p_verification_code THEN
    RAISE EXCEPTION 'invalid_verification_code';
  END IF;

  v_platform_fee := v_order.total_etb * 0.10;
  v_seller_earning := v_order.total_etb - v_platform_fee;

  UPDATE service_orders SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_order_id;

  INSERT INTO seller_wallets (user_id, current_balance_etb, total_earned_etb)
  VALUES (v_seller_user_id, v_seller_earning, v_seller_earning)
  ON CONFLICT (user_id) DO UPDATE SET
    current_balance_etb = seller_wallets.current_balance_etb + v_seller_earning,
    total_earned_etb = seller_wallets.total_earned_etb + v_seller_earning,
    updated_at = now();

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_order.customer_id, 'Service Completed', 'Your service order has been completed. Thank you for using our platform!', 'success');

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_seller_user_id, 'Service Completed', 'You earned ' || v_seller_earning || ' ETB for completing the service.', 'success');
END;
$$;

-- Generate unique verification code on payment verification
CREATE OR REPLACE FUNCTION public.generate_service_verification_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'payment_verified' AND OLD.status != 'payment_verified' THEN
    NEW.verification_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    NEW.status := 'in_progress';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_service_verification_code_trigger ON public.service_orders;
CREATE TRIGGER generate_service_verification_code_trigger
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_service_verification_code();