import { randomUUID, createHash } from "node:crypto";
import type { Message, User } from "./types.js";

export interface LicenseIdentity {
  licenseKeyHash: string;
  lemonLicenseKeyId: number;
  lemonInstanceId: string;
  lemonCustomerId: number;
  lemonStoreId: number;
  lemonProductId: number;
  lemonVariantId: number;
}

export interface BillingGrant {
  eventKey: string;
  eventName: string;
  resourceType: string;
  resourceId: string;
  email: string;
  lemonCustomerId: number;
  lemonStoreId: number;
  lemonProductId?: number;
  lemonVariantId?: number;
  credits: number;
  payload: unknown;
}

export interface CreditChargeResult {
  charged: boolean;
  duplicate: boolean;
  balance: number;
}

export interface Store {
  createUser(email: string, displayName?: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  linkLicense(userId: string, identity: LicenseIdentity): Promise<void>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getUserIdBySessionTokenHash(tokenHash: string): Promise<string | null>;
  addCredits(userId: string, delta: number, reason: string, ref?: string): Promise<boolean>;
  chargeCredits(userId: string, amount: number, requestId: string): Promise<CreditChargeResult>;
  creditBalance(userId: string): Promise<number>;
  processBillingGrant(grant: BillingGrant): Promise<{ processed: boolean; userId: string }>;
  createConversation(userId: string): Promise<string>;
  conversationBelongsTo(conversationId: string, userId: string): Promise<boolean>;
  appendMessage(conversationId: string, msg: Message): Promise<void>;
  getMessages(conversationId: string, userId: string, limit: number): Promise<Message[]>;
  logEvent(kind: string, payload: unknown, userId?: string): Promise<void>;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class MemoryStore implements Store {
  private users = new Map<string, User>();
  private usersByEmail = new Map<string, string>();
  private sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private ledger: { userId: string; delta: number; reason: string; ref?: string }[] = [];
  private ledgerRefs = new Set<string>();
  private charges = new Map<string, string>();
  private licenses = new Map<string, LicenseIdentity>();
  private billingEvents = new Set<string>();
  private conversations = new Map<string, { userId: string; messages: Message[] }>();
  readonly events: { kind: string; payload: unknown; userId?: string }[] = [];

  private balanceFor(userId: string): number {
    return this.ledger
      .filter((entry) => entry.userId === userId)
      .reduce((sum, entry) => sum + entry.delta, 0);
  }

  async createUser(email: string, displayName?: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const existing = this.usersByEmail.get(normalized);
    if (existing) return this.users.get(existing)!;
    const user: User = { id: randomUUID(), email: normalized, displayName: displayName ?? null };
    this.users.set(user.id, user);
    this.usersByEmail.set(normalized, user.id);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const id = this.usersByEmail.get(email.trim().toLowerCase());
    return id ? (this.users.get(id) ?? null) : null;
  }

  async linkLicense(userId: string, identity: LicenseIdentity): Promise<void> {
    this.licenses.set(userId, identity);
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async getUserIdBySessionTokenHash(tokenHash: string): Promise<string | null> {
    const session = this.sessions.get(tokenHash);
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    return session.userId;
  }

  async addCredits(
    userId: string,
    delta: number,
    reason: string,
    ref?: string,
  ): Promise<boolean> {
    const key = ref ? `${userId}:${reason}:${ref}` : null;
    if (key && this.ledgerRefs.has(key)) return false;
    if (key) this.ledgerRefs.add(key);
    this.ledger.push({ userId, delta, reason, ref });
    return true;
  }

  async chargeCredits(
    userId: string,
    amount: number,
    requestId: string,
  ): Promise<CreditChargeResult> {
    const existingUser = this.charges.get(requestId);
    if (existingUser) {
      return {
        charged: false,
        duplicate: existingUser === userId,
        balance: await this.creditBalance(userId),
      };
    }
    const balance = this.balanceFor(userId);
    if (balance < amount) return { charged: false, duplicate: false, balance };
    this.charges.set(requestId, userId);
    await this.addCredits(userId, -amount, "charge:chat", requestId);
    return { charged: true, duplicate: false, balance: balance - amount };
  }

  async creditBalance(userId: string): Promise<number> {
    return this.balanceFor(userId);
  }

  async processBillingGrant(grant: BillingGrant): Promise<{ processed: boolean; userId: string }> {
    let user = await this.getUserByEmail(grant.email);
    user ??= await this.createUser(grant.email);
    if (this.billingEvents.has(grant.eventKey)) return { processed: false, userId: user.id };
    this.billingEvents.add(grant.eventKey);
    await this.addCredits(user.id, grant.credits, "grant:subscription_payment", grant.eventKey);
    return { processed: true, userId: user.id };
  }

  async createConversation(userId: string): Promise<string> {
    const id = randomUUID();
    this.conversations.set(id, { userId, messages: [] });
    return id;
  }

  async conversationBelongsTo(conversationId: string, userId: string): Promise<boolean> {
    return this.conversations.get(conversationId)?.userId === userId;
  }

  async appendMessage(conversationId: string, msg: Message): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error("conversation_not_found");
    conversation.messages.push(msg);
  }

  async getMessages(conversationId: string, userId: string, limit: number): Promise<Message[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) return [];
    return conversation.messages.slice(-limit);
  }

  async logEvent(kind: string, payload: unknown, userId?: string): Promise<void> {
    this.events.push({ kind, payload, userId });
  }
}
