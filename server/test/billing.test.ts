import { test } from "node:test";
import assert from "node:assert/strict";
import { LemonSqueezyLicenseProvider } from "../src/billing.js";

const meta = {
  store_id: 463641,
  product_id: 1335888,
  variant_id: 2087359,
  customer_id: 9788246,
  customer_email: "Buyer@Example.com",
};

function fakeFetch(script: Array<{ url: RegExp; status?: number; body: unknown }>) {
  const calls: Array<{ url: string; body: string }> = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body = String(init?.body ?? "");
    calls.push({ url, body });
    const step = script.shift();
    if (!step) throw new Error(`unexpected request ${url}`);
    assert.match(url, step.url);
    return new Response(JSON.stringify(step.body), {
      status: step.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

test("a stale instance id from another session falls back to a fresh activation", async () => {
  // Observed live: the device kept the instance id of a free-beta session and
  // Lemon Squeezy answered the validate call with {"valid":false,"error":"instance_id not found."}.
  const { fetchImpl, calls } = fakeFetch([
    { url: /\/licenses\/validate$/, status: 404, body: { valid: false, error: "instance_id not found." } },
    {
      url: /\/licenses\/activate$/,
      body: {
        activated: true,
        error: null,
        license_key: { id: 90, status: "active" },
        instance: { id: "2d473749-2037-4817-aa15-e2b44882a67c" },
        meta,
      },
    },
  ]);
  const provider = new LemonSqueezyLicenseProvider(fetchImpl);
  const activation = await provider.activateOrValidate({
    licenseKey: "BBEF69B5-0000-0000-0000-000000000000",
    instanceName: "Studio Mac",
    instanceId: "11111111-2222-4333-8444-555555555555",
  });
  assert.equal(activation.instanceId, "2d473749-2037-4817-aa15-e2b44882a67c");
  assert.equal(activation.status, "active");
  assert.equal(activation.customerEmail, "buyer@example.com");
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.body, /instance_id=11111111-2222-4333-8444-555555555555/);
  assert.match(calls[1]!.body, /instance_name=Studio\+Mac/);
  assert.doesNotMatch(calls[1]!.body, /instance_id/);
});

test("a known instance id validates without a second activation", async () => {
  const { fetchImpl, calls } = fakeFetch([
    {
      url: /\/licenses\/validate$/,
      body: { valid: true, error: null, license_key: { id: 90, status: "active" }, instance: { id: "2d473749-2037-4817-aa15-e2b44882a67c" }, meta },
    },
  ]);
  const provider = new LemonSqueezyLicenseProvider(fetchImpl);
  const activation = await provider.activateOrValidate({
    licenseKey: "key",
    instanceName: "Studio Mac",
    instanceId: "2d473749-2037-4817-aa15-e2b44882a67c",
  });
  assert.equal(activation.instanceId, "2d473749-2037-4817-aa15-e2b44882a67c");
  assert.equal(calls.length, 1);
});

test("a wrong key is rejected even after the activation fallback", async () => {
  const { fetchImpl, calls } = fakeFetch([
    { url: /\/licenses\/validate$/, status: 404, body: { valid: false, error: "license_key not found." } },
    { url: /\/licenses\/activate$/, status: 404, body: { activated: false, error: "license_key not found." } },
  ]);
  const provider = new LemonSqueezyLicenseProvider(fetchImpl);
  await assert.rejects(
    provider.activateOrValidate({ licenseKey: "nope", instanceName: "Studio Mac", instanceId: "11111111-2222-4333-8444-555555555555" }),
    /license_key not found|license_provider_error/,
  );
  assert.equal(calls.length, 2);
});

test("a disabled key never activates", async () => {
  const { fetchImpl } = fakeFetch([
    { url: /\/licenses\/activate$/, body: { activated: false, error: "This license key has been disabled.", license_key: { id: 90, status: "disabled" }, meta } },
  ]);
  const provider = new LemonSqueezyLicenseProvider(fetchImpl);
  await assert.rejects(
    provider.activateOrValidate({ licenseKey: "key", instanceName: "Studio Mac" }),
    /disabled/,
  );
});
