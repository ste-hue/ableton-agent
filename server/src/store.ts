import { randomUUID, createHash } from "node:crypto";
import type { ActionPlan, Message, User } from "./types.js";

// ---------------------------------------------------------------------------
// Store interface — every method that touches user data takes userId, so
// multi-user isolation holds by construction. Two implementations:
// MemoryStore (dev/tests, below) and Postgres (deploy; migrations/ is the
// source of truth for the schema — wire a driver, e.g. via Hyperdrive/Neon).
// ---------------------------------------------------------------------------

export interface Store {
  createUser(email: string, displayName?: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;

  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getUserIdBySessionTokenHash(tokenHash: string): Promise<string | null>;

  addCredits(userId: string, delta: number, reason: string, ref?: string): Promise<void>;
  creditBalance(userId: string): Promise<number>;

  createConversation(userId: string): Promise<string>;
  conversationBelongsTo(conversationId: string, userId: string): Promise<boolean>;
  appendMessage(conversationId: string, msg: Message): Promise<void>;
  getMessages(conversationId: string, userId: string, limit: number): Promise<Message[]>;

  logEvent(kind: string, payload: unknown, userId?: string): Promise<void>;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

interface StoredMessage extends Message {
  actions?: ActionPlan;
}

export class MemoryStore implements Store {
  private users = new Map<string, User>();
  private usersByEmail = new Map<string, string>();
  private sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private ledger: { userId: string; delta: number; reason: string; ref?: string }[] = [];
  private conversations = new Map<string, { userId: string; messages: StoredMessage[] }>();
  readonly events: { kind: string; payload: unknown; userId?: string }[] = [];

  async createUser(email: string, displayName?: string): Promise<User> {
    const existing = this.usersByEmail.get(email);
    if (existing) return this.users.get(existing)!;
    const user: User = { id: randomUUID(), email, displayName: displayName ?? null };
    this.users.set(user.id, user);
    this.usersByEmail.set(email, user.id);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const id = this.usersByEmail.get(email);
    return id ? (this.users.get(id) ?? null) : null;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async getUserIdBySessionTokenHash(tokenHash: string): Promise<string | null> {
    const s = this.sessions.get(tokenHash);
    if (!s) return null;
    if (s.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    return s.userId;
  }

  async addCredits(userId: string, delta: number, reason: string, ref?: string): Promise<void> {
    this.ledger.push({ userId, delta, reason, ref });
  }

  async creditBalance(userId: string): Promise<number> {
    return this.ledger
      .filter((e) => e.userId === userId)
      .reduce((sum, e) => sum + e.delta, 0);
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
    this.conversations.get(conversationId)?.messages.push(msg);
  }

  async getMessages(conversationId: string, userId: string, limit: number): Promise<Message[]> {
    const conv = this.conversations.get(conversationId);
    if (!conv || conv.userId !== userId) return [];
    return conv.messages.slice(-limit);
  }

  async logEvent(kind: string, payload: unknown, userId?: string): Promise<void> {
    this.events.push({ kind, payload, userId });
  }
}
