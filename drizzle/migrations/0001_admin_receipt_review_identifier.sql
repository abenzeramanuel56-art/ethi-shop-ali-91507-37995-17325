CREATE OR REPLACE FUNCTION public.admin_review_payment_with_receipt(p_order_id uuid,p_approve boolean,p_reason text,p_receipt_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; v public.payment_verifications; ident text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 SELECT * INTO v FROM public.payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.state='confirmed' THEN RETURN jsonb_build_object('state','confirmed'); END IF;
 IF o.id IS NULL OR o.status<>'pending_payment' OR v.state IS DISTINCT FROM 'pending_review' THEN RAISE EXCEPTION 'Pending review required'; END IF;
 ident:=nullif(lower(regexp_replace(coalesce(p_receipt_id,''),'\s','','g')),'');
 IF ident IS NOT NULL AND length(ident)>64 THEN RAISE EXCEPTION 'Invalid receipt ID'; END IF;
 IF p_approve AND ident IS NOT NULL THEN UPDATE public.payment_verifications SET reference_id=ident WHERE order_id=p_order_id; END IF;
 RETURN public.admin_review_payment(p_order_id,p_approve,p_reason);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_payment_with_receipt(uuid,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_payment_with_receipt(uuid,boolean,text,text) TO authenticated;
