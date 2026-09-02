# Lemon Squeezy store — settings and copy to paste

Images in this folder are rendered from the HTML templates by `./build.sh`
(headless Chrome; palette and mark are the ones in `server/src/site.ts`).
Prices come from ADR-0001 A1: Starter €12 → 40 credits, Studio €29 → 120 credits.

## Store (Settings → General / Design)

| Field | Value |
| --- | --- |
| Store name | Tembro |
| Store URL | `tembro.lemonsqueezy.com` |
| Currency | EUR |
| Logo | `tembro-store-logo-1024.png` |
| Favicon | `tembro-store-favicon-512.png` |
| Cover / social image | `tembro-store-cover.png` (1600×900) |
| Support email | support@gettembro.com |
| Website | https://gettembro.com |
| Tagline | Make music by talking to Live. |

Colours if the theme asks: background `#1b1720`, text `#ded8c7`, accent `#a89b5c`,
button `#a56554`.

## Product (Products → New product)

- **Name:** Tembro credits
- **Pricing:** Single payment · **Variants** enabled (see below)
- **Tax category:** Software as a service (digital goods)
- **Media:** `tembro-credits-product.png` (first), `tembro-credits-starter.png`,
  `tembro-credits-studio.png`
- **Files:** attach the notarized `Tembro-0.1.5-beta.dmg` once Apple approves;
  until then the GitHub release DMG.
- **License keys:** on · activation limit **3** · never expires
- **Confirmation modal / receipt note:**
  > Your license key is above. In Ableton Live, drop Tembro on a MIDI track,
  > enter your email and this key once — your credits are already on the account.
  > Need help? support@gettembro.com

**Description**

> Tembro is a chat device for Ableton Live 12 (Max for Live). Ask for a beat,
> a chord progression, a melody or a whole arrangement and Tembro builds it in
> your Set — real MIDI clips on real tracks, read back and verified.
>
> Credits are what Tembro spends per request: 1 for a clip tweak, 2 for a beat
> or harmony + melody, 4 for a full arrangement. They live on your Tembro account
> and never expire. Buy a pack when you need one — there is no subscription.
>
> **Starter — €12 — 40 credits.** About ten whole-track arrangements, or a few
> weeks of beats, chord ideas and clip edits.
>
> **Studio — €29 — 120 credits.** Three Starter packs for the price of two and
> a half, for producers who use Tembro every session.
>
> Requirements: macOS, Ableton Live 12 Suite or Standard + Max for Live.
> Download and setup guide: https://gettembro.com

### Variants

| Variant | Price | Description (one line) |
| --- | --- | --- |
| Starter · 40 credits | €12.00 | 40 Tembro credits, one-time, never expire |
| Studio · 120 credits | €29.00 | 120 Tembro credits, one-time, never expire — best value |

Set Studio as the default variant only if the checkout shows one pack; otherwise
leave Starter first.

## Tax display — one decision to take

Lemon Squeezy is merchant of record and adds VAT per country. Two options:

- **Prices include tax** (recommended): the customer always sees €12 / €29.
  Net to us in Italy ≈ €9.84 / €23.77 before the LS fee (5 % + $0.50). Starter
  nets ≈ €8.85 → ADR margin worst case drops from 66 % to ≈ 58 %; still fine.
- **Prices exclude tax:** an Italian customer pays €14.64 / €35.38 at checkout;
  the page says "from €12" and the checkout says something else.

## After the product exists (Worker side)

1. Settings → Webhooks → `https://gettembro.com/v0/webhooks/lemonsqueezy`,
   event `order_created`, copy the signing secret.
2. No API key is needed: license validate/activate are public endpoints.
3. In `server/` (after merging PR #51 `feat/credit-packs`):
   ```bash
   npx wrangler secret put LEMON_SQUEEZY_WEBHOOK_SECRET
   npx wrangler secret put LEMON_SQUEEZY_STORE_ID
   npx wrangler secret put LEMON_SQUEEZY_PRODUCT_ID
   ```
   then in `wrangler.jsonc` set `CREDIT_PACKS` to
   `"<starter_variant_id>:40,<studio_variant_id>:120"` and `CHECKOUT_URL` to
   the product's hosted checkout URL; `npm run deploy`.
4. Test mode first: buy Starter with card `4242 4242 4242 4242`, then check
   `credit_ledger` in D1 shows a grant row keyed by the Lemon Squeezy order id
   and that the license key signs in from the device.
