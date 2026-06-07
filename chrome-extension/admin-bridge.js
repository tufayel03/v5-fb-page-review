// Inject global variable to let the React app know the extension is active
try {
  const script = document.createElement('script');
  script.textContent = 'window.__fbPageReviewExtensionInstalled = true;';
  (document.head || document.documentElement).appendChild(script);
  script.remove();
} catch (e) {
  console.error('[Extension Bridge] Failed to inject active flag:', e);
}

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
