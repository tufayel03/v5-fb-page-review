import { db } from './database.js';
import crypto from 'crypto';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

function normalizeImportNumber(num: any): string {
  let cleaned = String(num || '').trim();
  // Remove trailing .0 if Excel parsed it as a float (e.g. "1712345678.0")
  if (cleaned.endsWith('.0')) {
    cleaned = cleaned.substring(0, cleaned.length - 2);
  }

  // If it's a 10-digit number starting with '1' to '9' (typical for stripped BD mobile numbers, e.g. "1712345678")
  if (/^\d{10}$/.test(cleaned) && /^[1-9]/.test(cleaned)) {
    return '0' + cleaned;
  }
  return cleaned;
}


export function startExcelImportJob(
  adminId: string,
  importType: string,
  fileName: string,
  data: any[]
) {
  const jobId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO BulkImports (id, admin_id, import_type, file_name, total_rows, status)
    VALUES (?, ?, ?, ?, ?, 'Processing')
  `).run(jobId, adminId, importType, fileName, data.length);

  setTimeout(() => processExcelBatches(jobId, importType, data), 0);
  return jobId;
}

function processExcelBatches(jobId: string, importType: string, data: any[]) {
  let currentIndex = 0;
  const batchSize = 500;
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const errorReports: { rowIndex: number; error: string }[] = [];

  const isFraud = importType === 'Fraud Pages';
  const defaultStatus = isFraud ? 'Reported as Fraud' : 'Under Review';

  const checkPageStmt = db.prepare('SELECT id FROM FacebookPages WHERE facebook_url = ? OR current_name = ?');
  const insertPageStmt = db.prepare(`
    INSERT INTO FacebookPages (
      id, current_name, facebook_url, contact_number, extra_contacts, payment_methods, page_details, status_badge, trust_score, is_fraud_listed, added_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')
  `);

  const getContactStmt = db.prepare('SELECT id, linked_page_ids, status FROM ContactNumbers WHERE number = ?');
  const updateContactStmt = db.prepare('UPDATE ContactNumbers SET linked_page_ids = ?, type = ?, status = ? WHERE id = ?');
  const insertContactStmt = db.prepare(`
    INSERT INTO ContactNumbers (id, number, type, account_type, status, linked_page_ids, added_by) 
    VALUES (?, ?, ?, 'Unknown', ?, ?, 'admin')
  `);

  function nextBatch() {
    try {
      if (currentIndex >= data.length) {
        const finalStatus = failed > 0 ? 'Completed With Errors' : 'Completed';
        db.prepare(`UPDATE BulkImports SET status = ?, successful_rows = ?, failed_rows = ?, error_report = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(finalStatus, successful, failed, JSON.stringify(errorReports), jobId);
        return;
      }

      const chunk = data.slice(currentIndex, currentIndex + batchSize);

      db.transaction(() => {
        for (let i = 0; i < chunk.length; i++) {
          const row = chunk[i];
          const rowIndex = currentIndex + i + 1; // +1 for 1-based or header

          try {
            if (importType === 'Contact Numbers') {
              const contactRaw = row['number'] || row['Number'] || row['phone'] || row['Phone'] || row['contact'] || '';
              const cleanedNumber = normalizeImportNumber(contactRaw);
              if (!cleanedNumber) {
                skipped++;
                continue;
              }

              const typeParam = row['type'] || row['Type'] || 'bKash';
              const accountTypeParam = row['account type'] || row['Account Type'] || row['account_type'] || 'Personal';
              const displayNameParam = row['display name'] || row['Display Name'] || row['name'] || row['Name'] || '';
              const statusParam = row['status'] || row['Status'] || 'Normal';
              const adminNoteParam = row['admin note'] || row['Admin Note'] || row['note'] || row['Note'] || null;

              const existingContact: any = getContactStmt.get(cleanedNumber);
              if (existingContact) {
                db.prepare(`
                  UPDATE ContactNumbers
                  SET type = ?,
                      account_type = ?,
                      display_name = ?,
                      status = ?,
                      admin_note = ?,
                      updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?
                `).run(typeParam, accountTypeParam, displayNameParam, statusParam, adminNoteParam, existingContact.id);
              } else {
                db.prepare(`
                  INSERT INTO ContactNumbers (id, number, type, account_type, display_name, status, admin_note, added_by)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 'admin')
                `).run(crypto.randomUUID(), cleanedNumber, typeParam, accountTypeParam, displayNameParam, statusParam, adminNoteParam);
              }
              successful++;
              continue;
            }

            const pageName = row['page name'] || row['Page Name'] || row['name'] || '';
            const pageUrl = row['page url'] || row['Page URL'] || row['url'] || '';

            const pmRaw = row['payment method'] || row['Payment Method'] || '';
            const contactRaw = row['contact number'] || row['Contact Number'] || row['contact'] || '';
            const detailsRaw = row['page details'] || row['Page Details'] || row['details'] || '';

            if (!pageName && !pageUrl) {
              skipped++;
              continue;
            }

            let pageId = Date.now().toString() + Math.floor(Math.random() * 1000) + i;
            const urlParam = pageUrl || null;
            const nameParam = pageName || 'Unknown Page';

            const exists = checkPageStmt.get(urlParam, nameParam);
            if (exists) {
              const existingPageId = (exists as any).id;

              const pmList: string[] = pmRaw ? String(pmRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];
              const contactList = contactRaw ? String(contactRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];

              let mainContact = '';
              let extraContacts: string[] = [];
              if (contactList.length > 0) {
                mainContact = contactList[0];
                extraContacts = contactList.slice(1);
              }

              // Update the existing page in the database
              db.prepare(`
                UPDATE FacebookPages 
                SET current_name = COALESCE(?, current_name),
                    facebook_url = COALESCE(?, facebook_url),
                    contact_number = ?,
                    extra_contacts = ?,
                    payment_methods = ?,
                    page_details = ?
                WHERE id = ?
              `).run(
                nameParam,
                urlParam,
                mainContact,
                extraContacts.length ? JSON.stringify(extraContacts) : null,
                pmList.length ? JSON.stringify(pmList) : null,
                detailsRaw || null,
                existingPageId
              );

              const addOrUpdateNumber = (num: string, type: string) => {
                const existing: any = getContactStmt.get(num);
                let newStatus = isFraud ? 'Reported' : 'Normal';

                if (existing) {
                  const links = existing.linked_page_ids ? existing.linked_page_ids.split(',').map((s: string) => s.trim()) : [];
                  if (!links.includes(existingPageId)) links.push(existingPageId);

                  let updatedStatus = existing.status || 'Normal';
                  if (isFraud && existing.status !== 'Suspicious') {
                    updatedStatus = 'Reported';
                  }

                  updateContactStmt.run(links.join(','), type, updatedStatus, existing.id);
                } else {
                  insertContactStmt.run(crypto.randomUUID(), num, type, newStatus, existingPageId);
                }
              };

              for (const c of contactList) addOrUpdateNumber(c, 'Contact Number');
              for (const p of pmList) addOrUpdateNumber(p, 'Payment Method');

              successful++;
              continue;
            }

            const pmList: string[] = pmRaw ? String(pmRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];
            const contactList = contactRaw ? String(contactRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];

            let mainContact = '';
            let extraContacts: string[] = [];
            if (contactList.length > 0) {
              mainContact = contactList[0];
              extraContacts = contactList.slice(1);
            }

            let trustScore = isFraud ? -100 : 0; // Negative for fraud

            insertPageStmt.run(
              pageId,
              nameParam,
              urlParam,
              mainContact,
              extraContacts.length ? JSON.stringify(extraContacts) : null,
              pmList.length ? JSON.stringify(pmList) : null,
              detailsRaw || null,
              defaultStatus,
              trustScore,
              isFraud ? 1 : 0
            );

            const addOrUpdateNumber = (num: string, type: string) => {
              const existing: any = getContactStmt.get(num);
              let newStatus = 'Normal';
              if (isFraud) newStatus = 'Reported';

              if (existing) {
                const links = existing.linked_page_ids ? existing.linked_page_ids.split(',').map((s: string) => s.trim()) : [];
                if (!links.includes(pageId)) links.push(pageId);

                let updatedStatus = existing.status || 'Normal';
                if (isFraud && existing.status !== 'Suspicious') {
                  updatedStatus = 'Reported';
                }

                updateContactStmt.run(links.join(','), type, updatedStatus, existing.id);
              } else {
                insertContactStmt.run(crypto.randomUUID(), num, type, newStatus, pageId);
              }
            };

            for (const c of contactList) addOrUpdateNumber(c, 'Contact Number');
            for (const p of pmList) addOrUpdateNumber(p, 'Payment Method');

            successful++;
          } catch (rowErr: any) {
            failed++;
            errorReports.push({ rowIndex, error: rowErr.message });
          }
        }
      })();

      currentIndex += batchSize;

      db.prepare('UPDATE BulkImports SET successful_rows = ?, failed_rows = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(successful, failed, jobId);

      setTimeout(nextBatch, 0);
    } catch (err: any) {
      db.prepare('UPDATE BulkImports SET status = "Failed", error_report = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(JSON.stringify([{ rowIndex: -1, error: err.message || 'Fatal error during batch' }]), jobId);
    }
  }

  nextBatch();
}

