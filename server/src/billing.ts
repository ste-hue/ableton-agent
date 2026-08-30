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
    const validating = Boolean(input.instanceId);
    const body = new URLSearchParams({ license_key: input.licenseKey });
    if (input.instanceId) body.set("instance_id", input.instanceId);
    else body.set("instance_name", input.instanceName);

    const response = await this.fetchImpl(
      `https://api.lemonsqueezy.com/v1/licenses/${validating ? "validate" : "activate"}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    const parsed = LicenseResponseSchema.safeParse(await response.json().catch(() => null));
    if (!response.ok || !parsed.success) throw new Error("license_provider_error");
    const data = parsed.data;
    const accepted = validating ? data.valid : data.activated;
    if (!accepted || data.license_key.status !== "active") {
      throw new Error(data.error ?? "license_inactive");
    }
    const instanceId = input.instanceId ?? data.instance?.id;
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

export function billingGrantFromWebhook(
  raw: unknown,
  expectedStoreId: number,
  expectedProductId: number,
  credits: number,
): BillingGrant | null {
  const parsed = LemonWebhookSchema.safeParse(raw);
  if (!parsed.success || parsed.data.meta.event_name !== "subscription_payment_success") return null;
  const { data } = parsed.data;
  const attributes = data.attributes;
  const storeId = integer(attributes.store_id);
  const productId = integer(attributes.product_id);
  const variantId = integer(attributes.variant_id);
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
    credits,
    payload: parsed.data,
  };
}
