CREATE TABLE public.commerce_payment_verifications (
 order_id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('service','digital')), customer_id uuid NOT NULL REFERENCES public.profiles(id),
 state text NOT NULL DEFAULT 'pending_payment' CHECK(state IN ('pending_payment','verifying','confirmed','failed','pending_review','rejected')),
 method text, payment_method text, screenshot_path text, transaction_id text, reference_id text, request_id text, mode text, verified_amount numeric,
 attempts integer NOT NULL DEFAULT 0, reason text, service_error boolean NOT NULL DEFAULT false, lock_token uuid, locked_at timestamptz,
 approved_by uuid, approved_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commerce_payment_verifications TO authenticated;
GRANT ALL ON public.commerce_payment_verifications TO service_role;
ALTER TABLE public.commerce_payment_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY commerce_verification_read ON public.commerce_payment_verifications FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.commerce_payment_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.commerce_payment_verifications(order_id), state text NOT NULL, reason text, admin_id uuid, request_id text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commerce_payment_events TO authenticated;
GRANT ALL ON public.commerce_payment_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.commerce_payment_events_id_seq TO service_role;
ALTER TABLE public.commerce_payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY commerce_events_read ON public.commerce_payment_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.commerce_payment_verifications v WHERE v.order_id=commerce_payment_events.order_id AND (v.customer_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE TABLE public.payment_identifier_registry (
 identifier text PRIMARY KEY CHECK(identifier=lower(regexp_replace(identifier,'\s','','g'))), order_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('physical','service','digital')), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_identifier_registry TO service_role;
ALTER TABLE public.payment_identifier_registry ENABLE ROW LEVEL SECURITY;
INSERT INTO public.payment_identifier_registry(identifier,order_id,kind) SELECT identifier,order_id,'physical' FROM public.payment_receipt_claims;
CREATE FUNCTION public.sync_physical_payment_identifier() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.payment_identifier_registry(identifier,order_id,kind) VALUES(NEW.identifier,NEW.order_id,'physical') ON CONFLICT DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.payment_identifier_registry WHERE identifier=NEW.identifier AND order_id=NEW.order_id AND kind='physical') THEN RAISE unique_violation; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_physical_payment_identifier BEFORE INSERT ON public.payment_receipt_claims FOR EACH ROW EXECUTE FUNCTION public.sync_physical_payment_identifier();
CREATE FUNCTION public.guard_commerce_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE k text; item record; protected boolean;
BEGIN
 k:=CASE WHEN TG_TABLE_NAME='service_orders' THEN 'service' ELSE 'digital' END;
 IF TG_OP='INSERT' THEN
  IF NEW.status IS DISTINCT FROM 'pending_payment' THEN RAISE EXCEPTION 'Initial payment state required'; END IF;
  IF k='service' THEN
   SELECT * INTO item FROM public.services WHERE id=NEW.service_id AND is_active=true;
   IF item.id IS NULL OR coalesce(NEW.quantity,1) NOT BETWEEN 1 AND 10 OR coalesce(NEW.hours,1) NOT BETWEEN 1 AND 24 THEN RAISE EXCEPTION 'Invalid service'; END IF;
   NEW.seller_id:=item.seller_id;
   NEW.total_etb:=item.price_etb * CASE WHEN item.price_type='hourly' THEN coalesce(NEW.hours,1) ELSE coalesce(NEW.quantity,1) END;
  ELSE
   SELECT * INTO item FROM public.digital_products WHERE id=NEW.digital_product_id AND is_active=true AND ai_verification_status='approved';
   IF item.id IS NULL THEN RAISE EXCEPTION 'Invalid digital product'; END IF;
   NEW.seller_id:=item.seller_id; NEW.price_etb:=item.price_etb;
  END IF;
  RETURN NEW;
 END IF;
 IF k='service' THEN
  protected:=NEW.total_etb IS DISTINCT FROM OLD.total_etb OR NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.service_id IS DISTINCT FROM OLD.service_id OR NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.hours IS DISTINCT FROM OLD.hours;
 ELSE
  protected:=NEW.price_etb IS DISTINCT FROM OLD.price_etb OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id OR NEW.digital_product_id IS DISTINCT FROM OLD.digital_product_id;
 END IF;
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND protected THEN RAISE EXCEPTION 'Protected payment fields'; END IF;
 IF OLD.status='pending_payment' AND NEW.status IS DISTINCT FROM OLD.status AND (
  EXISTS(SELECT 1 FROM public.commerce_payment_verifications WHERE order_id=OLD.id) OR NOT public.has_role(auth.uid(),'admin')
 ) AND coalesce(current_setting('app.commerce_payment_transition',true),'')<>'allowed' THEN RAISE EXCEPTION 'Use payment review'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_guard_service_payment BEFORE INSERT OR UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.guard_commerce_payment();
