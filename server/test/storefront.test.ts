import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { CHORDARIUM } from '../src/products.js';
import { createStorefront } from '../src/storefront-routes.js';

test('store lists Atlas, Chordarium and Rudiment and keeps Tembro for Live on its own page', async () => {
  const app = createApp({ store: new MemoryStore(), checkoutUrl: 'https://tembro.lemonsqueezy.com/buy/credits', downloadUrl: 'https://example.com/tembro.dmg', atlasDownloadUrl: 'https://example.com/atlas.zip' });
  const home = await app.request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  const homeBody = await home.text();
  assert.match(homeBody, /href="\/atlas"/);
  assert.match(homeBody, /href="https:\/\/chordarium.com"/);
  assert.match(homeBody, /href="\/chordarium">Explore Chordarium/);
  assert.match(homeBody, /Rudiment/);
  assert.match(homeBody, /Coming soon/);
  assert.doesNotMatch(homeBody, /Tembro for Live/);
  assert.doesNotMatch(homeBody, /lemonsqueezy.com\/buy\/credits/);
  const atlas = await (await app.request('/atlas')).text();
  assert.match(atlas, /Download free beta/);
  assert.match(atlas, /href="\/tembro"/);
  assert.doesNotMatch(atlas, /lemonsqueezy.com\/buy\/credits/);
  assert.match(atlas, /notarized by Apple/i);
  assert.doesNotMatch(atlas, /not notarized/i);
  assert.equal((await app.request('/atlas/download')).headers.get('location'), 'https://example.com/atlas.zip');
  const live = await app.request('/tembro');
  assert.equal(live.status, 200);
  assert.match(live.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.match(await live.text(), /lemonsqueezy.com\/buy\/credits/);
  const version = await (await app.request('/v0/version')).json() as { download_url: string };
  assert.equal(version.download_url, 'https://example.com/tembro.dmg');
  assert.equal((await app.request('/v0/health')).status, 200);
  assert.equal((await app.request('/v0/health')).headers.get('content-security-policy'), null);
});

test('Atlas page offers checkout while receipt download stays a direct file link', async () => {
  const app = createApp({ store: new MemoryStore(), atlasCheckoutUrl: 'https://tembro.lemonsqueezy.com/buy/atlas', atlasDownloadUrl: 'https://example.com/atlas.zip' });
  assert.equal((await app.request('/atlas/download')).headers.get('location'), 'https://example.com/atlas.zip');
  assert.match(await (await app.request('/atlas')).text(), /Get Atlas free/);
  assert.match(await (await app.request('/atlas')).text(), /href="https:\/\/tembro.lemonsqueezy.com\/buy\/atlas"/);
});

test('missing or unsafe download configuration never exposes an unsafe link', async () => {
  for (const url of [undefined, 'javascript:alert(1)', 'http://example.com/atlas.zip', 'https://user:password@example.com/atlas.zip']) {
    const app = createApp({ store: new MemoryStore(), atlasDownloadUrl: url });
    const page = await app.request('/atlas');
    assert.match(page.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    const body = await page.text();
    assert.match(body, /download is being prepared/);
    assert.doesNotMatch(body, /href="javascript:|user:password/);
    assert.equal((await app.request('/atlas/download')).headers.get('location'), '/atlas#install');
  }
});

test('Chordarium is an HTML product page for ordinary and tracked URLs', async () => {
  const app = createApp({ store: new MemoryStore() });
  for (const path of ['/chordarium', '/chordarium?utm_source=newsletter', '/chordarium?fbclid=example&ref=friend']) {
    const page = await app.request(path);
    assert.equal(page.status, 200, path);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
    assert.match(page.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    const html = await page.text();
    assert.match(html, /href="https:\/\/chordarium.com"/);
    assert.match(html, /href="\/chordarium\/buy"/);
    assert.match(html, /Download for Mac/);
    assert.match(html, /href="\/chordarium\/download"/);
    assert.match(html, /Buy license · €59/);
    assert.match(html, /<s>€89<\/s>/);
    assert.match(html, /0\.3\.0/);
    assert.match(html, /Live MIDI/);
    assert.match(html, /id="install"/);
    assert.match(html, /five seeds/i);
    assert.match(html, /one year/i);
    assert.doesNotMatch(html, /Each MIDI export uses one web credit|real-time MIDI output are being developed/);
    assert.match(html, /rel="canonical" href="https:\/\/gettembro.com\/chordarium"/);
    assert.doesNotMatch(html, /<script|utm_source|fbclid|€59\.99/);
  }
});

test('Chordarium checkout has one destination and drops incoming checkout parameters', async () => {
  const app = createStorefront();
  for (const path of ['/chordarium/buy', '/chordarium/buy?utm_source=mail&checkout[discount_code]=anything&redirect=https://example.com']) {
    const response = await app.request(path);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), CHORDARIUM.checkoutUrl);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  }
});

test('Chordarium canonical slash redirects retain attribution while HEAD stays bodyless', async () => {
  const app = createStorefront();
  for (const path of ['/chordarium', '/chordarium/buy', '/chordarium/download']) {
    for (const method of ['GET', 'HEAD']) {
      const slash = await app.request(path + '/?utm_source=mail', { method });
      assert.equal(slash.status, 308);
      assert.equal(slash.headers.get('location'), path + '?utm_source=mail');
    }
    const head = await app.request(path + '?utm_source=mail', { method: 'HEAD' });
    assert.equal(head.status, path === '/chordarium' ? 200 : 302);
    assert.equal(await head.text(), '');
  }
});

test('unsupported Chordarium methods and unrelated paths never open checkout', async () => {
  const app = createStorefront();
  for (const path of ['/chordarium', '/chordarium/', '/chordarium/buy', '/chordarium/buy/', '/chordarium/download', '/chordarium/download/']) {
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await app.request(path + '?utm_source=mail', { method });
      assert.equal(response.status, 405, method + ' ' + path);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
      assert.equal(response.headers.get('location'), null);
    }
  }
  for (const path of ['/chordarium-other', '/chordarium/download/other', '/chordarium/buy/other']) {
    assert.equal((await app.request(path)).status, 404);
  }
});

test('storefront support configuration cannot inject markup or links', async () => {
  const app = createStorefront({ supportEmail: 'bad\"><script>alert(1)</script>@example.com' });
  for (const path of ['/', '/atlas', '/chordarium']) {
    const html = await (await app.request(path)).text();
    assert.doesNotMatch(html, /<script>|alert\(1\)/);
    assert.match(html, /mailto:support@gettembro.com/);
  }
});

test('legacy route shim forwards the original request and response to the central storefront', async (t) => {
  const { default: shim } = await import(new URL('../redirects/chordarium.mjs', import.meta.url).href);
  const app = createStorefront();
  const requests: Request[] = [];
  t.mock.method(globalThis, 'fetch', (request: Request) => {
    requests.push(request);
    return app.fetch(request);
  });
  for (const [path, method, expected] of [['/chordarium', 'GET', 200], ['/chordarium/', 'GET', 308], ['/chordarium', 'POST', 405]] as const) {
    const request = new Request('https://gettembro.com' + path, { method, headers: { 'X-Test-Header': 'preserved' } });
    const response = await shim.fetch(request);
    assert.equal(requests.at(-1), request);
    assert.equal(response.status, expected);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  }
});


test('public Chordarium download is the versioned notarized installer bundle and ignores query overrides', async () => {
  const app = createStorefront();
  const expected = 'https://github.com/ste-hue/tembro-releases/releases/download/chordarium-v0.3.0/Chordarium-0.3.0-macOS-download.zip';
  for (const path of ['/chordarium/download', '/chordarium/download?url=https://evil.example/test.pkg&version=unsigned']) {
    const response = await app.request(path);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  const html = await (await app.request('/chordarium')).text();
  assert.match(html, /90d82f0c1a8749112a82d9e726e419c3baad0b8f8f7493f34536c6d3e22c7a60/);
  assert.match(html, /Logic Pro/);
  assert.match(html, /macOS 11/);
  assert.doesNotMatch(html, /unsigned-test|LEGGIMI-TEST/);
});

test('Chordarium purchase applies the fixed launch offer', async () => {
  const response = await createStorefront().request('/chordarium/buy?checkout[discount_code]=CHORDTEST');
  const target = new URL(response.headers.get('location')!);
  assert.equal(target.searchParams.get('checkout[discount_code]'), 'LAUNCH59');
  assert.equal(target.pathname, '/checkout/buy/17e4b1a7-187d-4700-adba-cb07b41fb9ed');
});
