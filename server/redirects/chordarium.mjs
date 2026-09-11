const checkout = "https://tembro.lemonsqueezy.com/checkout/buy/17e4b1a7-187d-4700-adba-cb07b41fb9ed";

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/chordarium" && url.pathname !== "/chordarium/") {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: checkout, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  },
};
