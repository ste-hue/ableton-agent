// One-off: create a Tembro user with a manual credit grant and a long-lived
// session, without going through /v0/auth/license. Mirrors D1Store.createUser,
// addCredits and createSession. Run from server/:
//   node grant-family-beta.mjs <email> <credits> [days]
// Prints the path of a session.json the user drops into ~/.tembro/ .
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [email, creditsArg, daysArg = "365"] = process.argv.slice(2);
if (!email || !creditsArg) {
  console.error("usage: node grant-family-beta.mjs <email> <credits> [days]");
  process.exit(1);
}
const credits = Number(creditsArg);
const days = Number(daysArg);
if (!Number.isInteger(credits) || credits <= 0 || !(days > 0)) {
  console.error("credits must be a positive integer, days a positive number");
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();
const userId = randomUUID();
const sessionId = randomUUID();
const instanceId = randomUUID();
const token = randomBytes(32).toString("hex");
const tokenHash = createHash("sha256").update(token).digest("hex");
const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const ref = `manual-${new Date().toISOString().slice(0, 10)}`;

// If the email already exists, reuse that row (same as createUser's ON CONFLICT);
// the ledger's unique (user_id, reason, ref) index keeps the grant idempotent.
const sql = `
INSERT INTO users (id, email, credit_balance) VALUES ('${userId}', '${normalizedEmail}', 0)
  ON CONFLICT (email) DO NOTHING;
INSERT INTO credit_ledger (user_id, delta, reason, ref)
  SELECT id, ${credits}, 'grant:manual', '${ref}' FROM users WHERE email = '${normalizedEmail}'
  ON CONFLICT (user_id, reason, ref) WHERE ref IS NOT NULL DO NOTHING;
UPDATE users SET credit_balance = credit_balance + ${credits}
  WHERE email = '${normalizedEmail}'
    AND EXISTS (SELECT 1 FROM credit_ledger
                WHERE user_id = users.id AND reason = 'grant:manual' AND ref = '${ref}'
                  AND created_at >= datetime('now', '-1 minute'));
INSERT INTO sessions (id, user_id, token_hash, expires_at)
  SELECT '${sessionId}', id, '${tokenHash}', '${expiresAt}' FROM users WHERE email = '${normalizedEmail}';
SELECT u.email, u.credit_balance, s.expires_at
  FROM users u JOIN sessions s ON s.user_id = u.id
  WHERE u.email = '${normalizedEmail}' AND s.id = '${sessionId}';
`;

const out = execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "tembro", "--remote", "--json", "--command", sql],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
const results = JSON.parse(out);
const check = results.at(-1)?.results?.[0];
if (!check) {
  console.error("verification query returned no row — inspect D1 manually");
  process.exit(2);
}
console.log(`user ${check.email}: balance ${check.credit_balance}, session valid until ${check.expires_at}`);

const outDir = resolve("out");
mkdirSync(outDir, { recursive: true, mode: 0o700 });
const sessionFile = resolve(outDir, `session-${normalizedEmail.replace(/[^a-z0-9]/g, "_")}.json`);
writeFileSync(sessionFile, JSON.stringify({ token, instance_id: instanceId }) + "\n", { mode: 0o600 });
console.log(`session file: ${sessionFile}`);
console.log("send it as ~/.tembro/session.json — it is the bearer credential, share privately");
