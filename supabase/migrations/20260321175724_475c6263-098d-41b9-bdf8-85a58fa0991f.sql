
-- Fix triggers for delivery notifications and wallet payments
-- Re-create the pay_seller_on_pickup trigger to use correct table (seller_wallets not reseller_wallets)
CREATE OR REPLACE FUNCTION public.pay_seller_on_pickup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  order_total numeric;
  seller_user_id uuid;
  platform_fee numeric;
  seller_earning numeric;
BEGIN
  IF NEW.seller_confirmed_pickup = true AND (OLD.seller_confirmed_pickup IS DISTINCT FROM NEW.seller_confirmed_pickup) THEN
    SELECT o.total_etb, ss.user_id INTO order_total, seller_user_id
    FROM public.orders o
    JOIN public.seller_stores ss ON ss.id = o.seller_id
    WHERE o.id = NEW.order_id;
    
    IF seller_user_id IS NOT NULL AND order_total IS NOT NULL THEN
      platform_fee := order_total * 0.10;
      seller_earning := order_total - platform_fee - COALESCE((SELECT delivery_fee_etb FROM public.orders WHERE id = NEW.order_id), 0);
      
      INSERT INTO public.seller_wallets (user_id, current_balance_etb, total_earned_etb)
      VALUES (seller_user_id, seller_earning, seller_earning)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        current_balance_etb = seller_wallets.current_balance_etb + seller_earning,
        total_earned_etb = seller_wallets.total_earned_etb + seller_earning,
        updated_at = now();
      
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (seller_user_id, 'Order Picked Up! 💰', 'Driver picked up order. You earned ' || seller_earning::int || ' ETB (after 10% platform fee).', 'payment');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure pay_driver_on_delivery trigger function is correct
CREATE OR REPLACE FUNCTION public.pay_driver_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.customer_confirmed_delivery = true AND (OLD.customer_confirmed_delivery IS DISTINCT FROM NEW.customer_confirmed_delivery) THEN
    IF NEW.driver_earning_etb IS NOT NULL AND NEW.driver_earning_etb > 0 THEN
      INSERT INTO public.driver_wallets (user_id, current_balance_etb, total_earned_etb)
      VALUES (NEW.driver_id, NEW.driver_earning_etb, NEW.driver_earning_etb)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        current_balance_etb = driver_wallets.current_balance_etb + NEW.driver_earning_etb,
        total_earned_etb = driver_wallets.total_earned_etb + NEW.driver_earning_etb,
        updated_at = now();
      
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.driver_id, 'Delivery Completed! 💰', 'You earned ' || NEW.driver_earning_etb || ' ETB for this delivery.', 'payment');
    END IF;
    
    UPDATE public.orders SET status = 'delivered', updated_at = now() WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add triggers for driver_orders table if they don't exist
DROP TRIGGER IF EXISTS trigger_pay_seller_on_pickup ON public.driver_orders;
CREATE TRIGGER trigger_pay_seller_on_pickup
  AFTER UPDATE ON public.driver_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.pay_seller_on_pickup();

DROP TRIGGER IF EXISTS trigger_pay_driver_on_delivery ON public.driver_orders;
CREATE TRIGGER trigger_pay_driver_on_delivery
  AFTER UPDATE ON public.driver_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.pay_driver_on_delivery();

-- Add trigger on orders table for notification on order status change (to notify customers)
DROP TRIGGER IF EXISTS trigger_order_status_notification ON public.orders;
CREATE TRIGGER trigger_order_status_notification
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Add trigger for service_orders verification code generation
DROP TRIGGER IF EXISTS trigger_service_verification_code ON public.service_orders;
CREATE TRIGGER trigger_service_verification_code
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_service_verification_code();

-- Add trigger to notify customer of payment verified for service orders
DROP TRIGGER IF EXISTS trigger_service_payment_notification ON public.service_orders;
CREATE TRIGGER trigger_service_payment_notification
  AFTER UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_service_order_payment_verified();

-- Add trigger to notify seller of new service orders
DROP TRIGGER IF EXISTS trigger_new_service_order_notify ON public.service_orders;
CREATE TRIGGER trigger_new_service_order_notify
  AFTER INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_service_order();

-- Add trigger for driver applications status change notification
DROP TRIGGER IF EXISTS trigger_driver_application_notify ON public.driver_applications;
CREATE TRIGGER trigger_driver_application_notify
  AFTER UPDATE ON public.driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_application_status_change();

-- Add trigger for seller application status change notification  
DROP TRIGGER IF EXISTS trigger_seller_application_notify ON public.seller_applications;
CREATE TRIGGER trigger_seller_application_notify
  AFTER UPDATE ON public.seller_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_reseller_application_status_change();

-- Add trigger for withdrawal requests status change
DROP TRIGGER IF EXISTS trigger_withdrawal_notify ON public.withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_notify
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_withdrawal_status_change();

-- Add trigger to queue orders for drivers when payment is verified
DROP TRIGGER IF EXISTS trigger_queue_order_for_drivers ON public.orders;
CREATE TRIGGER trigger_queue_order_for_drivers
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_verified_order_for_drivers();

-- Fix seller_wallets INSERT policy for system inserts (SECURITY DEFINER functions need to bypass RLS)
DROP POLICY IF EXISTS "System can insert seller wallets" ON public.seller_wallets;
CREATE POLICY "System can insert seller wallets"
  ON public.seller_wallets
  FOR INSERT
  WITH CHECK (true);

-- Fix driver_orders INSERT policy (triggered via RPC functions)
DROP POLICY IF EXISTS "System can create driver orders" ON public.driver_orders;
CREATE POLICY "System can create driver orders"
  ON public.driver_orders
  FOR INSERT
  WITH CHECK (true);
