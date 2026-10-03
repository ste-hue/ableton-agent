import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';
import { BLOCKS, CHORDARIUM } from '../src/products.js';
import { createStorefront } from '../src/storefront-routes.js';

test('catalog connects available products to discovery and acquisition without advertising credits', async () => {
  const app = createApp({ store: new MemoryStore(), checkoutUrl: 'https://tembro.lemonsqueezy.com/buy/credits', downloadUrl: 'https://example.com/tembro.dmg', atlasDownloadUrl: 'https://example.com/atlas.zip' });
  const home = await app.request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  const homeBody = await home.text();
  assert.match(homeBody, /href="\/atlas"/);
  assert.match(homeBody, /href="https:\/\/chordarium.com"/);
  assert.match(homeBody, /href="\/chordarium"/);
  assert.match(homeBody, /href="\/chordarium\/buy"/);
  assert.match(homeBody, /href="\/atlas\/download"/);
  assert.match(homeBody, /href="\/chordarium\/download"/);
  assert.match(homeBody, /Rudiment/);
  assert.match(homeBody, /Coming soon/);
  assert.doesNotMatch(homeBody, /Tembro for Live/);
  assert.doesNotMatch(homeBody, /lemonsqueezy.com\/buy\/credits/);
  const atlas = await (await app.request('/atlas')).text();
  assert.match(atlas, /Download free beta/);
  assert.doesNotMatch(atlas, /credit|href="\/tembro"/i);
  assert.doesNotMatch(atlas, /lemonsqueezy.com\/buy\/credits/);
  assert.match(atlas, /notarized by Apple/i);
  assert.doesNotMatch(atlas, /not notarized/i);
  assert.equal((await app.request('/atlas/download')).headers.get('location'), 'https://example.com/atlas.zip');
  const live = await app.request('/tembro');
  assert.equal(live.status, 302);
  assert.equal(live.headers.get('location'), '/#products');
  assert.match(live.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.doesNotMatch(await live.text(), /lemonsqueezy.com\/buy\/credits/);
  const version = await (await app.request('/v0/version')).json() as { download_url: string };
  assert.equal(version.download_url, 'https://example.com/tembro.dmg');
  assert.equal((await app.request('/v0/health')).status, 200);
  assert.equal((await app.request('/v0/health')).headers.get('content-security-policy'), null);
});

test('retired credit landing links return to products without forwarding query overrides', async () => {
  const app = createApp({ store: new MemoryStore() });
  for (const path of ['/tembro', '/tembro/', '/tembro?redirect=https://example.com&checkout=credits']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await app.request(path, { method });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), '/#products');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    const post = await app.request(path, { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('location'), null);
  }
  for (const path of ['/', '/atlas', '/chordarium']) {
    const body = await (await app.request(path)).text();
    assert.doesNotMatch(body, /credits|href="\/tembro"/i, path);
  }
});

test('Atlas page offers checkout while receipt download stays a direct file link', async () => {
  const app = createApp({ store: new MemoryStore(), atlasCheckoutUrl: 'https://tembro.lemonsqueezy.com/buy/atlas', atlasDownloadUrl: 'https://example.com/atlas.zip' });
  assert.equal((await app.request('/atlas/download')).headers.get('location'), 'https://example.com/atlas.zip');
  assert.match(await (await app.request('/atlas')).text(), /Get Atlas free/);
  assert.match(await (await app.request('/atlas')).text(), /href="https:\/\/tembro.lemonsqueezy.com\/buy\/atlas"/);
});

test('Atlas can be acquired from the catalog when only its checkout is configured', async () => {
  const app = createStorefront({ atlasCheckoutUrl: 'https://tembro.lemonsqueezy.com/buy/atlas' });
  assert.match(await (await app.request('/')).text(), /href="\/atlas\/download"/);
  const response = await app.request('/atlas/download?redirect=https://example.com');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://tembro.lemonsqueezy.com/buy/atlas');
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
    assert.match(html, /Try online demo/);
    assert.match(html, /href="\/chordarium\/download"/);
    assert.match(html, /Buy plug-in · €59/);
    assert.match(html, /<s>€89<\/s>/);
    assert.match(html, /0\.3\.2/);
    assert.match(html, /Live MIDI/);
    assert.match(html, /id="install"/);
    assert.match(html, /five replayable examples/i);
    assert.match(html, /Activate once to enable all MIDI features/);
    assert.match(html, /Activate Chordarium/);
    assert.match(html, /MAIN\/card drag-and-drop/);
    assert.match(html, /DAW Sync follows the host BPM, timeline and Play\/Stop/);
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


test('Chordarium download requires a customer order and ignores query overrides', async () => {
  const app = createStorefront();
  const expected = 'https://app.lemonsqueezy.com/my-orders';
  for (const path of ['/chordarium/download', '/chordarium/download?url=https://evil.example/test.pkg&version=unsigned']) {
    const response = await app.request(path);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  const html = await (await app.request('/chordarium')).text();
  assert.match(html, /paste the license key from your receipt/i);
  assert.doesNotMatch(html, /No in-plugin activation|No license key|without activation|host tempo while stopped/);
  assert.doesNotMatch(html, /Download for Mac|Buy license|github.com.*releases\/download/);
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

test('Rudiment Blocks is in the catalog with its own page and one checkout destination', async () => {
  const app = createStorefront();
  const home = await (await app.request('/')).text();
  assert.match(home, /href="\/blocks"/);
  assert.match(home, /href="\/blocks\/buy"/);
  assert.match(home, /Rudiment Blocks/);
  assert.match(home, /src="\/media\/blocks\/01-rack\.png"/);
  assert.match(home, /Coming soon/);
  const page = await app.request('/blocks?utm_source=mail');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  const body = await page.text();
  assert.match(body, /rel="canonical" href="https:\/\/gettembro.com\/blocks"/);
  assert.match(body, /href="\/blocks\/buy"/);
  assert.match(body, /license key/i);
  assert.match(body, /two computers/i);
  assert.match(body, /MIDI track/);
  assert.doesNotMatch(body, /Standalone/);
  assert.doesNotMatch(body, /lemonsqueezy\.com\/checkout/);
  for (const path of ['/blocks/buy', '/blocks/buy?utm_source=mail&checkout[discount_code]=anything&redirect=https://example.com']) {
    const response = await app.request(path);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), BLOCKS.checkoutUrl);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  }
  assert.doesNotMatch(BLOCKS.checkoutUrl, /discount_code/);
  const download = await app.request('/blocks/download?redirect=https://example.com');
  assert.equal(download.status, 302);
  assert.equal(download.headers.get('location'), 'https://app.lemonsqueezy.com/my-orders');
});

test('Rudiment Blocks routes canonicalise slashes and refuse other methods', async () => {
  const app = createStorefront();
  const slash = await app.request('https://gettembro.com/blocks/?utm_source=mail');
  assert.equal(slash.status, 308);
  assert.equal(slash.headers.get('location'), '/blocks?utm_source=mail');
  for (const path of ['/blocks', '/blocks/buy', '/blocks/download']) {
    const post = await app.request(path, { method: 'POST' });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('allow'), 'GET, HEAD');
    assert.equal(post.headers.get('location'), null);
  }
  assert.equal((await app.request('/blocks/unknown')).status, 404);
});
