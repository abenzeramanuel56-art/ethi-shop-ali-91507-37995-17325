-- Ensure only one pending queue row per order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pending_driver_orders_order_id_key'
  ) THEN
    ALTER TABLE public.pending_driver_orders
      ADD CONSTRAINT pending_driver_orders_order_id_key UNIQUE (order_id);
  END IF;
END $$;

-- Create/replace trigger function to queue verified payments for drivers
CREATE OR REPLACE FUNCTION public.queue_verified_order_for_drivers()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_lat numeric;
  v_seller_lng numeric;
  v_seller_phone text;
  v_store_id uuid;
BEGIN
  -- Only when status becomes payment_verified
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'payment_verified'
     AND (OLD.status IS DISTINCT FROM NEW.status)
  THEN
    -- Do not queue if already queued or already accepted into driver_orders
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
        city
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
        NEW.city
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_queue_verified_order_for_drivers ON public.orders;
CREATE TRIGGER trg_queue_verified_order_for_drivers
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.queue_verified_order_for_drivers();

-- Backfill: queue any already-verified orders that are missing a pending row
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
  city
)
SELECT
  o.id,
  COALESCE(o.seller_id, o.reseller_id) AS seller_id,
  s.latitude,
  s.longitude,
  s.contact_phone,
  o.customer_latitude,
  o.customer_longitude,
  o.phone,
  o.shipping_address,
  o.city
FROM public.orders o
LEFT JOIN public.seller_stores s
  ON s.id = COALESCE(o.seller_id, o.reseller_id)
WHERE o.status = 'payment_verified'
  AND COALESCE(o.driver_assigned, false) = false
  AND NOT EXISTS (SELECT 1 FROM public.pending_driver_orders p WHERE p.order_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.driver_orders d WHERE d.order_id = o.id);