CREATE TRIGGER a_guard_digital_payment BEFORE INSERT OR UPDATE ON public.digital_product_orders FOR EACH ROW EXECUTE FUNCTION public.guard_commerce_payment();
CREATE FUNCTION public.commerce_payment_begin(p_kind text,p_order_id uuid,p_user_id uuid,p_ip_hash text,p_method text,p_payment_method text,p_transaction_id text,p_screenshot_path text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; total numeric; st text; v public.commerce_payment_verifications; tok uuid; call_id bigint;
BEGIN
 IF p_kind NOT IN ('service','digital') OR p_payment_method NOT IN ('cbe','telebirr') THEN RAISE EXCEPTION 'Invalid kind or method'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)); PERFORM pg_advisory_xact_lock(hashtext(p_ip_hash));
 IF p_kind='service' THEN SELECT customer_id,total_etb,status INTO owner_id,total,st FROM public.service_orders WHERE id=p_order_id FOR UPDATE;
 ELSE SELECT buyer_id,price_etb,status INTO owner_id,total,st FROM public.digital_product_orders WHERE id=p_order_id FOR UPDATE; END IF;
 IF owner_id IS NULL OR owner_id<>p_user_id THEN RETURN jsonb_build_object('state','failed','reason','order_not_found'); END IF;
 IF st='cancelled' THEN RETURN jsonb_build_object('state','rejected','reason','rejected'); END IF;
 IF st IN ('payment_verified','in_progress','completed') THEN RETURN jsonb_build_object('state','confirmed','order_id',p_order_id); END IF;
 IF st<>'pending_payment' THEN RETURN jsonb_build_object('state','failed','reason','order_not_found'); END IF;
 INSERT INTO public.commerce_payment_verifications(order_id,kind,customer_id) VALUES(p_order_id,p_kind,p_user_id) ON CONFLICT DO NOTHING;
 SELECT * INTO v FROM public.commerce_payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.kind<>p_kind THEN RAISE EXCEPTION 'Invalid target'; END IF;
 IF v.state IN ('confirmed','pending_review','rejected') THEN RETURN jsonb_build_object('state',v.state,'reason',v.reason); END IF;
 IF v.state='verifying' AND v.locked_at>now()-interval '90 seconds' THEN RETURN jsonb_build_object('state','verifying','reason','in_progress'); END IF;
 IF v.state='verifying' OR v.attempts>=5 THEN
  UPDATE public.commerce_payment_verifications SET state='pending_review',reason=CASE WHEN v.attempts>=5 THEN 'attempt_limit' ELSE 'service_error' END,service_error=v.state='verifying',lock_token=null,updated_at=now() WHERE order_id=p_order_id;
  INSERT INTO public.commerce_payment_events(order_id,state,reason) VALUES(p_order_id,'pending_review',CASE WHEN v.attempts>=5 THEN 'attempt_limit' ELSE 'service_error' END);
  RETURN jsonb_build_object('state','pending_review','reason',CASE WHEN v.attempts>=5 THEN 'attempt_limit' ELSE 'service_error' END);
 END IF;
 IF (SELECT count(*) FROM public.payment_verification_calls WHERE user_id=p_user_id AND created_at>now()-interval '1 minute')>=5 OR (SELECT count(*) FROM public.payment_verification_calls WHERE ip_hash=p_ip_hash AND created_at>now()-interval '1 minute')>=20 THEN RETURN jsonb_build_object('state','failed','reason','rate_limit'); END IF;
 tok:=gen_random_uuid();
 UPDATE public.commerce_payment_verifications SET state='verifying',method=p_method,payment_method=p_payment_method,transaction_id=nullif(lower(regexp_replace(p_transaction_id,'\s','','g')),''),screenshot_path=coalesce(p_screenshot_path,screenshot_path),attempts=attempts+1,lock_token=tok,locked_at=now(),reason=null,updated_at=now() WHERE order_id=p_order_id;
 INSERT INTO public.commerce_payment_events(order_id,state) VALUES(p_order_id,'verifying');
 INSERT INTO public.payment_verification_calls(user_id,ip_hash,order_id) VALUES(p_user_id,p_ip_hash,p_order_id) RETURNING id INTO call_id;
 RETURN jsonb_build_object('state','verifying','token',tok,'call_id',call_id,'amount',total,'attempts',v.attempts+1);
