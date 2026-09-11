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
5. Each user turn has a client-generated UUID. The API estimates the musical
   scope, reserves that many credits at agent start, never charges tool-result
   continuations, and refunds the reservation if the provider fails.
6. The device executes tool calls serially through the local MCP bridge, returns
   bounded results to the model, and shows the final verified reply in chat.

## Credit model for V0

Credits are product units, not raw model tokens. A focused clip edit costs the
`CHAT_COST_CREDITS` base amount; beat making and harmony/melody use 2×; a full
arrangement uses 4×. The server infers at least the same tier from the message,
so choosing a cheaper UI skill cannot underprice a large request.
`BETA_GRANT_CREDITS` controls the one-time free-beta allowance. Paid credits
are sold as one-time, non-expiring packs: `CREDIT_PACKS` maps each Lemon
Squeezy variant id to the credits it grants (`"id:credits,id:credits"`). There
is no subscription. The model's input/cached/output token counts are logged per
model call (`agent.usage`) and per turn (`agent.completed`), so pack sizes can
be tuned from real usage without exposing the vendor API key or changing the
customer protocol. One turn is bounded to `AGENT_STEP_BUDGET` model rounds
(`src/llm.ts`), which is what caps the cost of a single credit charge. The
model is told its round on every call and asked to stop and report ("Pausa —")
inside the last `AGENT_WRAP_UP_ROUNDS`; past the budget the server makes one
final call with tools disabled, so a turn always ends with words, never a bare
error.

V0.1.1 uses `gpt-5.6-luna` with medium reasoning effort through OpenAI's
Responses endpoint. A sensible launch baseline is 500 turns/month, then
review p50/p95 token usage before
adding a higher-cost “deep” mode. The server currently caps model output at
2,000 tokens and sends at most 30 stored messages.

Use a dedicated Lemon Squeezy store with one product ("Tembro credits") and
one variant per pack. `order_created` webhooks identify the store, customer and
variant; the Worker rejects a mismatched store or product, and a paid order for
a variant missing from `CREDIT_PACKS` is answered with 400 so Lemon Squeezy
retries it after the config is fixed. Grants are keyed by order id, so a
redelivered webhook cannot grant twice.

## API

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /` | no | Tembro product catalog |
| `GET /chordarium` | no | Chordarium product page and browser/plugin comparison |
| `GET /chordarium/buy` | no | redirect to the Chordarium plugin checkout |
| `GET /tembro` | no | original Tembro for Live landing page |
| `GET /v0/health` | no | liveness and protocol version |
| `POST /v0/auth/license` | no | activate a beta access code or Lemon Squeezy license |
| `POST /v0/webhooks/lemonsqueezy` | HMAC | grant a credit pack exactly once per paid order |
| `GET /v0/credits` | bearer | current balance |
| `GET /v0/skills` | no | public skill menu and server-authoritative credit estimates |
| `POST /v0/agent` | bearer | start/continue the distributed Responses ↔ local MCP loop |
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

The same Hono Worker serves the product catalog at `/`, the product pages, and
the original Tembro for Live page at `/tembro`. Public page rendering does not
query the database or call the payment service. Set `DOWNLOAD_URL` to the public
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
`chat_charges`, and `billing_events` are the audit and idempotency records.

## Lemon Squeezy setup

This is optional during the free beta and can be completed later without a
client update.

1. Create one product ("Tembro credits") with one variant per pack (e.g. 40
   and 120 credits), single payment, no subscription.
2. Enable license keys, choose an activation limit, and attach the versioned `.dmg` as a
   downloadable file. The first purchase's key activates the device; later
   packs only add credits to the same email.
3. Use the hosted checkout/product URL as the public buy link. A custom store
   domain can be added later without changing the API.
4. Create a webhook pointing to
   `https://<api-domain>/v0/webhooks/lemonsqueezy` and subscribe to
   `order_created`.
5. Copy the numeric store ID, product ID, and webhook signing secret into the
   Worker secrets, and the variant ids into `CREDIT_PACKS` in `wrangler.jsonc`. Complete an end-to-end purchase in Lemon Squeezy test mode
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

Public non-secret values (`LLM_RESPONSES_ENDPOINT`, `LLM_MODEL`, credit amounts, download
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


## Product store (September 2026)

The home page is a terminal-style catalog for VST Atlas, Chordarium and the
upcoming Rudiment. Product labels and the Chordarium browser/checkout destinations
live in `src/products.ts`; public routing lives in `src/storefront-routes.ts` and
HTML/CSS in `src/storefront.ts`. There are no client scripts, remote fonts, or
new dependencies. The original Tembro for Live page remains at `/tembro`.

`/chordarium` is a product page with separate browser and macOS plug-in choices.
`/chordarium/buy` redirects to the fixed plugin checkout with `Cache-Control:
no-store` and does not forward arbitrary query parameters. Browser credit buying
stays inside the composer, which retains wallet-specific top-up parameters.
Plugin price, duration, activation limits and download details belong to the
checkout; the page does not duplicate mutable licensing terms. The piano-roll
figure is explicitly an example, not an interactive player or a product screenshot.

Both Chordarium paths accept GET and HEAD. Trailing slashes redirect with HTTP 308
and preserve the query string; unsupported methods return 405 with `Allow: GET,
HEAD`. Tracked product links reach the same HTML page. Unknown child paths remain
404. Page security headers are scoped so `/v0` API responses retain their existing
behavior.

`/atlas/download` still redirects directly to `ATLAS_DOWNLOAD_URL`; page buttons
use `ATLAS_CHECKOUT_URL` when configured. Atlas configuration, Tembro `CHECKOUT_URL`,
`DOWNLOAD_URL`, activation, billing and `/v0/version` are unchanged. There are no
new bindings, databases or migrations. The Atlas page does not display a release
number because the previous 0.3.12 label did not match its configured 0.3.10 download;
this change does not select or publish a replacement installer.

### Publishing this change

The existing `tembro-chordarium-link` Route Worker takes precedence over the main
Worker for the two exact legacy paths. It must be updated as well as the main site.
Its new role is only to forward the original request to the Custom Domain Worker;
all content and checkout logic stay in the main application. No route deletion,
wildcard expansion, DNS change or additional service binding is necessary.

1. Check the current deployed main Worker configuration against `wrangler.jsonc`.
   Preserve production bindings, secrets and all payment/download variables.
2. Deploy the main `tembro-api` Worker first.
3. Verify `/chordarium?utm_source=smoke` returns HTTP 200 HTML, and
   `/chordarium/buy?utm_source=smoke` returns HTTP 302 to the intended plugin checkout.
   The query-bearing page request bypasses the old exact Route Worker.
4. Deploy the compatibility Worker using `redirects/wrangler.jsonc`.
5. Verify bare `/chordarium` (200), `/chordarium/` (308), HEAD (empty body), unsupported
   methods (405), `/`, `/atlas`, `/tembro`, `/atlas/download` and `/v0/health`.

See `redirects/README.md` for the Route-to-Custom-Domain forwarding contract.
The legacy redirect can be restored independently if the main site must be rolled
back. Merging alone does not perform either manual Cloudflare deployment.

Validation: `npm run typecheck`, `npm test` (56 tests), independent storefront
routing/security/forwarding cases, and local HTTP checks. These checks do not
validate an installer or establish DAW compatibility. The Chordarium plugin embeds
its own composer at build time; web changes only reach it after a separate rebuild,
signing and notarization.
