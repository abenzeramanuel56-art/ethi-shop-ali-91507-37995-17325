-- Fix driver pickup failing: remove legacy payout triggers that insert invalid wallets

-- 1) Driver order triggers (these were paying seller on pickup and driver on customer confirm)
DROP TRIGGER IF EXISTS on_driver_pickup_confirmed ON public.driver_orders;
DROP TRIGGER IF EXISTS on_customer_delivery_confirmed ON public.driver_orders;

-- 2) Order triggers referencing non-existent reseller tables
DROP TRIGGER IF EXISTS update_reseller_wallet_trigger ON public.orders;
DROP TRIGGER IF EXISTS update_wallet_on_payment_verified ON public.orders;

-- Note: payout is now handled centrally in public.customer_confirm_delivery()