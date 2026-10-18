CREATE TABLE public.payment_verifications (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id),
 state text NOT NULL DEFAULT 'pending_payment' CHECK (state IN ('pending_payment','verifying','confirmed','failed','pending_review','rejected')),
 method text, payment_method text, screenshot_path text, transaction_id text, reference_id text, request_id text, mode text,
 verified_amount numeric, attempts integer NOT NULL DEFAULT 0, reason text, service_error boolean NOT NULL DEFAULT false,
 lock_token uuid, locked_at timestamptz, approved_by uuid, approved_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_verifications TO authenticated;
GRANT ALL ON public.payment_verifications TO service_role;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_verifications_read ON public.payment_verifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=auth.uid()));
CREATE TABLE public.payment_receipt_claims (
 identifier text PRIMARY KEY CHECK (identifier = lower(regexp_replace(identifier,'\s','','g'))),
 order_id uuid NOT NULL REFERENCES public.orders(id), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_receipt_claims TO service_role;
ALTER TABLE public.payment_receipt_claims ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.payment_verification_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.orders(id), state text NOT NULL,
 reason text, admin_id uuid, request_id text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_verification_events TO authenticated;
GRANT ALL ON public.payment_verification_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.payment_verification_events_id_seq TO service_role;
ALTER TABLE public.payment_verification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_events_read ON public.payment_verification_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=auth.uid()));
CREATE TABLE public.payment_verification_calls (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid NOT NULL, ip_hash text NOT NULL, order_id uuid NOT NULL,
 service_error boolean, mode text, request_id text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_verification_calls TO service_role;
GRANT SELECT ON public.payment_verification_calls TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.payment_verification_calls_id_seq TO service_role;
ALTER TABLE public.payment_verification_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_calls_admin ON public.payment_verification_calls FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.payment_begin(p_order_id uuid,p_user_id uuid,p_ip_hash text,p_method text,p_payment_method text,p_transaction_id text,p_screenshot_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.orders; v public.payment_verifications; tok uuid; call_id bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
 PERFORM pg_advisory_xact_lock(hashtext(p_ip_hash));
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF o.id IS NULL OR o.customer_id<>p_user_id THEN RETURN jsonb_build_object('state','failed','reason','order_not_found'); END IF;
 IF o.status NOT IN ('pending_payment','cancelled') THEN RETURN jsonb_build_object('state','confirmed','order_id',o.id); END IF;
 IF o.status='cancelled' THEN RETURN jsonb_build_object('state','rejected','reason','rejected'); END IF;
 INSERT INTO public.payment_verifications(order_id) VALUES(p_order_id) ON CONFLICT DO NOTHING;
 SELECT * INTO v FROM public.payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.state IN ('confirmed','rejected','pending_review') THEN RETURN jsonb_build_object('state',v.state,'reason',v.reason); END IF;
 IF v.state='verifying' AND v.locked_at>now()-interval '90 seconds' THEN RETURN jsonb_build_object('state','verifying','reason','in_progress'); END IF;
 IF v.state='verifying' THEN
  UPDATE public.payment_verifications SET state='pending_review',reason='service_error',service_error=true,lock_token=null WHERE order_id=p_order_id;
  INSERT INTO public.payment_verification_events(order_id,state,reason) VALUES(p_order_id,'pending_review','service_error');
  RETURN jsonb_build_object('state','pending_review','reason','service_error');
 END IF;
 IF v.attempts>=5 THEN
  UPDATE public.payment_verifications SET state='pending_review',reason='attempt_limit' WHERE order_id=p_order_id;
  INSERT INTO public.payment_verification_events(order_id,state,reason) VALUES(p_order_id,'pending_review','attempt_limit');
  RETURN jsonb_build_object('state','pending_review','reason','attempt_limit');
 END IF;
 IF (SELECT count(*) FROM public.payment_verification_calls WHERE user_id=p_user_id AND created_at>now()-interval '1 minute')>=5 OR
    (SELECT count(*) FROM public.payment_verification_calls WHERE ip_hash=p_ip_hash AND created_at>now()-interval '1 minute')>=20 THEN
  RETURN jsonb_build_object('state','pending_review','reason','rate_limit');
 END IF;
 tok:=gen_random_uuid();
 UPDATE public.payment_verifications SET state='verifying',method=p_method,payment_method=p_payment_method,
 transaction_id=nullif(lower(regexp_replace(p_transaction_id,'\s','','g')),''), screenshot_path=coalesce(p_screenshot_path,screenshot_path),
 attempts=attempts+1,lock_token=tok,locked_at=now(),reason=null,updated_at=now() WHERE order_id=p_order_id;
 INSERT INTO public.payment_verification_events(order_id,state) VALUES(p_order_id,'verifying');
 INSERT INTO public.payment_verification_calls(user_id,ip_hash,order_id) VALUES(p_user_id,p_ip_hash,p_order_id) RETURNING id INTO call_id;
 RETURN jsonb_build_object('state','verifying','token',tok,'call_id',call_id,'amount',o.total_etb,'attempts',v.attempts+1);
END $$;
REVOKE ALL ON FUNCTION public.payment_begin(uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_begin(uuid,uuid,text,text,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.payment_finish(p_order_id uuid,p_token uuid,p_state text,p_reason text,p_reference text,p_request text,p_mode text,p_amount numeric,p_service_error boolean,p_call_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.payment_verifications; o public.orders; ident text; outcome text:=p_state; why text:=p_reason;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 SELECT * INTO v FROM public.payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.state='confirmed' THEN RETURN jsonb_build_object('state','confirmed','order_id',p_order_id); END IF;
 IF v.lock_token IS DISTINCT FROM p_token OR v.state<>'verifying' THEN RETURN jsonb_build_object('state',v.state,'reason','in_progress'); END IF;
 IF outcome NOT IN ('confirmed','failed','pending_review') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 IF outcome='confirmed' AND (p_amount IS NULL OR p_amount<>o.total_etb) THEN
  outcome:=CASE WHEN p_amount IS NULL OR p_amount>o.total_etb THEN 'pending_review' ELSE 'failed' END;
  why:=CASE WHEN p_amount IS NULL THEN 'amount_missing' ELSE 'amount_mismatch' END;
 END IF;
 IF outcome='confirmed' AND nullif(p_reference,'') IS NULL AND nullif(v.transaction_id,'') IS NULL THEN outcome:='pending_review';why:='reference_missing'; END IF;
 IF outcome='confirmed' THEN
  BEGIN
   FOR ident IN SELECT DISTINCT lower(regexp_replace(x,'\s','','g')) FROM unnest(ARRAY[v.transaction_id,p_reference]) x WHERE nullif(x,'') IS NOT NULL LOOP
    INSERT INTO public.payment_receipt_claims(identifier,order_id) VALUES(ident,p_order_id) ON CONFLICT(identifier) DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.payment_receipt_claims WHERE identifier=ident AND order_id=p_order_id) THEN RAISE unique_violation; END IF;
   END LOOP;
  EXCEPTION WHEN unique_violation THEN outcome:='failed';why:='receipt_used'; END;
 END IF;
 IF outcome='failed' AND v.attempts>=5 THEN outcome:='pending_review';why:='attempt_limit'; END IF;
 UPDATE public.payment_verifications SET state=outcome,reason=why,reference_id=p_reference,request_id=p_request,mode=p_mode,
 verified_amount=p_amount,service_error=p_service_error,lock_token=null,updated_at=now() WHERE order_id=p_order_id;
 UPDATE public.payment_verification_calls SET service_error=p_service_error,mode=p_mode,request_id=p_request WHERE id=p_call_id;
 INSERT INTO public.payment_verification_events(order_id,state,reason,request_id) VALUES(p_order_id,outcome,why,p_request);
 IF outcome='confirmed' THEN
  PERFORM set_config('app.payment_transition','allowed',true);
  UPDATE public.orders SET status='payment_verified',payment_method=v.payment_method WHERE id=p_order_id;
 END IF;
 RETURN jsonb_build_object('state',outcome,'reason',why,'order_id',p_order_id,'attempts',v.attempts,'mode',p_mode);
END $$;
REVOKE ALL ON FUNCTION public.payment_finish(uuid,uuid,text,text,text,text,text,numeric,boolean,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.payment_finish(uuid,uuid,text,text,text,text,text,numeric,boolean,bigint) TO service_role;
CREATE OR REPLACE FUNCTION public.admin_review_payment(p_order_id uuid,p_approve boolean,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.payment_verifications; o public.orders; ident text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Review reason required'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 SELECT * INTO v FROM public.payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.state='confirmed' THEN RETURN jsonb_build_object('state','confirmed'); END IF;
 IF v.state IS DISTINCT FROM 'pending_review' THEN RAISE EXCEPTION 'Pending review required'; END IF;
 IF p_approve THEN
  IF nullif(v.transaction_id,'') IS NULL AND nullif(v.reference_id,'') IS NULL THEN RAISE EXCEPTION 'receipt_id_required'; END IF;
  FOR ident IN SELECT DISTINCT lower(regexp_replace(x,'\s','','g')) FROM unnest(ARRAY[v.transaction_id,v.reference_id]) x WHERE nullif(x,'') IS NOT NULL LOOP
   INSERT INTO public.payment_receipt_claims(identifier,order_id) VALUES(ident,p_order_id) ON CONFLICT(identifier) DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM public.payment_receipt_claims WHERE identifier=ident AND order_id=p_order_id) THEN RAISE EXCEPTION 'receipt_used'; END IF;
  END LOOP;
 END IF;
 UPDATE public.payment_verifications SET state=CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END,reason=trim(p_reason),approved_by=auth.uid(),approved_at=now(),updated_at=now() WHERE order_id=p_order_id;
 INSERT INTO public.payment_verification_events(order_id,state,reason,admin_id) VALUES(p_order_id,CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END,trim(p_reason),auth.uid());
 PERFORM set_config('app.payment_transition','allowed',true);
 UPDATE public.orders SET status=CASE WHEN p_approve THEN 'payment_verified'::public.order_status ELSE 'cancelled'::public.order_status END,payment_method=v.payment_method WHERE id=p_order_id;
 RETURN jsonb_build_object('state',CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_payment(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_payment(uuid,boolean,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_payment_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NEW.status IS DISTINCT FROM 'pending_payment'::public.order_status THEN RAISE EXCEPTION 'Initial payment state required'; END IF;
  RETURN NEW;
 END IF;
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND OLD.status='pending_payment' AND
 (NEW.status IS DISTINCT FROM OLD.status OR NEW.total_etb IS DISTINCT FROM OLD.total_etb OR NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.delivery_fee_etb IS DISTINCT FROM OLD.delivery_fee_etb) THEN
  RAISE EXCEPTION 'Protected payment fields';
 END IF;
 IF EXISTS(SELECT 1 FROM public.payment_verifications WHERE order_id=OLD.id) AND OLD.status='pending_payment' AND NEW.status IS DISTINCT FROM OLD.status AND coalesce(current_setting('app.payment_transition',true),'')<>'allowed' THEN RAISE EXCEPTION 'Use payment review'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_payment_order BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_payment_order();