import { Hono } from "hono";
import type { Context, Next } from "hono";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import type { Store } from "./store.js";
import { hashToken } from "./store.js";
import type { AgentProvider, AgentStepResult, AgentStepUsage } from "./llm.js";
import { AGENT_STEP_BUDGET } from "./llm.js";
import type { CreditPacks, LicenseProvider } from "./billing.js";
import { billingGrantFromWebhook, verifyLemonSignature } from "./billing.js";
import { ClientEventSchema, AgentRequestSchema, LicenseAuthRequestSchema } from "./types.js";
import type { AgentStepResponse, McpTool } from "./types.js";
import { createStorefront } from "./storefront-routes.js";
import {
  estimateCreditCost,
  isTembroSkill,
  publicSkillProfiles,
  skillPromptFor,
} from "./skills.js";
import type { TembroSkillId } from "./skills.js";

// ---------------------------------------------------------------------------
// Tembro V0 API — one Hono app, deployable to Cloudflare Workers or Node.
//
// Client (M4L device) flow:
//   sign in → POST /v0/agent with message + live context + local MCP schemas →
//   receive tool calls → execute them locally → return tool outputs → repeat
//   until the agent replies. Credits are charged once per user turn, with the
//   amount chosen server-side from the musical scope of the request.
//
// Credit invariant: the credit policy is server-side and
// replaceable — the client only ever sees a balance. Credits are not chats
// and are not provider tokens.
// ---------------------------------------------------------------------------
export interface AppConfig {
  store: Store;
  agent?: AgentProvider;
  agentTokenSecret?: string;
  licenseProvider?: LicenseProvider;
  lemonStoreId?: number;
  lemonProductId?: number;
  lemonWebhookSecret?: string;
  /** Lemon Squeezy variant id → credits per unit; empty disables the webhook. */
  creditPacks?: CreditPacks;
  allowDevSignin?: boolean;
  signupGrantCredits?: number;
  chatCostCredits?: number;
  historyLimit?: number;
  atlasCheckoutUrl?: string;
  atlasDownloadUrl?: string;
  checkoutUrl?: string;
  freeFirstPackCode?: string;
  downloadUrl?: string;
  supportEmail?: string;
  betaAccessCode?: string;
  betaGrantCredits?: number;
  appVersion?: string;
}

type Env = { Variables: { userId: string } };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AGENT_TOKEN_TTL_MS = 30 * 60 * 1000;
// The step budget bounds what one credit charge can cost us in model calls
// (measured: ~60 cached Terra steps ≈ $0.30); the prompt states the same number.
const MAX_AGENT_STEPS = AGENT_STEP_BUDGET;

const SAFE_MCP_TOOLS = new Set([
  "live_ping",
  "live_bridge_status",
  "live_get",
  "live_set_summary",
  "live_set",
  "live_call",
  "live_children",
  "live_device_parameters",
  "live_parameter_set",
  "live_clip_notes",
  "live_clip_update_notes",
  "live_clip_add_notes",
  "live_clip_duplicate_to_arrangement",
  "live_clip_envelope",
  "live_clip_velocity_envelope",
  "live_clip_warp_markers",
  "live_track_create_audio_clip",
  "live_track_insert_device",
  "live_transport",
  "live_browser_roots",
  "live_browser_capabilities",
  "live_browser_search",
  "live_browser_load",
  "live_load_device",
  "live_browser_preview",
  "find_similar_sounds",
  "live_observe",
  "live_events",
  "tembro_arrange_clip",
  // These tools generate and inspect local proposals; the device owns their
  // implementations. They do not write to Live or execute arbitrary code.
  "tembro_chordarium_compose",
  "tembro_rudiment_compose",
  "tembro_ensemble_compose",
  "tembro_proposal_notes",
]);

interface AgentTokenPayload {
  userId: string;
  conversationId: string;
  requestId: string;
  responseId: string;
  toolHash: string;
  step: number;
  creditCost: number;
  skill: TembroSkillId | null;
  expiresAt: number;
  /** Tokens spent by the turn so far — rides in the token so the final step can report the whole turn. */
  usage?: AgentTurnUsage;
}

