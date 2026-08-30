import { createApp } from "./app.js";
import { LemonSqueezyLicenseProvider } from "./billing.js";
import { HttpChatProvider } from "./llm.js";
import { PostgresStore } from "./postgres-store.js";

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("invalid_env:" + name);
  return parsed;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const store = new PostgresStore(env.DATABASE_URL);
    const app = createApp({
      store,
      llm: new HttpChatProvider(env.LLM_ENDPOINT, env.LLM_API_KEY, env.LLM_MODEL),
      licenseProvider: new LemonSqueezyLicenseProvider(),
      lemonStoreId: positiveInteger(env.LEMON_SQUEEZY_STORE_ID, "LEMON_SQUEEZY_STORE_ID"),
      lemonProductId: positiveInteger(
        env.LEMON_SQUEEZY_PRODUCT_ID,
        "LEMON_SQUEEZY_PRODUCT_ID",
      ),
      lemonWebhookSecret: env.LEMON_SQUEEZY_WEBHOOK_SECRET,
      subscriptionGrantCredits: positiveInteger(
        env.SUBSCRIPTION_GRANT_CREDITS,
        "SUBSCRIPTION_GRANT_CREDITS",
      ),
      chatCostCredits: positiveInteger(env.CHAT_COST_CREDITS, "CHAT_COST_CREDITS"),
    });
    return app.fetch(request);
  },
} satisfies {
  fetch(request: Request, env: WorkerEnv): Promise<Response>;
};
