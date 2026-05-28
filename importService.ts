import { db } from './database.js';
import crypto from 'crypto';

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
                    page_details = ?,
                    status_badge = ?,
                    trust_score = ?,
                    is_fraud_listed = ?
                WHERE id = ?
              `).run(
                nameParam,
                urlParam,
                mainContact,
                extraContacts.length ? JSON.stringify(extraContacts) : null,
                pmList.length ? JSON.stringify(pmList) : null,
                detailsRaw || null,
                defaultStatus,
                isFraud ? -100 : 0,
                isFraud ? 1 : 0,
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

function processSheetBatches(jobId: string, importType: string, data: any[]) {
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
  const insertPageStmt = db.prepare(`
    INSERT INTO FacebookPages (
      id, current_name, facebook_url, contact_number, extra_contacts, payment_methods, page_details, status_badge, trust_score, is_fraud_listed, added_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')
  `);

  const checkRowMapStmt = db.prepare('SELECT id, database_record_id FROM GoogleSheetRowMap WHERE import_type = ? AND unique_key = ?');
  const insertRowMapStmt = db.prepare('INSERT INTO GoogleSheetRowMap (id, import_type, external_row_id, sheet_row_number, unique_key, database_record_id) VALUES (?, ?, ?, ?, ?, ?)');

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
        db.prepare(`UPDATE GoogleSheetSyncLogs SET status = ?, new_rows_added = ?, existing_rows_skipped = ?, failed_rows = ?, total_rows_checked = ?, error_report = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(finalStatus, successful, skipped, failed, data.length, JSON.stringify(errorReports), jobId);
        
        db.prepare('UPDATE GoogleSheetSyncSettings SET last_sync_status = ?, last_sync_at = CURRENT_TIMESTAMP WHERE import_type = ?').run(finalStatus, importType);
        return;
      }

      const chunk = data.slice(currentIndex, currentIndex + batchSize);

      db.transaction(() => {
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
              const pageExists = db.prepare('SELECT id FROM FacebookPages WHERE id = ?').get(alreadyMapped.database_record_id);
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
                const nameParam = pageName || 'Unknown Page';

                // Update the existing page in the database
                db.prepare(`
                  UPDATE FacebookPages 
                  SET current_name = COALESCE(?, current_name),
                      facebook_url = COALESCE(?, facebook_url),
                      contact_number = ?,
                      extra_contacts = ?,
                      payment_methods = ?,
                      page_details = ?,
                      status_badge = ?,
                      trust_score = ?,
                      is_fraud_listed = ?
                  WHERE id = ?
                `).run(
                  nameParam,
                  urlParam,
                  mainContact,
                  extraContacts.length ? JSON.stringify(extraContacts) : null,
                  pmList.length ? JSON.stringify(pmList) : null,
                  detailsRaw || null,
                  defaultStatus,
                  isFraud ? -100 : 0,
                  isFraud ? 1 : 0,
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
            
            const exists = checkPageStmt.get(urlParam, nameParam);
            if (exists) {
              const existingPageId = (exists as any).id;
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

              // Update the existing page in the database
              db.prepare(`
                UPDATE FacebookPages 
                SET current_name = COALESCE(?, current_name),
                    facebook_url = COALESCE(?, facebook_url),
                    contact_number = ?,
                    extra_contacts = ?,
                    payment_methods = ?,
                    page_details = ?,
                    status_badge = ?,
                    trust_score = ?,
                    is_fraud_listed = ?
                WHERE id = ?
              `).run(
                nameParam,
                urlParam,
                mainContact,
                extraContacts.length ? JSON.stringify(extraContacts) : null,
                pmList.length ? JSON.stringify(pmList) : null,
                detailsRaw || null,
                defaultStatus,
                isFraud ? -100 : 0,
                isFraud ? 1 : 0,
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
      })();

      currentIndex += batchSize;

      db.prepare('UPDATE GoogleSheetSyncLogs SET new_rows_added = ?, failed_rows = ?, existing_rows_skipped = ? WHERE id = ?')
        .run(successful, failed, skipped, jobId);

      setTimeout(nextBatch, 0);
    } catch (err: any) {
      db.prepare('UPDATE GoogleSheetSyncLogs SET status = "Failed", error_report = ? WHERE id = ?')
        .run(JSON.stringify([{ rowIndex: -1, error: err.message || 'Fatal error during batch' }]), jobId);
    }
  }

  nextBatch();
}
