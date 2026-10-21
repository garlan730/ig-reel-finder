// Pulls post records out of any Instagram JSON blob (API, GraphQL or embedded page data).
// Schema-agnostic on purpose: it looks for objects shaped like a post rather than fixed paths.
(function (root) {
  function collectPosts(data) {
    const out = [];
    const walk = (o, depth) => {
      if (!o || typeof o !== "object" || depth > 30) return;
      if (Array.isArray(o)) {
        for (const x of o) walk(x, depth + 1);
        return;
      }
      if (typeof o.code === "string" && "taken_at" in o) {
        out.push({
          code: o.code,
          caption: (o.caption && o.caption.text) || "",
          pinned: (o.timeline_pinned_user_ids || []).length > 0,
        });
      }
      for (const k in o) walk(o[k], depth + 1);
    };
    walk(data, 0);
    return out;
  }

  // Instagram sometimes prefixes JSON with an anti-hijacking guard.
  function parseJson(text) {
    return JSON.parse(String(text).replace(/^for \(;;\);/, ""));
  }

  const api = { collectPosts, parseJson };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReelPosts = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
