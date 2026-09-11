import { Hono } from 'hono';
import type { Context } from 'hono';
import { CHORDARIUM } from './products.js';
import { atlasPage, chordariumPage, publicHttpsUrl, storefrontPage } from './storefront.js';
import type { StoreOptions } from './storefront.js';

function setPublicHeaders(c: Context, referrerPolicy = 'strict-origin-when-cross-origin'): void {
  c.header('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
  c.header('Referrer-Policy', referrerPolicy);
  c.header('X-Content-Type-Options', 'nosniff');
}

/** Public pages and product links have no database or payment-service dependency. */
export function createStorefront(options: StoreOptions = {}) {
  const app = new Hono();
  app.get('/', (c) => {
    setPublicHeaders(c);
    return c.html(storefrontPage(options));
  });
  app.get('/atlas', (c) => {
    setPublicHeaders(c);
    return c.html(atlasPage(options));
  });
  app.get('/atlas/download', (c) => {
    setPublicHeaders(c);
    const url = publicHttpsUrl(options.atlasDownloadUrl);
    c.header('Cache-Control', 'no-store');
    return c.redirect(url ?? '/atlas#install', 302);
  });
  app.get('/atlas/download/linux', (c) => {
    setPublicHeaders(c);
    const url = publicHttpsUrl(options.atlasLinuxDownloadUrl);
    c.header('Cache-Control', 'no-store');
    return c.redirect(url ?? '/atlas#install', 302);
  });
  app.get(CHORDARIUM.path, (c) => {
    setPublicHeaders(c);
    return c.html(chordariumPage(options));
  });
  app.get('/chordarium/buy', (c) => {
    setPublicHeaders(c, 'no-referrer');
    c.header('Cache-Control', 'no-store');
    return c.redirect(CHORDARIUM.checkoutUrl, 302);
  });
  for (const path of ['/chordarium', '/chordarium/buy']) {
    app.get(path + '/', (c) => {
      setPublicHeaders(c);
      const url = new URL(c.req.url);
      return c.redirect(path + url.search, 308);
    });
    for (const route of [path, path + '/']) {
      app.all(route, (c) => {
        setPublicHeaders(c);
        c.header('Allow', 'GET, HEAD');
        return c.text('Method not allowed', 405);
      });
    }
  }
  return app;
}
