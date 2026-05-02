## Goals

Fix five issues the user reported on the live site.

---

### 1. Seller can't get current location

`LocationPicker` already calls `navigator.geolocation.getCurrentPosition` from a button click (good), but the preview iframe blocks geolocation by default unless the parent page grants permission to the iframe. That's why the browser says "can't get permission" even though the user clicks Allow.

**Fix:** explicitly allow geolocation inside iframes by ensuring our app sends the right Permissions-Policy and that the LocationPicker handles the iframe-permission-denied case with a clearer message + a "copy these coordinates" fallback. Concretely:
- Add a `Permissions-Policy: geolocation=(self)` meta tag in `index.html` so geolocation is allowed when the app is embedded.
- In `LocationPicker.tsx`, when `err.code === 1` (permission denied) and we detect we're inside an iframe (`window.self !== window.top`), show a tailored message: "The preview blocks location. Open the live site (Open in new tab) to grant access, or pick your city below / type coordinates."
- Make the "Quick city" buttons more prominent on the seller setup page so a seller is never stuck.

### 2. Factory reset says "need cause or clause"

Looking at `src/pages/admin/Maintenance.tsx`, the factory reset uses a JS `prompt()` asking the admin to type the word **`RESET`** (in capital letters). The user is misreading this as needing a "cause/clause".

**Fix:** replace the `prompt()` with a proper styled confirmation dialog (shadcn AlertDialog) that:
- Clearly explains what will be wiped.
- Has a single "Type RESET to confirm" input with a live-validated red/green border.
- Only enables the destructive button when the input equals `RESET`.

Also surface the underlying RPC error inline (the RPC `admin_factory_reset_transactional` already exists and works — the problem is purely the prompt UX).

### 3. Advertisement feature

The system is already implemented (`AdvertisementPlayer` mounted in `App.tsx`, admin page `/admin/advertisements` with trigger types). It likely just looks broken because no ads exist yet.

**Fix:**
- Add a small empty-state hint in `/admin/advertisements` telling admin "Create your first ad — it will play based on the trigger you choose."
- Add a "Test Now" button on each ad row that previews it immediately for the admin (calls the same player overlay).
- Verify the player isn't being suppressed on `/admin/*` routes (we will skip ads on admin routes to avoid disturbing admin work).

### 4. Report product / store option

Already wired:
- `ReportItemDialog` is mounted on `/products` and `/digital-market` cards (flag icon).
- `ReportStoreDialog` is mounted on the `Store` page.

The user probably can't find the flag icon. **Fix:** make the report button more visible — give it a label "Report" on hover, increase the icon's contrast, and add a "Report this store" link in the store header next to the store name.

### 5. Homepage AliExpress wording + rotating badge position

The homepage and many strings still say "Shop from AliExpress with Ethiopian Birr", "AliExpress Ethiopia", etc. Also `RotatingBadge` is currently rendered from `Navbar` (so technically already at bottom-right via `fixed bottom-4 right-4`), but the user wants confirmation it stays at the bottom of the page.

**Fix:**
- Update `LanguageContext.tsx` strings (English + Amharic) to remove all AliExpress mentions:
  - `nav.brand`: `'Abeni Express'` (am: `'አቤኒ ኤክስፕረስ'`)
  - `home.hero.title`: `'Ethiopia's Independent Marketplace'` (am equivalent)
  - `home.hero.subtitle`: `'Shop verified products and services from local sellers, paid in Ethiopian Birr, delivered by our driver network.'`
  - `products.subtitle`: `'Curated products from independent local sellers'`
- Leave the `RequestItem` page wording intact only if it's the legitimate "request a custom item from any external link" feature; rename "AliExpress URL" to "Product URL" and update placeholder to a generic example.
- Keep the rotating badge fixed at `bottom-4 right-4` (already correct), and ensure it isn't covered by the bottom nav on mobile by giving it `bottom-20` on small screens.

---

## Files to change

```
src/contexts/LanguageContext.tsx     — rewrite all AliExpress strings (en + am)
src/pages/Home.tsx                   — no logic change (uses translations)
src/pages/RequestItem.tsx            — rename label/placeholder to generic "Product URL"
src/components/LocationPicker.tsx    — iframe-aware error message + clearer fallback
index.html                           — add Permissions-Policy meta tag
src/pages/admin/Maintenance.tsx      — replace prompt() with AlertDialog + typed confirmation
src/pages/admin/Advertisements.tsx   — add empty state + "Test Now" button
src/components/AdvertisementPlayer.tsx — skip auto-play on /admin/* routes
src/pages/Products.tsx               — make Report button more discoverable (label on hover)
src/pages/DigitalMarket.tsx          — same
src/pages/Store.tsx                  — add "Report this store" text link in header
src/components/RotatingBadge.tsx     — bottom-20 on mobile so it isn't hidden
```

No database or edge-function changes are needed — all the backend pieces (factory reset RPC, advertisements table with trigger_type, store_reports) already exist.

## Out of scope

- Renaming the database enum value `ordered_on_aliexpress` (that's an internal status name customers never see in UI).
- Removing the `aliexpress_url` column on `products` (used internally by admin image fetcher; not visible to customers).