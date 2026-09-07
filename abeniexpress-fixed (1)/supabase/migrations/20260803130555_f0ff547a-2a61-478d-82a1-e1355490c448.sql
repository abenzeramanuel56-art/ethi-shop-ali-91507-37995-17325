-- 1) Only notify drivers whose registered vehicle matches the requested one
CREATE OR REPLACE FUNCTION public.notify_drivers_new_pending_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT ur.user_id,
         'New delivery available! 🚚',
         'Pickup in ' || COALESCE(NEW.city, 'your area') ||
         ' · ' || COALESCE(ROUND(NEW.distance_km, 1)::text, '?') || ' km · earn ' ||
         COALESCE(ROUND(NEW.estimated_earning_etb)::text, '?') || ' ETB' ||
         CASE WHEN NEW.preferred_vehicle_type IS NOT NULL
              THEN ' · vehicle: ' || NEW.preferred_vehicle_type ELSE '' END ||
         '. Open the driver dashboard to accept it.',
         'order'
  FROM public.user_roles ur
  WHERE ur.role = 'driver'::public.app_role
    AND (
      NEW.preferred_vehicle_type IS NULL
      OR EXISTS (
        SELECT 1 FROM public.driver_applications da
        WHERE da.user_id = ur.user_id
          AND da.status = 'approved'
          AND lower(COALESCE(da.vehicle_type, '')) = lower(NEW.preferred_vehicle_type)
      )
    );
  RETURN NEW;
END;
$function$;

-- 2) Enforce vehicle match on accept + auto-calculate distance/earning
CREATE OR REPLACE FUNCTION public.driver_accept_pending_order(p_pending_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pending record;
  v_driver_order_id uuid;
  v_driver_vehicle text;
  v_distance numeric;
  v_earning numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  SELECT * INTO v_pending FROM public.pending_driver_orders WHERE id = p_pending_id;
  IF v_pending.id IS NULL THEN
    RAISE EXCEPTION 'pending_order_not_available';
  END IF;

  SELECT da.vehicle_type INTO v_driver_vehicle
  FROM public.driver_applications da
  WHERE da.user_id = auth.uid() AND da.status = 'approved'
  ORDER BY da.created_at DESC LIMIT 1;

  IF v_pending.preferred_vehicle_type IS NOT NULL
     AND lower(COALESCE(v_driver_vehicle, '')) <> lower(v_pending.preferred_vehicle_type) THEN
    RAISE EXCEPTION 'vehicle_mismatch: customer requested % but your registered vehicle is %',
      v_pending.preferred_vehicle_type, COALESCE(v_driver_vehicle, 'not set');
  END IF;

  UPDATE public.pending_driver_orders
  SET accepted_by = auth.uid(), accepted_at = now()
  WHERE id = p_pending_id AND accepted_by IS NULL
  RETURNING * INTO v_pending;

  IF v_pending.id IS NULL THEN
    RAISE EXCEPTION 'pending_order_not_available';
  END IF;

  v_distance := v_pending.distance_km;
  IF v_distance IS NULL
     AND v_pending.seller_latitude IS NOT NULL AND v_pending.seller_longitude IS NOT NULL
     AND v_pending.customer_latitude IS NOT NULL AND v_pending.customer_longitude IS NOT NULL THEN
    v_distance := 6371 * 2 * asin(sqrt(
      power(sin(radians(v_pending.customer_latitude - v_pending.seller_latitude) / 2), 2) +
      cos(radians(v_pending.seller_latitude)) * cos(radians(v_pending.customer_latitude)) *
      power(sin(radians(v_pending.customer_longitude - v_pending.seller_longitude) / 2), 2)
    ));
  END IF;

  v_earning := COALESCE(v_pending.estimated_earning_etb, GREATEST(50, ROUND(COALESCE(v_distance, 0) * 25)));

  INSERT INTO public.driver_orders (
    driver_id, order_id, status, distance_km, driver_earning_etb,
    seller_latitude, seller_longitude, seller_phone,
    customer_latitude, customer_longitude, customer_phone
  ) VALUES (
    auth.uid(), v_pending.order_id, 'pending', v_distance, v_earning,
    v_pending.seller_latitude, v_pending.seller_longitude, v_pending.seller_phone,
    v_pending.customer_latitude, v_pending.customer_longitude, v_pending.customer_phone
  )
  RETURNING id INTO v_driver_order_id;

  UPDATE public.orders SET driver_assigned = true WHERE id = v_pending.order_id;

  RETURN v_driver_order_id;
END;
$function$;

-- 3) Clearer pickup confirmation errors
CREATE OR REPLACE FUNCTION public.driver_confirm_pickup(p_driver_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_do record;
  v_order_id uuid;
  v_customer_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'driver'::public.app_role) THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  SELECT * INTO v_do FROM public.driver_orders WHERE id = p_driver_order_id;
  IF v_do.id IS NULL THEN
    RAISE EXCEPTION 'driver_order_not_found';
  END IF;

  IF v_do.driver_id <> auth.uid() THEN
    RAISE EXCEPTION 'this delivery belongs to another driver';
  END IF;

  IF v_do.status <> 'pending' THEN
    IF v_do.status = 'picked_up' THEN
      RETURN true;
    END IF;
    RAISE EXCEPTION 'pickup cannot be confirmed while the delivery is "%"', v_do.status;
  END IF;

  UPDATE public.driver_orders
  SET seller_confirmed_pickup = true, pickup_at = now(), status = 'picked_up'
  WHERE id = p_driver_order_id
  RETURNING order_id INTO v_order_id;

  UPDATE public.orders SET status = 'shipped' WHERE id = v_order_id;

  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id = v_order_id;

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
$function$;