// Local dev server (Node). Deploy target is Cloudflare Workers (export the
// Hono app's fetch handler); this file exists so `npm run dev` works anywhere.
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { MemoryStore } from "./store.js";
import { HttpChatProvider, StubProvider } from "./llm.js";

const store = new MemoryStore();
const llm =
  process.env.LLM_API_KEY && process.env.LLM_ENDPOINT && process.env.LLM_MODEL
    ? new HttpChatProvider(
        process.env.LLM_ENDPOINT,
        process.env.LLM_API_KEY,
        process.env.LLM_MODEL,
      )
    : new StubProvider();

const app = createApp({ store, llm, allowDevSignin: true });

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
