-- Fix driver_confirm_delivery to properly check status = 'picked_up' before allowing confirmation
-- Also fix admin suspend issue by ensuring proper RLS

-- 1. Fix driver_confirm_delivery RPC - only allow if status is 'picked_up'
CREATE OR REPLACE FUNCTION public.driver_confirm_delivery(p_driver_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_customer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  -- Only allow confirming delivery if status is 'picked_up'
  UPDATE public.driver_orders
  SET status = 'awaiting_customer_confirmation'
  WHERE id = p_driver_order_id
    AND driver_id = auth.uid()
    AND status = 'picked_up'
  RETURNING order_id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'driver_order_not_found_or_invalid_status';
  END IF;

  SELECT customer_id INTO v_customer_id
  FROM public.orders
  WHERE id = v_order_id;

  IF v_customer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_customer_id,
      'Confirm your delivery! 📦',
      'The driver has delivered your order. Please go to your account to confirm that you received it.',
      'order'
    );
  END IF;

  RETURN true;
END;
$$;

-- 2. Create customer_confirm_delivery RPC that calculates 10% profit
CREATE OR REPLACE FUNCTION public.customer_confirm_delivery(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_order record;
  v_order record;
  v_seller_store record;
  v_driver_earning numeric;
  v_order_total numeric;
  v_platform_commission numeric;
  v_seller_earnings numeric;
  v_total_items_cost numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Get the order and verify ownership
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND customer_id = auth.uid();
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Get driver order
  SELECT * INTO v_driver_order 
  FROM public.driver_orders 
  WHERE order_id = p_order_id AND status = 'awaiting_customer_confirmation';
  
  IF v_driver_order.id IS NULL THEN
    RAISE EXCEPTION 'delivery_not_ready_for_confirmation';
  END IF;

  -- Update driver order
  UPDATE public.driver_orders
  SET customer_confirmed_delivery = true,
      delivered_at = now(),
      status = 'delivered'
  WHERE id = v_driver_order.id;

  -- Update order status
  UPDATE public.orders
  SET status = 'delivered'
  WHERE id = p_order_id;

  -- Credit driver wallet
  v_driver_earning := COALESCE(v_driver_order.driver_earning_etb, 0);
  IF v_driver_earning > 0 THEN
    INSERT INTO public.driver_wallets (user_id, current_balance_etb, total_earned_etb)
    VALUES (v_driver_order.driver_id, v_driver_earning, v_driver_earning)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance_etb = driver_wallets.current_balance_etb + EXCLUDED.current_balance_etb,
      total_earned_etb = driver_wallets.total_earned_etb + EXCLUDED.total_earned_etb;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_driver_order.driver_id,
      'Payment received! 💰',
      v_driver_earning::text || ' ETB has been credited to your wallet for the delivery.',
      'payment'
    );
  END IF;

  -- Get total product cost from order_items (excluding delivery fee)
  SELECT COALESCE(SUM(price_etb * quantity), 0) INTO v_total_items_cost
  FROM public.order_items WHERE order_id = p_order_id;

  -- Calculate 10% platform commission
  v_platform_commission := v_total_items_cost * 0.10;
  v_seller_earnings := v_total_items_cost - v_platform_commission;

  -- Get seller info and credit their wallet
  IF v_order.seller_id IS NOT NULL OR v_order.reseller_id IS NOT NULL THEN
    SELECT * INTO v_seller_store 
    FROM public.seller_stores 
    WHERE id = COALESCE(v_order.seller_id, v_order.reseller_id);

    IF v_seller_store.user_id IS NOT NULL AND v_seller_earnings > 0 THEN
      INSERT INTO public.seller_wallets (user_id, current_balance_etb, total_earned_etb)
      VALUES (v_seller_store.user_id, v_seller_earnings, v_seller_earnings)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_balance_etb = seller_wallets.current_balance_etb + EXCLUDED.current_balance_etb,
        total_earned_etb = seller_wallets.total_earned_etb + EXCLUDED.total_earned_etb;

      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_seller_store.user_id,
        'Sale completed! 💰',
        v_seller_earnings::text || ' ETB has been credited to your wallet (10% platform fee deducted).',
        'payment'
      );
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.customer_confirm_delivery(uuid) TO authenticated;

-- 3. Add admin suspend user RPC (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id uuid,
  p_reason text,
  p_days integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suspension_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  v_expires_at := now() + (p_days || ' days')::interval;

  INSERT INTO public.user_suspensions (user_id, suspended_by, reason, expires_at, is_active)
  VALUES (p_user_id, auth.uid(), p_reason, v_expires_at, true)
  RETURNING id INTO v_suspension_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    'Account Suspended ⚠️',
    'Your account has been suspended for ' || p_days || ' days. Reason: ' || p_reason,
    'system'
  );

  RETURN v_suspension_id;
END;
$$;

-- 4. Add admin ban user RPC
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ban_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  INSERT INTO public.user_bans (user_id, banned_by, reason, is_active)
  VALUES (p_user_id, auth.uid(), p_reason, true)
  RETURNING id INTO v_ban_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_user_id,
    'Account Banned 🚫',
    'Your account has been permanently banned. Reason: ' || p_reason,
    'system'
  );

  RETURN v_ban_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_suspend_user(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;