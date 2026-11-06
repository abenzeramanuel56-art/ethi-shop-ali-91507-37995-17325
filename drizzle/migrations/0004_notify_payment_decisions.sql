CREATE OR REPLACE FUNCTION public.notify_payment_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_kind text; v_link text;
BEGIN
  IF NEW.state IS NOT DISTINCT FROM OLD.state THEN RETURN NEW; END IF;
  IF NEW.state NOT IN ('confirmed','rejected','failed') THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'payment_verifications' THEN
    -- physical approvals already notify through the order status trigger
    IF NEW.state = 'confirmed' THEN RETURN NEW; END IF;
    SELECT customer_id INTO v_user FROM orders WHERE id = NEW.order_id;
    v_kind := 'order'; v_link := '/account';
  ELSE
    v_user := NEW.customer_id; v_kind := NEW.kind; v_link := '/account';
  END IF;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, title, message, type, link)
  VALUES (v_user,
    CASE WHEN NEW.state = 'confirmed' THEN 'Payment approved' ELSE 'Payment rejected' END,
    CASE WHEN NEW.state = 'confirmed'
      THEN 'Your payment for ' || v_kind || ' #' || left(NEW.order_id::text, 8) || ' was approved.'
      ELSE 'Your payment for ' || v_kind || ' #' || left(NEW.order_id::text, 8) || ' was not accepted' || COALESCE(': ' || NEW.reason, '') || '. Please check and resubmit at checkout.' END,
    CASE WHEN NEW.state = 'confirmed' THEN 'success' ELSE 'error' END,
    v_link);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_payment_decision ON public.payment_verifications;
CREATE TRIGGER trg_notify_payment_decision AFTER UPDATE OF state ON public.payment_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_decision();
DROP TRIGGER IF EXISTS trg_notify_commerce_payment_decision ON public.commerce_payment_verifications;
CREATE TRIGGER trg_notify_commerce_payment_decision AFTER UPDATE OF state ON public.commerce_payment_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_decision();