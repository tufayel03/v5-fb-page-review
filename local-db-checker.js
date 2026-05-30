const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const readline = require('readline');
const crypto = require('crypto');

// Configuration
const SSH_KEY_PATH = '/home/tufayel/Videos/sshkey.key';
const VPS_USER = 'ubuntu';
const VPS_IP = '168.138.115.223';
const REMOTE_DB_PATH = '/home/fbpagereview/htdocs/fbpagereview.com/data.db';
const LOCAL_DB_PATH = path.join(__dirname, 'local_vps_data.db');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const humanHeaders = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Connection': 'keep-alive'
};

function getFacebookPageId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('/profile.php')) {
      const idParam = parsed.searchParams.get('id');
      if (idParam) return idParam;
    }
    let pathname = parsed.pathname.replace(/^\/|\/$/g, '');
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      if (['pages', 'people', 'groups'].includes(parts[0])) {
        const lastSegment = parts[parts.length - 1];
        if (/^\d+$/.test(lastSegment)) {
          return lastSegment;
        }
        return parts[1] || parts[0];
      }
      const lastSegment = parts[parts.length - 1];
      if (/^\d+$/.test(lastSegment)) {
        return lastSegment;
      }
      return parts[0];
    }
  } catch (e) { }
  return null;
}

function getFacebookAboutUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('profile.php')) {
      parsed.searchParams.set('sk', 'about');
      return parsed.toString();
    }
    let origin = parsed.origin;
    let pathname = parsed.pathname.replace(/^\/|\/$/g, '');
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      if (['pages', 'people', 'groups'].includes(parts[0])) {
        return `${origin}/${parts.slice(0, 3).join('/')}/about`;
      }
      return `${origin}/${parts[0]}/about`;
    }
  } catch (e) { }
  return url + '/about';
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function normalizeName(str) {
  if (!str) return '';
  return str
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithRetry(url, options = {}, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (e) {
      if (i === retries) throw e;
    }
  }
  return null;
}