import { google } from 'googleapis';

export function startGoogleSheetSyncJob(adminId: string, importType: string) {
  const jobId = crypto.randomUUID();
  const settings: any = db.prepare('SELECT * FROM GoogleSheetSyncSettings WHERE import_type = ?').get(importType);
  if (!settings || !settings.spreadsheet_id) {
    throw new Error('Google Sheet settings not configured for this import type.');
  }

  db.prepare(`
    INSERT INTO GoogleSheetSyncLogs (id, import_type, started_at, status, created_by)
    VALUES (?, ?, CURRENT_TIMESTAMP, 'Processing', ?)
  `).run(jobId, importType, adminId);

  setTimeout(async () => {
    try {
      // Use public CSV export
      const url = `https://docs.google.com/spreadsheets/d/${settings.spreadsheet_id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(settings.sheet_name)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sheet. Make sure the sheet is public (Anyone with the link can view). Status: ${response.status}`);
      }

      const csvText = await response.text();

      // Basic CSV parser for the expected format (since xlsx might be overkill or we can use it)
      // Actually xlsx can read CSV too! But we'll just manually parse assuming standard format
      // Or better, let's use the xlsx library which is already imported at the top!
      // Wait, is xlsx imported in importService? Let's check. No, it's not.
      // But we can parse CSV using simple regex or just string splitting if there are no complex quotes.
      // Actually, since we have 'xlsx' installed, let's just dynamic import it
      const xlsx = await import('xlsx');
      const workbook = xlsx.read(csvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const dataObjects = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

      console.log(`Fetched Google Sheet ${settings.spreadsheet_id}. Row count: ${dataObjects?.length || 0}`);

      if (!dataObjects || dataObjects.length === 0) {
        db.prepare('UPDATE GoogleSheetSyncLogs SET status = ?, finished_at = CURRENT_TIMESTAMP, error_report = ? WHERE id = ?')
          .run('Completed', JSON.stringify([{ rowIndex: 0, error: 'No data found in sheet' }]), jobId);
        return;
      }

      // Ensure all keys are lowercase
      const normalizedData = dataObjects.map((row: any) => {
        const obj: any = {};
        for (const key of Object.keys(row)) {
          // If there is any strange whitespace in header, trim it
          obj[String(key).toLowerCase().trim()] = String(row[key] || '');
        }
        return obj;
      });

      console.log(`Normalized Data sample:`, normalizedData[0]);

      processSheetBatches(jobId, importType, normalizedData);

    } catch (err: any) {
      db.prepare('UPDATE GoogleSheetSyncLogs SET status = ?, finished_at = CURRENT_TIMESTAMP, error_report = ? WHERE id = ?')
        .run('Failed', err.message, jobId);
    }
  }, 0);

  return jobId;
}

function decodeHTMLEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function isFallbackFacebookName(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  const nameBlacklist = ["facebook", "error", "log in", "log in to facebook", "page not found", "broken link", "loading...", "facebook page", "unknown page", "facebook user", "profile picture"];
  if (nameBlacklist.includes(lower)) return true;
  if (/^\d+$/.test(lower)) return true;
  if (lower.startsWith('facebook page ') || lower.startsWith('facebook user ') || lower.startsWith('facebook profile ')) return true;
  if (/facebook page \d+/i.test(lower) || /facebook user \d+/i.test(lower)) return true;
  return false;
}

function extractFacebookId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes('profile.php')) {
      const id = parsed.searchParams.get('id');
      if (id && /^\d+$/.test(id)) return id;
    }
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      if (pathSegments.includes('people') || pathSegments.includes('pages')) {
        for (const segment of pathSegments) {
          if (/^\d+$/.test(segment)) {
            return segment;
          }
        }
      }
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (/^\d+$/.test(lastSegment)) {
        return lastSegment;
      }
    }
  } catch (e) {}
  
  const idMatch = url.match(/[?&]id=(\d+)/i) || url.match(/\/(\d+)(?:\/|\?|$)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }
  return null;
}

function addFacebookLocale(urlStr: string): string {
  if (!urlStr || !urlStr.includes('facebook.com')) return urlStr;
  try {
    const urlObj = new URL(urlStr);
    urlObj.searchParams.set('locale', 'en_US');
    return urlObj.toString();
  } catch (e) {
    if (urlStr.includes('?')) {
      return urlStr + '&locale=en_US';
    } else {
      return urlStr + '?locale=en_US';
    }
  }
}

