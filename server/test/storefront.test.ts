import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';

test('store separates Atlas from Tembro credit purchases and preserves the API', async () => {
  const app = createApp({ store: new MemoryStore(), checkoutUrl: 'https://tembro.lemonsqueezy.com/buy/credits', downloadUrl: 'https://example.com/tembro.dmg', atlasDownloadUrl: 'https://example.com/atlas.zip' });
  const home = await app.request('/');
  assert.equal(home.status, 200);
  const homeBody = await home.text();
  assert.match(homeBody, /href="\/atlas"/);
  assert.match(homeBody, /lemonsqueezy.com\/buy\/credits/);
  assert.doesNotMatch(homeBody, /Find your flow/);
  const atlas = await (await app.request('/atlas')).text();
  assert.match(atlas, /Download free beta/);
  assert.doesNotMatch(atlas, /lemonsqueezy.com\/buy\/credits/);
  assert.match(atlas, /not notarized/i);
  assert.equal((await app.request('/atlas/download')).headers.get('location'), 'https://example.com/atlas.zip');
  const legacy = await app.request('/tembro');
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get('location'), '/');
  const version = await (await app.request('/v0/version')).json() as { download_url: string };
  assert.equal(version.download_url, 'https://example.com/tembro.dmg');
  assert.equal((await app.request('/v0/health')).status, 200);
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
