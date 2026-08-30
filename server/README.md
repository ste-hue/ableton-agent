# Tembro API — free beta, paid V0 ready

The first public Tembro build is a free beta downloaded from GitHub Releases.
The user enters an email and shared beta access code; the Cloudflare Worker
creates a session, owns the AI key, and keeps the user's credit balance in
Cloudflare D1. The same endpoint can validate Lemon Squeezy licenses when payments
are enabled later.

```text
Worker landing page -> free GitHub download -> email + beta access code
                                          |
                                          v
Ableton Live -> Max for Live chat -> Cloudflare Worker -> Cloudflare D1
                   ^                  |                    auth + credits
                   |                  v
              local MCP tools <-> OpenAI Responses agent loop
```

The backend never connects directly to Ableton. It returns allowlisted MCP tool
calls; execution and readback remain on the customer's machine. Tool results go
back to the same model response until the musical request is complete.

## Customer journey

1. The user opens the public product URL and downloads the free beta.
2. The user opens the DMG, runs the one-click installer, drops Tembro into a Live Set, and enters an
   email plus the shared beta access code once.
3. `POST /v0/auth/license` verifies the access code, grants the configured beta
   credits once per email, and returns a 30-day bearer session.
4. When payments are enabled, the same endpoint validates a Lemon Squeezy
   license instead; no device protocol change is required.
5. Each user turn has a client-generated UUID. The API reserves one credit at
   agent start, never charges the tool-result continuations, and refunds the
   credit if the provider fails.
6. The device executes tool calls serially through the local MCP bridge, returns
   bounded results to the model, and shows the final verified reply in chat.

## Credit model for V0

`1 credit = 1 successful chat turn`. `BETA_GRANT_CREDITS` controls the one-time
free-beta allowance, `SUBSCRIPTION_GRANT_CREDITS` controls the future monthly
allowance, and `CHAT_COST_CREDITS` controls the per-turn charge. The
model's input/output/total token counts are logged with each completed request,
so the commercial allowance can be tuned from real usage without exposing the
vendor API key or changing the customer protocol.

V0.1.1 uses `gpt-5.6-luna` with medium reasoning effort through OpenAI's
Responses endpoint. A sensible launch baseline is 500 turns/month, then
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
| `GET /` | no | public Tembro product page and free download or paid checkout link |
| `GET /v0/health` | no | liveness and protocol version |
| `POST /v0/auth/license` | no | activate a beta access code or Lemon Squeezy license |
| `POST /v0/webhooks/lemonsqueezy` | HMAC | grant subscription credits exactly once per invoice |
| `GET /v0/credits` | bearer | current balance |
| `POST /v0/agent` | bearer | start/continue the distributed Responses ↔ local MCP loop |
| `POST /v0/chat` | bearer | legacy v0.1.0 JSON planner compatibility |
| `POST /v0/events` | bearer | client action/readback/error telemetry |
| `GET /v0/version` | no | current app version, download URL, and update availability |

The current agent protocol is `0.2`. The server filters every MCP schema against
an explicit allowlist; arbitrary code, evaluation, batch execution, and
self-modifying Max tools never reach the model.

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
Cloudflare deployment and one custom domain. Set `DOWNLOAD_URL` to the public
GitHub release asset for free beta mode. Later, setting `CHECKOUT_URL` takes
priority and automatically changes the page back to its paid journey.
`SUPPORT_EMAIL` is the public support address. If neither URL is configured,
the primary button stays disabled.

The page deliberately uses no third-party JavaScript, fonts, tracking pixels,
or client-side API keys. Its content-security policy blocks framing and limits
assets to the same origin. Keep the Lemon Squeezy and OpenAI credentials in the
Worker environment; they never belong in the HTML or Max for Live bundle.

## Cloudflare D1

The free beta uses the `DB` binding in `wrangler.jsonc`. Create and migrate a
fresh database with:

```bash
npx wrangler d1 create tembro
npx wrangler d1 migrations apply tembro --remote
```

The production implementation is `src/d1-store.ts`.
`users.credit_balance` is the atomic runtime balance; `credit_ledger`,
`chat_charges`, and `billing_events` are the audit and idempotency records. The
Postgres adapter remains available for a later data-plane migration.

## Lemon Squeezy setup

This is optional during the free beta and can be completed later without a
client update.

1. Create one subscription product and its paid variant.
2. Enable license keys, choose an activation limit, and attach the versioned `.dmg` as a
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
npx wrangler secret put LLM_API_KEY
npx wrangler secret put BETA_ACCESS_CODE
npm run deploy
```

Public non-secret values (`LLM_ENDPOINT`, `LLM_MODEL`, credit amounts, download
URL, checkout URL, and support email) live in `wrangler.jsonc`. Lemon Squeezy
IDs and webhook secret are only required once paid access is enabled.

After deploy, verify `/v0/health` on `gettembro.com`. When payments are enabled,
use `https://gettembro.com/v0/webhooks/lemonsqueezy` as the Lemon Squeezy
webhook URL.

## Still required after the beta release

- Developer ID signing and Apple notarization for warning-free installation.
- Privacy terms, refund policy, and public support contact.
- Test-mode purchase, clean-Mac install, expired-key, zero-credit, offline, and
  model-timeout acceptance tests.

Cloud Run is deliberately absent from V0. Add it only when Tembro performs
heavy server-side audio rendering or other long-running compute that does not
fit the Worker request path.
