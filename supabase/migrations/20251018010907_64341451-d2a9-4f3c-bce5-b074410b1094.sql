-- Create notifications table for user inbox
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to send notification to all users
CREATE OR REPLACE FUNCTION public.send_notification_to_all(
  notification_title TEXT,
  notification_message TEXT,
  notification_type TEXT DEFAULT 'info'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  -- Insert notification for all users
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT id, notification_title, notification_message, notification_type
  FROM auth.users;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Function to automatically send notifications on order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only send notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'payment_verified' THEN
        notification_title := 'Payment Confirmed';
        notification_message := 'Your payment for order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been verified. Your order is being processed.';
      WHEN 'ordered_on_aliexpress' THEN
        notification_title := 'Order Placed';
        notification_message := 'Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been placed with our supplier.';
      WHEN 'shipped' THEN
        notification_title := 'Order Shipped!';
        notification_message := 'Great news! Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been shipped.' || 
          CASE WHEN NEW.tracking_number IS NOT NULL THEN ' Tracking: ' || NEW.tracking_number ELSE '' END;
      WHEN 'delivered' THEN
        notification_title := 'Order Delivered';
        notification_message := 'Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' has been delivered. Thank you for your purchase!';
      ELSE
        notification_title := 'Order Update';
        notification_message := 'Your order #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' status has been updated to: ' || NEW.status;
    END CASE;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.customer_id, notification_title, notification_message, 'order_update');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for order status changes
DROP TRIGGER IF EXISTS trigger_order_status_notification ON public.orders;
CREATE TRIGGER trigger_order_status_notification
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Function to notify on withdrawal request status change
CREATE OR REPLACE FUNCTION public.notify_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only notify if status changed from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    CASE NEW.status
      WHEN 'approved' THEN
        notification_title := 'Withdrawal Approved';
        notification_message := 'Your withdrawal request of ' || NEW.amount_etb || ' ETB has been approved and is being processed.';
      WHEN 'paid' THEN
        notification_title := 'Withdrawal Paid';
        notification_message := 'Your withdrawal of ' || NEW.amount_etb || ' ETB has been paid to your account.';
      WHEN 'rejected' THEN
        notification_title := 'Withdrawal Rejected';
        notification_message := 'Your withdrawal request of ' || NEW.amount_etb || ' ETB was rejected.' ||
          CASE WHEN NEW.admin_notes IS NOT NULL THEN ' Reason: ' || NEW.admin_notes ELSE '' END;
    END CASE;
    
    -- Insert notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, notification_title, notification_message, 'withdrawal_update');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for withdrawal status changes
DROP TRIGGER IF EXISTS trigger_withdrawal_status_notification ON public.withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_status_notification
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_withdrawal_status_change();