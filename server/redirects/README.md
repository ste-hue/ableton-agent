# Chordarium compatibility route

`https://gettembro.com/chordarium` is now the central storefront's Chordarium
product page. Its plugin purchase link is `/chordarium/buy`.

The existing Worker still owns only the two exact routes in `wrangler.jsonc`.
It forwards the original request using `fetch(request)` to the `tembro-api` Custom
Domain Worker, which owns the page, slash normalization, method handling and
checkout destination. It contains no product URL, payment logic or database binding.

Cloudflare explicitly supports a Route Worker invoking the same hostname's Custom
Domain Worker through `fetch(request)`:
https://developers.cloudflare.com/workers/configuration/routing/routes/#background

Requests with query strings do not match these exact Routes and go directly to the
main Worker. Because both paths now reach the same storefront, tracked links work
without expanding route ownership or changing DNS.

Deploy the main Worker first and verify `/chordarium?utm_source=smoke` returns the
new page before deploying this compatibility shim. From `server/`, using the locked
project Wrangler:

```sh
npx wrangler deploy --config redirects/wrangler.jsonc --dry-run
npx wrangler deploy --config redirects/wrangler.jsonc
```

Afterward verify bare `/chordarium` returns 200, `/chordarium/` returns 308,
HEAD returns no body, and `/chordarium/buy` redirects to the plugin checkout.
Customers receive installer files through their Lemon Squeezy order; these routes
do not upload or validate a product package.
