document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const mainView = document.getElementById('mainView');
  const settingsView = document.getElementById('settingsView');
  const settingsBtn = document.getElementById('settingsBtn');
  const backToMainBtn = document.getElementById('backToMainBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  const serverUrlInput = document.getElementById('serverUrl');
  const adminUserInput = document.getElementById('adminUser');
  const adminPassInput = document.getElementById('adminPass');
  
  const facebookContent = document.getElementById('facebookContent');
  const nonFacebookContent = document.getElementById('nonFacebookContent');
  const openFbBtn = document.getElementById('openFbBtn');
  
  const pageAvatar = document.getElementById('pageAvatar');
  const pageName = document.getElementById('pageName');
  const pageUrl = document.getElementById('pageUrl');
  const contactNumber = document.getElementById('contactNumber');
  const paymentMethods = document.getElementById('paymentMethods');
  const pageDetails = document.getElementById('pageDetails');
  
  // Scraper Actions Buttons
  const addVerifiedBtn = document.getElementById('addVerifiedBtn');
  const addGoldBtn = document.getElementById('addGoldBtn');
  const addReviewBtn = document.getElementById('addReviewBtn');
  const addSuspiciousBtn = document.getElementById('addSuspiciousBtn');
  const addFraudBtn = document.getElementById('addFraudBtn');
  const alertBox = document.getElementById('alertBox');

  // Tab Elements
  const tabScraperBtn = document.getElementById('tabScraperBtn');
  const tabReviewBtn = document.getElementById('tabReviewBtn');
  const tabScraperContent = document.getElementById('tabScraperContent');
  const tabReviewContent = document.getElementById('tabReviewContent');

  // Review Form Elements
  const expPillGood = document.getElementById('expPillGood');
  const expPillBad = document.getElementById('expPillBad');
  const expPillFraud = document.getElementById('expPillFraud');
  const starsRatingContainer = document.getElementById('starsRatingContainer');
  const reviewTitle = document.getElementById('reviewTitle');
  const reviewDate = document.getElementById('reviewDate');
  const reviewDesc = document.getElementById('reviewDesc');
  const reviewBkash = document.getElementById('reviewBkash');
  const reviewPostLink = document.getElementById('reviewPostLink');
  const reviewOnBehalf = document.getElementById('reviewOnBehalf');
  const onBehalfName = document.getElementById('onBehalfName');
  const onBehalfNameGroup = document.getElementById('onBehalfNameGroup');
  const submitReviewBtn = document.getElementById('submitReviewBtn');

  reviewOnBehalf.addEventListener('change', () => {
    onBehalfNameGroup.style.display = reviewOnBehalf.checked ? 'block' : 'none';
  });

  // Globals
  let currentScrapedData = null;
  let connectionSettings = {
    serverUrl: 'https://fbpagereview.com',
    token: ''
  };
  let selectedReviewType = 'Good';
  let selectedRating = 5;

  // Set review date default to today
  const today = new Date().toISOString().split('T')[0];
  reviewDate.value = today;
  reviewDate.max = today;

  // Helper: Show Alert Message
  const showAlert = (message, type = 'success') => {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => {
      alertBox.style.display = 'none';
    }, 6000);
  };

  // Helper: Load Saved Connection Settings
  const loadSettings = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['serverUrl', 'token', 'adminUser'], (result) => {
        if (result.serverUrl) {
          connectionSettings.serverUrl = result.serverUrl;
          serverUrlInput.value = result.serverUrl;
        }
        if (result.token) {
          connectionSettings.token = result.token;
        }
        if (result.adminUser) {
          adminUserInput.value = result.adminUser;
        }
        resolve();
      });
    });
  };

  // Helper: Save form draft to chrome.storage
  const saveDraft = () => {
    const activeUrl = currentScrapedData ? currentScrapedData.url : pageUrl.textContent;
    if (!activeUrl || activeUrl === 'Not a Facebook page' || activeUrl.includes('placeholder')) {
      return;
    }

    const draft = {
      pageUrl: activeUrl,
      contactNumber: contactNumber.value,
      paymentMethods: paymentMethods.value,
      pageDetails: pageDetails.value,
      selectedReviewType: selectedReviewType,
      selectedRating: selectedRating,
      reviewTitle: reviewTitle.value,
      reviewDate: reviewDate.value,
      reviewDesc: reviewDesc.value,
      reviewBkash: reviewBkash.value,
      reviewPostLink: reviewPostLink.value,
      reviewOnBehalf: reviewOnBehalf.checked,
      onBehalfName: onBehalfName.value,
      activeTab: tabScraperBtn.classList.contains('active') ? 'scraper' : 'review'
    };

    chrome.storage.local.get(['review_drafts'], (result) => {
      const drafts = result.review_drafts || {};
      drafts[activeUrl] = draft;
      chrome.storage.local.set({ review_drafts: drafts });
    });
  };

  // Helper: Load form draft from chrome.storage
  const loadDraft = () => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeUrl = (tabs && tabs[0]) ? (tabs[0].url || '') : '';
        if (!activeUrl) {
          resolve();
          return;
        }

        chrome.storage.local.get(['review_drafts'], (result) => {
          const drafts = result.review_drafts || {};
          const draft = drafts[activeUrl];
          
          if (draft) {
            if (draft.contactNumber !== undefined) contactNumber.value = draft.contactNumber;
            if (draft.paymentMethods !== undefined) paymentMethods.value = draft.paymentMethods;
            if (draft.pageDetails !== undefined) pageDetails.value = draft.pageDetails;
            
            if (draft.selectedReviewType !== undefined) {
              selectedReviewType = draft.selectedReviewType;
              pills.forEach(p => {
                if (p.getAttribute('data-type') === selectedReviewType) {
                  p.classList.add('selected');
                } else {
                  p.classList.remove('selected');
                }
              });
            }
            
            if (draft.selectedRating !== undefined) {
              selectedRating = draft.selectedRating;
              updateStarsUI();
            }
            
            if (draft.reviewTitle !== undefined) reviewTitle.value = draft.reviewTitle;
            if (draft.reviewDate !== undefined) reviewDate.value = draft.reviewDate;
            if (draft.reviewDesc !== undefined) reviewDesc.value = draft.reviewDesc;
            if (draft.reviewBkash !== undefined) reviewBkash.value = draft.reviewBkash;
            if (draft.reviewPostLink !== undefined) reviewPostLink.value = draft.reviewPostLink;
            
            if (draft.reviewOnBehalf !== undefined) {
              reviewOnBehalf.checked = draft.reviewOnBehalf;
              if (onBehalfNameGroup) {
                onBehalfNameGroup.style.display = reviewOnBehalf.checked ? 'block' : 'none';
              }
            }
            if (draft.onBehalfName !== undefined) onBehalfName.value = draft.onBehalfName;
            
            if (draft.activeTab === 'review') {
              tabScraperBtn.classList.remove('active');
              tabReviewBtn.classList.add('active');
              tabScraperContent.style.display = 'none';
              tabReviewContent.style.display = 'block';
            } else {
              tabReviewBtn.classList.remove('active');
              tabScraperBtn.classList.add('active');
              tabReviewContent.style.display = 'none';
              tabScraperContent.style.display = 'block';
            }
          } else {
            // No draft for this active page, clear inputs to avoid leakage
            contactNumber.value = '';
            paymentMethods.value = '';
            pageDetails.value = '';
            reviewTitle.value = '';
            reviewDesc.value = '';
            reviewBkash.value = '';
            reviewPostLink.value = '';
            onBehalfName.value = '';
            reviewDate.value = today;
            selectedRating = 5;
            updateStarsUI();
            selectedReviewType = 'Good';
            pills.forEach(p => {
              if (p.getAttribute('data-type') === 'Good') {
                p.classList.add('selected');
              } else {
                p.classList.remove('selected');
              }
            });
            tabReviewBtn.classList.remove('active');
            tabScraperBtn.classList.add('active');
            tabReviewContent.style.display = 'none';
            tabScraperContent.style.display = 'block';
          }
          resolve();
        });
      });
    });
  };

  // Helper: Remove draft for a page URL
  const removeDraft = (url) => {
    if (!url) return;
    chrome.storage.local.get(['review_drafts'], (result) => {
      const drafts = result.review_drafts || {};
      delete drafts[url];
      chrome.storage.local.set({ review_drafts: drafts });
    });
  };

  await loadSettings();

  // Attach input and change event listeners to auto-save drafts
  const draftElements = [
    contactNumber,
    paymentMethods,
    pageDetails,
    reviewTitle,
    reviewDate,
    reviewDesc,
    reviewBkash,
    reviewPostLink,
    reviewOnBehalf,
    onBehalfName
  ];

  draftElements.forEach(el => {
    if (el) {
      el.addEventListener('input', saveDraft);
      el.addEventListener('change', saveDraft);
    }
  });

  // Navigation: Tabs switching
  tabScraperBtn.addEventListener('click', () => {
    tabReviewBtn.classList.remove('active');
    tabScraperBtn.classList.add('active');
    tabReviewContent.style.display = 'none';
    tabScraperContent.style.display = 'block';
    saveDraft();
  });

  tabReviewBtn.addEventListener('click', () => {
    tabScraperBtn.classList.remove('active');
    tabReviewBtn.classList.add('active');
    tabScraperContent.style.display = 'none';
    tabReviewContent.style.display = 'block';
    saveDraft();
  });

  // Review Form Pill Selection
  const pills = [expPillGood, expPillBad, expPillFraud];
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedReviewType = pill.getAttribute('data-type');

      // Fraud Report locks rating to 1 or 2 stars maximum
      if (selectedReviewType === 'Fraud Report') {
        if (selectedRating > 2) {
          selectedRating = 2;
          updateStarsUI();
        }
      }
      saveDraft();
    });
  });

  // Star Rating Interactive Selection
  const starButtons = Array.from(starsRatingContainer.children);
  starButtons.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-rating'));
      
      // Fraud report limits star rating to max 2
      if (selectedReviewType === 'Fraud Report' && rating > 2) {
        showAlert('Fraud reports are limited to 1 or 2 stars', 'danger');
        return;
      }

      selectedRating = rating;
      updateStarsUI();
      saveDraft();
    });
  });

  const updateStarsUI = () => {
    starButtons.forEach(star => {
      const rating = parseInt(star.getAttribute('data-rating'));
      if (rating <= selectedRating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  };

  // Navigation: Go to Settings Screen
  settingsBtn.addEventListener('click', () => {
    mainView.classList.remove('active');
    settingsView.classList.add('active');
  });

  // Navigation: Back to Main Screen
  backToMainBtn.addEventListener('click', () => {
    settingsView.classList.remove('active');
    mainView.classList.add('active');
  });

  // Save Settings & Connect to Server (Log In)
  saveSettingsBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
    const username = adminUserInput.value.trim();
    const password = adminPassInput.value;

    if (!serverUrl) {
      showAlert('Server URL is required!', 'danger');
      return;
    }

    saveSettingsBtn.disabled = true;
    saveSettingsBtn.innerHTML = '<span class="spinner"></span> Connecting...';

    try {
      if (username && password) {
        // Authenticate with server to fetch JWT
        const res = await fetch(`${serverUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_or_username: username,
            password: password
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Authentication failed');
        }

        const data = await res.json();
        
        // Ensure user is admin/moderator
        let role = data.user ? data.user.role : '';
        if (role === 'admin') role = 'Super Admin';
        const allowedRoles = ['Super Admin', 'Admin', 'Moderator'];
        if (!allowedRoles.includes(role)) {
          throw new Error('Access denied. You must be an administrator or moderator.');
        }

        connectionSettings.serverUrl = serverUrl;
        connectionSettings.token = data.token;

        // Save to Chrome Local Storage
        chrome.storage.local.set({
          serverUrl: serverUrl,
          token: data.token,
          adminUser: username
        });

        showAlert('Successfully connected and authenticated with server!', 'success');
      } else {
        // Just save server URL if credentials not provided (in case they already have a token)
        connectionSettings.serverUrl = serverUrl;
        chrome.storage.local.set({ serverUrl: serverUrl });
        showAlert('Server URL saved. (Not logged in)', 'success');
      }

      setTimeout(() => {
        settingsView.classList.remove('active');
        mainView.classList.add('active');
      }, 1000);

    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = 'Save & Connect';
    }
  });

  // Open Facebook if not on Facebook Tab
  openFbBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.facebook.com' });
  });

  let currentActiveScrapedUrl = '';

  // Helper: Verify if URL is an actual Facebook page / profile (and not newsfeed/groups)
  const isFacebookPageUrl = (urlStr) => {
    if (!urlStr || !urlStr.includes('facebook.com')) return false;
    try {
      const parsed = new URL(urlStr);
      let path = parsed.pathname;
      if (path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      path = path.toLowerCase();
      
      const ignoredPaths = [
        '',
        '/',
        '/home',
        '/home.php',
        '/watch',
        '/marketplace',
        '/groups',
        '/messages',
        '/notifications',
        '/friends',
        '/saved',
        '/events',
        '/gaming',
        '/bookmarks',
        '/memories',
        '/ads',
        '/pages',
        '/settings'
      ];
      
      if (ignoredPaths.includes(path)) {
        return false;
      }
      
      const ignoredPrefixes = [
        '/watch',
        '/marketplace',
        '/groups',
        '/messages',
        '/notifications',
        '/friends',
        '/saved',
        '/events',
        '/gaming',
        '/bookmarks',
        '/memories',
        '/ads',
        '/pages',
        '/settings'
      ];
      
      if (ignoredPrefixes.some(prefix => path.startsWith(prefix))) {
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  };

  // Query Active Tab & Scrape DOM details
  const initializeScraper = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) return;
      
      const activeTab = tabs[0];
      const url = activeTab.url || '';

      if (isFacebookPageUrl(url)) {
        // Reset fields before scraping new page to prevent cross-contamination ONLY if page URL changed!
        if (currentActiveScrapedUrl !== url) {
          currentActiveScrapedUrl = url;
          pageName.textContent = "Loading...";
          pageUrl.textContent = url;
          pageAvatar.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='38' height='38' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2'><circle cx='12' cy='12' r='10'/></svg>";
          
          contactNumber.value = '';
          paymentMethods.value = '';
          pageDetails.value = '';
          reviewTitle.value = '';
          reviewDesc.value = '';
          reviewBkash.value = '';
          reviewPostLink.value = '';
          onBehalfName.value = '';
          reviewOnBehalf.checked = false;
          if (onBehalfNameGroup) onBehalfNameGroup.style.display = 'none';
          selectedReviewType = 'Good';
          pills.forEach(p => {
            if (p.getAttribute('data-type') === 'Good') {
              p.classList.add('selected');
            } else {
              p.classList.remove('selected');
            }
          });
          selectedRating = 5;
          updateStarsUI();

          // Load new draft if url matches
          await loadDraft();
        }

        facebookContent.style.display = 'block';
        nonFacebookContent.style.display = 'none';

        // Trigger content script extraction
        chrome.tabs.sendMessage(activeTab.id, { action: "scrapePageDetails" }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script may not be loaded yet, retry injecting it
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js']
            }, () => {
              // Try messaging again
              chrome.tabs.sendMessage(activeTab.id, { action: "scrapePageDetails" }, (retryResponse) => {
                if (retryResponse && retryResponse.success) {
                  populateUI(retryResponse);
                } else {
                  pageName.textContent = "Unknown Facebook Page";
                  pageUrl.textContent = url;
                }
              });
            });
            return;
          }

          if (response && response.success) {
            populateUI(response);
          } else {
            pageName.textContent = "Unable to read page elements";
            pageUrl.textContent = url;
          }
        });

      } else {
        currentActiveScrapedUrl = '';
        facebookContent.style.display = 'none';
        nonFacebookContent.style.display = 'block';
      }
    });
  };

  // Populate UI with Scraped details
  const populateUI = (data) => {
    currentScrapedData = data;
    pageName.textContent = data.name || "Unknown Page";
    pageUrl.textContent = data.url || "Unknown URL";
    
    if (data.profilePicUrl) {
      pageAvatar.src = data.profilePicUrl;
    }
    
    if (data.contactNumber && !contactNumber.value.trim()) {
      contactNumber.value = data.contactNumber;
      saveDraft();
    }
    
    if (data.emailAddress && !pageDetails.value.includes(data.emailAddress)) {
      pageDetails.value = `Email: ${data.emailAddress}\n` + pageDetails.value;
      saveDraft();
    }

    // Check if page already exists in database
    if (data.url) {
      checkDatabaseStatus(data.url);
    }
  };

  const checkDatabaseStatus = async (url) => {
    const dbStatusBadge = document.getElementById('dbStatusBadge');
    if (!connectionSettings.token || !connectionSettings.serverUrl || !url) {
      dbStatusBadge.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`${connectionSettings.serverUrl}/api/admin/chrome-extension/check-page?url=${encodeURIComponent(url)}`, {
        headers: {
          'Authorization': `Bearer ${connectionSettings.token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.page) {
          dbStatusBadge.style.display = 'block';

          // Silently correct fallback names or missing profile pictures if we have scraped the real ones!
          const dbName = (data.page.current_name || '').toLowerCase().replace(/[\s\-\_]/g, '');
          const scrapedUsername = (currentScrapedData?.url || '').split('?')[0].replace(/\/$/, '').split('/').pop().toLowerCase().replace(/[\s\-\_]/g, '') || '';
          const nameLower = (data.page.current_name || '').toLowerCase();
          const isFallbackName = dbName === scrapedUsername ||
                                 nameLower === 'unknown page' ||
                                 nameLower === 'facebook page' ||
                                 nameLower === 'facebook user' ||
                                 /^\d+$/.test(nameLower) ||
                                 nameLower.startsWith('facebook page ') ||
                                 nameLower.startsWith('facebook user ');
          const isMissingPic = !data.page.profile_picture || data.page.profile_picture === 'failed' || data.page.profile_picture.includes('svg') || data.page.profile_picture.includes('circle');

          if ((isFallbackName || isMissingPic) && currentScrapedData && currentScrapedData.name && currentScrapedData.name !== 'Loading...') {
            console.log('[Extension] Auto-correcting fallback page metadata in database...');
            const payload = {
              facebookUrl: currentScrapedData.url,
              name: currentScrapedData.name,
              profilePictureUrl: currentScrapedData.profilePicUrl || '',
              status: data.page.status || 'Under Review',
              contactNumber: contactNumber.value.trim() || data.page.contactNumber || '',
              paymentMethods: paymentMethods.value.trim() || data.page.paymentMethods || '',
              pageDetails: pageDetails.value.trim() || data.page.pageDetails || ''
            };

            fetch(`${connectionSettings.serverUrl}/api/admin/chrome-extension/add-page`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${connectionSettings.token}`
              },
              body: JSON.stringify(payload)
            }).then(async (updateRes) => {
              if (updateRes.ok) {
                console.log('[Extension] Silently corrected fallback page details successfully!');
                // Auto-update the active text inside the popup UI so the user sees it correct instantly!
                pageName.textContent = currentScrapedData.name;
                if (currentScrapedData.profilePicUrl) {
                  pageAvatar.src = currentScrapedData.profilePicUrl;
                }
              }
            }).catch(e => console.error('[Extension] Failed to silent-update fallback page:', e));
          }
          
          // Pre-fill and merge existing data from database
          let updated = false;
          if (data.page.contactNumber) {
            const dbNums = data.page.contactNumber.split(',').map(s => s.trim()).filter(Boolean);
            const currentNums = contactNumber.value.split(',').map(s => s.trim()).filter(Boolean);
            const mergedNums = Array.from(new Set([...currentNums, ...dbNums]));
            const mergedStr = mergedNums.join(', ');
            if (contactNumber.value.trim() !== mergedStr) {
              contactNumber.value = mergedStr;
              updated = true;
            }
          }
          if (data.page.paymentMethods) {
            const dbPms = data.page.paymentMethods.split(',').map(s => s.trim()).filter(Boolean);
            const currentPms = paymentMethods.value.split(',').map(s => s.trim()).filter(Boolean);
            const mergedPms = Array.from(new Set([...currentPms, ...dbPms]));
            const mergedStr = mergedPms.join(', ');
            if (paymentMethods.value.trim() !== mergedStr) {
              paymentMethods.value = mergedStr;
              updated = true;
            }
          }
          if (data.page.pageDetails && !pageDetails.value.trim()) {
            pageDetails.value = data.page.pageDetails;
            updated = true;
          }
          if (updated) {
            saveDraft();
          }

          if (data.page.status === 'Reported as Fraud') {
            dbStatusBadge.textContent = '🛑 ALREADY LISTED: FRAUD';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; box-shadow: 0 0 10px rgba(239, 68, 68, 0.15); margin-bottom: 10px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addGoldBtn.textContent = '🏆 Change to Gold';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addSuspiciousBtn.textContent = '⚠️ Change to Suspicious';
            addFraudBtn.textContent = '🛑 Update Fraud Details';
          } else if (data.page.status === 'Gold Seller') {
            dbStatusBadge.textContent = '🏆 ALREADY LISTED: GOLD SELLER';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; box-shadow: 0 0 10px rgba(245, 158, 11, 0.15); margin-bottom: 10px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addGoldBtn.textContent = '🏆 Update Gold Details';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addSuspiciousBtn.textContent = '⚠️ Change to Suspicious';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          } else if (data.page.status === 'Verified Marketplace Seller') {
            dbStatusBadge.textContent = '⭐ ALREADY LISTED: VERIFIED SELLER';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; box-shadow: 0 0 10px rgba(16, 185, 129, 0.15); margin-bottom: 10px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Update Verified';
            addGoldBtn.textContent = '🏆 Change to Gold';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addSuspiciousBtn.textContent = '⚠️ Change to Suspicious';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          } else if (data.page.status === 'Suspicious') {
            dbStatusBadge.textContent = '⚠️ ALREADY LISTED: SUSPICIOUS';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; box-shadow: 0 0 10px rgba(245, 158, 11, 0.15); margin-bottom: 10px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addGoldBtn.textContent = '🏆 Change to Gold';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addSuspiciousBtn.textContent = '⚠️ Update Suspicious';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          } else {
            dbStatusBadge.textContent = '🔍 ALREADY LISTED: UNDER REVIEW';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; box-shadow: 0 0 10px rgba(16, 185, 129, 0.15); margin-bottom: 10px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addGoldBtn.textContent = '🏆 Change to Gold';
            addReviewBtn.textContent = '🔍 Update Under Review';
            addSuspiciousBtn.textContent = '⚠️ Change to Suspicious';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          }
        } else {
          dbStatusBadge.style.display = 'none';
          addVerifiedBtn.textContent = '⭐ Verified Seller';
          addGoldBtn.textContent = '🏆 Gold Seller';
          addReviewBtn.textContent = '🔍 Under Review';
          addSuspiciousBtn.textContent = '⚠️ Suspicious';
          addFraudBtn.textContent = '🛑 Report as FRAUD';
        }
      }
    } catch (err) {
      console.error('Error checking database status:', err);
    }
  };

  // Add Page to Database
  const submitPage = async (status) => {
    if (!connectionSettings.token) {
      showAlert('Please set up server settings and log in as admin first!', 'danger');
      settingsView.classList.add('active');
      mainView.classList.remove('active');
      return;
    }

    const payload = {
      facebookUrl: currentScrapedData ? currentScrapedData.url : pageUrl.textContent,
      name: currentScrapedData ? currentScrapedData.name : pageName.textContent,
      profilePictureUrl: currentScrapedData ? currentScrapedData.profilePicUrl : '',
      status: status,
      contactNumber: contactNumber.value.trim(),
      paymentMethods: paymentMethods.value.trim(),
      pageDetails: pageDetails.value.trim()
    };

    let targetBtn = addReviewBtn;
    if (status === 'Reported as Fraud') targetBtn = addFraudBtn;
    else if (status === 'Verified Marketplace Seller') targetBtn = addVerifiedBtn;
    else if (status === 'Gold Seller') targetBtn = addGoldBtn;
    else if (status === 'Suspicious') targetBtn = addSuspiciousBtn;

    const originalText = targetBtn.textContent;
    targetBtn.disabled = true;
    targetBtn.innerHTML = '<span class="spinner"></span> Saving...';

    try {
      const res = await fetch(`${connectionSettings.serverUrl}/api/admin/chrome-extension/add-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connectionSettings.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error saving page');
      }

      const data = await res.json();
      showAlert(data.message || 'Page successfully saved!', 'success');
      
      // Instantly refresh database status indicators!
      if (payload.facebookUrl) {
        checkDatabaseStatus(payload.facebookUrl);
      }
      
      // Clear draft
      if (payload.facebookUrl) {
        removeDraft(payload.facebookUrl);
      }

    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      targetBtn.disabled = false;
      targetBtn.textContent = originalText;
    }
  };

  // Submit Review On Behalf
  submitReviewBtn.addEventListener('click', async () => {
    if (!connectionSettings.token) {
      showAlert('Please set up server settings and log in as admin first!', 'danger');
      settingsView.classList.add('active');
      mainView.classList.remove('active');
      return;
    }

    const title = reviewTitle.value.trim();
    const dateOfExp = reviewDate.value;
    const description = reviewDesc.value.trim();

    if (!title || !dateOfExp || !description) {
      showAlert('Please fill in all required review fields (Title, Date, Description)!', 'danger');
      return;
    }

    submitReviewBtn.disabled = true;
    submitReviewBtn.innerHTML = '<span class="spinner"></span> Submitting...';

    const payload = {
      page_name: currentScrapedData ? currentScrapedData.name : pageName.textContent,
      page_url: currentScrapedData ? currentScrapedData.url : pageUrl.textContent,
      profile_picture: currentScrapedData ? currentScrapedData.profilePicUrl : '',
      review_type: selectedReviewType,
      star_rating: selectedRating,
      title: title,
      description: description,
      date_of_experience: dateOfExp,
      bkash_number: reviewBkash.value.trim(),
      facebook_post_link: reviewPostLink.value.trim(),
      is_on_behalf: reviewOnBehalf.checked,
      on_behalf_name: reviewOnBehalf.checked ? onBehalfName.value.trim() : ''
    };

    try {
      const res = await fetch(`${connectionSettings.serverUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${connectionSettings.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Server error submitting review');
      }

      showAlert('Review successfully submitted on behalf!', 'success');
      
      // Reset Review Form fields
      reviewTitle.value = '';
      reviewDesc.value = '';
      reviewBkash.value = '';
      reviewPostLink.value = '';
      onBehalfName.value = '';
      reviewDate.value = today;
      selectedRating = 5;
      updateStarsUI();
      const pageUrlString = currentScrapedData ? currentScrapedData.url : '';
      if (pageUrlString) {
        removeDraft(pageUrlString);
      }

    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      submitReviewBtn.disabled = false;
      submitReviewBtn.textContent = '🚀 Submit Review';
    }
  });

  // Event Listeners for Page Scraper Statuses
  addVerifiedBtn.addEventListener('click', () => submitPage('Verified Marketplace Seller'));
  addGoldBtn.addEventListener('click', () => submitPage('Gold Seller'));
  addReviewBtn.addEventListener('click', () => submitPage('Under Review'));
  addSuspiciousBtn.addEventListener('click', () => submitPage('Suspicious'));
  addFraudBtn.addEventListener('click', () => submitPage('Reported as Fraud'));

  // Load draft and then initialize scraper
  await loadDraft();
  await initializeScraper();

  let lastScrapedUrl = '';
  let pollingInterval = null;

  // Auto-refresh scraper when active tab changes or updates
  chrome.tabs.onActivated.addListener(() => {
    if (pollingInterval) clearInterval(pollingInterval);
    initializeScraper();
    
    // Progressive polling to catch SPA renderings
    let pollCount = 0;
    pollingInterval = setInterval(() => {
      initializeScraper();
      pollCount++;
      if (pollCount >= 5) {
        clearInterval(pollingInterval);
      }
    }, 600);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
      if (pollingInterval) clearInterval(pollingInterval);
      initializeScraper();
      
      // If the URL changed, trigger a progressive poll to capture late-rendering SPA content
      if (changeInfo.url && changeInfo.url !== lastScrapedUrl) {
        lastScrapedUrl = changeInfo.url;
        
        let pollCount = 0;
        pollingInterval = setInterval(() => {
          initializeScraper();
          pollCount++;
          if (pollCount >= 6) { // Poll for 3.6 seconds
            clearInterval(pollingInterval);
          }
        }, 600);
      }
    }
  });
});
