import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { MemoryStore } from '../src/store.js';

test('store lists Atlas, Chordarium and Rudiment and keeps Tembro for Live on its own page', async () => {
  const app = createApp({ store: new MemoryStore(), checkoutUrl: 'https://tembro.lemonsqueezy.com/buy/credits', downloadUrl: 'https://example.com/tembro.dmg', atlasDownloadUrl: 'https://example.com/atlas.zip' });
  const home = await app.request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  const homeBody = await home.text();
  assert.match(homeBody, /href="\/atlas"/);
  assert.match(homeBody, /href="https:\/\/chordarium.com"/);
  assert.match(homeBody, /href="\/chordarium">Buy Chordarium/);
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
