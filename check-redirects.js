import fs from 'fs';
import path from 'path';
import readline from 'readline';

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const REQUEST_DELAY = 2000; // 2 seconds delay to avoid Facebook rate limits

function extractFacebookUsername(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname.replace(/^\/|\/$/g, ''); // strip leading/trailing slashes
    
    if (pathname.includes('profile.php')) {
      const id = parsed.searchParams.get('id');
      if (id) return `profile.php?id=${id}`;
    }
    
    const parts = pathname.split('/');
    if (parts.length > 0) {
      if (['pages', 'people', 'groups'].includes(parts[0])) {
        if (parts.length > 1) return parts[1];
      }
      return parts[0];
    }
  } catch (e) {}
  return null;
}

async function checkFacebookUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow'
    });
    
    const finalUrl = response.url;
    const html = await response.text();
    
    // 1. Search for canonical link in HTML
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (canonicalMatch && canonicalMatch[1]) {
      const canonicalUrl = canonicalMatch[1];
      if (canonicalUrl.includes('facebook.com')) {
        return canonicalUrl;
      }
    }
    
    // 2. Search for og:url meta tag
    const ogMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
    if (ogMatch && ogMatch[1]) {
      const ogUrl = ogMatch[1];
      if (ogUrl.includes('facebook.com')) {
        return ogUrl;
      }
    }
    
    return finalUrl;
  } catch (e) {
    return null;
  }
}

// Minimal CSV parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return { fieldnames: [], rows: [] };
  
  // Simple CSV line splitter (handles quotes roughly but works perfectly for standard Google sheets CSV)
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

// Minimal CSV writer
function writeCSV(filepath, fieldnames, rows) {
  const headerLine = fieldnames.map(f => `"${f.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map(row => 
    fieldnames.map(f => {
      const val = row[f] || '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
  );
  fs.writeFileSync(filepath, [headerLine, ...rowLines].join('\n'), 'utf8');
}

async function main() {
  console.log("======================================================================");
  console.log("      FACEBOOK PAGE URL REDIRECTS CHECKER (NODE.JS - ZERO INSTALLS)");
  console.log("======================================================================\n");
  
  const files = fs.readdirSync('.').filter(f => f.endsWith('.csv'));
  let csvFile = null;
  
  if (files.length === 1) {
    csvFile = files[0];
  } else if (files.length > 1) {
    console.log("Multiple CSV files found in the current directory:");
    files.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question('\nSelect the CSV file number: ', resolve));
    rl.close();
    
    const idx = parseInt(answer.trim(), 10) - 1;
    csvFile = files[idx] || files[0];
  } else {
    console.log("❌ Error: No CSV file found in the current directory.");
    console.log("Tip: Export your Google Sheet as a CSV file (File -> Download -> Comma-separated values .csv)");
    console.log("and place it inside this folder before running the script.");
    return;
  }
  
  console.log(`Reading: '${csvFile}'...`);
  const content = fs.readFileSync(csvFile, 'utf8');
  const { fieldnames, rows } = parseCSV(content);
  
  if (rows.length === 0) {
    console.log("❌ Error: No rows found or CSV is empty.");
    return;
  }
  
  // Detect columns
  let nameCol = fieldnames.find(f => f.toLowerCase().includes('name'));
  let urlCol = fieldnames.find(f => f.toLowerCase().includes('url') || f.toLowerCase().includes('facebook') || f.toLowerCase().includes('link'));
  
  if (!nameCol) nameCol = fieldnames[0];
  if (!urlCol) urlCol = fieldnames[1] || fieldnames[0];
  
  console.log(`Using column '${nameCol}' for Page Names`);
  console.log(`Using column '${urlCol}' for Page URLs`);
  console.log(`Scanning ${rows.length} pages...\n`);
  
  console.log("----------------------------------------------------------------------");
  console.log(`${"PAGE NAME".padEnd(30)} | ${"STATUS".padEnd(10)} | DETAILS`);
  console.log("----------------------------------------------------------------------");
  
  const changes = [];
  
  for (const row of rows) {
    const name = row[nameCol] || 'Unknown';
    const url = row[urlCol] || '';
    
    if (!url || !url.includes('facebook.com')) {
      console.log(`\x1b[33m${name.substring(0, 30).padEnd(30)}\x1b[0m | SKIP       | No valid Facebook URL found.`);
      continue;
    }
    
    const oldUsername = extractFacebookUsername(url);
    if (!oldUsername) {
      console.log(`\x1b[33m${name.substring(0, 30).padEnd(30)}\x1b[0m | SKIP       | Could not parse username from URL.`);
      continue;
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    
    const destinationUrl = await checkFacebookUrl(url);
    if (!destinationUrl) {
      console.log(`\x1b[31m${name.substring(0, 30).padEnd(30)}\x1b[0m | FAILED     | Page unreachable or blocked.`);
      continue;
    }
    
    const newUsername = extractFacebookUsername(destinationUrl);
    
    if (newUsername && oldUsername.toLowerCase() !== newUsername.toLowerCase()) {
      console.log(`\x1b[32m${name.substring(0, 30).padEnd(30)}\x1b[0m | CHANGED    | ${oldUsername} ➜ ${newUsername}`);
      console.log(`  ↳ Old: ${url}`);
      console.log(`  ↳ New: ${destinationUrl}`);
      changes.push({
        "Page Name": name,
        "Old URL": url,
        "New URL": destinationUrl,
        "Old Username": oldUsername,
        "New Username": newUsername
      });
    } else {
      console.log(`${name.substring(0, 30).padEnd(30)} | OK         | URL is active and unchanged.`);
    }
  }
  
  console.log("----------------------------------------------------------------------");
  console.log(`\nScan complete! Checked ${rows.length} pages.`);
  console.log(`Detected ${changes.length} changed Facebook URLs.`);
  
  if (changes.length > 0) {
    const reportFile = "url_changes_report.csv";
    writeCSV(reportFile, ["Page Name", "Old URL", "New URL", "Old Username", "New Username"], changes);
    console.log(`📄 Saved list of changes to: \x1b[32m${reportFile}\x1b[0m`);
  } else {
    console.log("No changes found!");
  }
}

main().catch(console.error);
