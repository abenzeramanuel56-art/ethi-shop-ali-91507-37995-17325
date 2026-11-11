# Block reuse of someone else's old transfer

## Problem
At checkout, a customer can submit the transaction ID of any transfer that reached the Abeni Express account, including one sent by a different person or for a different reason. If the amount equals the order total and the ID hasn't been used before, the order is approved automatically.

## Changes
1. **Sender name check on by default**: ShegerPay also checks that the person who sent the money has the same name as the customer's profile. If the names differ, the payment goes to Payment Review instead of being approved.
2. **Freshness check**: Only transfers made after the order was created are approved automatically. Older transfers go to Payment Review.
3. **Admin setting**: Add a toggle in payment settings so the sender-name check can be turned off if needed.

## Technical details
- Set `expected_sender_enabled` to true by default in `checkout_payment_details`. When ShegerPay reports a sender name, compare it with `profiles.full_name`; on a mismatch or a missing name, go to `pending_review` with the reason `sender_mismatch`.
- Read the transfer date from the ShegerPay response (`date`, `transaction_date`, `created_at`). If it is earlier than the order's `created_at`, or the date is missing, go to `pending_review` with the reason `stale_receipt`.
- Add tests for the sender-mismatch and stale-receipt rules in `scripts/payment-policy.test.ts`.
