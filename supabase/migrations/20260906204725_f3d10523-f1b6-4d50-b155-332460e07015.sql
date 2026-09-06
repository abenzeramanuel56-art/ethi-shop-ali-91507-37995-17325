CREATE OR REPLACE FUNCTION public.admin_verify_affiliate_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_affiliate_user_id UUID;
  v_store_id UUID;
  v_new_order_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO v_order FROM public.affiliate_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.status NOT IN ('pending','pending_payment','payment_submitted','awaiting_verification') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE public.affiliate_orders SET status = 'payment_verified', updated_at = now() WHERE id = p_order_id;

  SELECT user_id INTO v_affiliate_user_id FROM public.affiliate_stores WHERE id = v_order.affiliate_store_id;

  INSERT INTO public.affiliate_wallets (user_id, current_balance_etb, total_earned_etb)
  VALUES (v_affiliate_user_id, v_order.affiliate_profit_etb, v_order.affiliate_profit_etb)
  ON CONFLICT (user_id) DO UPDATE SET
    current_balance_etb = affiliate_wallets.current_balance_etb + v_order.affiliate_profit_etb,
    total_earned_etb = affiliate_wallets.total_earned_etb + v_order.affiliate_profit_etb,
    updated_at = now();

  UPDATE public.affiliate_products SET sale_count = sale_count + 1 WHERE id = v_order.affiliate_product_id;

  -- Hand the delivery over to the driver pipeline by creating a real order record
  IF v_order.buyer_id IS NOT NULL THEN
    SELECT seller_id INTO v_store_id FROM public.products WHERE id = v_order.original_product_id;

    INSERT INTO public.orders (
      customer_id, seller_id, total_etb, shipping_address, city, phone,
      payment_proof_url, status, customer_latitude, customer_longitude, admin_notes
    ) VALUES (
      v_order.buyer_id, v_store_id, v_order.total_etb,
      COALESCE(v_order.shipping_address, 'Not provided'),
      COALESCE(v_order.city, 'Addis Ababa'),
      COALESCE(v_order.phone, 'N/A'),
      v_order.payment_proof_url, 'pending_payment',
      v_order.customer_latitude, v_order.customer_longitude,
      'Affiliate order ' || left(p_order_id::text, 8)
    ) RETURNING id INTO v_new_order_id;

    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price_etb)
    SELECT v_new_order_id, p.id, p.name, v_order.quantity, v_order.sold_price_etb
    FROM public.products p WHERE p.id = v_order.original_product_id;

    -- flipping to payment_verified triggers driver dispatch
    UPDATE public.orders SET status = 'payment_verified' WHERE id = v_new_order_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_affiliate_user_id, 'Affiliate Sale Confirmed! 💰',
    'You earned ' || v_order.affiliate_profit_etb || ' ETB from an affiliate sale.', 'success', '/affiliate/dashboard');

  IF v_order.buyer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_order.buyer_id, 'Payment Verified',
      'Your affiliate purchase has been confirmed. A driver will be assigned for delivery.', 'success', '/account');
  END IF;
END;
$function$;