async function crawlPageMetadata(pageId: string, url: string, currentName: string): Promise<{ name: string; profilePic: string | null }> {
  let finalName = currentName || '';
  let profilePicPath: string | null = null;

  if (url && url.includes('facebook.com')) {
    try {
      console.log(`[Google Sheet Crawler] Crawling metadata for "${currentName || 'Unknown'}" (${url})...`);
      const fbRes = await fetch(addFacebookLocale(url), {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (fbRes.ok) {
        const html = await fbRes.text();

        // 1. Crawl Page Name if missing or 'Unknown Page'
        let rawTitle = '';
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          rawTitle = ogTitleMatch[1].split('|')[0].trim();
        } else {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          rawTitle = titleMatch ? titleMatch[1].split('|')[0].trim() : '';
        }

        rawTitle = decodeHTMLEntities(rawTitle);

        if (rawTitle) {
          const titleLower = rawTitle.toLowerCase().trim()
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");

          const isRoadblocked = isFallbackFacebookName(rawTitle) || 
                                html.includes("This content isn't available") || 
                                html.includes("isn't available at the moment");

          if (!isRoadblocked) {
            if (!finalName || isFallbackFacebookName(finalName)) {
              finalName = rawTitle;
              console.log(`[Google Sheet Crawler] Resolved page name: "${finalName}"`);
            }

            // 2. Crawl Profile Picture
            const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
            if (ogImageMatch && ogImageMatch[1]) {
              let ogImageUrl = ogImageMatch[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");

              const imgRes = await fetch(ogImageUrl);

              if (imgRes.ok) {
                const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
                if (imageBuffer.length > 2500) {
                  const timestamp = Date.now();
                  const filename = `profile-${pageId}-${timestamp}.webp`;
                  const uploadsDir = path.join(process.cwd(), 'uploads');
                  const filepath = path.join(uploadsDir, filename);

                  if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                  }

                  await sharp(imageBuffer)
                    .resize(300, 300, { fit: 'cover' })
                    .webp({ quality: 80 })
                    .toFile(filepath);

                  const thumbFilename = `profile-thumb-${pageId}-${timestamp}.webp`;
                  const thumbFilepath = path.join(uploadsDir, thumbFilename);
                  await sharp(imageBuffer)
                    .resize(80, 80, { fit: 'cover' })
                    .webp({ quality: 70 })
                    .toFile(thumbFilepath);

                  profilePicPath = `/uploads/${filename}`;
                  console.log(`[Google Sheet Crawler] Saved profile picture WebP: ${profilePicPath}`);
                } else {
                  profilePicPath = null;
                  console.log(`[Google Sheet Crawler] Profile picture too small (placeholder). Skipping.`);
                }
              }
            }
          } else {
            profilePicPath = 'failed';
            console.log(`[Google Sheet Crawler] Page is roadblocked/invalid`);
          }
        } else {
          profilePicPath = 'failed';
          console.log(`[Google Sheet Crawler] No title resolved`);
        }
      } else {
        profilePicPath = 'failed';
        console.log(`[Google Sheet Crawler] Fetch response not OK: ${fbRes.status}`);
      }
    } catch (err) {
      console.error(`[Google Sheet Crawler] Failed crawling page metadata:`, err);
    }

    // Polite 1-second delay between crawls
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { name: finalName, profilePic: profilePicPath };
}

async function processSheetBatches(jobId: string, importType: string, data: any[]) {
  // Similar logic to excel but using GoogleSheetRowMap for tracking...
  let currentIndex = 0;
  const batchSize = 500;
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const errorReports: { rowIndex: number; error: string }[] = [];

  const isFraud = importType === 'Fraud Pages';
  const defaultStatus = isFraud ? 'Reported as Fraud' : 'Under Review';

  const checkPageStmt = db.prepare('SELECT id FROM FacebookPages WHERE facebook_url = ? OR current_name = ?');
  const checkRowMapStmt = db.prepare('SELECT id, database_record_id FROM GoogleSheetRowMap WHERE import_type = ? AND unique_key = ?');
  const insertRowMapStmt = db.prepare('INSERT INTO GoogleSheetRowMap (id, import_type, external_row_id, sheet_row_number, unique_key, database_record_id) VALUES (?, ?, ?, ?, ?, ?)');

  const getContactStmt = db.prepare('SELECT id, linked_page_ids, status FROM ContactNumbers WHERE number = ?');
  const updateContactStmt = db.prepare('UPDATE ContactNumbers SET linked_page_ids = ?, type = ?, status = ? WHERE id = ?');
  const insertContactStmt = db.prepare(`
    INSERT INTO ContactNumbers (id, number, type, account_type, status, linked_page_ids, added_by) 
    VALUES (?, ?, ?, 'Unknown', ?, ?, 'admin')
  `);

  async function nextBatch() {
    try {
      if (currentIndex >= data.length) {
        const finalStatus = failed > 0 ? 'Completed With Errors' : 'Completed';
        db.prepare(`UPDATE GoogleSheetSyncLogs SET status = ?, new_rows_added = ?, existing_rows_skipped = ?, failed_rows = ?, total_rows_checked = ?, error_report = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(finalStatus, successful, skipped, failed, data.length, JSON.stringify(errorReports), jobId);

        db.prepare('UPDATE GoogleSheetSyncSettings SET last_sync_status = ?, last_sync_at = CURRENT_TIMESTAMP WHERE import_type = ?').run(finalStatus, importType);
        return;
      }

      const chunk = data.slice(currentIndex, currentIndex + batchSize);

      for (let i = 0; i < chunk.length; i++) {
        const row = chunk[i];
        const rowIndex = currentIndex + i + 1; // +1 for header

        try {
          const pageName = row['page name'] || row['name'] || '';
          const pageUrl = row['page url'] || row['url'] || '';

          if (!pageName && !pageUrl) {
            skipped++;
            continue;
          }

          const uniqueKey = (pageUrl || pageName).toLowerCase().trim();
          const alreadyMapped: any = checkRowMapStmt.get(importType, uniqueKey);

          if (alreadyMapped) {
            // Verify if the page still exists in the database
            const pageExists = db.prepare('SELECT id, current_name, profile_picture FROM FacebookPages WHERE id = ?').get(alreadyMapped.database_record_id) as any;
            if (!pageExists) {
              // The page was manually deleted, so delete the stale mapping to allow re-importing
              db.prepare('DELETE FROM GoogleSheetRowMap WHERE id = ?').run(alreadyMapped.id);
            } else {
              const existingPageId = alreadyMapped.database_record_id;
              const pmRaw = row['payment method'] || '';
              const contactRaw = row['contact number'] || row['contact'] || '';
              const detailsRaw = row['page details'] || row['details'] || '';

              const pmList: string[] = pmRaw ? String(pmRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];
              const contactList = contactRaw ? String(contactRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];

              let mainContact = '';
              let extraContacts: string[] = [];
              if (contactList.length > 0) {
                mainContact = contactList[0];
                extraContacts = contactList.slice(1);
              }

              const urlParam = pageUrl || null;
              let nameParam = pageName || pageExists.current_name || 'Unknown Page';
              let profilePicToUpdate = pageExists.profile_picture;

              const isFallback = isFallbackFacebookName(pageExists.current_name);
              // If the page doesn't have a valid profile picture OR is currently a fallback name, crawl it!
              if (
                isFallback || !pageName ||
                (!pageExists.profile_picture || pageExists.profile_picture === 'failed')
              ) {
                const crawled = await crawlPageMetadata(existingPageId, urlParam || '', nameParam);
                if (crawled.name && !isFallbackFacebookName(crawled.name)) {
                  nameParam = crawled.name;
                }
                if (crawled.profilePic) {
                  profilePicToUpdate = crawled.profilePic;
                }
              }

              // Update the existing page in the database
              db.prepare(`
                UPDATE FacebookPages 
                SET current_name = COALESCE(?, current_name),
                    facebook_url = COALESCE(?, facebook_url),
                    contact_number = ?,
                    extra_contacts = ?,
                    payment_methods = ?,
                    page_details = ?,
                    profile_picture = ?
                WHERE id = ?
              `).run(
                nameParam,
                urlParam,
                mainContact,
                extraContacts.length ? JSON.stringify(extraContacts) : null,
                pmList.length ? JSON.stringify(pmList) : null,
                detailsRaw || null,
                profilePicToUpdate,
                existingPageId
              );

              const addOrUpdateNumber = (num: string, type: string) => {
                const existing: any = getContactStmt.get(num);
                let newStatus = isFraud ? 'Reported' : 'Normal';

                if (existing) {
                  const links = existing.linked_page_ids ? existing.linked_page_ids.split(',').map((s: string) => s.trim()) : [];
                  if (!links.includes(existingPageId)) links.push(existingPageId);

                  let updatedStatus = existing.status || 'Normal';
                  if (isFraud && existing.status !== 'Suspicious') {
                    updatedStatus = 'Reported';
                  }

                  updateContactStmt.run(links.join(','), type, updatedStatus, existing.id);
                } else {
                  insertContactStmt.run(crypto.randomUUID(), num, type, newStatus, existingPageId);
                }
              };

              for (const c of contactList) addOrUpdateNumber(c, 'Contact Number');
              for (const p of pmList) addOrUpdateNumber(p, 'Payment Method');

              successful++;
              continue;
            }
          }

          let pageId = Date.now().toString() + Math.floor(Math.random() * 1000) + i;
          const urlParam = pageUrl || null;
          const nameParam = pageName || 'Unknown Page';

          const exists = checkPageStmt.get(urlParam, nameParam) as any;
          if (exists) {
            const existingPageId = exists.id;
            const pmRaw = row['payment method'] || '';
            const contactRaw = row['contact number'] || row['contact'] || '';
            const detailsRaw = row['page details'] || row['details'] || '';

            const pmList: string[] = pmRaw ? String(pmRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];
            const contactList = contactRaw ? String(contactRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];

            let mainContact = '';
            let extraContacts: string[] = [];
            if (contactList.length > 0) {
              mainContact = contactList[0];
              extraContacts = contactList.slice(1);
            }

            const pageExists = db.prepare('SELECT current_name, profile_picture FROM FacebookPages WHERE id = ?').get(existingPageId) as any;
            let finalNameParam = pageName || pageExists.current_name || 'Unknown Page';
            let profilePicToUpdate = pageExists.profile_picture;

            if (
              (!pageExists.current_name || pageExists.current_name === 'Unknown Page' || !pageName) ||
              (!pageExists.profile_picture || pageExists.profile_picture === 'failed')
            ) {
              const crawled = await crawlPageMetadata(existingPageId, urlParam || '', finalNameParam);
              if (crawled.name && (!pageName || pageExists.current_name === 'Unknown Page')) {
                finalNameParam = crawled.name;
              }
              if (crawled.profilePic) {
                profilePicToUpdate = crawled.profilePic;
              }
            }

            // Update the existing page in the database
            db.prepare(`
              UPDATE FacebookPages 
              SET current_name = COALESCE(?, current_name),
                  facebook_url = COALESCE(?, facebook_url),
                  contact_number = ?,
                  extra_contacts = ?,
                  payment_methods = ?,
                  page_details = ?,
                  profile_picture = ?
              WHERE id = ?
            `).run(
              finalNameParam,
              urlParam,
              mainContact,
              extraContacts.length ? JSON.stringify(extraContacts) : null,
              pmList.length ? JSON.stringify(pmList) : null,
              detailsRaw || null,
              profilePicToUpdate,
              existingPageId
            );

            const addOrUpdateNumber = (num: string, type: string) => {
              const existing: any = getContactStmt.get(num);
              let newStatus = isFraud ? 'Reported' : 'Normal';

              if (existing) {
                const links = existing.linked_page_ids ? existing.linked_page_ids.split(',').map((s: string) => s.trim()) : [];
                if (!links.includes(existingPageId)) links.push(existingPageId);

                let updatedStatus = existing.status || 'Normal';
                if (isFraud && existing.status !== 'Suspicious') {
                  updatedStatus = 'Reported';
                }

                updateContactStmt.run(links.join(','), type, updatedStatus, existing.id);
              } else {
                insertContactStmt.run(crypto.randomUUID(), num, type, newStatus, existingPageId);
              }
            };

            for (const c of contactList) addOrUpdateNumber(c, 'Contact Number');
            for (const p of pmList) addOrUpdateNumber(p, 'Payment Method');

            // Register the row mapping
            insertRowMapStmt.run(crypto.randomUUID(), importType, null, rowIndex + 1, uniqueKey, existingPageId);

            successful++;
            continue;
          }

          const pmRaw = row['payment method'] || '';
          const contactRaw = row['contact number'] || row['contact'] || '';
          const detailsRaw = row['page details'] || row['details'] || '';

          const pmList: string[] = pmRaw ? String(pmRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];
          const contactList = contactRaw ? String(contactRaw).split(',').map((s) => normalizeImportNumber(s)).filter(Boolean) : [];

          let mainContact = '';
          let extraContacts: string[] = [];
          if (contactList.length > 0) {
            mainContact = contactList[0];
            extraContacts = contactList.slice(1);
          }

          let trustScore = isFraud ? -100 : 0;

          // task 1 & 2: Crawl name (if missing) and profile picture for new listings
          let finalName = pageName || '';
          let profilePicPath: string | null = null;

          if (urlParam && urlParam.includes('facebook.com')) {
            try {
              console.log(`[Google Sheet Crawler] Crawling new page metadata for "${pageName || 'Unknown'}" (${urlParam})...`);
              const fbRes = await fetch(addFacebookLocale(urlParam), {
                headers: {
                  'Accept-Language': 'en-US,en;q=0.9',
                }
              });

              if (fbRes.ok) {
                const html = await fbRes.text();

                // 1. Crawl Page Name if missing
                let rawTitle = '';
                const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
                if (ogTitleMatch && ogTitleMatch[1]) {
                  rawTitle = ogTitleMatch[1].split('|')[0].trim();
                } else {
                  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
                  rawTitle = titleMatch ? titleMatch[1].split('|')[0].trim() : '';
                }

                if (rawTitle) {
                  const titleLower = rawTitle.toLowerCase().trim()
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#039;/g, "'");

                  const isRoadblocked = isFallbackFacebookName(rawTitle) || 
                                        html.includes("This content isn't available") || 
                                        html.includes("isn't available at the moment");

                  if (!isRoadblocked) {
                    if (!finalName || isFallbackFacebookName(finalName)) {
                      finalName = rawTitle;
                      console.log(`[Google Sheet Crawler] Retrieved missing name: "${finalName}"`);
                    }

                    // 2. Crawl Profile Picture
                    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                    if (ogImageMatch && ogImageMatch[1]) {
                      let ogImageUrl = ogImageMatch[1]
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#039;/g, "'");

                      const imgRes = await fetch(ogImageUrl);

                      if (imgRes.ok) {
                        const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
                        if (imageBuffer.length > 2500) {
                          const timestamp = Date.now();
                          const filename = `profile-${pageId}-${timestamp}.webp`;
                          const uploadsDir = path.join(process.cwd(), 'uploads');
                          const filepath = path.join(uploadsDir, filename);

                          if (!fs.existsSync(uploadsDir)) {
                            fs.mkdirSync(uploadsDir, { recursive: true });
                          }

                          await sharp(imageBuffer)
                            .resize(300, 300, { fit: 'cover' })
                            .webp({ quality: 80 })
                            .toFile(filepath);

                          const thumbFilename = `profile-thumb-${pageId}-${timestamp}.webp`;
                          const thumbFilepath = path.join(uploadsDir, thumbFilename);
                          await sharp(imageBuffer)
                            .resize(80, 80, { fit: 'cover' })
                            .webp({ quality: 70 })
                            .toFile(thumbFilepath);

                          profilePicPath = `/uploads/${filename}`;
                          console.log(`[Google Sheet Crawler] Saved profile picture WebP: ${profilePicPath}`);
                        } else {
                          profilePicPath = null;
                          console.log(`[Google Sheet Crawler] Profile picture too small (placeholder). Skipping.`);
                        }
                      }
                    }
                  } else {
                    profilePicPath = 'failed';
                    console.log(`[Google Sheet Crawler] Page is roadblocked/invalid`);
                  }
                } else {
                  profilePicPath = 'failed';
                  console.log(`[Google Sheet Crawler] No title resolved`);
                }
              } else {
                profilePicPath = 'failed';
                console.log(`[Google Sheet Crawler] Fetch response not OK: ${fbRes.status}`);
              }
            } catch (err) {
              console.error(`[Google Sheet Crawler] Failed crawling page metadata:`, err);
            }

            // Polite 1-second delay between crawls during sheet import
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          if (!finalName || isFallbackFacebookName(finalName)) {
            // Try to extract handle from URL
            const queryId = extractFacebookId(urlParam || '');
            if (queryId && !/^\d+$/.test(queryId)) {
              finalName = queryId.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
          }

          if (!finalName || isFallbackFacebookName(finalName)) {
            console.warn(`[Google Sheet Import] Skipping page insertion for URL "${urlParam}": Resolved/provided name "${finalName}" is invalid/generic.`);
            continue;
          }

          db.prepare(`
            INSERT INTO FacebookPages (
              id, current_name, facebook_url, contact_number, extra_contacts, payment_methods, page_details, status_badge, trust_score, is_fraud_listed, added_by, profile_picture
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?)
          `).run(
            pageId,
            finalName,
            urlParam,
            mainContact,
            extraContacts.length ? JSON.stringify(extraContacts) : null,
            pmList.length ? JSON.stringify(pmList) : null,
            detailsRaw || null,
            defaultStatus,
            trustScore,
            isFraud ? 1 : 0,
            profilePicPath
          );

          insertRowMapStmt.run(crypto.randomUUID(), importType, null, rowIndex + 1, uniqueKey, pageId);

          const addOrUpdateNumber = (num: string, type: string) => {
            const existing: any = getContactStmt.get(num);
            let newStatus = 'Normal';
            if (isFraud) newStatus = 'Reported';

            if (existing) {
              const links = existing.linked_page_ids ? existing.linked_page_ids.split(',').map((s: string) => s.trim()) : [];
              if (!links.includes(pageId)) links.push(pageId);

              let updatedStatus = existing.status || 'Normal';
              if (isFraud && existing.status !== 'Suspicious') {
                updatedStatus = 'Reported';
              }

              updateContactStmt.run(links.join(','), type, updatedStatus, existing.id);
            } else {
              insertContactStmt.run(crypto.randomUUID(), num, type, newStatus, pageId);
            }
          };

          for (const c of contactList) addOrUpdateNumber(c, 'Contact Number');
          for (const p of pmList) addOrUpdateNumber(p, 'Payment Method');

          successful++;
        } catch (rowErr: any) {
          failed++;
          errorReports.push({ rowIndex, error: rowErr.message });
        }
      }

      currentIndex += batchSize;

      db.prepare('UPDATE GoogleSheetSyncLogs SET new_rows_added = ?, failed_rows = ?, existing_rows_skipped = ? WHERE id = ?')
        .run(successful, failed, skipped, jobId);

      setTimeout(() => { nextBatch(); }, 0);
    } catch (err: any) {
      db.prepare('UPDATE GoogleSheetSyncLogs SET status = "Failed", error_report = ? WHERE id = ?')
        .run(JSON.stringify([{ rowIndex: -1, error: err.message || 'Fatal error during batch' }]), jobId);
    }
  }

  nextBatch();
}