async function checkFacebookUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      headers: humanHeaders,
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const finalUrl = response.url;
    const html = await response.text();

    const isRoadblocked = html.includes('id="login_blank"') ||
                          html.includes('id="login_form"') ||
                          html.includes('/login/?next') ||
                          html.includes('id="loginbutton"') ||
                          html.includes('facebook.com/login') ||
                          html.includes('checkpoint') ||
                          finalUrl.includes('/login') ||
                          finalUrl.includes('checkpoint');

    let title = '';
    const ogTitleMatch = html.match(/<meta[^>]*(?:property|name)=[\"']og:title[\"'][^>]*content=[\"']([^\"']+)[\"']/i) ||
                         html.match(/<meta[^>]*content=[\"']([^\"']+)[\"'][^>]*(?:property|name)=[\"']og:title[\"']/i);
    if (ogTitleMatch) {
      title = decodeHtmlEntities(ogTitleMatch[1]);
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = decodeHtmlEntities(titleMatch[1].replace(' | Facebook', ''));
      }
    }

    if (title === 'Error' || title === 'Log in to Facebook') {
      title = '';
    }

    if ((!title || isRoadblocked) && !url.includes('/about')) {
      const aboutUrl = getFacebookAboutUrl(url);
      const fallbackResult = await checkFacebookUrl(aboutUrl);
      if (fallbackResult && fallbackResult.title && fallbackResult.title !== '[Private, Deleted or Roadblocked]') {
        return {
          url: finalUrl,
          title: fallbackResult.title
        };
      }
    }

    if (isRoadblocked && !title) {
      return {
        url: finalUrl,
        title: '[Private, Deleted or Roadblocked]'
      };
    }

    return {
      url: finalUrl,
      title: title || 'Unknown Page Name'
    };
  } catch (e) {
    if (!url.includes('/about')) {
      const aboutUrl = getFacebookAboutUrl(url);
      return checkFacebookUrl(aboutUrl);
    }
    return null;
  }
}

async function main() {
  console.log("=======================================================================");
  console.log("🌟   LOCAL DATABASE FACEBOOK PAGE REDIRECT & NAME CHECKER");
  console.log("=======================================================================\n");

  // Step 1: Download Database from VPS
  console.log(`📡 Connecting to VPS at ${VPS_IP} to download live data.db...`);
  try {
    execSync(`scp -i "${SSH_KEY_PATH}" "${VPS_USER}@${VPS_IP}:${REMOTE_DB_PATH}" "${LOCAL_DB_PATH}"`, { stdio: 'inherit' });
    console.log("✅ Successfully downloaded live database file!\n");
  } catch (err) {
    console.error("❌ Failed to download database from VPS. Please verify your SSH Key path or network connection.");
    return;
  }

  // Step 2: Open database
  const db = new Database(LOCAL_DB_PATH);
  
  // Get active pages
  const pages = db.prepare("SELECT * FROM FacebookPages WHERE status_badge NOT LIKE 'Old/Dead Page%' OR status_badge IS NULL").all();
  console.log(`📋 Loaded ${pages.length} active pages from the database.\n`);

  if (pages.length === 0) {
    console.log("🎉 No active Facebook pages found in the database!");
    db.close();
    fs.unlinkSync(LOCAL_DB_PATH);
    return;
  }

  console.log("Scanning pages in parallel using safe network connection...\n");
  console.log("-----------------------------------------------------------------------");
  console.log(`${"PAGE NAME".padEnd(30)} | ${"STATUS".padEnd(12)} | DETAILS`);
  console.log("-----------------------------------------------------------------------");

  const pendingChanges = [];
  const CONCURRENCY = 8;
  let activeIndex = 0;

  async function worker() {
    while (activeIndex < pages.length) {
      const index = activeIndex++;
      const page = pages[index];
      const name = page.current_name || 'Unknown';
      const url = page.facebook_url || '';

      if (!url || !url.includes('facebook.com')) {
        console.log(`\x1b[33m${name.substring(0, 30).padEnd(30)}\x1b[0m | SKIP         | No valid Facebook URL.`);
        continue;
      }

      const oldPageId = getFacebookPageId(url);
      if (!oldPageId) {
        console.log(`\x1b[33m${name.substring(0, 30).padEnd(30)}\x1b[0m | SKIP         | Could not parse unique ID.`);
        continue;
      }

      const result = await checkFacebookUrl(url);
      if (!result) {
        console.log(`\x1b[31m${name.substring(0, 30).padEnd(30)}\x1b[0m | FAILED       | Page unreachable or blocked.`);
        continue;
      }

      const destinationUrl = result.url;
      const scrapedPageName = result.title;
      const newPageName = scrapedPageName === '[Private, Deleted or Roadblocked]' ? name : scrapedPageName;
      const newPageId = getFacebookPageId(destinationUrl);

      const usernameChanged = newPageId && oldPageId.toLowerCase() !== newPageId.toLowerCase();
      const nameChanged = scrapedPageName && 
                          scrapedPageName !== '[Private, Deleted or Roadblocked]' && 
                          normalizeName(name) !== normalizeName(scrapedPageName);

      if (usernameChanged || nameChanged) {
        let changeType = "CHANGED";
        if (usernameChanged && nameChanged) {
          changeType = "BOTH CHANGED";
        } else if (usernameChanged) {
          changeType = "URL CHANGED";
        } else if (nameChanged) {
          changeType = "NAME CHANGED";
        }

        console.log(`\x1b[32m${name.substring(0, 30).padEnd(30)}\x1b[0m | \x1b[33m${changeType.padEnd(12)}\x1b[0m | ${oldPageId} ➜ ${newPageId}`);
        
        pendingChanges.push({
          page,
          scrapedName: newPageName,
          scrapedUrl: destinationUrl,
          changeType
        });
      } else {
        console.log(`${name.substring(0, 30).padEnd(30)} | OK           | Live Name: ${newPageName}`);
      }
      
      // Mimic human spacing
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);

  console.log("-----------------------------------------------------------------------");
  console.log(`\nScan complete! Checked ${pages.length} database pages.`);
  console.log(`Detected ${pendingChanges.length} live changes.`);

  if (pendingChanges.length === 0) {
    console.log("\n🎉 All scanned profiles are pointing to their original recorded usernames and names.");
    db.close();
    fs.unlinkSync(LOCAL_DB_PATH);
    return;
  }

  console.log("\n=======================================================================");
  console.log("🌟   LIVE CHANGES READY TO BE APPLIED:");
  console.log("=======================================================================");
  pendingChanges.forEach((c, idx) => {
    console.log(`\n${idx + 1}. Page: ${c.page.current_name} [${c.changeType}]`);
    console.log(`   ↳ Old URL:  ${c.page.facebook_url}`);
    console.log(`   ↳ New URL:  ${c.scrapedUrl}`);
    console.log(`   ↳ Old Name: ${c.page.current_name}`);
    console.log(`   ↳ New Name: ${c.scrapedName}`);
  });
  console.log("=======================================================================\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => {
    rl.question(`❓ Do you want to apply these ${pendingChanges.length} changes to the database and upload to VPS? (yes/no): `, resolve);
  });
  rl.close();

  if (answer.trim().toLowerCase() === 'yes' || answer.trim().toLowerCase() === 'y') {
    console.log("\n💾 Applying updates to SQLite database...");

    const updateStmt = db.prepare("UPDATE FacebookPages SET status_badge = ? WHERE id = ?");
    const selectUrlStmt = db.prepare("SELECT id FROM FacebookPages WHERE facebook_url = ?");
    const insertPageStmt = db.prepare(`
      INSERT INTO FacebookPages (
        id, current_name, facebook_url, contact_number, extra_contacts, 
        payment_methods, page_details, status_badge, trust_score, 
        is_fraud_listed, profile_picture
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Run in a single fast transaction
    const transaction = db.transaction((changesList) => {
      for (const item of changesList) {
        const { page, scrapedName, scrapedUrl } = item;

        let newStatus = 'Old/Dead Page';
        if (page.status_badge && page.status_badge !== 'Old/Dead Page') {
          if (!page.status_badge.startsWith('Old/Dead Page - ')) {
            newStatus = `Old/Dead Page - ${page.status_badge}`;
          } else {
            newStatus = page.status_badge;
          }
        }

        // If the new URL already exists in database, just mark old as dead
        const existingNewPage = selectUrlStmt.get(scrapedUrl);
        if (existingNewPage) {
          updateStmt.run(newStatus, page.id);
          continue;
        }

        // Mark old page as dead/old
        updateStmt.run(newStatus, page.id);

        // Create replica with new values
        const newPageId = crypto.randomUUID();
        const newDetails = `Old Page Name: ${page.current_name}\nOld Page URL: ${page.facebook_url}\n\nOriginal Details:\n${page.page_details || ''}`;
        
        insertPageStmt.run(
          newPageId,
          scrapedName,
          scrapedUrl,
          page.contact_number || '',
          page.extra_contacts || '',
          page.payment_methods || '',
          newDetails,
          page.status_badge,
          page.trust_score,
          page.is_fraud_listed,
          ''
        );
      }
    });

    try {
      transaction(pendingChanges);
      console.log("✅ Successfully committed all updates to the database transaction!");
    } catch (dbErr) {
      console.error("❌ Database Transaction Error:", dbErr.message);
      db.close();
      fs.unlinkSync(LOCAL_DB_PATH);
      return;
    }

    db.close();

    // Step 4: Upload Database back to VPS
    console.log(`\n📤 Uploading updated database back to production VPS...`);
    try {
      execSync(`scp -i "${SSH_KEY_PATH}" "${LOCAL_DB_PATH}" "${VPS_USER}@${VPS_IP}:${REMOTE_DB_PATH}"`, { stdio: 'inherit' });
      console.log("✅ Database uploaded successfully!");

      console.log("🔄 Restarting production website service...");
      execSync(`ssh -i "${SSH_KEY_PATH}" "${VPS_USER}@${VPS_IP}" "sudo systemctl restart fbpagereview.service"`, { stdio: 'inherit' });
      console.log("\n🎉 SUCCESS! All changes applied live to fbpagereview.com without hitting cloud limits!");
    } catch (uploadErr) {
      console.error("❌ Failed to upload updated database back to VPS. Your local copy is saved as local_vps_data.db.");
      return;
    }

    // Clean up local temp file
    if (fs.existsSync(LOCAL_DB_PATH)) {
      fs.unlinkSync(LOCAL_DB_PATH);
    }
  } else {
    console.log("\n❌ Cancelled. No changes were applied.");
    db.close();
    if (fs.existsSync(LOCAL_DB_PATH)) {
      fs.unlinkSync(LOCAL_DB_PATH);
    }
  }
}

main().catch(console.error);