/** Running token totals of one agent turn, summed over its model calls. */
interface AgentTurnUsage {
  calls: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
}

const EMPTY_TURN_USAGE: AgentTurnUsage = {
  calls: 0,
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
};

function addTurnUsage(
  previous: AgentTurnUsage | undefined,
  step: AgentStepUsage | undefined,
): AgentTurnUsage {
  const base = previous ?? EMPTY_TURN_USAGE;
  if (!step) return base;
  return {
    calls: base.calls + 1,
    inputTokens: base.inputTokens + step.inputTokens,
    cachedInputTokens: base.cachedInputTokens + step.cachedInputTokens,
    outputTokens: base.outputTokens + step.outputTokens,
    reasoningTokens: base.reasoningTokens + step.reasoningTokens,
    totalTokens: base.totalTokens + step.totalTokens,
  };
}

function safeAgentTools(tools: McpTool[]): McpTool[] {
  const seen = new Set<string>();
  const safe = tools.filter((tool) => {
    if (!SAFE_MCP_TOOLS.has(tool.name) || seen.has(tool.name)) return false;
    seen.add(tool.name);
    return true;
  });
  if (safe.length === 0) throw new Error("no_safe_mcp_tools");
  if (JSON.stringify(safe).length > 180_000) throw new Error("mcp_tool_schema_too_large");
  return safe;
}

function hashAgentTools(tools: McpTool[]): string {
  return createHash("sha256").update(JSON.stringify(tools)).digest("hex");
}

