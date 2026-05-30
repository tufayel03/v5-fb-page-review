import fs from 'fs';
import path from 'path';
import readline from 'readline';
import * as XLSXModule from 'xlsx';
const XLSX = XLSXModule.readFile ? XLSXModule : (XLSXModule.default || XLSXModule);

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const humanHeaders = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Connection': 'keep-alive'
};

function getFacebookPageId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('profile.php')) {
      const id = parsed.searchParams.get('id');
      if (id) return id;
    }
    let pathname = parsed.pathname.replace(/^\/|\/$/g, '');
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      if (['pages', 'people', 'groups'].includes(parts[0])) {
        if (parts.length >= 3 && /^\d+$/.test(parts[2])) {
          return parts[2];
        }
        if (parts.length >= 2) {
          if (/^\d+$/.test(parts[1])) {
            return parts[1];
          }
          return parts[1];
        }
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

    let finalUrl = response.url;
    let html = await response.text();

    let canonicalUrl = finalUrl;
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (canonicalMatch && canonicalMatch[1]) {
      if (canonicalMatch[1].includes('facebook.com')) {
        canonicalUrl = canonicalMatch[1];
      }
    } else {
      const ogMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
      if (ogMatch && ogMatch[1]) {
        if (ogMatch[1].includes('facebook.com')) {
          canonicalUrl = ogMatch[1];
        }
      }
    }

    const isCanonicalSystem = canonicalUrl.toLowerCase().includes('/login') ||
      canonicalUrl.toLowerCase().includes('/checkpoint') ||
      canonicalUrl.toLowerCase().includes('login.php');
    if (!isCanonicalSystem) {
      finalUrl = canonicalUrl;
    }

    let title = null;
    const ogTitleMatch = html.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].split('|')[0].trim();
    }
    if (!title) {
      const twitterTitle = html.match(/<meta[^>]*(?:name|property)=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:title["']/i);
      if (twitterTitle && twitterTitle[1]) {
        title = twitterTitle[1].split('|')[0].trim();
      }
    }
    if (!title) {
      const metaTitle = html.match(/<meta[^>]*(?:name|property)=["']title["'][^>]*content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']title["']/i);
      if (metaTitle && metaTitle[1]) {
        title = metaTitle[1].split('|')[0].trim();
      }
    }
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].split('|')[0].trim();
      }
    }

    if (title) {
      title = decodeHtmlEntities(title);
    }

    const nameBlacklist = ["facebook", "error", "log in", "log in to facebook", "page not found", "broken link", "loading..."];
    let isRoadblocked = !title ||
      nameBlacklist.includes(title.toLowerCase().trim()) ||
      html.includes("This content isn't available") ||
      html.includes("isn't available at the moment");

    if (isRoadblocked) {
      try {
        const fallbackUrl = getFacebookAboutUrl(finalUrl);
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 6000);
        const fbAboutRes = await fetch(fallbackUrl, {
          redirect: 'follow',
          headers: humanHeaders,
          signal: fallbackController.signal
        });
        clearTimeout(fallbackTimeout);
        if (fbAboutRes.ok) {
          const aboutHtml = await fbAboutRes.text();
          let aboutTitle = null;
          const ogAboutTitleMatch = aboutHtml.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
            aboutHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i);
          if (ogAboutTitleMatch && ogAboutTitleMatch[1]) {
            aboutTitle = ogAboutTitleMatch[1].split('|')[0].trim();
          }
          if (!aboutTitle) {
            const aboutTitleMatch = aboutHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (aboutTitleMatch && aboutTitleMatch[1]) {
              aboutTitle = aboutTitleMatch[1].split('|')[0].trim();
            }
          }
          if (aboutTitle) {
            aboutTitle = decodeHtmlEntities(aboutTitle);
            if (!nameBlacklist.includes(aboutTitle.toLowerCase().trim())) {
              title = aboutTitle;
              isRoadblocked = false;
            }
          }
        }
      } catch (fallbackErr) { }
    }

    if (isRoadblocked) {
      title = "[Private, Deleted or Roadblocked]";
    }

    let profilePicUrl = null;
    if (!isRoadblocked) {
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        profilePicUrl = decodeHtmlEntities(ogImageMatch[1]);
      }
    }

    return {
      url: finalUrl,
      title: title || 'Unknown Page Name',
      profilePicUrl: profilePicUrl
    };
  } catch (e) {
    return null;
  }
}

