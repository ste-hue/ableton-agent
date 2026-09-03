import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { LemonWebhookSchema } from "./types.js";
import type { BillingGrant } from "./store.js";

const LicenseResponseSchema = z.object({
  activated: z.boolean().optional(),
  valid: z.boolean().optional(),
  error: z.string().nullable().optional(),
  license_key: z.object({
    id: z.number(),
    status: z.enum(["inactive", "active", "expired", "disabled"]),
  }),
  instance: z.object({ id: z.string().uuid() }).optional(),
  meta: z.object({
    store_id: z.number(),
    product_id: z.number(),
    variant_id: z.number(),
    customer_id: z.number(),
    customer_email: z.string().email(),
  }),
});

export interface LicenseActivation {
  licenseKeyId: number;
  instanceId: string;
  status: "inactive" | "active" | "expired" | "disabled";
  storeId: number;
  productId: number;
  variantId: number;
  customerId: number;
  customerEmail: string;
}

export interface LicenseProvider {
  activateOrValidate(input: {
    licenseKey: string;
    instanceName: string;
    instanceId?: string;
  }): Promise<LicenseActivation>;
}

export class LemonSqueezyLicenseProvider implements LicenseProvider {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async activateOrValidate(input: {
    licenseKey: string;
    instanceName: string;
    instanceId?: string;
  }): Promise<LicenseActivation> {
    // The device remembers the instance id of its last session, which may
    // belong to a free-beta session or to another license. Lemon Squeezy
    // answers a validate call for such an id with "instance_id not found",
    // so a failed validation falls back to a fresh activation of this key.
    if (input.instanceId) {
      try {
        return await this.call("validate", input.licenseKey, { instance_id: input.instanceId });
      } catch {
        /* fall through to activate */
      }
    }
    return this.call("activate", input.licenseKey, { instance_name: input.instanceName });
  }

  private async call(
    action: "validate" | "activate",
    licenseKey: string,
    extra: Record<string, string>,
  ): Promise<LicenseActivation> {
    const body = new URLSearchParams({ license_key: licenseKey, ...extra });
    const response = await this.fetchImpl(`https://api.lemonsqueezy.com/v1/licenses/${action}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const raw: unknown = await response.json().catch(() => null);
    const parsed = LicenseResponseSchema.safeParse(raw);
    if (!response.ok || !parsed.success) {
      const error =
        raw && typeof raw === "object" && typeof (raw as { error?: unknown }).error === "string"
          ? (raw as { error: string }).error
          : "license_provider_error";
      throw new Error(error);
    }
    const data = parsed.data;
    const accepted = action === "validate" ? data.valid : data.activated;
    if (!accepted || data.license_key.status !== "active") {
      throw new Error(data.error ?? "license_inactive");
    }
    const instanceId = extra.instance_id ?? data.instance?.id;
    if (!instanceId) throw new Error("license_instance_missing");
    return {
      licenseKeyId: data.license_key.id,
      instanceId,
      status: data.license_key.status,
      storeId: data.meta.store_id,
      productId: data.meta.product_id,
      variantId: data.meta.variant_id,
      customerId: data.meta.customer_id,
      customerEmail: data.meta.customer_email.trim().toLowerCase(),
    };
  }
}

export function verifyLemonSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !signature || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const normalized = signature.padEnd(expected.length, "0").slice(0, expected.length);
  const received = Buffer.from(normalized);
  const same = timingSafeEqual(expected, received);
  return same && signature.length === expected.length;
}

function integer(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/** Lemon Squeezy variant id → credits granted per unit bought. */
export type CreditPacks = ReadonlyMap<number, number>;

/**
 * Parses the CREDIT_PACKS variable: "variantId:credits,variantId:credits".
 * Variant ids are the Lemon Squeezy product variants (one per pack); the
 * mapping lives in config, not in the database, so a pack is a deploy.
 */
export function parseCreditPacks(value: string | undefined): CreditPacks {
  const packs = new Map<number, number>();
  for (const entry of (value ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const match = /^(\d+):(\d+)$/.exec(trimmed);
    const variantId = match ? Number(match[1]) : NaN;
    const credits = match ? Number(match[2]) : NaN;
    if (!Number.isInteger(variantId) || !Number.isInteger(credits) || credits <= 0) {
      throw new Error("invalid_env:CREDIT_PACKS");
    }
    packs.set(variantId, credits);
  }
  return packs;
}

/**
 * Turns a signed Lemon Squeezy webhook into a credit grant, or null when the
 * event is not a paid order. Credits are sold as one-time packs: every paid
 * `order_created` for a known variant grants that pack's credits × quantity,
 * keyed by order id so a redelivered webhook cannot grant twice.
 */
export function billingGrantFromWebhook(
  raw: unknown,
  expectedStoreId: number,
  expectedProductId: number,
  packs: CreditPacks,
): BillingGrant | null {
  const parsed = LemonWebhookSchema.safeParse(raw);
  if (!parsed.success || parsed.data.meta.event_name !== "order_created") return null;
  const { data } = parsed.data;
  const attributes = data.attributes;
  if (attributes.status !== "paid") return null;
  const item =
    attributes.first_order_item && typeof attributes.first_order_item === "object"
      ? (attributes.first_order_item as Record<string, unknown>)
      : {};
  const storeId = integer(attributes.store_id);
  const productId = integer(item.product_id);
  const variantId = integer(item.variant_id);
  const quantity = integer(item.quantity) ?? 1;
  const customerId = integer(attributes.customer_id);
  const email =
    typeof attributes.user_email === "string"
      ? attributes.user_email.trim().toLowerCase()
      : null;
  if (
    storeId !== expectedStoreId ||
    (productId !== undefined && productId !== expectedProductId) ||
    !customerId ||
    !email
  ) {
    throw new Error("billing_product_mismatch");
  }
  const packCredits = variantId === undefined ? undefined : packs.get(variantId);
  // Our store, our product, but a variant nobody configured: a config gap, not
  // a foreign event. Fail loudly so Lemon Squeezy retries and the log shows it.
  if (packCredits === undefined || quantity <= 0) throw new Error("billing_unknown_variant");
  return {
    eventKey: `${parsed.data.meta.event_name}:${data.type}:${data.id}`,
    eventName: parsed.data.meta.event_name,
    resourceType: data.type,
    resourceId: data.id,
    email,
    lemonCustomerId: customerId,
    lemonStoreId: storeId,
    lemonProductId: productId,
    lemonVariantId: variantId,
    credits: packCredits * quantity,
    payload: parsed.data,
  };
}
