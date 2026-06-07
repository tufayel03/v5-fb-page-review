// Expose extension status by adding a custom data attribute on the html element (bypasses CSP)
document.documentElement.setAttribute('data-fb-page-review-extension-installed', 'true');

// Dispatch a custom event to notify React if it's already loaded
window.dispatchEvent(new CustomEvent('FB_PAGE_REVIEW_EXTENSION_READY'));

// Listen for messages from the React Admin page
window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const data = event.data;
  if (data && data.type === 'FB_PAGE_REVIEW_START_SYNC') {
    console.log('[Extension Bridge] Received start sync request from page:', data);
    // Forward the request to the background worker
    chrome.runtime.sendMessage(data);
  }
});

// Listen for messages from the background service worker and forward to page
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'FB_PAGE_REVIEW_SYNC_PROGRESS') {
    window.postMessage(message, '*');
  }
});
