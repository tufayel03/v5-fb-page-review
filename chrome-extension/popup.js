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
  
  const addVerifiedBtn = document.getElementById('addVerifiedBtn');
  const addFraudBtn = document.getElementById('addFraudBtn');
  const addReviewBtn = document.getElementById('addReviewBtn');
  const alertBox = document.getElementById('alertBox');

  // Globals
  let currentScrapedData = null;
  let connectionSettings = {
    serverUrl: 'https://fbpagereview.com',
    token: ''
  };

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

  await loadSettings();

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

  // Query Active Tab & Scrape DOM details
  const initializeScraper = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      
      const activeTab = tabs[0];
      const url = activeTab.url || '';

      if (url.includes('facebook.com')) {
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
    
    if (data.contactNumber) {
      contactNumber.value = data.contactNumber;
    }
    
    if (data.emailAddress) {
      pageDetails.value = `Email: ${data.emailAddress}\n`;
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
          
          // Pre-fill existing data from database
          if (data.page.contactNumber) {
            contactNumber.value = data.page.contactNumber;
          }
          if (data.page.paymentMethods) {
            paymentMethods.value = data.page.paymentMethods;
          }
          if (data.page.pageDetails) {
            pageDetails.value = data.page.pageDetails;
          }

          if (data.page.status === 'Reported as Fraud') {
            dbStatusBadge.textContent = '🛑 ALREADY LISTED: FRAUD';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; box-shadow: 0 0 10px rgba(239, 68, 68, 0.15); margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addFraudBtn.textContent = '🛑 Update Fraud Details';
          } else if (data.page.status === 'Gold Seller') {
            dbStatusBadge.textContent = '🏆 ALREADY LISTED: GOLD SELLER';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; box-shadow: 0 0 10px rgba(245, 158, 11, 0.15); margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          } else if (data.page.status === 'Verified Marketplace Seller') {
            dbStatusBadge.textContent = '⭐ ALREADY LISTED: VERIFIED SELLER';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; box-shadow: 0 0 10px rgba(16, 185, 129, 0.15); margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Update Verified';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          } else if (data.page.status === 'Suspicious') {
            dbStatusBadge.textContent = '⚠️ ALREADY LISTED: SUSPICIOUS';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; box-shadow: 0 0 10px rgba(245, 158, 11, 0.15); margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addReviewBtn.textContent = '🔍 Change to Under Review';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          } else {
            dbStatusBadge.textContent = '🔍 ALREADY LISTED: UNDER REVIEW';
            dbStatusBadge.style.cssText = 'display: block; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; box-shadow: 0 0 10px rgba(16, 185, 129, 0.15); margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; animation: fadeIn 0.25s;';
            addVerifiedBtn.textContent = '⭐ Change to Verified';
            addReviewBtn.textContent = '🔍 Update Under Review';
            addFraudBtn.textContent = '🛑 Change to FRAUD';
          }
        } else {
          dbStatusBadge.style.display = 'none';
          addVerifiedBtn.textContent = '⭐ Verified Seller';
          addReviewBtn.textContent = '🔍 Under Review';
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

    const targetBtn = status === 'Reported as Fraud' 
      ? addFraudBtn 
      : (status === 'Verified Marketplace Seller' ? addVerifiedBtn : addReviewBtn);
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
      
      // Instantly refresh the database status badge and button labels!
      if (payload.facebookUrl) {
        checkDatabaseStatus(payload.facebookUrl);
      }

    } catch (err) {
      showAlert(err.message, 'danger');
    } finally {
      targetBtn.disabled = false;
      targetBtn.textContent = originalText;
    }
  };

  // Event Listeners for Adding
  addVerifiedBtn.addEventListener('click', () => submitPage('Verified Marketplace Seller'));
  addReviewBtn.addEventListener('click', () => submitPage('Under Review'));
  addFraudBtn.addEventListener('click', () => submitPage('Reported as Fraud'));

  // Initialize
  await initializeScraper();
});
