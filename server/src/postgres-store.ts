import { neon } from "@neondatabase/serverless";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { BillingGrant, CreditChargeResult, LicenseIdentity, Store } from "./store.js";
import type { Message, User } from "./types.js";

type Sql = NeonQueryFunction<false, false>;
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

export class PostgresStore implements Store {
  private readonly sql: Sql;

  constructor(databaseUrlOrSql: string | Sql) {
    this.sql = typeof databaseUrlOrSql === "string" ? neon(databaseUrlOrSql) : databaseUrlOrSql;
  }

  async createUser(email: string, displayName?: string): Promise<User> {
    const rows = await this.sql`
      INSERT INTO users (email, display_name)
      VALUES (${email.trim().toLowerCase()}, ${displayName ?? null})
      ON CONFLICT (email) DO UPDATE
        SET display_name = COALESCE(users.display_name, EXCLUDED.display_name)
      RETURNING id, email, display_name
    `;
    return userFromRow(rows[0] as Row);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${email.trim().toLowerCase()}
    `;
    return rows[0] ? userFromRow(rows[0] as Row) : null;
  }

  async linkLicense(userId: string, identity: LicenseIdentity): Promise<void> {
    await this.sql.transaction((tx) => [
      tx`
        UPDATE users
        SET lemon_customer_id = ${identity.lemonCustomerId}
        WHERE id = ${userId}
      `,
      tx`
        INSERT INTO licenses (
          user_id, license_key_hash, lemon_license_key_id, lemon_instance_id,
          lemon_customer_id, lemon_store_id, lemon_product_id, lemon_variant_id,
          last_validated_at
        )
        VALUES (
          ${userId}, ${identity.licenseKeyHash}, ${identity.lemonLicenseKeyId},
          ${identity.lemonInstanceId}, ${identity.lemonCustomerId},
          ${identity.lemonStoreId}, ${identity.lemonProductId},
          ${identity.lemonVariantId}, now()
        )
        ON CONFLICT (lemon_instance_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          license_key_hash = EXCLUDED.license_key_hash,
          last_validated_at = now()
      `,
    ]);
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    `;
  }

  async getUserIdBySessionTokenHash(tokenHash: string): Promise<string | null> {
    const rows = await this.sql`
      SELECT user_id
      FROM sessions
      WHERE token_hash = ${tokenHash} AND expires_at > now()
    `;
    return rows[0] ? String((rows[0] as Row).user_id) : null;
  }

  async addCredits(
    userId: string,
    delta: number,
    reason: string,
    ref?: string,
  ): Promise<boolean> {
    const rows = await this.sql.query(
      `WITH inserted AS (
         INSERT INTO credit_ledger (user_id, delta, reason, ref)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reason, ref) WHERE ref IS NOT NULL DO NOTHING
         RETURNING user_id, delta
       ),
       updated AS (
         UPDATE users
         SET credit_balance = credit_balance + inserted.delta
         FROM inserted
         WHERE users.id = inserted.user_id
         RETURNING users.id
       )
       SELECT EXISTS(SELECT 1 FROM updated) AS applied`,
      [userId, delta, reason, ref ?? null],
    );
    return Boolean((rows[0] as Row | undefined)?.applied);
  }

  async chargeCredits(
    userId: string,
    amount: number,
    requestId: string,
  ): Promise<CreditChargeResult> {
    const rows = await this.sql.query(
      `WITH new_charge AS (
         INSERT INTO chat_charges (request_id, user_id, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (request_id) DO NOTHING
         RETURNING request_id, user_id, amount
       ),
       debit AS (
         UPDATE users
         SET credit_balance = credit_balance - new_charge.amount
         FROM new_charge
         WHERE users.id = new_charge.user_id
           AND users.credit_balance >= new_charge.amount
         RETURNING users.id, users.credit_balance
       ),
       ledger AS (
         INSERT INTO credit_ledger (user_id, delta, reason, ref)
         SELECT id, -$3, 'charge:chat', $1 FROM debit
         ON CONFLICT (user_id, reason, ref) WHERE ref IS NOT NULL DO NOTHING
       ),
       rejected AS (
         DELETE FROM chat_charges
         WHERE request_id = $1
           AND EXISTS (SELECT 1 FROM new_charge)
           AND NOT EXISTS (SELECT 1 FROM debit)
       )
       SELECT
         EXISTS(SELECT 1 FROM debit) AS charged,
         NOT EXISTS(SELECT 1 FROM new_charge)
           AND EXISTS(SELECT 1 FROM chat_charges WHERE request_id = $1 AND user_id = $2)
           AS duplicate,
         credit_balance AS balance
       FROM users
       WHERE id = $2`,
      [requestId, userId, amount],
    );
    const row = rows[0] as Row;
    return {
      charged: Boolean(row.charged),
      duplicate: Boolean(row.duplicate),
      balance: numeric(row.balance),
    };
  }

  async consumeAgentStep(requestId: string, userId: string, step: number): Promise<boolean> {
    const rows = await this.sql.query(
      `INSERT INTO agent_steps (request_id, step, user_id)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM agent_steps WHERE request_id = $1 AND step = -1
       )
       ON CONFLICT (request_id, step) DO NOTHING
       RETURNING request_id`,
      [requestId, step, userId],
    );
    return rows.length > 0;
  }

  async closeAgentRequest(requestId: string, userId: string): Promise<void> {
    await this.sql.query(
      `INSERT INTO agent_steps (request_id, step, user_id)
       VALUES ($1, -1, $2)
       ON CONFLICT (request_id, step) DO NOTHING`,
      [requestId, userId],
    );
  }

  async creditBalance(userId: string): Promise<number> {
    const rows = await this.sql`SELECT credit_balance FROM users WHERE id = ${userId}`;
    return rows[0] ? numeric((rows[0] as Row).credit_balance) : 0;
  }

  async processBillingGrant(grant: BillingGrant): Promise<{ processed: boolean; userId: string }> {
    const rows = await this.sql.query(
      `WITH target_user AS (
         INSERT INTO users (email, lemon_customer_id)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE
           SET lemon_customer_id = EXCLUDED.lemon_customer_id
         RETURNING id
       ),
       new_event AS (
         INSERT INTO billing_events (
           event_key, event_name, resource_type, resource_id, user_id,
           lemon_customer_id, lemon_store_id, lemon_product_id,
           lemon_variant_id, payload
         )
         SELECT $3, $4, $5, $6, id, $2, $7, $8, $9, $10::jsonb
         FROM target_user
         ON CONFLICT (event_key) DO NOTHING
         RETURNING user_id
       ),
       ledger AS (
         INSERT INTO credit_ledger (user_id, delta, reason, ref)
         SELECT user_id, $11, 'grant:subscription_payment', $3
         FROM new_event
         ON CONFLICT (user_id, reason, ref) WHERE ref IS NOT NULL DO NOTHING
         RETURNING user_id, delta
       ),
       balance AS (
         UPDATE users
         SET credit_balance = credit_balance + ledger.delta
         FROM ledger
         WHERE users.id = ledger.user_id
         RETURNING users.id
       )
       SELECT
         (SELECT id FROM target_user) AS user_id,
         EXISTS(SELECT 1 FROM balance) AS processed`,
      [
        grant.email,
        grant.lemonCustomerId,
        grant.eventKey,
        grant.eventName,
        grant.resourceType,
        grant.resourceId,
        grant.lemonStoreId,
        grant.lemonProductId ?? null,
        grant.lemonVariantId ?? null,
        JSON.stringify(grant.payload),
        grant.credits,
      ],
    );
    const row = rows[0] as Row;
    return { processed: Boolean(row.processed), userId: String(row.user_id) };
  }

  async createConversation(userId: string): Promise<string> {
    const rows = await this.sql`
      INSERT INTO conversations (user_id)
      VALUES (${userId})
      RETURNING id
    `;
    return String((rows[0] as Row).id);
  }

  async conversationBelongsTo(conversationId: string, userId: string): Promise<boolean> {
    const rows = await this.sql`
      SELECT EXISTS(
        SELECT 1 FROM conversations WHERE id = ${conversationId} AND user_id = ${userId}
      ) AS owned
    `;
    return Boolean((rows[0] as Row).owned);
  }

  async appendMessage(conversationId: string, message: Message): Promise<void> {
    await this.sql`
      INSERT INTO messages (conversation_id, role, content, actions)
      VALUES (
        ${conversationId}, ${message.role}, ${message.content},
        ${message.actions ? JSON.stringify(message.actions) : null}::jsonb
      )
    `;
  }

  async getMessages(conversationId: string, userId: string, limit: number): Promise<Message[]> {
    const rows = await this.sql`
      SELECT m.role, m.content, m.actions
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.id = ${conversationId} AND c.user_id = ${userId}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ${limit}
    `;
    return rows.reverse().map((raw) => {
      const row = raw as Row;
      return {
        role: row.role as Message["role"],
        content: String(row.content),
        ...(row.actions ? { actions: row.actions as Message["actions"] } : {}),
      };
    });
  }

  async logEvent(kind: string, payload: unknown, userId?: string): Promise<void> {
    await this.sql`
      INSERT INTO events (user_id, kind, payload)
      VALUES (${userId ?? null}, ${kind}, ${JSON.stringify(payload)}::jsonb)
    `;
  }
}
