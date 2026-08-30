# Tembro API — paid V0

Tembro is sold as a Lemon Squeezy subscription with a downloadable Max for
Live device and a generated license key. The device opens a session against this
Cloudflare Worker; the Worker validates the license, owns the AI key, and keeps
the user's credit balance in Neon Postgres.

```text
Worker landing page -> Lemon Squeezy checkout -> receipt + download + license key
                                                    |
                                                    v
Ableton Live -> Max for Live chat -> Cloudflare Worker -> Neon Postgres
                                      |                    auth + credits
                                      v
                                  model API
                                      |
                                      v
               validated action plan -> local LOM executor -> Ableton Live
```

The backend never connects directly to Ableton. It returns a zod-validated
action plan; execution and readback remain on the customer's machine.

## Customer journey

1. The customer opens the public product URL and pays in Lemon Squeezy.
2. Lemon Squeezy emails the receipt, download link, and generated license key.
3. The first `subscription_payment_success` webhook creates the user and grants
   the month's credits. Webhook retries are idempotent by invoice ID.
4. The customer installs the `.amxd`, drops it into a Live Set, and enters the
   purchase email and license key once.
5. `POST /v0/auth/license` activates the key for that computer and returns a
   30-day bearer session. Only a SHA-256 hash of the raw license key is stored.
6. Each chat request has a client-generated UUID. The API reserves one credit
   before calling the model, never charges a retry twice, and refunds the credit
   if the provider or response validation fails.
7. The device shows the reply, executes the validated action plan locally, and
   reports the verified Live readback or the exact failed step.

## Credit model for V0

`1 credit = 1 successful chat turn`. `SUBSCRIPTION_GRANT_CREDITS` controls the
monthly allowance and `CHAT_COST_CREDITS` controls the per-turn charge. The
model's input/output/total token counts are logged with each completed request,
so the commercial allowance can be tuned from real usage without exposing the
vendor API key or changing the customer protocol.

V0 uses `gpt-5.6-luna` with low reasoning effort through OpenAI's Chat
Completions endpoint. A sensible launch baseline is 500 turns/month, then
review p50/p95 token usage before
adding a higher-cost “deep” mode. The server currently caps model output at
2,000 tokens and sends at most 30 stored messages.

For V0, use a dedicated Lemon Squeezy store (or keep only this one subscription
product in the store). Subscription invoice webhook payloads reliably identify
the store and customer, but may omit the original product ID; the Worker rejects
an explicit mismatched product ID and relies on the dedicated-store boundary
when it is absent.

## API

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /` | no | public Tembro product page and Lemon Squeezy buy link |
| `GET /v0/health` | no | liveness and protocol version |
| `POST /v0/auth/license` | no | activate/validate Lemon Squeezy license and create session |
| `POST /v0/webhooks/lemonsqueezy` | HMAC | grant subscription credits exactly once per invoice |
| `GET /v0/credits` | bearer | current balance |
| `POST /v0/chat` | bearer | chat + Live context -> reply and validated LOM action plan |
| `POST /v0/events` | bearer | client action/readback/error telemetry |

Every client chat payload includes `protocol_version: "0.1"`. The action surface
is defined in `src/types.ts`: `set_tempo`, `create_midi_track`, `load_device`,
`create_clip`, `replace_notes`, `fire_clip`, `fire_scene`, `stop_all`, and
`undo`. Invalid model output never reaches Live.

## Local development

This repo uses npm and commits `package-lock.json`.

```bash
cd server
npm ci
npm run typecheck
npm test

cp .dev.vars.example .dev.vars
npm run dev:worker
```

`.dev.vars` is ignored and must never be committed. `npm run dev` still starts
the in-memory development server with `/v0/auth/dev-signin`; the Worker entry
point never enables that route.

## Public product page

The same Hono Worker serves the public Tembro page at `/`, so V0 needs only one
Cloudflare deployment and one custom domain. Set `CHECKOUT_URL` to the hosted
Lemon Squeezy checkout URL and `SUPPORT_EMAIL` to the public support address.
Until a valid HTTPS checkout URL is configured, every buy button displays
`[ ACCESS_PENDING ]` and cannot navigate anywhere.

The page deliberately uses no third-party JavaScript, fonts, tracking pixels,
or client-side API keys. Its content-security policy blocks framing and limits
assets to the same origin. Keep the Lemon Squeezy and OpenAI credentials in the
Worker environment; they never belong in the HTML or Max for Live bundle.

## Neon setup

1. Create a Neon project and copy its pooled connection string.
2. Run `migrations/001_init.sql` in the Neon SQL Editor (or with `psql`).
3. Put the connection string in the Worker secret `DATABASE_URL`.

The production implementation is `src/postgres-store.ts`, using Neon's
serverless HTTP driver. `users.credit_balance` is the atomic runtime balance;
`credit_ledger`, `chat_charges`, and `billing_events` are the audit and
idempotency records.

## Lemon Squeezy setup

1. Create one subscription product and its paid variant.
2. Enable license keys, choose an activation limit, and attach the `.amxd` as a
   downloadable file.
3. Use the hosted checkout/product URL as the public buy link. A custom store
   domain can be added later without changing the API.
4. Create a webhook pointing to
   `https://<api-domain>/v0/webhooks/lemonsqueezy` and subscribe to
   `subscription_payment_success`.
5. Copy the numeric store ID, product ID, and webhook signing secret into the
   Worker secrets. Complete an end-to-end purchase in Lemon Squeezy test mode
   before switching the product live.

## Cloudflare deploy

Authenticate once, then create each secret without putting its value in shell
history:

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL
npx wrangler secret put LLM_API_KEY
npx wrangler secret put LLM_ENDPOINT
npx wrangler secret put LLM_MODEL
npx wrangler secret put LEMON_SQUEEZY_STORE_ID
npx wrangler secret put LEMON_SQUEEZY_PRODUCT_ID
npx wrangler secret put LEMON_SQUEEZY_WEBHOOK_SECRET
npx wrangler secret put SUBSCRIPTION_GRANT_CREDITS
npx wrangler secret put CHAT_COST_CREDITS
npx wrangler secret put CHECKOUT_URL
npx wrangler secret put SUPPORT_EMAIL
npm run deploy
```

After deploy, verify `/v0/health`, attach the desired API custom domain in
Cloudflare, and then paste that final webhook URL into Lemon Squeezy.

## Still required for the sellable package

- Visual QA and polish for the Max for Live login/chat window, including a
  multi-message transcript rather than the compact V0 last-message display.
- Signed `.amxd`/zip release, install guide, privacy terms, refund policy, and
  support contact.
- Test-mode purchase, clean-Mac install, expired-key, zero-credit, offline, and
  model-timeout acceptance tests.

Cloud Run is deliberately absent from V0. Add it only when Tembro performs
heavy server-side audio rendering or other long-running compute that does not
fit the Worker request path.
