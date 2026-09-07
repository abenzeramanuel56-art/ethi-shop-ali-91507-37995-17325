DO $$
DECLARE v_admin uuid;
BEGIN
  SELECT id INTO v_admin FROM auth.users WHERE lower(email) = 'abenitheman5@gmail.com' LIMIT 1;

  DELETE FROM public.driver_orders;
  DELETE FROM public.pending_driver_orders;
  DELETE FROM public.order_items;
  DELETE FROM public.refund_requests;
  DELETE FROM public.orders;
  DELETE FROM public.service_orders;
  DELETE FROM public.digital_product_orders;
  DELETE FROM public.affiliate_orders;
  DELETE FROM public.affiliate_products;
  DELETE FROM public.affiliate_stores;
  DELETE FROM public.affiliate_wallets;
  DELETE FROM public.services;
  DELETE FROM public.digital_products;
  DELETE FROM public.seller_products;
  DELETE FROM public.products;
  DELETE FROM public.seller_stores;
  DELETE FROM public.seller_wallets;
  DELETE FROM public.driver_wallets;
  DELETE FROM public.withdrawal_requests;
  DELETE FROM public.wallet_deductions;
  DELETE FROM public.driver_applications;
  DELETE FROM public.seller_applications;
  DELETE FROM public.store_reports;
  DELETE FROM public.ticket_replies;
  DELETE FROM public.support_tickets;
  DELETE FROM public.quote_requests;
  DELETE FROM public.advertisements;
  DELETE FROM public.notifications;
  DELETE FROM public.user_bans;
  DELETE FROM public.user_warnings;
  DELETE FROM public.user_suspensions;
  DELETE FROM public.telegram_verifications;
  DELETE FROM public.telegram_link_tokens;
  DELETE FROM public.email_verification_codes;

  IF v_admin IS NULL THEN
    DELETE FROM public.user_roles;
    DELETE FROM public.profiles;
    DELETE FROM auth.users;
  ELSE
    DELETE FROM public.user_roles WHERE user_id <> v_admin;
    DELETE FROM public.profiles WHERE id <> v_admin;
    DELETE FROM auth.users WHERE id <> v_admin;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;