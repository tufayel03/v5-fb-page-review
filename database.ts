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

try { db.exec('ALTER TABLE Users ADD COLUMN reset_token TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE Users ADD COLUMN reset_token_expires DATETIME;'); } catch (e) {}

try {
  db.exec('ALTER TABLE Reviews ADD COLUMN updated_at DATETIME;');
} catch (e) {}
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
const countUsers = db.prepare('SELECT COUNT(*) as count FROM Users WHERE role = \'admin\'').get() as { count: number };
if (countUsers.count === 0) {
  const seedUserId = crypto.randomUUID();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fbpagereview.com';
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

export { db };
