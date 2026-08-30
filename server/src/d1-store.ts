import { randomUUID } from "node:crypto";
import type { BillingGrant, CreditChargeResult, LicenseIdentity, Store } from "./store.js";
import type { Message, User } from "./types.js";

type Row = Record<string, unknown>;

function userFromRow(row: Row): User {
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: row.display_name == null ? null : String(row.display_name),
  };
}

function numeric(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

function changes(result: D1Result): number {
  return result.meta.changes ?? 0;
}

export class D1Store implements Store {
  constructor(private readonly db: D1Database) {}

  async createUser(email: string, displayName?: string): Promise<User> {
    const id = randomUUID();
    const row = await this.db
      .prepare(
        `INSERT INTO users (id, email, display_name)
         VALUES (?, ?, ?)
         ON CONFLICT (email) DO UPDATE SET
           display_name = COALESCE(users.display_name, excluded.display_name)
         RETURNING id, email, display_name`,
      )
      .bind(id, email.trim().toLowerCase(), displayName ?? null)
      .first<Row>();
    if (!row) throw new Error("user_create_failed");
    return userFromRow(row);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .prepare("SELECT id, email, display_name FROM users WHERE email = ?")
      .bind(email.trim().toLowerCase())
      .first<Row>();
    return row ? userFromRow(row) : null;
  }

  async linkLicense(userId: string, identity: LicenseIdentity): Promise<void> {
    await this.db.batch([
      this.db
        .prepare("UPDATE users SET lemon_customer_id = ? WHERE id = ?")
        .bind(identity.lemonCustomerId, userId),
      this.db
        .prepare(
          `INSERT INTO licenses (
             id, user_id, license_key_hash, lemon_license_key_id,
             lemon_instance_id, lemon_customer_id, lemon_store_id,
             lemon_product_id, lemon_variant_id, last_validated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (lemon_instance_id) DO UPDATE SET
             user_id = excluded.user_id,
             license_key_hash = excluded.license_key_hash,
             last_validated_at = excluded.last_validated_at`,
        )
        .bind(
          randomUUID(),
          userId,
          identity.licenseKeyHash,
          identity.lemonLicenseKeyId,
          identity.lemonInstanceId,
          identity.lemonCustomerId,
          identity.lemonStoreId,
          identity.lemonProductId,
          identity.lemonVariantId,
          new Date().toISOString(),
        ),
    ]);
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      )
      .bind(randomUUID(), userId, tokenHash, expiresAt.toISOString())
      .run();
  }

  async getUserIdBySessionTokenHash(tokenHash: string): Promise<string | null> {
    const row = await this.db
      .prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?")
      .bind(tokenHash, new Date().toISOString())
      .first<Row>();
    return row ? String(row.user_id) : null;
  }

  async addCredits(
    userId: string,
    delta: number,
    reason: string,
    ref?: string,
  ): Promise<boolean> {
    const reference = ref ?? null;
    const [updated] = await this.db.batch([
      this.db
        .prepare(
          `UPDATE users
           SET credit_balance = credit_balance + ?
           WHERE id = ?
             AND (? IS NULL OR NOT EXISTS (
               SELECT 1 FROM credit_ledger
               WHERE user_id = ? AND reason = ? AND ref = ?
             ))`,
        )
        .bind(delta, userId, reference, userId, reason, reference),
      this.db
        .prepare(
          `INSERT INTO credit_ledger (user_id, delta, reason, ref)
           SELECT ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)
           ON CONFLICT (user_id, reason, ref) WHERE ref IS NOT NULL DO NOTHING`,
        )
        .bind(userId, delta, reason, reference, userId),
    ]);
    if (!updated) throw new Error("credit_update_failed");
    return changes(updated) > 0;
  }

  async chargeCredits(
    userId: string,
    amount: number,
    requestId: string,
  ): Promise<CreditChargeResult> {
    const [inserted] = await this.db.batch([
      this.db
        .prepare(
          `INSERT OR IGNORE INTO chat_charges (request_id, user_id, amount)
           SELECT ?, ?, ?
           WHERE EXISTS (
             SELECT 1 FROM users WHERE id = ? AND credit_balance >= ?
           )`,
        )
        .bind(requestId, userId, amount, userId, amount),
      this.db
        .prepare(
          `UPDATE users
           SET credit_balance = credit_balance - ?
           WHERE id = ?
             AND EXISTS (
               SELECT 1 FROM chat_charges
               WHERE request_id = ? AND user_id = ? AND amount = ?
             )
             AND NOT EXISTS (
               SELECT 1 FROM credit_ledger
               WHERE user_id = ? AND reason = 'charge:chat' AND ref = ?
             )`,
        )
        .bind(amount, userId, requestId, userId, amount, userId, requestId),
      this.db
        .prepare(
          `INSERT INTO credit_ledger (user_id, delta, reason, ref)
           SELECT ?, ?, 'charge:chat', ?
           WHERE EXISTS (
             SELECT 1 FROM chat_charges WHERE request_id = ? AND user_id = ?
           )
           ON CONFLICT (user_id, reason, ref) WHERE ref IS NOT NULL DO NOTHING`,
        )
        .bind(userId, -amount, requestId, requestId, userId),
    ]);
    if (!inserted) throw new Error("credit_charge_failed");

    const charged = changes(inserted) > 0;
    const existing = charged
      ? null
      : await this.db
          .prepare("SELECT user_id FROM chat_charges WHERE request_id = ?")
          .bind(requestId)
          .first<Row>();
    return {
      charged,
      duplicate: !charged && existing?.user_id === userId,
      balance: await this.creditBalance(userId),
    };
  }

  async creditBalance(userId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT credit_balance FROM users WHERE id = ?")
      .bind(userId)
      .first<Row>();
    return row ? numeric(row.credit_balance) : 0;
  }

  async processBillingGrant(
    grant: BillingGrant,
  ): Promise<{ processed: boolean; userId: string }> {
    const existing = await this.getUserByEmail(grant.email);
    const user = existing ?? (await this.createUser(grant.email));
    const result = await this.db
      .prepare(
        `INSERT OR IGNORE INTO billing_events (
           event_key, event_name, resource_type, resource_id, user_id,
           lemon_customer_id, lemon_store_id, lemon_product_id,
           lemon_variant_id, payload
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        grant.eventKey,
        grant.eventName,
        grant.resourceType,
        grant.resourceId,
        user.id,
        grant.lemonCustomerId,
        grant.lemonStoreId,
        grant.lemonProductId ?? null,
        grant.lemonVariantId ?? null,
        JSON.stringify(grant.payload),
      )
      .run();
    const processed = changes(result) > 0;
    if (processed) {
      await this.addCredits(
        user.id,
        grant.credits,
        "grant:subscription_payment",
        grant.eventKey,
      );
    }
    return { processed, userId: user.id };
  }

  async createConversation(userId: string): Promise<string> {
    const id = randomUUID();
    await this.db
      .prepare("INSERT INTO conversations (id, user_id) VALUES (?, ?)")
      .bind(id, userId)
      .run();
    return id;
  }

  async conversationBelongsTo(conversationId: string, userId: string): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 AS owned FROM conversations WHERE id = ? AND user_id = ?")
      .bind(conversationId, userId)
      .first<Row>();
    return Boolean(row?.owned);
  }

  async appendMessage(conversationId: string, message: Message): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO messages (conversation_id, role, content, actions) VALUES (?, ?, ?, ?)",
      )
      .bind(
        conversationId,
        message.role,
        message.content,
        message.actions ? JSON.stringify(message.actions) : null,
      )
      .run();
  }

  async getMessages(conversationId: string, userId: string, limit: number): Promise<Message[]> {
    const result = await this.db
      .prepare(
        `SELECT m.role, m.content, m.actions
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE c.id = ? AND c.user_id = ?
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT ?`,
      )
      .bind(conversationId, userId, limit)
      .all<Row>();
    return (result.results ?? []).reverse().map((row) => ({
      role: row.role as Message["role"],
      content: String(row.content),
      ...(row.actions
        ? { actions: JSON.parse(String(row.actions)) as Message["actions"] }
        : {}),
    }));
  }

  async logEvent(kind: string, payload: unknown, userId?: string): Promise<void> {
    await this.db
      .prepare("INSERT INTO events (user_id, kind, payload) VALUES (?, ?, ?)")
      .bind(userId ?? null, kind, JSON.stringify(payload))
      .run();
  }
}
