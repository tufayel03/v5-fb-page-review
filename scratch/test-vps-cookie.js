const Database = require('better-sqlite3');
const { execSync } = require('child_process');

const db = new Database('/home/fbpagereview/htdocs/fbpagereview.com/data.db');
const cookieRow = db.prepare("SELECT value FROM Settings WHERE key_name = 'facebook_scraper_cookies'").get();
if (!cookieRow || !cookieRow.value) {
  console.log("❌ No cookies found in database.");
  process.exit(0);
}

try {
  const val = cookieRow.value.trim();
  let scraperCookie = '';
  if (val.startsWith('[')) {
    const parsed = JSON.parse(val);
    scraperCookie = parsed.map(c => `${c.name}=${c.value}`).join('; ');
  } else {
    scraperCookie = val;
  }
  
  console.log("⚙️ Parsed Cookie String successfully!");
  console.log("🌍 Sending test request to Facebook Profile Page...");
  
  const html = execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Cookie: ${scraperCookie}" https://mbasic.facebook.com/profile.php`, { encoding: 'utf-8', timeout: 10000 });
  
  if (html.includes("100026472457756") || html.includes("composer") || html.includes("logout") || html.includes("mbasic_logout_button") || html.includes("xc_message")) {
    console.log("✅ COOKIE IS WORKING PERFECTLY! Successfully authenticated as Facebook user 100026472457756.");
  } else if (html.includes("login_form") || html.includes("login_error") || html.includes("checkpoint")) {
    console.log("❌ COOKIE EXPIRED OR BLOCKED! Facebook responded with a login page or checkpoint wall.");
  } else {
    console.log(`⚠️ COOKIE RETURNED UNEXPECTED PAGE. Response length: ${html.length}. Check if Facebook returned an empty page.`);
  }
} catch (e) {
  console.log("❌ Error testing cookies:", e.message);
}
