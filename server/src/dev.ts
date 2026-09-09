// Local dev server (Node). Deploy target is Cloudflare Workers (export the
// Hono app's fetch handler); this file exists so `npm run dev` works anywhere.
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { MemoryStore } from "./store.js";
import { HttpResponsesProvider, StubAgentProvider } from "./llm.js";

const store = new MemoryStore();
const agent =
  process.env.LLM_API_KEY && process.env.LLM_RESPONSES_ENDPOINT && process.env.LLM_MODEL
    ? new HttpResponsesProvider(
        process.env.LLM_RESPONSES_ENDPOINT,
        process.env.LLM_API_KEY,
        process.env.LLM_MODEL,
      )
    : new StubAgentProvider();

const app = createApp({
  store,
  agent,
  agentTokenSecret: process.env.AGENT_TOKEN_SECRET || "local-agent-token-secret",
  allowDevSignin: true,
  atlasCheckoutUrl: process.env.ATLAS_CHECKOUT_URL,
  atlasDownloadUrl: process.env.ATLAS_DOWNLOAD_URL,
  atlasLinuxDownloadUrl: process.env.ATLAS_LINUX_DOWNLOAD_URL,
  checkoutUrl: process.env.CHECKOUT_URL,
  freeFirstPackCode: process.env.FREE_FIRST_PACK_CODE,
  downloadUrl: process.env.DOWNLOAD_URL,
  supportEmail: process.env.SUPPORT_EMAIL,
});

const port = Number(process.env.PORT ?? 8787);
createServer(async (req, res) => {
  const url = `http://localhost:${port}${req.url ?? "/"}`;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  const response = await app.fetch(
    new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body,
    }),
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, "127.0.0.1", () => {
  console.log(`tembro-server dev listening on http://127.0.0.1:${port}`);
});
