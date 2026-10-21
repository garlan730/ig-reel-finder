// Shortcode <-> media ID helpers. Loaded as a content script (attaches to
// globalThis.ReelShortcode) and also require()-able from Node for tests.
(function (root) {
  const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  // Instagram IDs: top 41 bits are milliseconds since this custom epoch
  // (from Instagram's "Sharding & IDs" engineering post).
  const IG_EPOCH_MS = 1314220021721n;

  // Private-account links carry a longer code; the media ID is the first 11 chars.
  function normalize(code) {
    return code.length > 11 ? code.slice(0, 11) : code;
  }

  function shortcodeToId(code) {
    let id = 0n;
    for (const ch of normalize(code)) {
      const v = ALPHABET.indexOf(ch);
      if (v < 0) throw new Error(`Invalid shortcode character: ${ch}`);
      id = id * 64n + BigInt(v);
    }
    return id;
  }

  function idToShortcode(id) {
    id = BigInt(id);
    let code = "";
    while (id > 0n) {
      code = ALPHABET[Number(id % 64n)] + code;
      id /= 64n;
    }
    return code;
  }

  function idToDate(id) {
    return new Date(Number((BigInt(id) >> 23n) + IG_EPOCH_MS));
  }

  // Accepts a full URL or a path; returns the shortcode or null.
  function parseShortcode(url) {
    const m = String(url).match(/\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([A-Za-z0-9_-]{10,})/);
    return m ? normalize(m[1]) : null;
  }

  const api = { shortcodeToId, idToShortcode, idToDate, parseShortcode, normalize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ReelShortcode = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
