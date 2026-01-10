-- Fix driver RPCs to use correct has_role(user_id, role) argument order

CREATE OR REPLACE FUNCTION public.driver_accept_pending_order(p_pending_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending record;
  v_driver_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- has_role signature is (user_id uuid, role app_role)
  IF NOT public.has_role(auth.uid(), 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  UPDATE public.pending_driver_orders
  SET accepted_by = auth.uid(),
      accepted_at = now()
  WHERE id = p_pending_id
    AND accepted_by IS NULL
  RETURNING * INTO v_pending;

  IF v_pending.id IS NULL THEN
    RAISE EXCEPTION 'pending_order_not_available';
  END IF;

  INSERT INTO public.driver_orders (
    driver_id,
    order_id,
    status,
    distance_km,
    driver_earning_etb,
    seller_latitude,
    seller_longitude,
    seller_phone,
    customer_latitude,
    customer_longitude,
    customer_phone
  ) VALUES (
    auth.uid(),
    v_pending.order_id,
    'pending',
    v_pending.distance_km,
    v_pending.estimated_earning_etb,
    v_pending.seller_latitude,
    v_pending.seller_longitude,
    v_pending.seller_phone,
    v_pending.customer_latitude,
    v_pending.customer_longitude,
    v_pending.customer_phone
  )
  RETURNING id INTO v_driver_order_id;

  UPDATE public.orders
  SET driver_assigned = true
  WHERE id = v_pending.order_id;

  RETURN v_driver_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.driver_confirm_pickup(p_driver_order_id uuid)
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

  UPDATE public.driver_orders
  SET seller_confirmed_pickup = true,
      pickup_at = now(),
      status = 'picked_up'
  WHERE id = p_driver_order_id
    AND driver_id = auth.uid()
  RETURNING order_id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'driver_order_not_found';
  END IF;

  UPDATE public.orders
  SET status = 'shipped'
  WHERE id = v_order_id;

  SELECT customer_id INTO v_customer_id
  FROM public.orders
  WHERE id = v_order_id;

  IF v_customer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_customer_id,
      'Driver picked up your order! 🚚',
      'Your order is on its way! The driver has picked up your package and is heading to your location.',
      'order'
    );
  END IF;

  RETURN true;
END;
$$;

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

  UPDATE public.driver_orders
  SET status = 'awaiting_customer_confirmation'
  WHERE id = p_driver_order_id
    AND driver_id = auth.uid()
  RETURNING order_id INTO v_order_id;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'driver_order_not_found';
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

-- Ensure app clients can call these (idempotent)
GRANT EXECUTE ON FUNCTION public.driver_accept_pending_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_confirm_pickup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.driver_confirm_delivery(uuid) TO authenticated;
