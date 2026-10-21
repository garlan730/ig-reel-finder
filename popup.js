const { parseShortcode } = globalThis.ReelShortcode;
const input = document.getElementById("url");
const err = document.getElementById("err");

// Prefill with the current tab if it's already a reel.
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab && tab.url && parseShortcode(tab.url)) input.value = tab.url;
});

document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = parseShortcode(input.value.trim());
  if (!code) {
    err.textContent = "That doesn't look like an Instagram reel or post link.";
    return;
  }
  await chrome.storage.local.set({ pendingCode: code });
  await chrome.tabs.create({ url: `https://www.instagram.com/reel/${code}/` });
  window.close();
});
