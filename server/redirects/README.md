# Chordarium checkout link

`https://gettembro.com/chordarium` redirects to Chordarium's Lemon Squeezy checkout.
Customers get their files through the order after checkout; this is not a public
installer URL and it does not upload or validate the product's files.

The dedicated Worker owns only the two exact routes in wrangler.jsonc. It does not
deploy the main Tembro site or change its settings, downloads, assets or database.
Query strings are deliberately not forwarded to checkout.

From server/ using the locked project Wrangler:

```sh
npx wrangler deploy --config redirects/wrangler.jsonc --dry-run
npx wrangler deploy --config redirects/wrangler.jsonc
```

Cloudflare route precedence: https://developers.cloudflare.com/workers/configuration/routing/routes/
