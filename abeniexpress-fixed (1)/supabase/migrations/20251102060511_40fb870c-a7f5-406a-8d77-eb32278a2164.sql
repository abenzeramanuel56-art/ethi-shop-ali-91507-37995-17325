-- Credit reseller wallet when admin verifies payment
-- 1) Create or replace function
CREATE OR REPLACE FUNCTION public.update_reseller_wallet_on_payment_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reseller_user_id uuid;
  total_profit numeric;
BEGIN
  -- Only process if status changed to 'payment_verified' and order has a reseller
  IF NEW.status = 'payment_verified' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.reseller_id IS NOT NULL THEN
    -- Get the reseller user_id from the store
    SELECT user_id INTO reseller_user_id
    FROM public.reseller_stores
    WHERE id = NEW.reseller_id;

    -- Calculate total profit for this order (sum of per-item reseller_profit_etb * quantity)
    SELECT COALESCE(SUM(COALESCE(reseller_profit_etb, 0) * quantity), 0) INTO total_profit
    FROM public.order_items
    WHERE order_id = NEW.id;

    -- If there is any profit, update or create the wallet entry
    IF total_profit > 0 THEN
      INSERT INTO public.reseller_wallets (user_id, current_balance_etb, total_earned_etb)
      VALUES (reseller_user_id, total_profit, total_profit)
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_balance_etb = reseller_wallets.current_balance_etb + EXCLUDED.current_balance_etb,
        total_earned_etb = reseller_wallets.total_earned_etb + EXCLUDED.total_earned_etb,
        updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger on orders table
DROP TRIGGER IF EXISTS update_wallet_on_payment_verified ON public.orders;
CREATE TRIGGER update_wallet_on_payment_verified
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_reseller_wallet_on_payment_verified();