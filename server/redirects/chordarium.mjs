// Keep existing Route ownership during migration. On Cloudflare, fetch(request)
// from a Route Worker invokes the same hostname's Custom Domain Worker.
// The main storefront now owns the page, methods and checkout link in one place.
export default {
  fetch(request) {
    return fetch(request);
  },
};
