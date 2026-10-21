// Reel Finder content script: runs on instagram.com under the user's own session.
//
// Instagram blocks its feed API for browsers, so instead we open the creator's profile and
// scroll the grid like a person would. Every grid tile links to a shortcode, and a shortcode
// decodes to an upload time, so we know exactly when we've reached (or passed) the target.
(() => {
  const { shortcodeToId, idToDate, parseShortcode } = globalThis.ReelShortcode;
  const { collectPosts, parseJson } = globalThis.ReelPosts;

  const IG_APP_ID = "936619743392459"; // public web-app ID instagram.com sends with its own API calls
  const SCROLL_WAIT_MS = 900;
  const MAX_STALLS = 12; // ~11s without the page growing = end of grid
  const TIME_LIMIT_MS = 10 * 60 * 1000;
  const PINNED_SLOTS = 3; // pinned posts can only occupy the first row
  const NEWER_SCAN = 15; // how many newer posts to check for a "Part 2" caption
  const JOB_KEY = "reelFinder.job";
  const PART2_RE = /\b(part|pt\.?|bagian|parte|teil)\s*(2|two|ii|dua)\b|\b2\s*\/\s*\d\b/i;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Captions, captured from Instagram's own responses (see intercept.js) ----------

  const captions = new Map(); // shortcode -> { caption, pinned }
  const remember = (posts) => posts.forEach((p) => captions.set(p.code, p));

  window.addEventListener("message", (e) => {
    if (e.source === window && e.data && e.data.source === "reel-finder") remember(e.data.posts || []);
  });

  // The first page of posts ships inside the HTML rather than via a request.
  function harvestEmbedded() {
    for (const s of document.querySelectorAll('script[type="application/json"]')) {
      if (!s.textContent.includes('"taken_at"')) continue;
      try { remember(collectPosts(parseJson(s.textContent))); } catch {}
    }
  }

  // ---------- Who posted it ----------

  async function igGet(path) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "X-IG-App-ID": IG_APP_ID, "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) {
      throw new Error(`HTTP ${res.status} from ${path}`);
    }
    return res.json();
  }

  const RESERVED_PATHS = new Set(["explore", "reels", "reel", "p", "tv", "stories", "direct", "accounts", "about", "legal"]);

  // Username of the post's author, read from the page (header link next to the avatar).
  function ownerFromPage() {
    const fromUrl = location.pathname.match(/^\/([\w.]+)\/(?:reels?|p)\//);
    if (fromUrl && !RESERVED_PATHS.has(fromUrl[1])) return fromUrl[1];
    for (const a of document.querySelectorAll('main a[href^="/"]')) {
      const m = a.getAttribute("href").match(/^\/([\w.]+)\/$/);
      if (m && !RESERVED_PATHS.has(m[1]) && a.textContent.trim() === m[1]) return m[1];
    }
    return null;
  }

  async function lookupOwner(code) {
    try {
      const info = await igGet(`/api/v1/media/${shortcodeToId(code)}/info/`);
      const user = info.items && info.items[0] && info.items[0].user;
      if (user && user.username) return user.username;
    } catch (err) {
      console.warn("[Reel Finder] media info failed, falling back to page:", err.message);
    }
    return ownerFromPage();
  }

  // ---------- UI helpers ----------

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null) el.append(c);
    return el;
  }

  const fmtDate = (d) => d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const dateOf = (code) => idToDate(shortcodeToId(code));
  const captionOf = (tile) => (captions.get(tile.code) || {}).caption || tile.alt || "";

  let panel = null;
  function closePanel() {
    if (panel) panel.remove();
    panel = null;
  }

  function openPanel(...content) {
    closePanel();
    panel = h("div", { class: "rf-panel" },
      h("div", { class: "rf-head" },
        h("strong", {}, "Reel Finder"),
        h("button", { class: "rf-x", title: "Close", onclick: closePanel }, "×")),
      h("div", { class: "rf-body" }, ...content));
    document.body.append(panel);
    return panel.querySelector(".rf-body");
  }

  function showError(message) {
    openPanel(h("div", { class: "rf-status rf-error" }, message));
  }

  function postRow(tile, label) {
    const cap = captionOf(tile);
    const isPart2 = PART2_RE.test(cap);
    return h("a", { class: "rf-post" + (isPart2 ? " rf-match" : ""), href: tile.href },
      h("img", { src: tile.thumb, alt: "", loading: "lazy" }),
      h("div", { class: "rf-meta" },
        h("div", { class: "rf-label" }, label, isPart2 ? h("span", { class: "rf-badge" }, "Part 2?") : null),
        h("div", { class: "rf-date" }, fmtDate(dateOf(tile.code))),
        h("div", { class: "rf-cap" }, cap.slice(0, 90) || "(no caption)")));
  }

  // ---------- Step 1: on a reel page, work out the creator and go to their profile ----------

  async function run(code) {
    openPanel(h("div", { class: "rf-status" }, "Looking up who posted this…"));
    const username = await lookupOwner(code);
    if (!username) return showError("Couldn't work out who posted this reel. Try opening it on its own page (/reel/…).");
    sessionStorage.setItem(JOB_KEY, JSON.stringify({ username, code }));
    location.href = `/${username}/`;
  }

  // ---------- Step 2: on the profile, scroll the grid until we reach the reel ----------

  const gridSelector = 'main a[href*="/p/"], main a[href*="/reel/"]';
  const tileSelector = (code) => `main a[href*="/${code}/"]`;

  // Records tiles in first-seen order; that order survives Instagram unmounting off-screen rows.
  function scanGrid(seen) {
    for (const a of document.querySelectorAll(gridSelector)) {
      const href = a.getAttribute("href");
      const code = parseShortcode(href);
      if (!code || seen.has(code)) continue;
      const img = a.querySelector("img");
      seen.set(code, {
        code,
        href,
        thumb: (img && img.currentSrc) || (img && img.src) || "",
        alt: (img && img.alt) || "",
        pinned: !!a.querySelector('svg[aria-label*="pinned" i]') || !!(captions.get(code) || {}).pinned,
      });
    }
  }

  function takeJob() {
    let job;
    try { job = JSON.parse(sessionStorage.getItem(JOB_KEY) || "null"); } catch { job = null; }
    if (!job || location.pathname.replace(/\/$/, "") !== `/${job.username}`) return null;
    sessionStorage.removeItem(JOB_KEY);
    return job;
  }

  async function findOnProfile({ username, code }) {
    const targetId = shortcodeToId(code);
    const targetDate = idToDate(targetId);
    let cancelled = false;

    const body = openPanel(
      h("div", { class: "rf-status" }, `Scrolling @${username}'s grid…`),
      h("button", { class: "rf-btn rf-secondary", onclick: () => { cancelled = true; closePanel(); } }, "Stop"));
    const status = body.querySelector(".rf-status");

    const seen = new Map();
    let lastHeight = 0, stalls = 0;
    const deadline = Date.now() + TIME_LIMIT_MS;

    while (!cancelled && Date.now() < deadline) {
      harvestEmbedded();
      scanGrid(seen);
      const tiles = [...seen.values()];
      const index = tiles.findIndex((t) => t.code === code);

      // Found it. Grab one more scroll if it's the last tile so we can show the post before it.
      if (index >= 0 && (index < tiles.length - 1 || stalls >= 2)) return showResult(username, tiles, index);

      // Grid is newest-first after pinned posts, so an older post means we've passed it.
      const passed = tiles.slice(PINNED_SLOTS).some((t) => !t.pinned && shortcodeToId(t.code) < targetId);
      if (index < 0 && passed) {
        return showError("This reel isn't in the main grid. It may be archived, deleted, or only in the Reels tab.");
      }

      const last = tiles[tiles.length - 1];
      status.textContent = `Looking for a post from ${fmtDate(targetDate)} · scanned ${tiles.length} posts` +
        (last ? ` · now at ${fmtDate(dateOf(last.code))}` : "");

      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(SCROLL_WAIT_MS);
      const height = document.documentElement.scrollHeight;
      stalls = height === lastHeight ? stalls + 1 : 0;
      lastHeight = height;
      if (stalls >= MAX_STALLS) break;
    }
    if (!cancelled) showError(`Reached the end of what Instagram would load (${seen.size} posts) without finding it.`);
  }

  function scrollToTile(code) {
    const link = document.querySelector(tileSelector(code));
    if (!link) return false;
    link.scrollIntoView({ block: "center", behavior: "smooth" });
    link.classList.add("rf-highlight");
    return true;
  }

  function showResult(username, tiles, index) {
    const target = tiles[index];
    scrollToTile(target.code);

    // Newer posts sit just above the target in the grid; index-1 is the very next upload.
    const newer = tiles.slice(0, index).reverse().filter((t) => !t.pinned).slice(0, NEWER_SCAN);
    const older = tiles.slice(index + 1).find((t) => !t.pinned);

    // Always show the next 3 uploads; beyond that, only ones whose caption looks like "Part 2".
    const shown = newer.filter((t, i) => i < 3 || PART2_RE.test(captionOf(t)));
    const ordinal = (n) => ["Next upload", "2nd after", "3rd after"][n] || `${n + 1}th after`;
    const pos = index + 1;

    openPanel(
      h("div", { class: "rf-summary" },
        h("div", {}, h("b", {}, `@${username}`), ` · posted ${fmtDate(dateOf(target.code))}`),
        h("div", { class: "rf-big" }, `#${pos} in grid`),
        h("div", { class: "rf-sub" }, `row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1} · ${index} posts above it`),
        h("div", { class: "rf-actions" },
          h("button", { class: "rf-btn", onclick: () => scrollToTile(target.code) }, "Scroll to it"))),
      h("div", { class: "rf-section" }, "Posted after this (newer, above it in grid)"),
      shown.length
        ? shown.map((t) => postRow(t, ordinal(newer.indexOf(t))))
        : h("div", { class: "rf-empty" }, "Nothing newer. This is their latest post, so Part 2 isn't out yet."),
      older ? [h("div", { class: "rf-section" }, "Posted before this"), postRow(older, "Previous upload")] : null,
    );
  }

  // ---------- Floating button + SPA URL watching ----------

  const fab = h("button", { class: "rf-fab", title: "Find this reel in the creator's profile" }, "🔎 Find in profile");
  fab.addEventListener("click", () => {
    const code = parseShortcode(location.pathname);
    if (code) run(code);
  });

  let lastUrl = "";
  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    const code = parseShortcode(location.pathname);
    if (code && !fab.isConnected) document.body.append(fab);
    if (!code) fab.remove();
    const job = takeJob();
    if (job) findOnProfile(job);
  }
  setInterval(onUrlChange, 700);
  onUrlChange();

  // Links pasted into the toolbar popup are queued in storage and picked up here.
  chrome.storage.local.get("pendingCode", ({ pendingCode }) => {
    if (pendingCode && parseShortcode(location.pathname) === pendingCode) {
      chrome.storage.local.remove("pendingCode");
      run(pendingCode);
    }
  });
})();
