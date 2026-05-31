// Listen for requests from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapePageDetails") {
    try {
      // 1. Detect Logged-In User Profile Photo to Block It
      const blockedUrls = new Set();
      const userAvatarSelectors = [
        '[role="navigation"] img',
        'header img',
        '[aria-label*="Your profile"] img',
        '[aria-label*="আপনার প্রোফাইল"] img',
        '[aria-label*="profile"] img',
        '[role="navigation"] image',
        'header image',
        '[aria-label*="Your profile"] image',
        '[aria-label*="আপনার প্রোফাইল"] image'
      ];
      
      userAvatarSelectors.forEach(selector => {
        try {
          const els = document.querySelectorAll(selector);
          els.forEach(el => {
            const src = el.src || el.getAttribute('href') || el.getAttribute('xlink:href');
            if (src) {
              blockedUrls.add(src);
              try {
                const cleanUrl = src.split('?')[0];
                blockedUrls.add(cleanUrl);
              } catch (e) {}
            }
          });
        } catch (e) {}
      });

      // 2. Extract Page Name (Avoid Home, Facebook, navigation H1s)
      const mainContainer = document.querySelector('[role="main"]') || document.body;
      const h1Elements = Array.from(mainContainer.querySelectorAll('h1'));
      
      let pageName = '';
      const validH1 = h1Elements.find(el => {
        const text = el.innerText.trim();
        const textLower = text.toLowerCase();
        return text && 
               textLower !== 'home' && 
               textLower !== 'facebook' && 
               textLower !== 'হোম' && 
               textLower !== 'ফেসবুক' && 
               textLower !== 'pages' && 
               textLower !== 'পেজ';
      });

      if (validH1) {
        pageName = validH1.innerText.trim();
      }

      // Fallback to document title (strip " | Facebook")
      if (!pageName) {
        const docTitle = document.title || '';
        if (docTitle && !docTitle.toLowerCase().includes('facebook home') && !docTitle.toLowerCase().includes('log in')) {
          pageName = docTitle.split('|')[0].trim();
        }
      }

      // 3. Helper to verify if an image URL is allowed
      const isAllowedPic = (src) => {
        if (!src) return false;
        if (blockedUrls.has(src)) return false;
        try {
          const clean = src.split('?')[0];
          if (blockedUrls.has(clean)) return false;
        } catch (e) {}
        return true;
      };

      // 4. Extract Profile Picture URL
      let profilePicUrl = '';
      const allImgs = Array.from(mainContainer.querySelectorAll('img'));
      
      // A. Prioritize finding image whose alt matches/contains the Facebook Page name
      if (pageName) {
        const pageNameLower = pageName.toLowerCase();
        const pageImg = allImgs.find(img => {
          // Exclude small navigation images or user header icons (rendered width < 100)
          const rect = img.getBoundingClientRect();
          const width = rect.width || img.width || 0;
          if (width > 0 && width < 100) return false;
          if (img.closest('[role="navigation"]') || img.closest('header')) return false;

          const src = img.src || '';
          if (!isAllowedPic(src)) return false;

          const alt = (img.alt || '').toLowerCase();
          return alt === pageNameLower || alt.includes(pageNameLower);
        });
        if (pageImg) {
          profilePicUrl = pageImg.src;
        }
      }

      // B. Fallback: Search for any page profile image container (excl. navigation & small avatars)
      if (!profilePicUrl) {
        const profileImg = allImgs.find(img => {
          // Exclude small navigation images or user header icons (rendered width < 100)
          const rect = img.getBoundingClientRect();
          const width = rect.width || img.width || 0;
          if (width > 0 && width < 100) return false;
          if (img.closest('[role="navigation"]') || img.closest('header')) return false;

          const src = img.src || '';
          if (!isAllowedPic(src)) return false;

          const alt = (img.alt || '').toLowerCase();
          return alt.includes('profile photo') || 
                 alt.includes('profile picture') || 
                 alt.includes('প্রোফাইল ছবি') || 
                 alt.includes('প্রোফাইল ফটো') || 
                 alt.includes('profile pic');
        });

        if (profileImg) {
          profilePicUrl = profileImg.src;
        }
      }

      // C. Fallback: look in SVG <image> elements (common in modern FB page/profile headers)
      if (!profilePicUrl) {
        const allSvgImages = Array.from(mainContainer.querySelectorAll('image'));
        const headerSvgImage = allSvgImages.find(img => {
          // Strict size check for SVG images as well!
          const rect = img.getBoundingClientRect();
          const width = rect.width || parseFloat(img.getAttribute('width')) || 0;
          if (width > 0 && width < 100) return false;
          if (img.closest('[role="navigation"]') || img.closest('header')) return false;

          const href = img.getAttribute('href') || img.getAttribute('xlink:href') || '';
          if (!isAllowedPic(href)) return false;

          return href.includes('scontent') && (href.includes('/v/') || href.includes('/t') || href.includes('p160x160') || href.includes('p200x200') || href.includes('p320x320') || href.includes('p50x50') || href.includes('p100x100'));
        });
        
        if (headerSvgImage) {
          profilePicUrl = headerSvgImage.getAttribute('href') || headerSvgImage.getAttribute('xlink:href');
        }
      }

      // D. Fallback: search for any large avatar element
      if (!profilePicUrl) {
        const candidateImg = mainContainer.querySelector('img[width="168"], img[width="176"], img[width="132"]');
        if (candidateImg) {
          const src = candidateImg.src || '';
          if (isAllowedPic(src)) {
            profilePicUrl = src;
          }
        }
      }

      // 3. Extract Contact Phone Number
      let contactNumber = '';
      const text = document.body.innerText || '';
      
      // Find Bangladeshi phone numbers (e.g., +88017..., 017..., etc.)
      const phoneRegex = /(?:\+880\s*|0)1[3-9]\d{2}\s*-?\s*\d{6}/g;
      const phoneMatches = text.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0) {
        // Clean up the match
        contactNumber = phoneMatches[0].replace(/[\s-]/g, '');
        if (contactNumber.startsWith('0') && !contactNumber.startsWith('+')) {
          contactNumber = '+88' + contactNumber;
        }
      }

      // 4. Extract Email Address
      let emailAddress = '';
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emailMatches = text.match(emailRegex);
      if (emailMatches && emailMatches.length > 0) {
        emailAddress = emailMatches[0];
      }

      // Send the extracted details back to the popup!
      sendResponse({
        success: true,
        name: pageName,
        profilePicUrl: profilePicUrl,
        contactNumber: contactNumber,
        emailAddress: emailAddress,
        url: window.location.href
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true; // Keep the message channel open for async response
});
