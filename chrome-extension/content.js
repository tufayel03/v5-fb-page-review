// Listen for requests from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapePageDetails") {
    try {
      // 1. Extract Page Name (H1 is the standard Facebook Page layout title)
      const h1El = document.querySelector('h1');
      const pageName = h1El ? h1El.innerText.trim() : '';

      // 2. Extract Profile Picture URL
      let profilePicUrl = '';
      const allImgs = Array.from(document.querySelectorAll('img'));
      
      // Try to find the profile photo by alt text (handles multiple languages like English, Bangla, etc.)
      const profileImg = allImgs.find(img => {
        const alt = (img.alt || '').toLowerCase();
        return alt.includes('profile photo') || 
               alt.includes('profile picture') || 
               alt.includes('প্রোফাইল ছবি') || 
               alt.includes('প্রোফাইল ফটো');
      });

      if (profileImg) {
        profilePicUrl = profileImg.src;
      } else {
        // Fallback: search for any image in a circle or large container inside the page header
        const header = document.querySelector('[role="main"]') || document.body;
        const candidateImg = header.querySelector('img[width="168"], img[width="176"], img[width="132"]');
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
