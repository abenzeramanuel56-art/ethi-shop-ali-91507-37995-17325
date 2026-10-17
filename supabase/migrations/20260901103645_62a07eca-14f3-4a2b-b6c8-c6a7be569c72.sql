
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  label TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own devices"
  ON public.user_devices FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_admins(p_title TEXT, p_message TEXT, p_type TEXT, p_link TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, p_title, p_message, p_type, p_link
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New user joined',
    COALESCE(NEW.full_name, 'A new user') || ' just created an account on Abeni Express.',
    'info',
    '/admin'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_user ON public.profiles;
CREATE TRIGGER trg_notify_admins_new_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_user();

CREATE OR REPLACE FUNCTION public.notify_admins_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New order placed',
    'Order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' for ' || NEW.total_etb || ' ETB is waiting for payment verification.',
    'order_update',
    '/admin'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON public.orders;
CREATE TRIGGER trg_notify_admins_new_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_order();

CREATE OR REPLACE FUNCTION public.notify_admins_new_service_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New service order',
    'A service order of ' || NEW.total_etb || ' ETB was placed and needs payment verification.',
    'order_update',
    '/admin/service-orders'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_service_order ON public.service_orders;
CREATE TRIGGER trg_notify_admins_new_service_order
AFTER INSERT ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_service_order();

CREATE OR REPLACE FUNCTION public.notify_admins_new_digital_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins(
    'New digital product order',
    'A digital product order of ' || NEW.price_etb || ' ETB needs payment verification.',
    'order_update',
    '/admin'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_digital_order ON public.digital_product_orders;
CREATE TRIGGER trg_notify_admins_new_digital_order
AFTER INSERT ON public.digital_product_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_digital_order();

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'payment_verified' THEN
        notification_title := 'Payment Confirmed';
        notification_message := 'Your payment for order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been verified. Your order is being processed.';
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
