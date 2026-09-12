import { Hono } from 'hono';
import { CHORDARIUM } from './products.js';
import { atlasPage, chordariumPage, publicHttpsUrl, storefrontPage } from './storefront.js';
import type { StoreOptions } from './storefront.js';

/** Public pages and product links have no database or payment-service dependency. */
export function createStorefront(options: StoreOptions = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (['/', '/tembro', '/tembro/', '/atlas', '/atlas/download', '/chordarium', '/chordarium/', '/chordarium/buy', '/chordarium/buy/', '/chordarium/download', '/chordarium/download/'].includes(c.req.path)) {
      c.header('Content-Security-Policy', "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
      c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      c.header('X-Content-Type-Options', 'nosniff');
    }
    await next();
  });
  app.get('/', (c) => c.html(storefrontPage(options)));
  for (const path of ['/tembro', '/tembro/']) {
    app.get(path, (c) => {
      c.header('Cache-Control', 'no-store');
      return c.redirect('/#products', 302);
    });
    app.all(path, (c) => {
      c.header('Allow', 'GET, HEAD');
      return c.text('Method not allowed', 405);
    });
  }
  app.get('/atlas', (c) => c.html(atlasPage(options)));
  app.get('/atlas/download', (c) => {
    const url = publicHttpsUrl(options.atlasDownloadUrl) ?? publicHttpsUrl(options.atlasCheckoutUrl);
    c.header('Cache-Control', 'no-store');
    return c.redirect(url ?? '/atlas#install', 302);
  });
  app.get(CHORDARIUM.path, (c) => c.html(chordariumPage(options)));
  app.get('/chordarium/buy', (c) => {
    c.header('Cache-Control', 'no-store');
    c.header('Referrer-Policy', 'no-referrer');
    return c.redirect(CHORDARIUM.checkoutUrl, 302);
  });
  app.get('/chordarium/download', (c) => {
    c.header('Cache-Control', 'no-store');
    c.header('Referrer-Policy', 'no-referrer');
    return c.redirect('https://app.lemonsqueezy.com/my-orders', 302);
  });
  for (const path of ['/chordarium', '/chordarium/buy', '/chordarium/download']) {
    app.get(path + '/', (c) => {
      const url = new URL(c.req.url);
      return c.redirect(path + url.search, 308);
    });
    for (const route of [path, path + '/']) {
      app.all(route, (c) => {
        c.header('Allow', 'GET, HEAD');
        return c.text('Method not allowed', 405);
      });
    }
  }
  return app;
}
