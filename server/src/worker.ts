import { createApp } from "./app.js";
import { LemonSqueezyLicenseProvider } from "./billing.js";
import { D1Store } from "./d1-store.js";
import { HttpResponsesProvider } from "./llm.js";
import { parseCreditPacks } from "./billing.js";

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("invalid_env:" + name);
  return parsed;
}

function optionalPositiveInteger(value: string | undefined, name: string): number | undefined {
  return value ? positiveInteger(value, name) : undefined;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (!env.DB) throw new Error("invalid_env:DB");
    const app = createApp({
      store: new D1Store(env.DB),
      agent: new HttpResponsesProvider(
        env.LLM_RESPONSES_ENDPOINT,
        env.LLM_API_KEY,
        env.LLM_MODEL,
      ),
      agentTokenSecret: env.AGENT_TOKEN_SECRET || env.LLM_API_KEY,
      licenseProvider: new LemonSqueezyLicenseProvider(),
      lemonStoreId: optionalPositiveInteger(env.LEMON_SQUEEZY_STORE_ID, "LEMON_SQUEEZY_STORE_ID"),
      lemonProductId: optionalPositiveInteger(
        env.LEMON_SQUEEZY_PRODUCT_ID,
        "LEMON_SQUEEZY_PRODUCT_ID",
      ),
      atlasProductId: optionalPositiveInteger(env.ATLAS_PRODUCT_ID, "ATLAS_PRODUCT_ID"),
      chordariumProductId: optionalPositiveInteger(env.CHORDARIUM_PRODUCT_ID, "CHORDARIUM_PRODUCT_ID"),
      lemonWebhookSecret: env.LEMON_SQUEEZY_WEBHOOK_SECRET || undefined,
      creditPacks: parseCreditPacks(env.CREDIT_PACKS),
      chatCostCredits: positiveInteger(env.CHAT_COST_CREDITS, "CHAT_COST_CREDITS"),
      atlasCheckoutUrl: env.ATLAS_CHECKOUT_URL || undefined,
      atlasDownloadUrl: env.ATLAS_DOWNLOAD_URL || undefined,
      checkoutUrl: env.CHECKOUT_URL || undefined,
      freeFirstPackCode: env.FREE_FIRST_PACK_CODE || undefined,
      downloadUrl: env.DOWNLOAD_URL || undefined,
      supportEmail: env.SUPPORT_EMAIL || undefined,
      betaAccessCode: env.BETA_ACCESS_CODE || undefined,
      betaGrantCredits: optionalPositiveInteger(env.BETA_GRANT_CREDITS, "BETA_GRANT_CREDITS"),
      appVersion: env.APP_VERSION,
    });
    return app.fetch(request);
  },
} satisfies {
  fetch(request: Request, env: WorkerEnv): Promise<Response>;
};
