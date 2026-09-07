

# Abeni Express — Multi-area upgrade plan

This plan groups your asks into 7 work blocks. I'll do them in this order. Tell me if you want to skip any block.

---

## 1. Real address (not just city) for everyone

**Problem:** Today we only save city + lat/lng. You want the **exact street/place address**.

**Fix:**
- In `LocationPicker`, after geolocation succeeds, reverse-geocode lat/lng → full address using a free public API (OpenStreetMap Nominatim, no key needed).
- Store the full address string in `shipping_address` / `seller_stores.location_address`.
- Show "Detected address: …" under the GPS button so the user can confirm.

---

## 2. Customer cannot order — "absolute location of that place" error

**Problem:** Checkout is blocking the order because location is missing/invalid.

**Fix:**
- Audit `Cart.tsx` / checkout submit. Make location **required but auto-filled** from profile if missing, with a clear inline message instead of a blocking generic error.
- If GPS fails, allow ordering as long as a typed address + city is provided.

---

## 3. Vehicle selection (customer) + vehicle-aware driver routing

**Schema changes (migration):**
- `driver_applications.vehicle_type` already exists ✅. Add `driver_wallets.vehicle_type` (synced on approval) so we can filter fast.
- Add `orders.preferred_vehicle_type text` (motorbike / car / van / truck / any).
- Add `pending_driver_orders.preferred_vehicle_type text`.

**Customer side:** In checkout, add a Vehicle picker (Motorbike, Car, Van, Truck, Any). Default = Any.

**Driver side:**
- During driver application, vehicle_type is already collected — make it **required**.
- On the driver's pending-orders dashboard, only show orders where `preferred_vehicle_type = 'any' OR = driver.vehicle_type`.
- Driver realtime notification only fires for matching vehicle.

---

## 4. Driver map view (seller pickup → customer drop-off)

In `src/pages/driver/Dashboard.tsx`:
- Stage 1 (status = `pending` / `accepted`): show **seller location** on `SimpleMap` + "Open in Google Maps" directions from driver's current GPS to seller.
- Stage 2 (after `seller_confirmed_pickup = true`): switch the map to show **customer location** + directions from current GPS to customer.
- Distance + earning recalculated on each stage and shown clearly.

---

## 5. Price calculator — make it 100% correct

Centralize in `src/lib/pricing.ts`:
- `deliveryFee = max(50, distanceKm * 25)` ETB (driver gets 25 ETB/km, platform adds nothing on delivery).
- `productSubtotal = sum(item.price_etb * qty)`.
- `platformCommission = productSubtotal * 0.10` (deducted from seller payout, not added to customer).
- `customerTotal = productSubtotal + deliveryFee`.
- `sellerPayout = productSubtotal * 0.90`.
- `driverPayout = distanceKm * 25`.

Replace ad-hoc math in Cart, Checkout, seller wallet, driver wallet with these helpers.

---

## 6. Storage bucket 404 — admin can't view ID / payment-proof images

**Cause:** UI is requesting public URLs from buckets that either don't exist or aren't named the way the code expects (`id-photos`, `payment-proofs`, `digital-products`, `ad-media`, `support-attachments`).

**Fix (migration):**
- Ensure all these buckets exist:
  - `id-photos` (private)
  - `payment-proofs` (private)
  - `digital-products` (private)
  - `ad-media` (public)
  - `support-attachments` (private) — new, for customer screenshots in agent/tickets
- Re-apply storage RLS so admins can read all, owners can read/write their own.
- Switch admin viewing code from `getPublicUrl` → `createSignedUrl(60)` for private buckets.

---

## 7. Agent upgrades

### 7a. Page-aware agent
`FloatingAbeniAgent` injects a hidden system note like:
- "User is currently on the COMING SOON page — they cannot use the app yet, only answer general questions and capture interest."
- "User is on the home page / route X — full app access."

### 7b. Customer screenshot attachments in agent + tickets
- Add an image upload button in `FloatingAbeniAgent` and `Support.tsx`.
- Uploads go to `support-attachments/{user_id}/...`.
- Image is sent to the agent as a multimodal user message (Gemini supports images).
- When forwarded to admin, the image URL is included in the ticket / replies.

### 7c. Admin chat-style view of forwarded agent conversations
In `src/pages/admin/SupportTickets.tsx`:
- Detect tickets created by "Forward to Admin" (we'll mark them with `category = 'agent_forward'` and store the transcript as alternating chat bubbles in `ticket_replies` instead of one big paragraph).
- Render as left/right chat bubbles labeled **Customer** vs **Abeni Agent** vs **Admin**.

### 7d. Admin → Agent command console (new)
New page `src/pages/admin/AgentConsole.tsx`:
- Chat UI where admin types updates ("New rule: refunds now take 48h", "New bank: Dashen added").
- Stored in new table `agent_instructions (id, admin_id, instruction, created_at, is_active)`.
- The `abeni-agent` edge function reads the latest active instructions on each call and prepends them to the system prompt — so the agent always knows the newest admin-issued facts.

---

## Technical summary (for reference)

- **New tables:** `agent_instructions`
- **Altered tables:** `orders` (+preferred_vehicle_type), `pending_driver_orders` (+preferred_vehicle_type), `driver_wallets` (+vehicle_type), `support_tickets` (+attachment_url optional)
- **New buckets:** `support-attachments`; verify `id-photos`, `payment-proofs`, `digital-products`, `ad-media`
- **New files:** `src/lib/pricing.ts`, `src/pages/admin/AgentConsole.tsx`
- **Edited:** `LocationPicker.tsx`, `Cart.tsx` (or checkout page), `ApplyDriver.tsx`, `driver/Dashboard.tsx`, `seller/Wallet.tsx`, `driver/Wallet.tsx`, `FloatingAbeniAgent.tsx`, `Support.tsx`, `admin/SupportTickets.tsx`, `supabase/functions/abeni-agent/index.ts`
- **Migration:** schema + storage buckets + RLS in one go.

---

Approve this plan and I'll start with **block 6 (storage 404 fix) + block 1 (real address)** first since those unblock everything else, then work down the list.
