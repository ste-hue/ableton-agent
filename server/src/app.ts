import { Hono } from "hono";
import type { Context, Next } from "hono";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "./store.js";
import { hashToken } from "./store.js";
import type { LlmProvider } from "./llm.js";
import type { LicenseProvider } from "./billing.js";
import { billingGrantFromWebhook, verifyLemonSignature } from "./billing.js";
import {
  ChatRequestSchema,
  ClientEventSchema,
  LicenseAuthRequestSchema,
} from "./types.js";
import type { ChatResponse } from "./types.js";

// ---------------------------------------------------------------------------
// Tembro V0 API — one Hono app, deployable to Cloudflare Workers or Node.
//
// Client (M4L device) flow:
//   sign in → POST /v0/chat with message + live context → receive reply +
//   action plan → execute locally via MCP/LOM bridge → report outcomes to
//   POST /v0/events. Credits are charged per chat; balance in every response.
//
// Credit invariant (V0 placeholder): the credit policy is server-side and
// replaceable — the client only ever sees a balance. Credits are not chats
// and are not provider tokens; the flat per-chat charge below is a stand-in
// that can change without any client update.
// ---------------------------------------------------------------------------
export interface AppConfig {
  store: Store;
  llm: LlmProvider;
  licenseProvider?: LicenseProvider;
  lemonStoreId?: number;
  lemonProductId?: number;
  lemonWebhookSecret?: string;
  subscriptionGrantCredits?: number;
  allowDevSignin?: boolean;
  signupGrantCredits?: number;
  chatCostCredits?: number;
  historyLimit?: number;
}

