import os
import re
import csv
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
CONCURRENCY = 15  # Process 15 requests at the same time

def extract_facebook_username(url):
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.strip("/")
        
        if "profile.php" in path:
            queries = urllib.parse.parse_qs(parsed.query)
            if "id" in queries:
                return f"profile.php?id={queries['id'][0]}"
        
        parts = path.split("/")
        if parts:
            if parts[0] in ["pages", "people", "groups"]:
                if len(parts) > 1:
                    return parts[1]
            return parts[0]
    except Exception:
        pass
    return None

def check_facebook_url(url):
    req = urllib.request.Request(
        url, 
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            final_url = response.geturl()
            html = response.read().decode('utf-8', errors='ignore')
            
            canonical_match = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if canonical_match:
                canonical_url = canonical_match.group(1)
                if "facebook.com" in canonical_url:
                    return canonical_url
            
            og_url_match = re.search(r'<meta\s+property=["\']og:url["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
            if og_url_match:
                og_url = og_url_match.group(1)
                if "facebook.com" in og_url:
                    return og_url
            
            return final_url
    except Exception:
        return None

def process_row(row, name_col, url_col):
    name = row.get(name_col, "Unknown").strip()
    url = row.get(url_col, "").strip()
    
    if not url or "facebook.com" not in url:
        return {"status": "SKIP", "name": name, "reason": "No valid Facebook URL found."}
        
    old_username = extract_facebook_username(url)
    if not old_username:
        return {"status": "SKIP", "name": name, "reason": "Could not parse username."}
        
    destination_url = check_facebook_url(url)
    if not destination_url:
        return {"status": "FAILED", "name": name, "reason": "Page unreachable."}
        
    new_username = extract_facebook_username(destination_url)
    
    if new_username and old_username.lower() != new_username.lower():
        return {
            "status": "CHANGED",
            "name": name,
            "old_url": url,
            "new_url": destination_url,
            "old_username": old_username,
            "new_username": new_username
        }
        
    return {"status": "OK", "name": name, "destination_url": destination_url}

def main():
    print("=" * 70)
    print("      FACEBOOK PAGE URL REDIRECTS CHECKER (PYTHON - BLAZING FAST)")
    print("=" * 70)
    
    files = [f for f in os.listdir(".") if f.endswith(".csv")]
    
    csv_file = None
    if len(files) == 1:
        csv_file = files[0]
    elif len(files) > 1:
        print("Multiple CSV files found in the current directory:")
        for idx, f in enumerate(files):
            print(f"  {idx + 1}. {f}")
        choice = input("Select the CSV file number: ").strip()
        try:
            csv_file = files[int(choice) - 1]
        except Exception:
            csv_file = choice
    else:
        csv_file = input("Please enter the name of your CSV file: ").strip()
        
    if not csv_file or not os.path.exists(csv_file):
        print(f"\n❌ Error: File '{csv_file}' not found.")
        return
        
    print(f"\nReading: '{csv_file}'...")
    
    rows = []
    with open(csv_file, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for r in reader:
            rows.append(r)
            
    if not rows:
        print("❌ Error: No rows found or CSV is empty.")
        return
        
    name_col = next((c for c in fieldnames if "name" in c.lower()), fieldnames[0])
    url_col = next((c for c in fieldnames if "url" in c.lower() or "facebook" in c.lower() or "link" in c.lower()), fieldnames[1] if len(fieldnames) > 1 else fieldnames[0])
    
    print(f"Using column '{name_col}' for Page Names")
    print(f"Using column '{url_col}' for Page URLs")
    print(f"Scanning {len(rows)} pages with {CONCURRENCY} parallel threads...\n")
    
    print("-" * 70)
    print(f"{'PAGE NAME':<30} | {'STATUS':<10} | {'DETAILS'}")
    print("-" * 70)
    
    changes = []
    
    # Run requests concurrently using standard library ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        futures = {executor.submit(process_row, row, name_col, url_col): row for row in rows}
        
        for future in as_completed(futures):
            res = future.result()
            name = res["name"]
            
            if res["status"] == "SKIP":
                print(f"{name[:30]:<30} | \033[93mSKIP\033[0m       | {res['reason']}")
            elif res["status"] == "FAILED":
                print(f"{name[:30]:<30} | \033[91mFAILED\033[0m     | {res['reason']}")
            elif res["status"] == "OK":
                print(f"{name[:30]:<30} | OK         | Active URL: {res['destination_url']}")
            elif res["status"] == "CHANGED":
                print(f"\033[92m{name[:30]:<30}\033[0m | \033[92mCHANGED\033[0m    | {res['old_username']} ➜ {res['new_username']}")
                print(f"  ↳ Old: {res['old_url']}")
                print(f"  ↳ New: {res['new_url']}")
                changes.append({
                    "Page Name": name,
                    "Old URL": res["old_url"],
                    "New URL": res["new_url"],
                    "Old Username": res["old_username"],
                    "New Username": res["new_username"]
                })
                
    print("-" * 70)
    print(f"\nScan complete! Checked {len(rows)} pages.")
    print(f"Detected {len(changes)} changed Facebook URLs.")
    
    if changes:
        report_file = "url_changes_report.csv"
        with open(report_file, mode='w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=["Page Name", "Old URL", "New URL", "Old Username", "New Username"])
            writer.writeheader()
            writer.writerows(changes)
        print(f"📄 Saved list of changes to: '\033[92m{report_file}\033[0m'")
    else:
        print("No changes found!")

if __name__ == "__main__":
    main()