END $$;
REVOKE ALL ON FUNCTION public.commerce_payment_begin(text,uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commerce_payment_begin(text,uuid,uuid,text,text,text,text,text) TO service_role;
CREATE FUNCTION public.commerce_payment_finish(p_order_id uuid,p_token uuid,p_state text,p_reason text,p_reference text,p_request text,p_mode text,p_amount numeric,p_service_error boolean,p_call_id bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.commerce_payment_verifications; total numeric; st text; ident text; outcome text:=p_state; why text:=p_reason;
BEGIN
 SELECT * INTO v FROM public.commerce_payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.state='confirmed' THEN RETURN jsonb_build_object('state','confirmed','order_id',p_order_id); END IF;
 IF v.lock_token IS DISTINCT FROM p_token OR v.state<>'verifying' OR p_token IS NULL THEN RETURN jsonb_build_object('state',v.state,'reason','in_progress'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.payment_verification_calls WHERE id=p_call_id AND order_id=p_order_id AND user_id=v.customer_id) THEN RAISE EXCEPTION 'Invalid call'; END IF;
 IF v.kind='service' THEN SELECT total_etb,status INTO total,st FROM public.service_orders WHERE id=p_order_id FOR UPDATE;
 ELSE SELECT price_etb,status INTO total,st FROM public.digital_product_orders WHERE id=p_order_id FOR UPDATE; END IF;
 IF st<>'pending_payment' OR outcome NOT IN ('confirmed','failed','pending_review') THEN RAISE EXCEPTION 'Invalid state'; END IF;
 IF outcome='confirmed' AND (p_amount IS NULL OR p_amount<>total) THEN outcome:=CASE WHEN p_amount IS NULL OR p_amount>total THEN 'pending_review' ELSE 'failed' END; why:=CASE WHEN p_amount IS NULL THEN 'amount_missing' ELSE 'amount_mismatch' END; END IF;
 IF outcome='confirmed' AND nullif(p_reference,'') IS NULL AND v.transaction_id IS NULL THEN outcome:='pending_review'; why:='reference_missing'; END IF;
 IF outcome='confirmed' THEN
  BEGIN
   FOR ident IN SELECT DISTINCT lower(regexp_replace(x,'\s','','g')) FROM unnest(ARRAY[v.transaction_id,p_reference]) x WHERE nullif(x,'') IS NOT NULL LOOP
    INSERT INTO public.payment_identifier_registry(identifier,order_id,kind) VALUES(ident,p_order_id,v.kind) ON CONFLICT DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.payment_identifier_registry WHERE identifier=ident AND order_id=p_order_id AND kind=v.kind) THEN RAISE unique_violation; END IF;
   END LOOP;
  EXCEPTION WHEN unique_violation THEN outcome:='failed'; why:='receipt_used'; END;
 END IF;
 IF outcome='failed' AND v.attempts>=5 THEN outcome:='pending_review';why:='attempt_limit'; END IF;
 UPDATE public.commerce_payment_verifications SET state=outcome,reason=why,reference_id=p_reference,request_id=p_request,mode=p_mode,verified_amount=p_amount,service_error=p_service_error,lock_token=null,updated_at=now() WHERE order_id=p_order_id;
 UPDATE public.payment_verification_calls SET service_error=p_service_error,mode=p_mode,request_id=p_request WHERE id=p_call_id;
 INSERT INTO public.commerce_payment_events(order_id,state,reason,request_id) VALUES(p_order_id,outcome,why,p_request);
 IF outcome='confirmed' THEN
  PERFORM set_config('app.commerce_payment_transition','allowed',true);
  IF v.kind='service' THEN UPDATE public.service_orders SET status='payment_verified',payment_method=v.payment_method WHERE id=p_order_id;
  ELSE UPDATE public.digital_product_orders SET status='payment_verified',payment_method=v.payment_method WHERE id=p_order_id; END IF;
 END IF;
 RETURN jsonb_build_object('state',outcome,'reason',why,'order_id',p_order_id,'attempts',v.attempts,'mode',p_mode);
END $$;
REVOKE ALL ON FUNCTION public.commerce_payment_finish(uuid,uuid,text,text,text,text,text,numeric,boolean,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commerce_payment_finish(uuid,uuid,text,text,text,text,text,numeric,boolean,bigint) TO service_role;
CREATE FUNCTION public.admin_review_commerce_payment(p_order_id uuid,p_approve boolean,p_reason text,p_receipt_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.commerce_payment_verifications; ident text; receipt text; st text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Review reason required'; END IF;
 SELECT * INTO v FROM public.commerce_payment_verifications WHERE order_id=p_order_id FOR UPDATE;
 IF v.state='confirmed' THEN RETURN jsonb_build_object('state','confirmed'); END IF;
 IF v.state IS DISTINCT FROM 'pending_review' THEN RAISE EXCEPTION 'Pending review required'; END IF;
 IF v.kind='service' THEN SELECT status INTO st FROM public.service_orders WHERE id=p_order_id FOR UPDATE;
 ELSE SELECT status INTO st FROM public.digital_product_orders WHERE id=p_order_id FOR UPDATE; END IF;
 IF st<>'pending_payment' THEN RAISE EXCEPTION 'Pending payment required'; END IF;
 receipt:=nullif(lower(regexp_replace(coalesce(p_receipt_id,''),'\s','','g')),'');
 IF length(receipt)>64 THEN RAISE EXCEPTION 'Invalid receipt ID'; END IF;
 IF p_approve THEN
  IF receipt IS NULL AND v.transaction_id IS NULL AND v.reference_id IS NULL THEN RAISE EXCEPTION 'receipt_id_required'; END IF;
  FOR ident IN SELECT DISTINCT lower(regexp_replace(x,'\s','','g')) FROM unnest(ARRAY[v.transaction_id,v.reference_id,receipt]) x WHERE nullif(x,'') IS NOT NULL LOOP
   INSERT INTO public.payment_identifier_registry(identifier,order_id,kind) VALUES(ident,p_order_id,v.kind) ON CONFLICT DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM public.payment_identifier_registry WHERE identifier=ident AND order_id=p_order_id AND kind=v.kind) THEN RAISE EXCEPTION 'receipt_used'; END IF;
  END LOOP;
 END IF;
 UPDATE public.commerce_payment_verifications SET state=CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END,reason=trim(p_reason),reference_id=coalesce(receipt,reference_id),approved_by=auth.uid(),approved_at=now(),updated_at=now() WHERE order_id=p_order_id;
 INSERT INTO public.commerce_payment_events(order_id,state,reason,admin_id) VALUES(p_order_id,CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END,trim(p_reason),auth.uid());
 PERFORM set_config('app.commerce_payment_transition','allowed',true);
 IF v.kind='service' THEN UPDATE public.service_orders SET status=CASE WHEN p_approve THEN 'payment_verified' ELSE 'cancelled' END,payment_method=v.payment_method WHERE id=p_order_id;
 ELSE UPDATE public.digital_product_orders SET status=CASE WHEN p_approve THEN 'payment_verified' ELSE 'cancelled' END,payment_method=v.payment_method WHERE id=p_order_id; END IF;
 RETURN jsonb_build_object('state',CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END);
END $$;
REVOKE ALL ON FUNCTION public.admin_review_commerce_payment(uuid,boolean,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_review_commerce_payment(uuid,boolean,text,text) TO authenticated;