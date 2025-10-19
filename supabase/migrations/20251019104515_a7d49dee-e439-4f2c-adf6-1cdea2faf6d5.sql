-- Create reports table for store complaints
CREATE TABLE public.store_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.reseller_stores(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Create user bans table
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id)
);

-- Create wallet deductions log
CREATE TABLE public.wallet_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_etb NUMERIC NOT NULL CHECK (amount_etb > 0),
  reason TEXT NOT NULL,
  deducted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_deductions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_reports
CREATE POLICY "Users can create reports"
  ON public.store_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.store_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all reports"
  ON public.store_reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_bans
CREATE POLICY "Admins can manage bans"
  ON public.user_bans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own ban status"
  ON public.user_bans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for wallet_deductions
CREATE POLICY "Admins can create deductions"
  ON public.wallet_deductions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their deductions"
  ON public.wallet_deductions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Function to deduct from reseller wallet
CREATE OR REPLACE FUNCTION public.deduct_from_wallet(
  target_user_id UUID,
  deduction_amount NUMERIC,
  deduction_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Check if admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can deduct from wallets';
  END IF;

  -- Get current balance
  SELECT current_balance_etb INTO current_balance
  FROM public.reseller_wallets
  WHERE user_id = target_user_id;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  -- Update wallet
  UPDATE public.reseller_wallets
  SET current_balance_etb = GREATEST(0, current_balance_etb - deduction_amount),
      updated_at = now()
  WHERE user_id = target_user_id;

  -- Log deduction
  INSERT INTO public.wallet_deductions (user_id, amount_etb, reason, deducted_by)
  VALUES (target_user_id, deduction_amount, deduction_reason, auth.uid());

  RETURN true;
END;
$$;