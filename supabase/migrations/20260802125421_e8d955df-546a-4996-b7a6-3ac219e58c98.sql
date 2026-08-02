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
         COALESCE(ROUND(NEW.estimated_earning_etb)::text, '?') || ' ETB. Open the driver dashboard to accept it.',
         'order'
  FROM public.user_roles ur
  WHERE ur.role = 'driver'::public.app_role;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_drivers_new_pending_order ON public.pending_driver_orders;
CREATE TRIGGER trg_notify_drivers_new_pending_order
AFTER INSERT ON public.pending_driver_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_drivers_new_pending_order();