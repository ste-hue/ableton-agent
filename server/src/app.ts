import { Hono } from "hono";
import type { Context, Next } from "hono";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "./store.js";
import { hashToken } from "./store.js";
import type { LlmProvider } from "./llm.js";
import { ChatRequestSchema, ClientEventSchema } from "./types.js";
import type { ChatResponse } from "./types.js";

// ---------------------------------------------------------------------------
// Liveworks V0 API — one Hono app, deployable to Cloudflare Workers or Node.
//
// Client (M4L device) flow:
//   sign in → POST /v0/chat with message + live context → receive reply +
//   action plan → execute locally via MCP/LOM bridge → report outcomes to
//   POST /v0/events. Credits are charged per chat; balance in every response.
// ---------------------------------------------------------------------------

export interface AppConfig {
  store: Store;
  llm: LlmProvider;
  /** Enable POST /v0/auth/dev-signin (email → token, no verification). Dev only. */
  allowDevSignin?: boolean;
  signupGrantCredits?: number;
  chatCostCredits?: number;
  historyLimit?: number;
}

type Env = { Variables: { userId: string } };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function createApp(config: AppConfig) {
  const {
    store,
    llm,
    allowDevSignin = false,
    signupGrantCredits = 100,
    chatCostCredits = 1,
    historyLimit = 30,
  } = config;

  const app = new Hono<Env>();

  app.onError(async (err, c) => {
    await store.logEvent("server.error", {
      path: c.req.path,
      message: err instanceof Error ? err.message : String(err),
    });
    return c.json({ error: "internal_error" }, 500);
  });

  app.get("/v0/health", (c) => c.json({ ok: true }));

  // --- Auth -----------------------------------------------------------------
  // V0 production sign-in (email magic link / device code via Lemon Squeezy
  // customer identity) is wired at deploy; dev-signin covers local dev + tests.
  if (allowDevSignin) {
    const DevSigninSchema = z.object({
      email: z.string().email(),
      display_name: z.string().max(128).optional(),
    });
    app.post("/v0/auth/dev-signin", async (c) => {
      const body = DevSigninSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) return c.json({ error: "invalid_request" }, 400);
      const existing = await store.getUserByEmail(body.data.email);
      const user =
        existing ?? (await store.createUser(body.data.email, body.data.display_name));
      if (!existing) {
        await store.addCredits(user.id, signupGrantCredits, "grant:signup");
      }
      const token = randomUUID() + randomUUID().replace(/-/g, "");
      await store.createSession(
        user.id,
        hashToken(token),
        new Date(Date.now() + SESSION_TTL_MS),
      );
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

  // --- Credits ---------------------------------------------------------------
  app.get("/v0/credits", requireAuth, async (c) => {
    const balance = await store.creditBalance(c.get("userId"));
    return c.json({ credits: balance });
  });

  // --- Chat -------------------------------------------------------------------
  app.post("/v0/chat", requireAuth, async (c) => {
    const userId = c.get("userId");
    const parsed = ChatRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const req = parsed.data;

    const balance = await store.creditBalance(userId);
    if (balance < chatCostCredits) {
      return c.json({ error: "insufficient_credits", credits: balance }, 402);
    }

    let conversationId = req.conversation_id ?? null;
    if (conversationId) {
      const owned = await store.conversationBelongsTo(conversationId, userId);
      if (!owned) return c.json({ error: "not_found" }, 404);
    } else {
      conversationId = await store.createConversation(userId);
    }

    await store.appendMessage(conversationId, { role: "user", content: req.message });
    const history = await store.getMessages(conversationId, userId, historyLimit);

    await store.logEvent("chat.request", { conversationId }, userId);
    const result = await llm.complete(history, req.live_context);

    await store.appendMessage(conversationId, {
      role: "assistant",
      content: result.reply,
      actions: result.actions,
    });
    await store.addCredits(userId, -chatCostCredits, "charge:chat", conversationId);

    const response: ChatResponse = {
      conversation_id: conversationId,
      reply: result.reply,
      actions: result.actions,
      credits_remaining: await store.creditBalance(userId),
    };
    return c.json(response);
  });

  // --- Client telemetry (action outcomes, readback mismatches, errors) --------
  app.post("/v0/events", requireAuth, async (c) => {
    const parsed = ClientEventSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    await store.logEvent(parsed.data.kind, parsed.data.payload, c.get("userId"));
    return c.json({ ok: true });
  });

  return app;
}
