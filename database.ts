import Database from 'better-sqlite3';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const db = new Database('data.db');
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS FacebookPages (
    id TEXT PRIMARY KEY,
    current_name TEXT,
    facebook_url TEXT UNIQUE,
    current_username TEXT,
    previous_names TEXT,
    previous_usernames TEXT,
    profile_picture TEXT,
    category TEXT,
    trust_score INTEGER DEFAULT 0,
    evidence_score INTEGER DEFAULT 0,
    status_badge TEXT DEFAULT 'Under Review',
    claim_status TEXT DEFAULT 'Unclaimed',
    owner_id TEXT,
    contact_number TEXT,
    extra_contacts TEXT,
    other_urls TEXT,
    payment_methods TEXT,
    website_url TEXT,
    page_details TEXT,
    category_id TEXT,
    subcategory_id TEXT,
    added_by TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(id)
  );

  CREATE TABLE IF NOT EXISTS Reviews (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    review_type TEXT NOT NULL,
    star_rating INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date_of_experience TEXT NOT NULL,
    bkash_number TEXT,
    bkash_account_type TEXT,
    bkash_display_name TEXT,
    facebook_post_link TEXT,
    order_amount TEXT,
    product_service_type TEXT,
    proof_image TEXT,
    status TEXT DEFAULT 'Pending',
    category_id TEXT,
    subcategory_id TEXT,
    is_on_behalf INTEGER DEFAULT 0,
    on_behalf_name TEXT,
    useful_count INTEGER DEFAULT 0,
    share_image_publicly INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES FacebookPages(id),
    FOREIGN KEY (user_id) REFERENCES Users(id)
  );

  CREATE TABLE IF NOT EXISTS ContactNumbers (
    id TEXT PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    type TEXT,
    account_type TEXT,
    display_name TEXT,
    linked_page_ids TEXT, 
    total_mentions INTEGER DEFAULT 0,
    fraud_report_count INTEGER DEFAULT 0,
    suspicious_report_count INTEGER DEFAULT 0,
    first_reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Normal',
    admin_note TEXT,
    added_by TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Claims (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    claimer_username TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    status TEXT DEFAULT 'Pending Verification',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES FacebookPages(id),
    FOREIGN KEY (user_id) REFERENCES Users(id)
  );

  CREATE TABLE IF NOT EXISTS Disputes (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    review_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    proof_image TEXT,
    status TEXT DEFAULT 'Open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS OwnerReplies (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    reply_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES Reviews(id),
    FOREIGN KEY (owner_id) REFERENCES Users(id)
  );

  CREATE TABLE IF NOT EXISTS BlogPosts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    category_id TEXT,
    tags TEXT,
    featured_image TEXT,
    seo_title TEXT,
    seo_description TEXT,
    status TEXT DEFAULT 'Draft',
    is_pinned BOOLEAN DEFAULT 0,
    author_id TEXT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS Categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    image TEXT,
    parent_id TEXT,
    type TEXT DEFAULT 'main',
    seo_title TEXT,
    seo_description TEXT,
    status TEXT DEFAULT 'Active',
    featured INTEGER DEFAULT 0,
    show_publicly INTEGER DEFAULT 1,
    admin_note TEXT,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS AbuseReports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT,
    reported_user_id TEXT,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    report_type TEXT NOT NULL,
    description TEXT,
    evidence_file TEXT,
    status TEXT DEFAULT 'Open',
    admin_note TEXT,
    admin_decision TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS AdminLogs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    read_status INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS BulkImports (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    import_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    error_report TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS BulkExports (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    export_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    row_count INTEGER DEFAULT 0,
    filters TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS GoogleSheetSyncSettings (
    id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    spreadsheet_id TEXT,
    sheet_name TEXT,
    import_type TEXT UNIQUE,
    sync_interval TEXT,
    sync_mode TEXT DEFAULT 'Add New Rows Only',
    last_sync_at DATETIME,
    last_sync_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS GoogleSheetSyncLogs (
    id TEXT PRIMARY KEY,
    import_type TEXT,
    started_at DATETIME,
    finished_at DATETIME,
    status TEXT,
    total_rows_checked INTEGER DEFAULT 0,
    new_rows_added INTEGER DEFAULT 0,
    existing_rows_skipped INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_report TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS GoogleSheetRowMap (
    id TEXT PRIMARY KEY,
    import_type TEXT,
    external_row_id TEXT,
    sheet_row_number INTEGER,
    unique_key TEXT,
    database_record_id TEXT,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Settings (
    id TEXT PRIMARY KEY,
    group_name TEXT NOT NULL,
    key_name TEXT UNIQUE NOT NULL,
    value TEXT,
    type TEXT,
    description TEXT,
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS AdminSettingsHistory (
    id TEXT PRIMARY KEY,
    setting_group TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS MediaLibrary (
    id TEXT PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    filename TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ContactMessages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS VisitorLogs (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec('ALTER TABLE FacebookPages ADD COLUMN owner_id TEXT;');
} catch (e) {
  // column might already exist
}

try {
  db.exec('ALTER TABLE FacebookPages ADD COLUMN contact_number TEXT;');
} catch (e) {
  // column might already exist
}

try { db.exec('ALTER TABLE FacebookPages ADD COLUMN website_url TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN extra_contacts TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN other_urls TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN payment_methods TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN page_details TEXT;'); } catch (e) {}

try {
  db.exec('ALTER TABLE FacebookPages ADD COLUMN sub_category TEXT;');
} catch (e) {}

try { db.exec('ALTER TABLE FacebookPages ADD COLUMN products_sold TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN product_keywords TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN delivery_area TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN has_cod INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN has_return_policy INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN business_description TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN official_contact_number TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN official_email TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN business_address TEXT;'); } catch (e) {}

try { db.exec('ALTER TABLE OwnerReplies ADD COLUMN status TEXT DEFAULT "Public";'); } catch (e) {}
try { db.exec('ALTER TABLE OwnerReplies ADD COLUMN updated_at DATETIME;'); } catch (e) {}
try { db.exec('ALTER TABLE OwnerReplies ADD COLUMN page_id TEXT;'); } catch (e) {}

// Migrate legacy 'Verified Safe' status badges to 'Verified Marketplace Seller'
try {
  db.prepare("UPDATE FacebookPages SET status_badge = 'Verified Marketplace Seller' WHERE status_badge = 'Verified Safe'").run();
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS BusinessProfileUpdates (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    update_type TEXT,
    old_value TEXT,
    new_value TEXT,
    status TEXT DEFAULT 'Pending Review',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES FacebookPages(id),
    FOREIGN KEY (owner_id) REFERENCES Users(id)
  );
`);
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN price_range TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN average_rating REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN total_reviews INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN safe_review_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN neutral_review_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN suspicious_report_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN fraud_report_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN recent_positive_review_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN recent_fraud_report_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN trusted_ranking_score REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN featured_trusted_seller INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN admin_trusted_note TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN business_verification_status TEXT DEFAULT "Normal";'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN business_verification_note TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN business_verified_by_admin_id TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN business_verified_at DATETIME;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN require_manual_fraud_approval INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN is_fraud_listed INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN fraud_list_reason TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN fraud_listed_by_admin_id TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN fraud_listed_at DATETIME;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN fraud_severity TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE FacebookPages ADD COLUMN fraud_internal_note TEXT;'); } catch (e) {}

try { db.exec("ALTER TABLE FacebookPages ADD COLUMN added_by TEXT DEFAULT 'admin';"); } catch (e) {}
try { db.exec("ALTER TABLE ContactNumbers ADD COLUMN added_by TEXT DEFAULT 'admin';"); } catch (e) {}
try { db.exec("ALTER TABLE ContactNumbers ADD COLUMN linked_page_count INTEGER DEFAULT 0;"); } catch (e) {}

// Backfill linked_page_count from existing linked_page_ids
try {
  const _cnRows = db.prepare("SELECT id, linked_page_ids FROM ContactNumbers WHERE linked_page_ids IS NOT NULL AND linked_page_ids != ''").all() as any[];
  const _updCn = db.prepare("UPDATE ContactNumbers SET linked_page_count = ? WHERE id = ?");
  for (const _row of _cnRows) {
    const _cnt = _row.linked_page_ids.split(',').filter((s: string) => s.trim()).length;
    _updCn.run(_cnt, _row.id);
  }
} catch (e) {}

try { db.exec('ALTER TABLE Users ADD COLUMN reset_token TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Users ADD COLUMN reset_token_expires DATETIME;'); } catch (e) {}

try {
  db.exec('ALTER TABLE Reviews ADD COLUMN updated_at DATETIME;');
} catch (e) {}
try { db.exec('ALTER TABLE Reviews ADD COLUMN is_on_behalf INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE Reviews ADD COLUMN on_behalf_name TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Reviews ADD COLUMN useful_count INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE Reviews ADD COLUMN share_image_publicly INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE Claims ADD COLUMN updated_at DATETIME;'); } catch (e) {}
try { db.exec('ALTER TABLE Claims ADD COLUMN admin_note TEXT;'); } catch (e) {}

try { db.exec('ALTER TABLE Categories ADD COLUMN description TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN icon TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN image TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN seo_title TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN seo_description TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN featured INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN display_order INTEGER DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE Categories ADD COLUMN updated_at DATETIME;'); } catch (e) {}

try { db.exec('ALTER TABLE BlogPosts ADD COLUMN category_id TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN tags TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN featured_image TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN seo_title TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN seo_description TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN focus_keyword TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN og_title TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN og_description TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN og_image TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Disputes ADD COLUMN admin_decision TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Disputes ADD COLUMN admin_note TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Disputes ADD COLUMN updated_at DATETIME;'); } catch (e) {}

try { db.exec('ALTER TABLE BlogPosts ADD COLUMN status TEXT DEFAULT "Draft";'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN author_id TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN published_at DATETIME;'); } catch (e) {}
try { db.exec('ALTER TABLE BlogPosts ADD COLUMN updated_at DATETIME;'); } catch (e) {}

try { db.exec('ALTER TABLE AbuseReports ADD COLUMN reported_user_id TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE AbuseReports ADD COLUMN evidence_file TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE AbuseReports ADD COLUMN admin_decision TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE AbuseReports ADD COLUMN updated_at DATETIME;'); } catch (e) {}

try { db.exec('ALTER TABLE BulkImports ADD COLUMN import_type TEXT NOT NULL DEFAULT "Unknown";'); } catch (e) {}
try { db.exec('ALTER TABLE BulkImports ADD COLUMN updated_at DATETIME;'); } catch (e) {}
try { db.exec('ALTER TABLE BulkImports ADD COLUMN status TEXT DEFAULT "Pending";'); } catch (e) {}
try { db.exec('ALTER TABLE BulkImports ADD COLUMN error_report TEXT;'); } catch (e) {}


// Seed admin user if none exists — password from env or auto-generated
const adminEmail = process.env.ADMIN_EMAIL || 'admin@fbpagereview.com';
const countUsers = db.prepare("SELECT COUNT(*) as count FROM Users WHERE username = 'admin' OR email = ?").get(adminEmail) as { count: number };
if (countUsers.count === 0) {
  const seedUserId = crypto.randomUUID();
  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomUUID();
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(`\n⚠️  No ADMIN_PASSWORD set in .env — auto-generated admin password: ${adminPassword}`);
    console.warn(`   Admin email: ${adminEmail}`);
    console.warn(`   Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for production.\n`);
  }
  db.prepare(`
    INSERT INTO Users (id, full_name, username, email, password_hash, role) 
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET role = 'admin'
  `).run(seedUserId, 'System Admin', 'admin', adminEmail, bcrypt.hashSync(adminPassword, 10), 'admin');
}

// Ensure admin user role is correctly set (using env-configured email)
try {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fbpagereview.com';
  db.prepare("UPDATE Users SET role = 'admin' WHERE LOWER(email) = LOWER(?)").run(adminEmail);
} catch (roleErr) {
  console.warn("User role migration warning:", roleErr);
}

// Proactive clean up of any initial mock data to prepare for a clean production setup
try {
  const seedPageId = '1e4a64ef-4b44-4b55-a226-d3a373cf58bb';
  const seedContactId = '3e4a64ef-4b44-4b55-a226-d3a373cf58bb';
  
  db.prepare('DELETE FROM FacebookPages WHERE id = ?').run(seedPageId);
  db.prepare('DELETE FROM ContactNumbers WHERE id = ? OR number = ?').run(seedContactId, '01711223344');
  db.prepare('DELETE FROM Reviews WHERE page_id = ?').run(seedPageId);
} catch (cleanupErr) {
  console.warn("Database mock clean up warning:", cleanupErr);
}

// Ensure anonymous user exists for foreign key constraints
try {
  db.prepare(`
    INSERT OR IGNORE INTO Users (id, full_name, username, email, password_hash, role) 
    VALUES ('anonymous', 'Anonymous User', 'anonymous', 'anonymous@fbpagereview.com', 'no-password-hash', 'user')
  `).run();
} catch (e) {
  console.error("Failed to seed anonymous user:", e);
}

// Sync existing manually marked high-risk pages as is_fraud_listed = 1
try {
  db.exec(`
    UPDATE FacebookPages 
    SET is_fraud_listed = 0,
        fraud_listed_at = NULL
    WHERE LOWER(status_badge) NOT IN ('reported as fraud', 'admin verified fraud') OR status_badge IS NULL
  `);

  db.exec(`
    UPDATE FacebookPages 
    SET is_fraud_listed = 1, 
        fraud_listed_at = COALESCE(fraud_listed_at, CURRENT_TIMESTAMP)
    WHERE LOWER(status_badge) IN ('reported as fraud', 'admin verified fraud')
  `);
} catch (e) {
  console.error("Migration update warning:", e);
}

// Search Queries Table
db.exec(`
  CREATE TABLE IF NOT EXISTS SearchQueries (
    query TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  // Purge seeded mock items to ensure a purely dynamic set of search queries
  db.exec(`
    DELETE FROM SearchQueries 
    WHERE query IN ('Watch', 'Mobile Phone', 'Clothes', 'Cosmetics', 'Hot Wheels')
  `);
} catch (e) {
  console.error("Purging mock search queries error:", e);
}

// -------------------------------------------------------------------------
// DATABASE INDEX OPTIMIZATION FOR 50k+ RECORDS PRODUCTION LOAD
// -------------------------------------------------------------------------
const indexStatements = [
  "CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);",
  "CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);",
  "CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);",
  "CREATE INDEX IF NOT EXISTS idx_users_created ON Users(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_fb_pages_name ON FacebookPages(current_name);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_url ON FacebookPages(facebook_url);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_username ON FacebookPages(current_username);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_category ON FacebookPages(category);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_score ON FacebookPages(trust_score);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_is_fraud ON FacebookPages(is_fraud_listed);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_claim ON FacebookPages(claim_status);",
  "CREATE INDEX IF NOT EXISTS idx_fb_pages_created ON FacebookPages(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_reviews_page ON Reviews(page_id);",
  "CREATE INDEX IF NOT EXISTS idx_reviews_user ON Reviews(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_reviews_rating ON Reviews(star_rating);",
  "CREATE INDEX IF NOT EXISTS idx_reviews_type ON Reviews(review_type);",
  "CREATE INDEX IF NOT EXISTS idx_reviews_status ON Reviews(status);",
  "CREATE INDEX IF NOT EXISTS idx_reviews_created ON Reviews(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_claims_page ON Claims(page_id);",
  "CREATE INDEX IF NOT EXISTS idx_claims_user ON Claims(user_id);",
  "CREATE INDEX IF NOT EXISTS idx_claims_status ON Claims(status);",
  "CREATE INDEX IF NOT EXISTS idx_claims_created ON Claims(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_disputes_page ON Disputes(page_id);",
  "CREATE INDEX IF NOT EXISTS idx_disputes_review ON Disputes(review_id);",
  "CREATE INDEX IF NOT EXISTS idx_disputes_status ON Disputes(status);",
  "CREATE INDEX IF NOT EXISTS idx_disputes_created ON Disputes(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_blog_slug ON BlogPosts(slug);",
  "CREATE INDEX IF NOT EXISTS idx_blog_status ON BlogPosts(status);",
  "CREATE INDEX IF NOT EXISTS idx_blog_category ON BlogPosts(category_id);",
  "CREATE INDEX IF NOT EXISTS idx_blog_published ON BlogPosts(published_at);",
  "CREATE INDEX IF NOT EXISTS idx_blog_created ON BlogPosts(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_abuse_reports_target ON AbuseReports(target_id);",
  "CREATE INDEX IF NOT EXISTS idx_abuse_reports_target_type ON AbuseReports(target_type);",
  "CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON AbuseReports(status);",
  "CREATE INDEX IF NOT EXISTS idx_abuse_reports_created ON AbuseReports(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_contact_numbers_num ON ContactNumbers(number);",
  "CREATE INDEX IF NOT EXISTS idx_contact_numbers_type ON ContactNumbers(type);",
  "CREATE INDEX IF NOT EXISTS idx_contact_numbers_status ON ContactNumbers(status);",
  "CREATE INDEX IF NOT EXISTS idx_contact_numbers_created ON ContactNumbers(created_at);",

  "CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON AdminLogs(admin_id);",
  "CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON AdminLogs(action);",
  "CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON AdminLogs(created_at);"
];

for (const stmt of indexStatements) {
  try {
    db.exec(stmt);
  } catch (err) {
    console.error("Index creation index flag warning:", stmt, err);
  }
}

// -------------------------------------------------------------------------
// AUTO-HEAL: Purge any invalid Facebook URLs added as pages (e.g., photo, posts, reels)
// -------------------------------------------------------------------------
try {
  const invalidPatterns = [
    '%facebook.com/photo%', '%facebook.com/permalink.php%', '%facebook.com/posts%', 
    '%facebook.com/groups%', '%facebook.com/reels%', '%facebook.com/stories%', 
    '%facebook.com/watch%', '%facebook.com/videos%', '%fb.com/photo%', 
    '%fb.com/permalink.php%', '%fb.com/posts%', '%fb.com/groups%', 
    '%fb.com/reels%', '%fb.com/stories%', '%fb.com/watch%', '%fb.com/videos%',
    '%?fbid=%', '%&fbid=%', '%?story_fbid=%', '%&story_fbid=%'
  ];

  const placeholders = invalidPatterns.map(() => 'facebook_url LIKE ?').join(' OR ');
  const invalidPages = db.prepare(`
    SELECT id, facebook_url FROM FacebookPages 
    WHERE ${placeholders}
  `).all(...invalidPatterns) as { id: string, facebook_url: string }[];

  if (invalidPages.length > 0) {
    const pageIds = invalidPages.map(p => p.id);
    const idPlaceholders = pageIds.map(() => '?').join(',');

    db.prepare(`DELETE FROM Reviews WHERE page_id IN (${idPlaceholders})`).run(...pageIds);
    db.prepare(`DELETE FROM Claims WHERE page_id IN (${idPlaceholders})`).run(...pageIds);
    db.prepare(`DELETE FROM FacebookPages WHERE id IN (${idPlaceholders})`).run(...pageIds);

    console.log(`[Auto-Heal] Successfully purged ${invalidPages.length} invalid page URLs (photos, posts, groups) from database:`, invalidPages.map(p => p.facebook_url));
  }
} catch (e) {
  console.error('[Auto-Heal] Failed to purge invalid Facebook URL page records:', e);
}

// -------------------------------------------------------------------------
// SEEDING: Populate high-quality blog posts if none exist
// -------------------------------------------------------------------------
try {
  const countBlogs = db.prepare("SELECT COUNT(*) as count FROM BlogPosts").get() as { count: number };
  if (countBlogs.count === 0) {
    const seedBlogs = [
      {
        id: 'blog-seed-1',
        title: '5 Critical Signs of a Facebook Shopping Scam in Bangladesh',
        slug: 'avoid-facebook-marketplace-scams-bangladesh',
        excerpt: 'A comprehensive guide to identifying fraudulent sellers on Facebook. Learn key warning signs like unrealistic prices, fake reviews, and pressure tactics.',
        content: `### Introduction
With the rapid expansion of digital commerce in Bangladesh, shopping on Facebook pages and groups has become incredibly popular. However, this convenience has also opened the door for malicious scammers who set up fake storefronts, collect advance payments, and disappear. 

To help you shop with confidence, we have compiled the five most critical warning signs of a Facebook shopping scam.

---

### 1. Unbelievably Low Prices
If a page is selling high-end products (like iPhones, designer cosmetics, or imported gadgets) at a fraction of their market price, you should immediately raise your guard. Scammers often use "clearance sales," "limited-time promotions," or "anniversary deals" as bait. Remember the golden rule: **If it sounds too good to be true, it probably is.**

### 2. High-Pressure Tactics
Fake sellers will try to rush you into making a decision. They might say, *"Only one item left in stock, send money now to secure it"* or *"Price will double in 10 minutes."* Real businesses value customer satisfaction and will rarely pressure you to pay instantly without verifying your order details.

### 3. Lack of Customer Reviews or Disabled Comments
Legitimate Facebook businesses thrive on customer engagement. If a page has disabled comments on its posts, or if you notice that all negative reactions/reviews are blocked or deleted, it is a huge red flag. Scammers disable comments to prevent past victims from warning new buyers.

### 4. Suspicious Page Transparency
Facebook provides a "Page Transparency" section for every page. Check this section to see:
* **Page creation date:** Scammers frequently create new pages, run ads, scam a few dozen people, and then delete the page to start a new one. Be extremely cautious with pages less than 6 months old.
* **Name change history:** If a page was created as a fan group or a personal blog and suddenly changed its name to an online shop, it might have been hacked or purchased.

### 5. Demands for Advanced Payment (No Cash on Delivery)
Scammers will almost always refuse Cash on Delivery (COD). They will insist on full or partial advanced payment via bKash, Nagad, or Rocket, claiming it is for "delivery charge security." Once the money is sent, they will block your profile and remove their chat history.

---

### Conclusion
Always do your homework before transacting. Search the page name, username, and bKash number on [FB Page Review](https://fbpagereview.com) to see if other buyers have flagged them. Stay safe, shop smart, and help protect the community by reporting any suspicious activity.`,
        category_id: 'safety',
        tags: 'Safety Guide, Online Shopping, Scams',
        featured_image: '',
        seo_title: 'Avoid Facebook Marketplace Scams in Bangladesh - 5 Signs',
        seo_description: 'Discover how to identify fake Facebook pages and avoid online shopping scams in Bangladesh. Learn the top 5 warning signs before you pay.',
        status: 'Published',
        is_pinned: 1,
        author_id: 'admin',
        published_at: new Date().toISOString()
      },
      {
        id: 'blog-seed-2',
        title: 'How to Verify bKash and Nagad Merchant Numbers Before Paying',
        slug: 'verify-bkash-nagad-rocket-payment-numbers',
        excerpt: 'Don\'t send money blindly! Learn how to verify seller payment numbers using public databases and search queries to avoid mobile banking fraud.',
        content: `### Introduction
Mobile Financial Services (MFS) like bKash, Nagad, and Rocket have revolutionized transactions in Bangladesh. However, their speed and convenience also make them the primary tool for online scammers. Since transactions are instant and irreversible, once you send money to a fraudster, recovering it is extremely difficult.

Here is a step-by-step guide on how to verify any bKash or Nagad payment number before sending money.

---

### 1. Perform a Global Search on FB Page Review
Before making any payment, copy the seller\'s bKash or Nagad number and search it in the [FB Page Review Search Bar](https://fbpagereview.com). Our crowd-sourced database tracks reported numbers associated with fraudulent Facebook pages. If the number has been flagged in past scams, you will see reports and screenshots instantly.

### 2. Search the Number on Facebook and Google
Type the phone number in quotes (e.g., *"017XXXXXXXX"*) into Facebook and Google search boxes:
* **On Facebook:** Check if the number is linked to multiple different pages with completely different names and niches. Scammers often run 5-10 fake pages simultaneously using a single payment wallet.
* **On Google:** Search if the number has been mentioned in community groups, forum posts, or fraud warning lists.

### 3. Verify the Wallet Owner\'s Name (Name Matching)
When transferring money through the bKash or Nagad app, look at the receiver name displayed on the confirmation screen before entering your PIN:
* Does the name match the business name or the seller\'s declared name?
* If the page claims to be an official brand but the wallet is a Personal account under an unrelated individual\'s name, proceed with extreme caution.

### 4. Insist on Merchant Payments (bKash Merchant/Nagad Business)
Whenever possible, make payments using official Merchant numbers rather than Personal send-money wallets. Merchant accounts require business trade licenses and national identification to set up, making it much easier for authorities and mobile banking services to track and block fraudulent merchants in case of disputes.

---

### Conclusion
Taking two minutes to verify a payment number can save you from losing thousands of Taka. If you discover a number linked to a scam, make sure to report it on [FB Page Review](https://fbpagereview.com/write-review?type=fraud) to prevent other shoppers from falling victim.`,
        category_id: 'safety',
        tags: 'bKash, Nagad, Mobile Banking, Safety',
        featured_image: '',
        seo_title: 'Verify bKash and Nagad Payment Numbers Before Sending Money',
        seo_description: 'Learn how to verify seller bKash, Nagad, and Rocket numbers in Bangladesh. Protect yourself from mobile financial fraud with these verification steps.',
        status: 'Published',
        is_pinned: 0,
        author_id: 'admin',
        published_at: new Date().toISOString()
      },
      {
        id: 'blog-seed-3',
        title: 'The Power of Community: Why Reporting Online Scams Saves Others',
        slug: 'importance-of-reporting-online-scams',
        excerpt: 'By reporting fraudulent pages and writing reviews, you help build a safer digital Bangladesh. Discover how crowd-sourced scam reporting works.',
        content: `### Introduction
When someone gets scammed online, the initial reaction is often a mixture of anger, frustration, and helplessness. Many victims choose to remain silent, thinking, *"It was only 500 Taka, why bother?"* or *"Nothing will happen anyway."*

However, silence is exactly what scammers count on. By staying quiet, we allow fraudulent pages to continue operating and scamming hundreds of other innocent buyers. Here is why reporting scams is so powerful and how it protects our digital community.

---

### 1. Breaking the Scam Cycle
Most online scammers rely on volume. They scam 50 people for 1,000 Taka each, accumulating 50,000 Taka a week. If even one or two victims write a public review or report the page with evidence on [FB Page Review](https://fbpagereview.com), that page\'s name, URL, and payment numbers become searchable. The next potential buyer who searches before buying will see the warning and step back, breaking the scammer\'s loop.

### 2. Building a Searchable Public Database
Fraudsters constantly change page names and create new profiles, but they cannot easily change their phone numbers, bank accounts, or bKash wallets. A crowd-sourced directory that aggregates scam numbers and fraudulent page profiles creates an index that scammers cannot escape. Even if they change their page name, search engines will link their payment number back to the reported fraud profile.

### 3. Helping Honest Businesses Succeed
By weeding out scammers, we also support legitimate small businesses. When buyers are constantly scammed, they lose trust in Facebook commerce as a whole, which hurts authentic sellers. Exposing fraud helps restore trust in honest page owners who deliver quality goods and care about their customers.

---

### How to Write an Effective Fraud Report
When you report a scam page on our platform, make sure to:
1. **Provide the Exact URL:** Page names can be duplicated, but the unique Facebook URL cannot.
2. **Mention Payment Numbers:** Write down the exact bKash/Nagad numbers used.
3. **Upload Proof:** Attach screenshots of the chat showing the order confirmation and payment receipt. Make sure to blur any personal sensitive data (like your home address) before uploading.

Together, we can build a transparent and safe digital marketplace in Bangladesh.`,
        category_id: 'community',
        tags: 'Community, Fraud Reporting, E-commerce',
        featured_image: '',
        seo_title: 'Why Reporting Online Scams Matters - Community Power',
        seo_description: 'Understand how crowd-sourced fraud reporting stops online scammers in Bangladesh. Learn how to write an effective report and help other buyers.',
        status: 'Published',
        is_pinned: 0,
        author_id: 'admin',
        published_at: new Date().toISOString()
      },
      {
        id: 'blog-seed-4',
        title: 'A Guide for Safe Online Shopping: Checklist Before Clicking \'Order\'',
        slug: 'safe-online-shopping-checklist-bangladesh',
        excerpt: 'Keep this checklist handy next time you order from a new Facebook shop. Simple steps to verify seller authenticity, page age, and reviews.',
        content: `### Introduction
Shopping online in Bangladesh has never been easier, but it also carries risks. With thousands of pages offering clothes, food, electronics, and cosmetics, how do you verify if a seller is legitimate? 

To make your shopping safe and hassle-free, use this simple checklist before clicking the "Order" button or sending any advance payments.

---

### The Pre-Order Verification Checklist

#### 1. Page History and Age
* Go to the page\'s "Page Transparency" tab.
* Look at the creation date. If the page was created in the last 2-3 months, be extra careful.
* Check if they have changed names recently. A page that changed from "Funny Videos" to "Gadget Store" is highly suspicious.

#### 2. Check for Real Reviews
* Look for reviews outside of their own page. Page owners can delete negative comments on their posts, but they cannot delete reviews on independent directories.
* Search the page on [FB Page Review](https://fbpagereview.com) to check their rating and feedback.

#### 3. Delivery and Return Policy
* Ask the seller: *"What is your return policy if the product is damaged or does not match?"*
* Authentic shops have clear, written return policies. If a seller gives vague answers or says "no returns under any circumstances," think twice.

#### 4. Opt for Cash on Delivery (COD)
* For your first order with a new seller, always choose Cash on Delivery.
* Pay only after you receive the package and verify that the outer label matches your order. 
* Refuse pages that demand 100% advanced payment for non-customized goods.

#### 5. Verify the Contact Number
* Does the page have a valid phone number listed? Call the number to see if it works.
* Search the phone number on search engines to see if it is associated with any past fraudulent activity.

---

### Final Thoughts
Safe shopping is all about awareness. By spending just a few minutes checking this list, you can protect your hard-earned money. Happy shopping!`,
        category_id: 'safety',
        tags: 'Checklist, Safe Shopping, E-commerce',
        featured_image: '',
        seo_title: 'Safe Online Shopping Checklist for Bangladesh Buyers',
        seo_description: 'Keep your money safe with this step-by-step checklist for buying from Facebook pages. Verify page age, reviews, and payment numbers.',
        status: 'Published',
        is_pinned: 0,
        author_id: 'admin',
        published_at: new Date().toISOString()
      },
      {
        id: 'blog-seed-5',
        title: 'For Businesses: How to Build Trust and Claim Your Page on FB Page Review',
        slug: 'how-businesses-claim-facebook-page-build-trust',
        excerpt: 'Are you an authentic Facebook seller? Learn how to claim your page, display the Verified Seller badge, and manage your public reputation.',
        content: `### Introduction
For authentic e-commerce brands in Bangladesh, customer trust is the most valuable asset. With so many fraudulent pages operating on social media, honest business owners face the challenge of proving their legitimacy to skeptical buyers.

Claiming your business page on [FB Page Review](https://fbpagereview.com) is a free and effective way to showcase your brand\'s reliability, gather verified customer reviews, and separate your business from the scammers.

---

### Why Claim Your Page?

#### 1. Earn the "Verified Seller" Badge
Once our team verifies your business credentials (such as page ownership, trade license, or active shop details), you will receive a Verified Seller badge. This badge is displayed next to your business name on search results, instantly reassuring buyers.

#### 2. Reply to Reviews and Customer Feedback
Claiming your page gives you access to a dedicated Business Dashboard. You can respond to customer reviews, address complaints, and publicly demonstrate that you care about customer satisfaction.

#### 3. Resolve Customer Disputes
If a customer leaves a negative review or reports a dispute, you can interact with them to resolve the issue. Once resolved, the buyer can update their review rating, helping you maintain a high trust score.

---

### Step-by-Step Guide to Claiming Your Page

1. **Search Your Page:** Search for your page name or URL on FB Page Review. If it is already in our directory, click on the profile. If not, you can add it during the claim process.
2. **Click "Claim Business":** On your page profile, click the claim button.
3. **Submit Verification Details:** Provide your business contact number, official email, and optional supporting documents (like page manager screenshot or trade license).
4. **Admin Approval:** Our moderation team will review your submission and approve the claim within 24-48 hours.

Once approved, you will gain full control over your business profile and can start building a rock-solid online reputation.`,
        category_id: 'business',
        tags: 'Business, Trust, Page Verification',
        featured_image: '',
        seo_title: 'How to Claim Your Business Page & Build Customer Trust',
        seo_description: 'Are you an online seller in Bangladesh? Learn how to claim your page on FB Page Review, display the Verified badge, and boost sales.',
        status: 'Published',
        is_pinned: 0,
        author_id: 'admin',
        published_at: new Date().toISOString()
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO BlogPosts (id, title, slug, excerpt, content, category_id, tags, featured_image, seo_title, seo_description, status, is_pinned, author_id, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const blog of seedBlogs) {
      stmt.run(
        blog.id,
        blog.title,
        blog.slug,
        blog.excerpt,
        blog.content,
        blog.category_id,
        blog.tags,
        blog.featured_image,
        blog.seo_title,
        blog.seo_description,
        blog.status,
        blog.is_pinned,
        blog.author_id,
        blog.published_at
      );
    }
    console.log('[Seeding] Successfully seeded 5 high-quality safety articles into BlogPosts.');
  }
} catch (e) {
  console.error('[Seeding] Failed to seed blog posts:', e);
}

export { db };