// Minimal CSV parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return { fieldnames: [], rows: [] };

  const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const fieldnames = splitCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i]);
    const row = {};
    fieldnames.forEach((name, idx) => {
      row[name] = values[idx] || '';
    });
    rows.push(row);
  }

  return { fieldnames, rows };
}

async function main() {
  console.log("======================================================================");
  console.log("      FACEBOOK PAGE URL & DISPLAY NAME REDIRECTS CHECKER");
  console.log("======================================================================\n");

  const files = fs.readdirSync('.').filter(f => {
    const isSheet = f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv');
    const isReport = f.startsWith('url_changes_report');
    return isSheet && !isReport;
  });

  let selectedFile = null;

  if (files.length === 1) {
    selectedFile = files[0];
  } else if (files.length > 1) {
    console.log("Sheet files found in the current directory:");
    files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question('\nSelect the file number: ', resolve));
    rl.close();

    const idx = parseInt(answer.trim(), 10) - 1;
    selectedFile = files[idx] || files[0];
  } else {
    console.log("❌ Error: No Excel (.xlsx, .xls) or CSV (.csv) file found.");
    console.log("Tip: Please put your downloaded Google Sheet in this folder first.");
    return;
  }

  console.log(`Reading: '${selectedFile}'...`);

  let rows = [];
  let fieldnames = [];
  const isExcel = selectedFile.endsWith('.xlsx') || selectedFile.endsWith('.xls');

  if (isExcel) {
    const workbook = XLSX.readFile(selectedFile);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length > 0) {
      fieldnames = Object.keys(rows[0]);
    }
  } else {
    const content = fs.readFileSync(selectedFile, 'utf8');
    const parsed = parseCSV(content);
    rows = parsed.rows;
    fieldnames = parsed.fieldnames;
  }

  if (rows.length === 0) {
    console.log("❌ Error: No rows or data columns found in the sheet.");
    return;
  }

  let nameCol = fieldnames.find(f => f.toLowerCase().includes('name'));
  let urlCol = fieldnames.find(f => f.toLowerCase().includes('url') || f.toLowerCase().includes('facebook') || f.toLowerCase().includes('link'));

  if (!nameCol) nameCol = fieldnames[0];
  if (!urlCol) urlCol = fieldnames[1] || fieldnames[0];

  console.log(`Using column '${nameCol}' for Page Names`);
  console.log(`Using column '${urlCol}' for Page URLs`);
  console.log("Scanning pages in parallel...\n");

  console.log("----------------------------------------------------------------------");
  console.log(`${"PAGE NAME".padEnd(30)} | ${"STATUS".padEnd(10)} | DETAILS`);
  console.log("----------------------------------------------------------------------");

  const changes = [];
  const CONCURRENCY = 8;
  let activeIndex = 0;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function worker() {
    while (activeIndex < rows.length) {
      const index = activeIndex++;
      await sleep(100 + Math.random() * 300);
      const row = rows[index];
      const name = row[nameCol] || 'Unknown';
      const url = row[urlCol] || '';

      if (!url || !url.includes('facebook.com')) {
        console.log(`\x1b[33m${name.substring(0, 30).padEnd(30)}\x1b[0m | SKIP       | No valid Facebook URL found.`);
        continue;
      }

      const oldPageId = getFacebookPageId(url);
      if (!oldPageId) {
        console.log(`\x1b[33m${name.substring(0, 30).padEnd(30)}\x1b[0m | SKIP       | Could not parse unique ID from URL.`);
        continue;
      }

      const result = await checkFacebookUrl(url);
      if (!result) {
        console.log(`\x1b[31m${name.substring(0, 30).padEnd(30)}\x1b[0m | FAILED     | Page unreachable or blocked.`);
        continue;
      }

      const destinationUrl = result.url;
      const scrapedPageName = result.title;
      const newPageName = scrapedPageName === '[Private, Deleted or Roadblocked]' ? name : scrapedPageName;
      const newPageId = getFacebookPageId(destinationUrl);

      const usernameChanged = newPageId && oldPageId.toLowerCase() !== newPageId.toLowerCase();
      const nameChanged = scrapedPageName && scrapedPageName !== '[Private, Deleted or Roadblocked]' && normalizeName(name) !== normalizeName(scrapedPageName);

      if (usernameChanged || nameChanged) {
        let changeType = "CHANGED";
        if (usernameChanged && nameChanged) {
          changeType = "BOTH CHANGED";
        } else if (usernameChanged) {
          changeType = "URL CHANGED";
        } else if (nameChanged) {
          changeType = "NAME CHANGED";
        }

        console.log(`\x1b[32m${name.substring(0, 30).padEnd(30)}\x1b[0m | ${changeType.padEnd(10)} | ${oldPageId} ➜ ${newPageId}`);
        console.log(`  ↳ Old Name: ${name}`);
        if (nameChanged) {
          console.log(`  ↳ New Name: ${newPageName}`);
        }
        console.log(`  ↳ Old URL:  ${url}`);
        console.log(`  ↳ New URL:  ${destinationUrl}`);
        changes.push({
          "Original Page Name": name,
          "New Page Name": nameChanged ? newPageName : "",
          "Old URL": url,
          "New URL": destinationUrl,
          "Old Username": oldPageId,
          "New Username": newPageId,
          "Change Type": changeType
        });
      } else {
        console.log(`${name.substring(0, 30).padEnd(30)} | OK         | Live Name: ${newPageName}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);

  console.log("----------------------------------------------------------------------");
  console.log(`\nScan complete! Checked ${rows.length} pages.`);
  console.log(`Detected ${changes.length} changed Facebook pages.`);

  if (changes.length > 0) {
    console.log("\n======================================================================");
    console.log("🌟 DETECTED PAGE NAME & URL CHANGES:");
    console.log("======================================================================");
    changes.forEach((c, idx) => {
      console.log(`\x1b[32m${idx + 1}. Original Name: ${c["Original Page Name"]} \x1b[33m[${c["Change Type"]}]\x1b[0m`);
      if (c["Change Type"] === "NAME CHANGED" || c["Change Type"] === "BOTH CHANGED") {
        console.log(`   ➜ New Name:      ${c["New Page Name"]}`);
      }
      console.log(`   ↳ Old URL:       ${c["Old URL"]}`);
      console.log(`   ↳ New URL:       ${c["New URL"]}`);
      console.log("----------------------------------------------------------------------");
    });
    console.log("======================================================================\n");

    if (isExcel) {
      const reportFile = "url_changes_report.xlsx";
      const newWorksheet = XLSX.utils.json_to_sheet(changes);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Page Changes");
      XLSX.writeFile(newWorkbook, reportFile);
      console.log(`📄 Saved list of changes to Excel file: \x1b[32m${reportFile}\x1b[0m`);
    } else {
      const reportFile = "url_changes_report.csv";
      const headerLine = ["Original Page Name", "New Page Name", "Old URL", "New URL", "Old Username", "New Username"].map(f => `"${f}"`).join(',');
      const rowLines = changes.map(c =>
        [c["Original Page Name"], c["New Page Name"], c["Old URL"], c["New URL"], c["Old Username"], c["New Username"]].map(val => `"${val.replace(/"/g, '""')}"`).join(',')
      );
      fs.writeFileSync(reportFile, [headerLine, ...rowLines].join('\n'), 'utf8');
      console.log(`📄 Saved list of changes to CSV file: \x1b[32m${reportFile}\x1b[0m`);
    }
  } else {
    console.log("No changes found!");
  }
}

main().catch(console.error);
