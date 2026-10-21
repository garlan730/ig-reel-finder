#!/usr/bin/env bash
# Packages the extension into dist/reel-finder-<version>.zip for store upload.
# The same zip works for Chrome Web Store, Firefox Add-ons and Edge Add-ons.
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=(
  manifest.json
  shortcode.js posts.js intercept.js content.js content.css
  popup.html popup.js
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
)

# Fail if the manifest references a file that isn't in the package.
node -e '
  const m = require("./manifest.json");
  const packed = new Set(process.argv.slice(1));
  const refs = [
    ...Object.values(m.icons || {}),
    ...Object.values((m.action || {}).default_icon || {}),
    (m.action || {}).default_popup,
    ...(m.content_scripts || []).flatMap((c) => [...(c.js || []), ...(c.css || [])]),
  ].filter(Boolean);
  const missing = refs.filter((f) => !packed.has(f));
  if (missing.length) { console.error("Not packaged but referenced by manifest:", missing); process.exit(1); }
' "${FILES[@]}"

for f in "${FILES[@]}"; do node --check "$f" 2>/dev/null || [[ "$f" != *.js ]] || { echo "Syntax error in $f"; exit 1; }; done

VERSION=$(node -p 'require("./manifest.json").version')
OUT="dist/reel-finder-$VERSION.zip"
mkdir -p dist
rm -f "$OUT"
zip -qX "$OUT" "${FILES[@]}"
echo "Built $OUT ($(du -h "$OUT" | cut -f1 | tr -d ' '))"