type Env = { Variables: { userId: string } };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createApp(config: AppConfig) {
  const {
    store,
    llm,
    licenseProvider,
    lemonStoreId,
    lemonProductId,
    lemonWebhookSecret,
    subscriptionGrantCredits = 500,
    allowDevSignin = false,
    signupGrantCredits = 100,
    chatCostCredits = 1,
    historyLimit = 30,
  } = config;

  const app = new Hono<Env>();

  app.onError(async (error, c) => {
    await store.logEvent("server.error", {
      path: c.req.path,
      message: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/v0/health", (c) => c.json({ ok: true, protocol_version: "0.1" }));

  if (licenseProvider && lemonStoreId && lemonProductId) {
    app.post("/v0/auth/license", async (c) => {
      const parsed = LicenseAuthRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
      const request = parsed.data;
      let activation;
      try {
        activation = await licenseProvider.activateOrValidate({
          licenseKey: request.license_key,
          instanceName: request.instance_name,
          instanceId: request.instance_id,
        });
      } catch {
        return c.json({ error: "license_invalid" }, 401);
      }
      if (
        activation.storeId !== lemonStoreId ||
        activation.productId !== lemonProductId ||
        activation.customerEmail !== request.email
      ) {
        return c.json({ error: "license_product_or_email_mismatch" }, 403);
      }

      let user = await store.getUserByEmail(request.email);
      user ??= await store.createUser(request.email);
      await store.linkLicense(user.id, {
        licenseKeyHash: hashToken(request.license_key),
        lemonLicenseKeyId: activation.licenseKeyId,
        lemonInstanceId: activation.instanceId,
        lemonCustomerId: activation.customerId,
        lemonStoreId: activation.storeId,
        lemonProductId: activation.productId,
        lemonVariantId: activation.variantId,
      });

      const token = randomBytes(32).toString("hex");
      await store.createSession(user.id, hashToken(token), new Date(Date.now() + SESSION_TTL_MS));
      return c.json({
        token,
        user_id: user.id,
        instance_id: activation.instanceId,
        credits: await store.creditBalance(user.id),
        protocol_version: "0.1",
      });
    });
  }

  if (lemonWebhookSecret && lemonStoreId && lemonProductId) {
    app.post("/v0/webhooks/lemonsqueezy", async (c) => {
      const rawBody = await c.req.text();
      const signature = c.req.header("x-signature") ?? "";
      if (!verifyLemonSignature(rawBody, signature, lemonWebhookSecret)) {
        return c.json({ error: "invalid_signature" }, 401);
      }
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return c.json({ error: "invalid_payload" }, 400);
      }
      let grant;
      try {
        grant = billingGrantFromWebhook(
          payload,
          lemonStoreId,
          lemonProductId,
          subscriptionGrantCredits,
        );
      } catch (error) {
        if (error instanceof Error && error.message === "billing_product_mismatch") {
          return c.json({ error: "billing_product_mismatch" }, 400);
        }
        throw error;
      }
      if (!grant) return c.json({ ok: true, ignored: true });
      const result = await store.processBillingGrant(grant);
      await store.logEvent(
        "billing.subscription_payment_success",
        { eventKey: grant.eventKey, processed: result.processed },
        result.userId,
      );
      return c.json({ ok: true, processed: result.processed });
    });
  }

  if (allowDevSignin) {
    const DevSigninSchema = z.object({
      email: z.string().email().transform((value) => value.trim().toLowerCase()),
      display_name: z.string().max(128).optional(),
    });
    app.post("/v0/auth/dev-signin", async (c) => {
      const body = DevSigninSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) return c.json({ error: "invalid_request" }, 400);
      const existing = await store.getUserByEmail(body.data.email);
      const user = existing ?? (await store.createUser(body.data.email, body.data.display_name));
      if (!existing) {
        await store.addCredits(user.id, signupGrantCredits, "grant:dev_signup", user.id);
      }
      const token = randomBytes(32).toString("hex");
      await store.createSession(user.id, hashToken(token), new Date(Date.now() + SESSION_TTL_MS));
      return c.json({ token, user_id: user.id });
    });
  }

  const requireAuth = async (c: Context<Env>, next: Next) => {
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return c.json({ error: "unauthorized" }, 401);
    const userId = await store.getUserIdBySessionTokenHash(hashToken(token));
    if (!userId) return c.json({ error: "unauthorized" }, 401);
    c.set("userId", userId);
    await next();
  };

  app.get("/v0/credits", requireAuth, async (c) => {
    const balance = await store.creditBalance(c.get("userId"));
    return c.json({ credits: balance });
  });

  app.post("/v0/chat", requireAuth, async (c) => {
    const userId = c.get("userId");
    const parsed = ChatRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const request = parsed.data;
    const requestId = request.request_id ?? randomUUID();

    let conversationId = request.conversation_id ?? null;
    if (conversationId) {
      const owned = await store.conversationBelongsTo(conversationId, userId);
      if (!owned) return c.json({ error: "not_found" }, 404);
    }

    const charge = await store.chargeCredits(userId, chatCostCredits, requestId);
    if (charge.duplicate) {
      return c.json({ error: "duplicate_request", request_id: requestId }, 409);
    }
    if (!charge.charged) {
      return c.json({ error: "insufficient_credits", credits: charge.balance }, 402);
    }

    try {
      conversationId ??= await store.createConversation(userId);
      await store.appendMessage(conversationId, { role: "user", content: request.message });
      const history = await store.getMessages(conversationId, userId, historyLimit);
      await store.logEvent("chat.request", { conversationId, requestId }, userId);
      const result = await llm.complete(history, request.live_context);
      await store.appendMessage(conversationId, {
        role: "assistant",
        content: result.reply,
        actions: result.actions,
      });
      await store.logEvent(
        "chat.completed",
        { conversationId, requestId, usage: result.usage ?? null },
        userId,
      );
      const response: ChatResponse = {
        request_id: requestId,
        protocol_version: "0.1",
        conversation_id: conversationId,
        reply: result.reply,
        actions: result.actions,
        credits_remaining: charge.balance,
      };
      return c.json(response);
    } catch (error) {
      await store.addCredits(userId, chatCostCredits, "refund:chat", requestId);
      throw error;
    }
  });

  app.post("/v0/events", requireAuth, async (c) => {
    const parsed = ClientEventSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    await store.logEvent(parsed.data.kind, parsed.data.payload, c.get("userId"));
    return c.json({ ok: true });
  });

  return app;
}
