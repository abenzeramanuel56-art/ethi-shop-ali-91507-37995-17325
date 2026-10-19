# Architecture rules

- Keep staging robots directives in an early hostname-conditional head script, not a static noindex tag, because production and staging share the same HTML artifact.
- Keep payment verification in the backend with atomic payment_begin/payment_finish/admin_review_payment transitions; a separate verification state maps confirmed to the existing payment_verified tracking state to preserve fulfilment.
- Resolve payment provider identifiers from ShegerPay providers and fail to manual review when the response contract cannot establish amount or recipient; never infer success from screenshots in the browser.
- Keep payment review in a dedicated admin tab and use the atomic review RPC for verification-backed orders, preserving legacy fulfillment screens.