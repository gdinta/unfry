// Content script: grabs lightweight context from the active page.
// Never sends full page content anywhere — only title + first heading text,
// which the background worker classifies locally.
function grabContext() {
  const h = document.querySelector("h1, h2");
  return {
    title: document.title || "",
    url: location.hostname, // domain only, never the full path
    headingText: (h?.textContent || "").slice(0, 160),
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "UNFRY_SCRAPE") {
    sendResponse(grabContext());
  }
  return true;
});