function signAgentToken(secret: string, payload: AgentTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyAgentToken(secret: string, token: string): AgentTokenPayload | null {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AgentTokenPayload;
    if (
      !payload ||
      typeof payload !== "object" ||
      payload.expiresAt < Date.now() ||
      !Number.isInteger(payload.creditCost) ||
      payload.creditCost <= 0 ||
      (payload.skill !== null && !isTembroSkill(payload.skill))
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createApp(config: AppConfig) {
  const {
    store,
    agent,
    agentTokenSecret,
    licenseProvider,
    lemonStoreId,
    lemonProductId,
    lemonWebhookSecret,
    creditPacks = new Map<number, number>(),
    allowDevSignin = false,
    signupGrantCredits = 100,
    chatCostCredits = 1,
    historyLimit = 30,
    downloadUrl,
    supportEmail,
    betaAccessCode,
    betaGrantCredits = 40,
    appVersion = "0.1.6-beta",
  } = config;

  const app = new Hono<Env>();

  app.onError(async (error, c) => {
    await store.logEvent("server.error", {
      path: c.req.path,
      message: error instanceof Error ? error.message : String(error),
    });
    return c.json({ error: "internal_error" }, 500);
  });

  const storeOptions = { atlasCheckoutUrl: config.atlasCheckoutUrl, atlasDownloadUrl: config.atlasDownloadUrl, supportEmail };
  app.route("/", createStorefront(storeOptions));

  app.get("/v0/health", (c) => c.json({ ok: true, protocol_version: "0.1" }));

  app.get("/v0/skills", (c) =>
    c.json({
      protocol_version: "0.2",
      base_credit_cost: chatCostCredits,
      skills: publicSkillProfiles(chatCostCredits),
    }),
  );

  app.get("/v0/version", (c) =>
    c.json({
      version: appVersion,
      download_url: downloadUrl || null,
    }),
  );

  const paidLicense =
    licenseProvider && lemonStoreId && lemonProductId
      ? { provider: licenseProvider, storeId: lemonStoreId, productId: lemonProductId }
      : null;

  if (paidLicense || betaAccessCode) {
    app.post("/v0/auth/license", async (c) => {
      const parsed = LicenseAuthRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
      const request = parsed.data;

      if (
        betaAccessCode &&
        hashToken(request.license_key) === hashToken(betaAccessCode)
      ) {
        let user = await store.getUserByEmail(request.email);
        user ??= await store.createUser(request.email);
        await store.addCredits(user.id, betaGrantCredits, "grant:free_beta", user.id);
        const token = randomBytes(32).toString("hex");
        const instanceId = request.instance_id ?? randomUUID();
        await store.createSession(user.id, hashToken(token), new Date(Date.now() + SESSION_TTL_MS));
        return c.json({
          token,
          user_id: user.id,
          instance_id: instanceId,
          credits: await store.creditBalance(user.id),
          protocol_version: "0.1",
          access_mode: "free_beta",
        });
      }

      // Failed activations are logged with their cause: the device only shows
      // the HTTP status, so this is the one place a support question can be
      // answered from. The key itself is never stored, only its prefix.
      const licenseFailed = (reason: string, extra: Record<string, unknown> = {}) =>
        store.logEvent("auth.license_failed", {
          reason,
          email: request.email,
          keyPrefix: request.license_key.slice(0, 8),
          instanceName: request.instance_name,
          hasInstanceId: Boolean(request.instance_id),
          ...extra,
        });
      if (!paidLicense) {
        await licenseFailed("paid_license_not_configured");
        return c.json({ error: "license_invalid" }, 401);
      }
      let activation;
      try {
        activation = await paidLicense.provider.activateOrValidate({
          licenseKey: request.license_key,
          instanceName: request.instance_name,
          instanceId: request.instance_id,
        });
      } catch (error) {
        await licenseFailed("provider_rejected", {
          providerError: error instanceof Error ? error.message : String(error),
        });
        return c.json({ error: "license_invalid" }, 401);
      }
      if (
        activation.storeId !== paidLicense.storeId ||
        activation.productId !== paidLicense.productId ||
        activation.customerEmail !== request.email
      ) {
        await licenseFailed("product_or_email_mismatch", {
          licenseStoreId: activation.storeId,
          licenseProductId: activation.productId,
          licenseEmail: activation.customerEmail,
        });
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

  if (lemonWebhookSecret && lemonStoreId && lemonProductId && creditPacks.size > 0) {
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
          creditPacks,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === "billing_product_mismatch" ||
            error.message === "billing_unknown_variant")
        ) {
          await store.logEvent("billing.rejected", { reason: error.message });
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
      if (!grant) return c.json({ ok: true, ignored: true });
      const result = await store.processBillingGrant(grant);
      await store.logEvent(
        "billing.order_created",
        { eventKey: grant.eventKey, credits: result.credits, free: grant.free, processed: result.processed },
        result.userId,
      );
      if (result.processed && grant.free && result.credits === 0) {
        await store.logEvent(
          "billing.free_pack_repeat",
          { eventKey: grant.eventKey, email: grant.email, refused: grant.credits },
          result.userId,
        );
      }
      return c.json({ ok: true, processed: result.processed, credits: result.credits });
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

  app.post("/v0/agent", requireAuth, async (c) => {
    if (!agent || !agentTokenSecret) return c.json({ error: "agent_unavailable" }, 503);
    const parsed = AgentRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const userId = c.get("userId");
    let tools: McpTool[];
    try {
      tools = safeAgentTools(parsed.data.tools);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : "invalid_mcp_tools" },
        400,
      );
    }
    const toolHash = hashAgentTools(tools);

    const responseFor = async (
      result: AgentStepResult,
      meta: {
        conversationId: string;
        requestId: string;
        step: number;
        creditCost: number;
        skill: TembroSkillId | null;
        /** Totals of the previous steps of this turn (none on step 1). */
        usageSoFar?: AgentTurnUsage;
      },
    ): Promise<AgentStepResponse> => {
      const allowed = new Set(tools.map((tool) => tool.name));
      if (
        result.toolCalls.length > 8 ||
        result.toolCalls.some((call) => !allowed.has(call.name))
      ) {
        throw new Error("model_requested_unavailable_tool");
      }
      // Every model call is metered individually: the provider bills per call,
      // and a turn's real cost is the sum, not the last step's context size.
      const turnUsage = addTurnUsage(meta.usageSoFar, result.usage);
      if (result.usage) {
        await store.logEvent(
          "agent.usage",
          {
            requestId: meta.requestId,
            step: meta.step,
            usage: result.usage,
            turn: turnUsage,
            skill: meta.skill,
          },
          userId,
        );
      }
      const credits = await store.creditBalance(userId);
      if (result.toolCalls.length > 0) {
        const continuationToken = signAgentToken(agentTokenSecret, {
          userId,
          conversationId: meta.conversationId,
          requestId: meta.requestId,
          responseId: result.responseId,
          toolHash,
          step: meta.step,
          creditCost: meta.creditCost,
          skill: meta.skill,
          expiresAt: Date.now() + AGENT_TOKEN_TTL_MS,
          usage: turnUsage,
        });
        return {
          protocol_version: "0.2",
          kind: "tool_calls",
          conversation_id: meta.conversationId,
          reply: result.reply,
          tool_calls: result.toolCalls,
          continuation_token: continuationToken,
          credits_remaining: credits,
          credits_charged: meta.creditCost,
          skill: meta.skill,
        };
      }
      await store.appendMessage(meta.conversationId, {
        role: "assistant",
        content: result.reply,
      });
      await store.logEvent(
        "agent.completed",
        {
          conversationId: meta.conversationId,
          requestId: meta.requestId,
          steps: meta.step,
          usage: turnUsage,
          model: result.usage?.model ?? null,
          creditsCharged: meta.creditCost,
          skill: meta.skill,
        },
        userId,
      );
      return {
        protocol_version: "0.2",
        kind: "final",
        conversation_id: meta.conversationId,
        reply: result.reply,
        tool_calls: [],
        credits_remaining: credits,
        credits_charged: meta.creditCost,
        skill: meta.skill,
      };
    };

    if (parsed.data.kind === "start") {
      const requestId = parsed.data.request_id ?? randomUUID();
      const skill = parsed.data.skill ?? null;
      const creditCost = estimateCreditCost(
        chatCostCredits,
        parsed.data.message,
        parsed.data.skill,
      );
      let conversationId = parsed.data.conversation_id ?? null;
      if (conversationId) {
        const owned = await store.conversationBelongsTo(conversationId, userId);
        if (!owned) return c.json({ error: "not_found" }, 404);
      }
      const charge = await store.chargeCredits(userId, creditCost, requestId);
      if (charge.duplicate) {
        return c.json({ error: "duplicate_request", request_id: requestId }, 409);
      }
      if (!charge.charged) {
        return c.json(
          { error: "insufficient_credits", credits: charge.balance, credits_required: creditCost },
          402,
        );
      }
      try {
        conversationId ??= await store.createConversation(userId);
        await store.appendMessage(conversationId, {
          role: "user",
          content: parsed.data.message,
        });
        const history = await store.getMessages(conversationId, userId, historyLimit);
        await store.logEvent(
          "agent.started",
          { conversationId, requestId, toolCount: tools.length, creditCost, skill },
          userId,
        );
        const result = await agent.step({
          messages: history,
          liveContext: parsed.data.live_context,
          tools,
          reasoningEffort: "high",
          skillPrompt: skillPromptFor(skill),
        });
        if (result.thinking) {
          await store.logEvent(
            "agent.thinking",
            { requestId, step: 1, thinking: result.thinking },
            userId,
          );
        }
        return c.json(
          await responseFor(result, {
            conversationId,
            requestId,
            step: 1,
            creditCost,
            skill,
          }),
        );
      } catch (error) {
        await store.closeAgentRequest(requestId, userId);
        await store.addCredits(userId, creditCost, "refund:agent", requestId);
        await store.logEvent(
          "agent.failed",
          {
            requestId,
            step: 0,
            message: error instanceof Error ? error.message : String(error),
          },
          userId,
        );
        return c.json(
          {
            error: "agent_provider_error",
            detail: "the model call failed; your credits were refunded",
            credits_remaining: await store.creditBalance(userId),
          },
          502,
        );
      }
    }

    const continuation = verifyAgentToken(agentTokenSecret, parsed.data.continuation_token);
    if (
      !continuation ||
      continuation.userId !== userId ||
      continuation.conversationId !== parsed.data.conversation_id ||
      continuation.toolHash !== toolHash
    ) {
      return c.json({ error: "invalid_continuation" }, 401);
    }
    // Each continuation token is single-use: a stateless HMAC blob would
    // otherwise allow replaying an old step forever — resetting the step
    // counter and triggering unbounded provider spend on a turn charged once.
    const consumed = await store.consumeAgentStep(
      continuation.requestId,
      userId,
      continuation.step,
    );
    if (!consumed) {
      return c.json({ error: "continuation_replayed" }, 409);
    }
    // Budget exhausted with the model still asking for tools: it has ignored
    // the wrap-up notices. Rather than going silent (a bare error the device
    // can only render as "stopped"), spend one last call with tools disabled so
    // the user hears what exists in Live and what remains. The work is real
    // and reported, so the charge stands; the event tells us how often the
    // model has to be forced here.
    const budgetExhausted = continuation.step >= MAX_AGENT_STEPS;
    try {
      await store.logEvent(
        "agent.tool_results",
        {
          conversationId: continuation.conversationId,
          requestId: continuation.requestId,
          step: continuation.step,
          outputCount: parsed.data.tool_outputs.length,
          creditCost: continuation.creditCost,
          skill: continuation.skill,
        },
        userId,
      );
      const stepResult = await agent.step({
        previousResponseId: continuation.responseId,
        toolOutputs: parsed.data.tool_outputs,
        tools,
        reasoningEffort: "high",
        skillPrompt: skillPromptFor(continuation.skill),
        budget: { round: continuation.step + 1, total: MAX_AGENT_STEPS },
        finalOnly: budgetExhausted,
      });
      let result = stepResult;
      if (budgetExhausted) {
        await store.logEvent(
          "agent.budget_exhausted",
          {
            requestId: continuation.requestId,
            round: continuation.step + 1,
            skill: continuation.skill,
            ignoredToolCalls: stepResult.toolCalls.length,
          },
          userId,
        );
        result = {
          ...stepResult,
          toolCalls: [],
          reply:
            stepResult.reply.trim() ||
            "Paused — the round budget for this turn is used up. What is in Live now is what was built and verified so far; say \"continue\" to keep going, or listen first.",
        };
      }
      if (result.thinking) {
        await store.logEvent(
          "agent.thinking",
          {
            requestId: continuation.requestId,
            step: continuation.step + 1,
            thinking: result.thinking,
          },
          userId,
        );
      }
      return c.json(
        await responseFor(result, {
          conversationId: continuation.conversationId,
          requestId: continuation.requestId,
          step: continuation.step + 1,
          creditCost: continuation.creditCost,
          skill: continuation.skill,
          usageSoFar: continuation.usage,
        }),
      );
    } catch (error) {
      // A refunded turn must not remain completable through its outstanding
      // token: close the request in the same breath as the refund.
      await store.closeAgentRequest(continuation.requestId, userId);
      await store.addCredits(
        userId,
        continuation.creditCost,
        "refund:agent",
        continuation.requestId,
      );
      await store.logEvent(
        "agent.failed",
        {
          requestId: continuation.requestId,
          step: continuation.step,
          message: error instanceof Error ? error.message : String(error),
        },
        userId,
      );
      // Say what happened and show the post-refund balance instead of a bare
      // internal_error that leaves the user believing the credit was spent.
      return c.json(
        {
          error: "agent_provider_error",
          detail: "the model call failed mid-turn; your credits were refunded",
          credits_remaining: await store.creditBalance(userId),
        },
        502,
      );
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
