// Listen for requests from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapePageDetails") {
    try {
      // 1. Extract Page Name (H1 is the standard Facebook Page layout title)
      const h1El = document.querySelector('h1');
      const pageName = h1El ? h1El.innerText.trim() : '';

      // 2. Extract Profile Picture URL
      let profilePicUrl = '';
      const mainContainer = document.querySelector('[role="main"]') || document.body;
      const allImgs = Array.from(mainContainer.querySelectorAll('img'));
      
      // A. Prioritize finding image whose alt matches/contains the Facebook Page name
      if (pageName) {
        const pageNameLower = pageName.toLowerCase();
        const pageImg = allImgs.find(img => {
          // Exclude small navigation images or user header icons (width < 60)
          const width = img.width || 0;
          if (width > 0 && width < 60) return false;
          if (img.closest('[role="navigation"]') || img.closest('header')) return false;

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
          const width = img.width || 0;
          if (width > 0 && width < 60) return false;
          if (img.closest('[role="navigation"]') || img.closest('header')) return false;

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

      // C. Fallback: look in SVG <image> elements (common in modern FB page headers)
      if (!profilePicUrl) {
        const allSvgImages = Array.from(mainContainer.querySelectorAll('image'));
        const headerSvgImage = allSvgImages.find(img => {
          const href = img.getAttribute('href') || img.getAttribute('xlink:href') || '';
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
          profilePicUrl = candidateImg.src;
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
