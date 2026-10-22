# Reel Finder

A browser extension that finds where an Instagram reel sits in its creator's profile grid and shows what they posted right after it, which is usually Part 2.

## How it works

1. The reel's shortcode (`/reel/DM0aBcDeFgH/`) decodes to its media ID, and the ID contains the upload time.
2. It works out who posted the reel, then opens their profile.
3. It scrolls the grid automatically. Every tile's link decodes to a date, so it knows when it has reached the reel, or passed it if the reel isn't in the grid.
4. It highlights the reel in the grid and shows its position (#, row, column) plus the posts uploaded after it. Any caption that looks like "Part 2" (also "pt 2", "bagian 2", "2/3"…) is marked.

Instagram blocks its feed API when called from a browser, so the extension doesn't request posts itself. `intercept.js` only reads the responses Instagram's own page already loads, to pick up captions.

Nothing leaves your browser. There's no server and no data collection.

## Install (Chrome / Edge / Brave / Arc)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this folder.
4. Log in at instagram.com and open any reel. A **🔎 Find in profile** button appears at the bottom right.

You can also paste a reel link (for example one you shared from your phone) into the toolbar popup.

## Install (Firefox, including Firefox for Android)

- Desktop: open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and choose `manifest.json`.
- Android: needs the add-on to be signed through addons.mozilla.org (free, can be unlisted), or Firefox Nightly with a custom collection.

## Limits

- Instagram can change its page layout at any time. If it stops finding reels, the grid link selector in `content.js` (`gridSelector`) probably needs updating.
- Very large profiles take a while. It scrolls at roughly human speed and can only go as fast as Instagram loads more posts.
- Archived reels and "Reels tab only" reels are not in the main grid, so it can't place them.
- Automated access is against Instagram's terms. For personal use at this pace the risk is low, but don't hammer it.

## Files

- `shortcode.js`: shortcode ↔ media ID ↔ date (`node -e 'require("./shortcode.js")'` for testing)
- `content.js`: button, creator lookup, grid scanning, results panel
- `intercept.js` + `posts.js`: read captions from Instagram's own responses
- `content.css`: panel styles
- `popup.html` / `popup.js`: paste-a-link popup
- `icons/`: SVG sources and exported PNGs
- `docs/`: privacy policy + homepage (GitHub Pages)
- `store/LISTING.md`: store listing text
- `scripts/build.sh`: builds the upload zip

## Publishing

1. Build the store package: `./scripts/build.sh`, which creates `dist/reel-finder-<version>.zip`.
2. Copy the store text, permission justifications and reviewer notes from `store/LISTING.md`.
3. Upload the same zip to each store:
   - Chrome Web Store: https://chrome.google.com/webstore/devconsole ($5 one-time fee)
   - Firefox Add-ons: https://addons.mozilla.org/developers/ (free; also covers Firefox for Android)
   - Edge Add-ons: https://partner.microsoft.com/dashboard/microsoftedge (free)
4. For each update, bump `version` in `manifest.json`, rebuild, and upload the new zip.

The privacy policy and homepage live in `docs/`. To host them, enable GitHub Pages for the `/docs` folder of the `main` branch.

Check Firefox compatibility before uploading with `npx web-ext lint --source-dir <unzipped dist folder>`.

## License

MIT. See [LICENSE](LICENSE).
