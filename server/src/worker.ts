import { createApp } from "./app.js";
import { LemonSqueezyLicenseProvider } from "./billing.js";
import { D1Store } from "./d1-store.js";
import { HttpChatProvider } from "./llm.js";
import { PostgresStore } from "./postgres-store.js";

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
    const store = env.DB ? new D1Store(env.DB) : new PostgresStore(env.DATABASE_URL);
    const app = createApp({
      store,
      llm: new HttpChatProvider(env.LLM_ENDPOINT, env.LLM_API_KEY, env.LLM_MODEL),
      licenseProvider: new LemonSqueezyLicenseProvider(),
      lemonStoreId: optionalPositiveInteger(env.LEMON_SQUEEZY_STORE_ID, "LEMON_SQUEEZY_STORE_ID"),
      lemonProductId: optionalPositiveInteger(
        env.LEMON_SQUEEZY_PRODUCT_ID,
        "LEMON_SQUEEZY_PRODUCT_ID",
      ),
      lemonWebhookSecret: env.LEMON_SQUEEZY_WEBHOOK_SECRET || undefined,
      subscriptionGrantCredits: optionalPositiveInteger(
        env.SUBSCRIPTION_GRANT_CREDITS,
        "SUBSCRIPTION_GRANT_CREDITS",
      ),
      chatCostCredits: positiveInteger(env.CHAT_COST_CREDITS, "CHAT_COST_CREDITS"),
      checkoutUrl: env.CHECKOUT_URL || undefined,
      downloadUrl: env.DOWNLOAD_URL || undefined,
      supportEmail: env.SUPPORT_EMAIL || undefined,
      betaAccessCode: env.BETA_ACCESS_CODE || undefined,
      betaGrantCredits: optionalPositiveInteger(env.BETA_GRANT_CREDITS, "BETA_GRANT_CREDITS"),
    });
    return app.fetch(request);
  },
} satisfies {
  fetch(request: Request, env: WorkerEnv): Promise<Response>;
};
