let activeSyncSession = null; // Prevent concurrent sync runs

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

  // Set up periodic alarm to check remote sync queue every 1 minute
  chrome.alarms.create('checkRemoteSyncQueue', { periodInMinutes: 1 });
});

// Top level alarm registration
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkRemoteSyncQueue') {
    processRemoteSyncQueue();
  }
});

// Listen for messages from the content bridge script running in AdminPages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'FB_PAGE_REVIEW_START_SYNC') {
    const sourceTabId = sender.tab ? sender.tab.id : null;
    if (!sourceTabId) {
      console.error('[Background] Could not identify source tab ID.');
      return;
    }

    if (activeSyncSession) {
      chrome.tabs.sendMessage(sourceTabId, {
        type: 'FB_PAGE_REVIEW_SYNC_PROGRESS',
        error: 'Another sync process is already running in the background!'
      });
      return;
    }

    // Start background sync loop
    runBackgroundSync(request, sourceTabId);
  }
});

async function runBackgroundSync(request, sourceTabId) {
  activeSyncSession = request;
  const { ids, mode, token, serverUrl } = request;

  // Determine server origin base
  const origin = new URL(serverUrl || 'https://fbpagereview.com').origin;

  const reportProgress = (payload) => {
    // Check if the tab still exists before messaging
    chrome.tabs.get(sourceTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) return;
      chrome.tabs.sendMessage(sourceTabId, {
        type: 'FB_PAGE_REVIEW_SYNC_PROGRESS',
        ...payload
      });
    });
  };

  try {
    reportProgress({ current: 0, total: 0, pageName: 'Initializing list...', count: 0 });

    // Fetch matching pending/update list from database
    let fetchUrl = `${origin}/api/admin/chrome-extension/pending-sync-pages?mode=${mode}`;
    if (ids && ids.length > 0) {
      fetchUrl += `&ids=${encodeURIComponent(ids.join(','))}`;
    }

    console.log(`[Background Sync] Fetching page list from: ${fetchUrl}`);
    const res = await fetch(fetchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch pages to sync');
    }

    const data = await res.json();
    const pages = data.pages || [];
    const total = pages.length;

    if (total === 0) {
      reportProgress({ done: true, total: 0, count: 0 });
      activeSyncSession = null;
      return;
    }

    console.log(`[Background Sync] Starting sync for ${total} pages in "${mode}" mode`);
    let count = 0;

    for (let i = 0; i < total; i++) {
      const page = pages[i];
      const displayName = page.current_name || page.facebook_url;

      reportProgress({
        current: i,
        total,
        pageName: displayName,
        count
      });

      const success = await syncSinglePage(page.facebook_url, origin, token);
      if (success) {
        count++;
      }

      // 2.5 seconds pause between tabs to respect rate limits and let browser cool down
      await new Promise(r => setTimeout(r, 2500));
    }

    reportProgress({
      done: true,
      total,
      count
    });
  } catch (err) {
    console.error('[Background Sync] Error:', err);
    reportProgress({
      error: err.message || 'An error occurred during background sync'
    });
  } finally {
    activeSyncSession = null;
  }
}

async function processRemoteSyncQueue() {
  const stored = await chrome.storage.local.get(['serverUrl', 'token']);
  if (!stored.serverUrl || !stored.token) {
    return; // Silent skip if no user settings synced yet
  }

  if (activeSyncSession) {
    console.log('[Background Queue] Sync session already active, skipping poll.');
    return;
  }

  try {
    const origin = new URL(stored.serverUrl).origin;
    const res = await fetch(`${origin}/api/admin/chrome-extension/pending-sync-pages?mode=queue`, {
      headers: {
        'Authorization': `Bearer ${stored.token}`
      }
    });

    if (!res.ok) return;

    const data = await res.json();
    const pages = data.pages || [];
    if (pages.length === 0) return;

    console.log(`[Background Queue] Found ${pages.length} remote queued pages to sync.`);

    // Run remote queue processing session
    activeSyncSession = { polling: true };
    for (const page of pages) {
      console.log(`[Background Queue] Processing remote sync for: ${page.facebook_url}`);
      await syncSinglePage(page.facebook_url, origin, stored.token);
      // Wait 3 seconds between tabs to cool down
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (err) {
    console.error('[Background Queue] Error processing remote sync queue:', err);
  } finally {
    activeSyncSession = null;
  }
}

async function reportSyncFailure(url, serverUrl, token) {
  try {
    await fetch(`${serverUrl}/api/admin/chrome-extension/sync-page-picture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        facebookUrl: url,
        failed: true
      })
    });
  } catch (err) {
    console.error('[Background Sync] Failed to report sync failure to server:', err.message);
  }
}

async function syncSinglePage(url, serverUrl, token) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: url, active: false }, (tab) => {
      const tabId = tab.id;
      let tabLoaded = false;

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          tabLoaded = true;
          chrome.tabs.onUpdated.removeListener(listener);

          // Wait 4.5 seconds for React/GraphQL elements on FB to fully render
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: "scrapePageDetails" }, async (response) => {
              if (chrome.runtime.lastError) {
                console.warn('[Background Sync] Scrape message error:', chrome.runtime.lastError.message);
                await reportSyncFailure(url, serverUrl, token);
                chrome.tabs.remove(tabId);
                return resolve(false);
              }

              if (response && response.success && response.profilePicUrl) {
                let picBase64 = null;
                try {
                  const imgRes = await fetch(response.profilePicUrl);
                  if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    picBase64 = await new Promise((resolveB64) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolveB64(reader.result);
                      reader.onerror = () => resolveB64(null);
                      reader.readAsDataURL(blob);
                    });
                  }
                } catch (fetchErr) {
                  console.warn('[Background Sync] Could not fetch image as base64:', fetchErr.message);
                }

                try {
                  const syncRes = await fetch(`${serverUrl}/api/admin/chrome-extension/sync-page-picture`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      facebookUrl: url,
                      profilePictureUrl: response.profilePicUrl,
                      profilePictureBase64: picBase64 || '',
                      name: response.name
                    })
                  });
                  if (!syncRes.ok) {
                    await reportSyncFailure(url, serverUrl, token);
                  }
                  chrome.tabs.remove(tabId);
                  resolve(syncRes.ok);
                } catch (err) {
                  console.error('[Background Sync] Sync request failed:', err.message);
                  await reportSyncFailure(url, serverUrl, token);
                  chrome.tabs.remove(tabId);
                  resolve(false);
                }
              } else {
                await reportSyncFailure(url, serverUrl, token);
                chrome.tabs.remove(tabId);
                resolve(false);
              }
            });
          }, 4500);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // 15 seconds fail-safe timeout
      setTimeout(async () => {
        if (!tabLoaded) {
          chrome.tabs.onUpdated.removeListener(listener);
          await reportSyncFailure(url, serverUrl, token);
          chrome.tabs.get(tabId, (existingTab) => {
            if (existingTab) {
              chrome.tabs.remove(tabId);
            }
          });
          resolve(false);
        }
      }, 15000);
    });
  });
}
