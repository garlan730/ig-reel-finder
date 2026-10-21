// Runs in the page's own JS world. Listens (read-only) to the API responses Instagram's
// app already makes and forwards post captions to content.js. Never sends requests itself.
(() => {
  const { collectPosts, parseJson } = globalThis.ReelPosts;
  const isApi = (url) => /\/(graphql|api)\//.test(url);

  function forward(data) {
    const posts = collectPosts(data);
    if (posts.length) window.postMessage({ source: "reel-finder", posts }, location.origin);
  }

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const res = await origFetch.call(this, input, init);
    try {
      const url = typeof input === "string" ? input : input.url;
      if (isApi(url)) res.clone().text().then((t) => forward(parseJson(t)), () => {});
    } catch {}
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    if (isApi(String(url))) {
      this.addEventListener("load", () => {
        try {
          forward(this.responseType === "json" ? this.response : parseJson(this.responseText));
        } catch {}
      });
    }
    return origOpen.call(this, method, url, ...rest);
  };
})();
