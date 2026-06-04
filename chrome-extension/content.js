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

      // Helper to verify if element is inside a timeline post, feed, featured section, or comment
      const isInsidePostOrFeed = (el) => {
        if (!el) return false;
        const postSelectors = [
          '[role="article"]',
          '[role="feed"]',
          '[data-pagelet^="FeedUnit"]',
          '[data-pagelet="ProfileTimeline"]',
          '[data-pagelet^="ProfileFeatured"]',
          '[data-pagelet^="Featured"]',
          '#profile_grid',
          '[aria-label="Featured"]',
          '[aria-label="Photos"]',
          '[aria-label="Posts"]',
          'a[href*="/photos/"]',
          'a[href*="/posts/"]',
          'a[href*="/permalink/"]'
        ];
        for (const selector of postSelectors) {
          try {
            if (el.closest(selector)) return true;
          } catch (e) {}
        }
        return false;
      };

      // Helper to check if an image is likely the cover photo
      const isLikelyCoverPhoto = (img) => {
        const rect = img.getBoundingClientRect();
        const width = rect.width || img.width || parseFloat(img.getAttribute('width')) || 0;
        const height = rect.height || img.height || parseFloat(img.getAttribute('height')) || 0;
        if (width > 300 && height > 0 && (width / height) > 1.8) {
          return true; // Wide aspect ratio is cover photo
        }
        return false;
      };

      // 4. Extract Profile Picture URL
      let profilePicUrl = '';

      // Let's find the header container based on H1 to isolate the header elements
      let headerContainer = null;
      if (pageName && validH1) {
        let current = validH1;
        for (let i = 0; i < 6; i++) {
          if (!current) break;
          const imgs = Array.from(current.querySelectorAll('img, image'));
          const hasCandidate = imgs.some(img => {
            const rect = img.getBoundingClientRect();
            const width = rect.width || img.width || parseFloat(img.getAttribute('width')) || 0;
            return width >= 100 && !isInsidePostOrFeed(img) && !isLikelyCoverPhoto(img);
          });
          if (hasCandidate) {
            headerContainer = current;
            break;
          }
          current = current.parentElement;
        }
      }

      // Search inside the headerContainer first (for perfect local precision), fall back to mainContainer
      const searchRoot = headerContainer || mainContainer;
      const allCandidates = Array.from(searchRoot.querySelectorAll('img, image'));

      const candidates = allCandidates.filter(img => {
        // Exclude small avatars or navigation icons
        const rect = img.getBoundingClientRect();
        const width = rect.width || img.width || parseFloat(img.getAttribute('width')) || 0;
        if (width > 0 && width < 100) return false;
        
        // Exclude navigation and header bar elements
        if (img.closest('[role="navigation"]') || img.closest('header')) return false;
        
        // Exclude timeline posts and feeds
        if (isInsidePostOrFeed(img)) return false;
        
        // Exclude the user's own profile photo
        const src = img.src || img.getAttribute('href') || img.getAttribute('xlink:href') || '';
        if (!isAllowedPic(src)) return false;
        
        // Exclude cover photo
        if (isLikelyCoverPhoto(img)) return false;
        
        return true;
      });

      if (candidates.length > 0) {
        // Sort candidates by score
        candidates.sort((a, b) => {
          const getScore = (img) => {
            let score = 0;
            const alt = (img.getAttribute('alt') || img.alt || '').toLowerCase();
            
            // Search up the parent tree for aria-label or alt
            let current = img;
            let foundProfileLabel = false;
            let foundPageNameLabel = false;
            for (let i = 0; i < 6; i++) {
              if (!current) break;
              const label = (current.getAttribute('aria-label') || current.getAttribute('alt') || '').toLowerCase();
              if (label.includes('profile picture') || label.includes('profile photo') || label.includes('প্রোফাইল') || label.includes('pic') || label.includes('avatar')) {
                foundProfileLabel = true;
              }
              if (pageName) {
                const pageNameLower = pageName.toLowerCase();
                if (label === pageNameLower || label.includes(pageNameLower)) {
                  foundPageNameLabel = true;
                }
              }
              current = current.parentElement;
            }

            if (foundProfileLabel) {
              score += 150;
            }
            if (foundPageNameLabel) {
              score += 50;
            }

            // Modern FB Page profile picture is usually an SVG <image> tag
            if (img.tagName.toLowerCase() === 'image') {
              score += 60;
            }

            // Size and aspect ratio preference
            const rect = img.getBoundingClientRect();
            const width = rect.width || img.width || parseFloat(img.getAttribute('width')) || 0;
            const height = rect.height || img.height || parseFloat(img.getAttribute('height')) || 0;
            
            // Profile photos are exactly square (1:1 aspect ratio)
            if (width > 0 && height > 0) {
              const aspect = width / height;
              if (aspect >= 0.95 && aspect <= 1.05) {
                score += 50; // Aspect ratio is perfectly square!
              }
            }

            if (width >= 120 && width <= 185) {
              score += 30;
            }

            return score;
          };
          
          return getScore(b) - getScore(a);
        });
        
        const best = candidates[0];
        profilePicUrl = best.src || best.getAttribute('href') || best.getAttribute('xlink:href') || '';
      }

      // 3. Extract Contact Phone Number
      let contactNumber = '';
      const text = document.body.innerText || '';
      
      // Find Bangladeshi phone numbers (e.g., +88017..., 017..., etc.)
      const phoneRegex = /(?:\+880\s*|880\s*|0)1[3-9]\d(?:\s*[\s\-]?\s*\d){7}/g;
      const phoneMatches = text.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0) {
        // Clean up the match to be exactly 11 digits starting with 01
        let rawNum = phoneMatches[0];
        let digits = rawNum.replace(/\D/g, ''); // Extract only digits
        if (digits.startsWith('8801')) {
          contactNumber = '0' + digits.substring(3);
        } else if (digits.startsWith('01')) {
          contactNumber = digits;
        } else if (digits.startsWith('1') && digits.length === 10) {
          contactNumber = '0' + digits;
        } else {
          contactNumber = digits;
        }
        if (contactNumber.length > 11 && contactNumber.startsWith('01')) {
          contactNumber = contactNumber.substring(0, 11);
        }
      }

      // 4. Extract Email Address (Disabled)
      let emailAddress = '';

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
