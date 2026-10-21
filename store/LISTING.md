# Store listing

Copy-paste text for the Chrome Web Store, Firefox Add-ons (AMO) and Edge Add-ons.

## Name

Reel Finder for Instagram

(Use this as the store name only. The extension calls itself "Reel Finder" and doesn't use Instagram's logo.)

## Summary (132 characters max)

Find where a reel sits in its creator's profile grid and see what they posted right after it, usually Part 2.

## Description

Ever watched a reel that ends with "Part 2 on my profile", then given up scrolling through hundreds of posts to find it?

Reel Finder does the scrolling for you.

HOW IT WORKS
• Open any reel or post on instagram.com and click "Find in profile".
• Reel Finder opens the creator's profile and scrolls their grid automatically.
• When it reaches the reel, it highlights it and shows its position (for example "#147 in grid, row 49").
• It lists the posts uploaded right after it, and marks any whose caption looks like "Part 2" (also "pt 2", "bagian 2", "2/3"…).

You can also paste a reel link into the toolbar popup, for example one shared from your phone.

PRIVATE BY DESIGN
• No account, no server, no analytics. Everything runs in your browser.
• It uses your existing Instagram login and only reads what Instagram already shows you.
• It never posts, likes, follows, comments, or reads your messages.

GOOD TO KNOW
• Very large profiles take a while, because it scrolls at human speed.
• Archived reels and reels that only appear in the Reels tab aren't in the main grid, so it can't place them.

Reel Finder is an independent project and is not affiliated with, endorsed by or sponsored by Instagram or Meta Platforms, Inc.

## Category

- Chrome: Tools (or "Social & Communication" if offered)
- Firefox: Social & Communication
- Edge: Social

## Links

- Homepage: https://garlan730.github.io/ig-reel-finder/
- Privacy policy: https://garlan730.github.io/ig-reel-finder/privacy.html
- Support: https://github.com/garlan730/ig-reel-finder/issues

## Chrome "Privacy practices" tab

**Single purpose**

Helps the user find a specific Instagram reel within its creator's profile grid and see the posts uploaded right after it.

**Permission justifications**

- `storage`: Holds a reel link pasted into the toolbar popup until the Instagram tab it opens picks it up. The link is then deleted.
- `activeTab`: Lets the popup pre-fill the current tab's reel link when the user opens it.
- Host permission `https://www.instagram.com/*`: The extension's only function is on Instagram. Its content script adds the "Find in profile" button, scrolls the profile grid, and shows the results panel.

**Are you using remote code?** No. All code ships in the package. Nothing is fetched or evaluated at runtime.

**Data usage**: tick none of the data types. Then tick all three certifications (no selling data, no use unrelated to the single purpose, no use for creditworthiness/lending).

## Firefox "Notes to reviewer"

No build step: the uploaded files are the source.

`intercept.js` runs in the page's MAIN world. It wraps `fetch`/`XMLHttpRequest` read-only so it can read captions from the GraphQL/API responses Instagram's own app already receives. It forwards only `{code, caption, pinned}` to the content script via `window.postMessage`. It never makes requests, never changes responses, and never sends data anywhere.

`content.js` makes one same-origin request (`/api/v1/media/{id}/info/`) with the user's own session to find a reel's author. Everything else is DOM reading and scrolling.

To test: log in to Instagram, open any reel (e.g. https://www.instagram.com/reel/<code>/), click "Find in profile" at the bottom right.

## Screenshots to take (1280×800 PNG or JPG)

1. Results panel over a profile grid with the reel highlighted (the main shot).
2. The "Find in profile" button on a reel page.
3. The panel while scrolling ("Looking for a post from …").
4. The toolbar popup with a link pasted in.

Tip: set the Chrome window to 1280×800 (DevTools → device toolbar → Responsive → 1280 × 800), then use `Cmd+Shift+4` and press space to capture the window.

Chrome also asks for an optional **440×280 promo tile**. You can skip it at first.
