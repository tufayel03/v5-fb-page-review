import express from 'express';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './database.js';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import { execSync } from 'child_process';
import * as xlsx from 'xlsx';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function decodeHTMLEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
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

async function optimizeBase64Image(base64Str: string, type: 'profile' | 'proof', id: string) {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;

  const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return base64Str;

  const imageBuffer = Buffer.from(matches[2], 'base64');
  const timestamp = Date.now();
  const filename = `${type}-${id}-${timestamp}.webp`;
  const filepath = path.join(uploadsDir, filename);

  try {
    if (type === 'profile') {
      await sharp(imageBuffer)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(filepath);

      const thumbFilename = `${type}-thumb-${id}-${timestamp}.webp`;
      const thumbFilepath = path.join(uploadsDir, thumbFilename);
      await sharp(imageBuffer)
        .resize(80, 80, { fit: 'cover' })
        .webp({ quality: 70 })
        .toFile(thumbFilepath);
    } else {
      await sharp(imageBuffer)
        .resize(1200, undefined, { withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 80 })
        .toFile(filepath);
    }
    
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Image optimization failed:', err);
    return base64Str;
  }
}
import nodemailer from 'nodemailer';
import { setupFraudEndpoints } from './fraud_endpoints.ts';
import { setupBusinessEndpoints } from './business_endpoints.ts';
import { startExcelImportJob, startGoogleSheetSyncJob } from './importService.js';
import crypto from 'crypto';
import 'dotenv/config';

const upload = multer({ storage: multer.memoryStorage() });

// SECURITY: Refuse to start with weak/default JWT secret
const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET;
  if (!envSecret || envSecret === 'your_jwt_secret_here' || envSecret === 'dev-jwt-secret-key') {
    const generated = crypto.randomBytes(64).toString('hex');
    console.warn(`\n\u26a0\ufe0f  JWT_SECRET not set or is a placeholder. Auto-generated a strong secret for this session.`);
    console.warn(`   For production, add a strong JWT_SECRET to your .env file.\n`);
    return generated;
  }
  return envSecret;
})();

// SECURITY: CRON_SECRET — internal auth token for cron jobs, never exposed in code
const CRON_SECRET = process.env.CRON_SECRET || crypto.randomBytes(32).toString('hex');

// HTML sanitizer to prevent XSS in emails
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// In-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
function rateLimit(windowMs: number, maxRequests: number) {
  return (req: any, res: any, next: any) => {
    const key = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') + ':' + req.path;
    const now = Date.now();
    const record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    return next();
  };
}
// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) rateLimitStore.delete(key);
  }
}, 300000);

// Advanced Database Scraping Protection Firewall (Anti-Scrape / Anti-Bot Shield)
function antiScrapeShield() {
  return (req: any, res: any, next: any) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    // 1. Block Common Scraper Tools & Libraries (zero exceptions for bulk query scrapers)
    const scraperLibraries = [
      'python', 'requests', 'axios', 'got', 'node-fetch', 'postman', 'curl', 'wget', 
      'http.client', 'scrappy', 'selenium', 'puppeteer', 'playwright', 'headless',
      'beautifulsoup', 'urllib', 'httpx', 'scrapy', 'phantomjs', 'zgrab', 'masscan', 
      'nmap', 'sqlmap', 'nikto', 'dirbuster'
    ];
    
    const isBot = scraperLibraries.some(agent => userAgent.includes(agent));
    
    // Whitelist legitimate search engines ONLY for SEO ranking index purposes
    const isAllowedSearchEngine = userAgent.includes('googlebot') || 
                                  userAgent.includes('bingbot') || 
                                  userAgent.includes('duckduckbot') || 
                                  userAgent.includes('yandexbot');
                                  
    if (isBot && !isAllowedSearchEngine) {
      console.warn(`[SECURITY FIREWALL] Blocked automated bot scraper: "${userAgent}" from IP: ${ip} attempting: ${req.url}`);
      return res.status(403).json({ error: 'Access Denied: Automated database scraping and bot requests are strictly prohibited on fbpagereview.com to protect our proprietary data.' });
    }

    // 2. Strict Rate Limiting on public bulk search and directory queries (Max 25 queries per minute)
    const path = req.path;
    if (path.includes('/api/pages/fraud-directory') || path.includes('/api/pages/search') || path.includes('/api/pages/trusted-search')) {
      const key = `${ip}:anti_scrape_dir:${path}`;
      const now = Date.now();
      const record = rateLimitStore.get(key);
      if (!record || now > record.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
      } else {
        record.count++;
        if (record.count > 25) {
          console.warn(`[SECURITY FIREWALL] Query Rate Limit Exceeded by IP: ${ip} on API endpoint: ${path}`);
          return res.status(429).json({ error: 'Rate limit exceeded. Search & Directory listings are restricted to 25 queries per minute to protect our intellectual property. Please try again in 1 minute.' });
        }
      }
    }

    // 3. Strict rate limiting on single page profiles detail extraction (Max 40 detail views per minute)
    if (path.startsWith('/api/pages/') && !path.includes('recent-fraud') && !path.includes('fraud-directory') && !path.includes('search')) {
      const key = `${ip}:anti_scrape_details:${path}`;
      const now = Date.now();
      const record = rateLimitStore.get(key);
      if (!record || now > record.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
      } else {
        record.count++;
        if (record.count > 40) {
          console.warn(`[SECURITY FIREWALL] Profile detail extraction Rate Limit Exceeded by IP: ${ip} on endpoint: ${path}`);
          return res.status(429).json({ error: 'Rate limit exceeded. Profiling detail requests are limited to 40 views per minute. Please try again in 1 minute.' });
        }
      }
    }

    next();
  };
}

async function startServer() {
  const app = express();

  // Transparently sanitize 'failed' profile pictures for frontend
  app.use((req: any, res: any, next: any) => {
    const originalJson = res.json;
    res.json = function (body: any) {
      const sanitize = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }
        const newObj = { ...obj };
        for (const key in newObj) {
          if (key === 'profile_picture' && newObj[key] === 'failed') {
            newObj[key] = null;
          } else {
            newObj[key] = sanitize(newObj[key]);
          }
        }
        return newObj;
      };
      return originalJson.call(this, sanitize(body));
    };
    next();
  });

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Global Hardened Security Firewall (Hackerproof Shield)
  app.disable('x-powered-by'); // Remove powered-by fingerprinting to obscure server technology
  
  app.use((req, res, next) => {
    // 1. Path Traversal & Sensitive Extension/File Prevention Check
    const rawUrl = decodeURIComponent(req.url).toLowerCase();
    if (
      rawUrl.includes('..') || 
      rawUrl.includes('.env') || 
      rawUrl.includes('.sqlite') || 
      rawUrl.includes('.db') || 
      rawUrl.includes('.git') || 
      rawUrl.includes('package.json') ||
      rawUrl.includes('tsconfig.json') ||
      rawUrl.includes('server.ts') ||
      rawUrl.includes('/config') ||
      rawUrl.includes('.sql')
    ) {
      console.warn(`[SECURITY ALERT] Blocked suspicious request to: ${req.url} from IP: ${req.ip}`);
      return res.status(403).json({ error: 'Access Denied: Unallowed request signature.' });
    }

    // 2. Apply Recommended Security Protection Headers (OWASP Compliant)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self' https: data:;");
    
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));

  // Protect all Facebook Pages data endpoints from automated scrapers and high-frequency crawling
  app.use('/api/pages', antiScrapeShield());

  setupFraudEndpoints(app, db);
  setupBusinessEndpoints(app, db);

  // Auth Routes (rate limited: 10 attempts per 15 minutes)
  const authLimiter = rateLimit(15 * 60 * 1000, 10);
  const contactLimiter = rateLimit(15 * 60 * 1000, 5);

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { full_name, username, email, password, is_business } = req.body;
    try {
      // SECURITY: Enforce password strength
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
      const hash = bcrypt.hashSync(password, 10);
      const id = Date.now().toString();
      // SECURITY: Role is ONLY user or owner. Admin accounts are created via database seeder or by existing admins.
      const role = is_business ? 'owner' : 'user';
      
      db.prepare(`INSERT INTO Users (id, full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, full_name, username, email, hash, role);
      
      const createdUser = db.prepare(`SELECT id, full_name, username, email, role, created_at FROM Users WHERE id = ?`).get(id) as any;
      const token = jwt.sign({ id, username, role }, JWT_SECRET, { expiresIn: '7d' });
      
      // Send Welcome Email asynchronously so it does not block registration performance
      const getSetting = (key: string, def: string) => {
        const row = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get(key) as any;
        return row ? row.value : def;
      };

      const host = getSetting('smtp_host', 'mail.privateemail.com');
      const port = parseInt(getSetting('smtp_port', '465') || '465');
      const secure = getSetting('smtp_secure', 'true') === 'true';
      const authUser = getSetting('smtp_user', '');
      const authPass = getSetting('smtp_pass', '');
      const fromEmail = getSetting('system_from_email', 'noreply@fbpagereview.com');
      const fromName = getSetting('system_from_name', 'FB Page Review');

      if (authUser && authPass) {
        // Run in background
        Promise.resolve().then(async () => {
          try {
            const transporter = nodemailer.createTransport({
              host, port, secure,
              auth: { user: authUser, pass: authPass }
            });

            const welcomeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FB Page Review</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      background-color: #ffffff;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header {
      background-color: #0fbc6f;
      padding: 44px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      font-size: 15px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0fbc6f;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #0fbc6f;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Welcome to FB Page Review!</h1>
      </div>
      <div class="content">
        <h2>Hi ${full_name || username},</h2>
        <p>Thanks for choosing <strong>FB Page Review</strong>! We are absolutely thrilled to welcome you to our community of smart consumers and trusted page owners.</p>
        <p>Your account is now ready to use. Start exploring the platform to check trusts scores, read validated community reviews, or listing suspected fraudulent pages to warn others.</p>
        
        <div class="button-container">
          <a href="${req.protocol}://${req.get('host')}/" class="btn">Explore Platform Now</a>
        </div>
        
        <p>Need assistance or have questions? Simply reply to this email, or check the help content on our platform anytime.</p>
        <p>Best regards,<br>The FB Page Review Team</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} FB Page Review. All rights reserved.</p>
        <p>Need support? <a href="${req.protocol}://${req.get('host')}/contact">Contact Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

            await transporter.sendMail({
              from: `"${fromName}" <${fromEmail}>`,
              to: email,
              subject: 'Welcome to FB Page Review',
              html: welcomeHtml
            });
          } catch (mailErr) {
            console.error("Failed to send welcome registration email:", mailErr);
          }
        });
      }

      res.json({ token, user: createdUser });
    } catch(e) {
      res.status(400).json({ error: 'Username or email already exists' });
    }
  });

  app.post('/api/auth/login', authLimiter, (req, res) => {
    const { email_or_username, password } = req.body;
    const user = db.prepare(`SELECT * FROM Users WHERE email = ? OR username = ?`)
      .get(email_or_username, email_or_username) as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, full_name: user.full_name, username: user.username, email: user.email, role: user.role, created_at: user.created_at } });
  });

  app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
    const { email } = req.body;
    const user = db.prepare(`SELECT * FROM Users WHERE email = ?`).get(email) as any;
    
    if (!user) {
      // Return success even if not found to prevent email enumeration
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    
    db.prepare('UPDATE Users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(resetToken, expiresAt, user.id);

    // Fetch SMTP settings
    const getSetting = (key: string, def: string) => {
      const row = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get(key) as any;
      return row ? row.value : def;
    };

    const host = getSetting('smtp_host', 'mail.privateemail.com');
    const port = parseInt(getSetting('smtp_port', '465') || '465');
    const secure = getSetting('smtp_secure', 'true') === 'true';
    const authUser = getSetting('smtp_user', '');
    const authPass = getSetting('smtp_pass', '');
    const fromEmail = getSetting('system_from_email', 'noreply@fbpagereview.com');
    const fromName = getSetting('system_from_name', 'FB Page Review Admin');

    if (!authUser || !authPass) {
      console.error('SMTP not fully configured');
      return res.status(500).json({ error: 'SMTP settings not configured on the server.' });
    }

    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user: authUser, pass: authPass }
    });

    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
    const name = user.full_name || user.username || 'user';

    const resetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      background-color: #ffffff;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
      border: 1px solid #e2e8f0;
    }
    .header {
      background-color: #0fbc6f;
      padding: 44px 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #334155;
      line-height: 1.6;
    }
    .content h2 {
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .content p {
      font-size: 15px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0fbc6f;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
    }
    .alert-box {
      background-color: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      font-size: 13.5px;
      color: #b45309;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #0fbc6f;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Password Reset Request</h1>
      </div>
      <div class="content">
        <h2>Hi ${name},</h2>
        <p>We received a request to reset the password for your account on <strong>FB Page Review</strong>. If you did not initiate this request, you can safely ignore this email.</p>
        
        <div class="alert-box">
          <strong>Important Security Notice:</strong> This reset link is valid for <strong>1 hour</strong> only. After that, you will have to request a new one.
        </div>

        <div class="button-container">
          <a href="${resetLink}" class="btn">Reset Password</a>
        </div>
        
        <p>If you have any issues with the button above, copy and paste the following link into your web browser:</p>
        <p style="word-break: break-all; font-size: 13px; color: #64748b;"><a href="${resetLink}" style="color: #0fbc6f;">${resetLink}</a></p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} FB Page Review. All rights reserved.</p>
        <p>Need support? <a href="${req.protocol}://${req.get('host')}/contact">Contact Support</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: 'Reset Your Password - FB Page Review',
        html: resetHtml
      });
      res.json({ success: true, message: 'Password reset email sent.' });
    } catch (err: any) {
      console.error('Failed to send email:', err);
      res.status(500).json({ error: 'Failed to send reset email.' });
    }
  });

  app.post('/api/auth/reset-password', authLimiter, (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing data' });
    // SECURITY: Enforce password strength on reset too
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    const user = db.prepare('SELECT * FROM Users WHERE reset_token = ? AND reset_token_expires > ?').get(token, new Date().toISOString()) as any;
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE Users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hash, user.id);
    
    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare(`SELECT id, full_name, username, email, role, created_at FROM Users WHERE id = ?`)
        .get(decoded.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      res.json({ user });
    } catch(e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.get('/api/blogs', (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '10'));
      if (limit > 50) limit = 50; // max limit protection
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const sort = req.query.sort as string; // 'recent' or 'oldest'

      let baseQuery = `FROM BlogPosts WHERE status = 'Published'`;
      const queryParams: any[] = [];

      if (search) {
        baseQuery += ` AND (title LIKE ? OR excerpt LIKE ? OR content LIKE ?)`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const totalCount = (db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams) as any).count;
      
      let orderBy = 'ORDER BY is_pinned DESC, published_at DESC, created_at DESC';
      if (sort === 'oldest') {
        orderBy = 'ORDER BY is_pinned DESC, published_at ASC, created_at ASC';
      }

      const blogs = db.prepare(`SELECT id, title, slug, excerpt, featured_image, published_at, created_at, is_pinned ${baseQuery} ${orderBy} LIMIT ? OFFSET ?`)
                      .all(...queryParams, limit, offset);

      res.json({
        blogs,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/blogs/:slug', (req, res) => {
    try {
      const blog = db.prepare("SELECT * FROM BlogPosts WHERE slug = ? AND status = 'Published'").get(req.params.slug);
      if (!blog) return res.status(404).json({ error: 'Not found' });
      res.json(blog);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/public-settings', (req, res) => {
    try {
      const settings = db.prepare('SELECT key_name, value FROM Settings').all() as any[];
      const publicSettings = {};
      const allowedKeys = [
          'site_name', 'site_tagline', 'footer_desc',
          'min_review_length', 'max_review_length',
          'contact_email', 'facebook_page_url',
          'allow_image_proof', 'site_logo',
          'allow_bkash', 'allow_nagad', 'show_publicly', 'mask_numbers',
          'homepage_adsterra_code', 'homepage_adsense_code',
          'profile_sidebar_adsterra_code', 'head_verification_code'
      ];
      settings.forEach(s => {
          if (allowedKeys.includes(s.key_name)) {
              publicSettings[s.key_name] = s.value;
          }
      });
      res.json(publicSettings);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/public/contact', contactLimiter, async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO ContactMessages (id, name, email, subject, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, email, subject, message);

      // Fetch SMTP settings to forward email
      const getSetting = (key: string, def: string) => {
        const row = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get(key) as any;
        return row ? row.value : def;
      };

      const host = getSetting('smtp_host', '');
      const port = parseInt(getSetting('smtp_port', '465') || '465');
      const secure = getSetting('smtp_secure', 'true') === 'true';
      const authUser = getSetting('smtp_user', '');
      const authPass = getSetting('smtp_pass', '');
      const toEmail = getSetting('contact_email', '') || getSetting('system_from_email', '');
      const fromName = getSetting('system_from_name', 'FB Page Review');

      if (authUser && authPass && toEmail) {
        try {
          const transporter = nodemailer.createTransport({
            host, port, secure,
            auth: { user: authUser, pass: authPass }
          });

          await transporter.sendMail({
            from: `"${fromName}" <${authUser}>`, 
            replyTo: email,
            to: toEmail,
            subject: `New Contact Form Message: ${escapeHtml(subject)}`,
            html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
                   <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                   <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
                   <br />
                   <p><strong>Message:</strong></p>
                   <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>`
          });
        } catch (mailErr) {
          console.error("Failed to forward contact email:", mailErr);
        }
      }

      res.json({ success: true, message: "Message received" });
    } catch (e) {
      console.error('Failed to send contact message: ', e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post('/api/track-visit', (req, res) => {
    try {
      const { visitorId, path } = req.body || {};
      if (!visitorId || !path) {
        return res.status(400).json({ error: "Missing tracking metrics" });
      }

      const rawIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ip = String(rawIp).trim();
      const userAgent = req.headers['user-agent'] || '';

      // 1. Exclude localhost / loopbacks
      if (ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost')) {
        return res.json({ success: true, message: "Excluded (Localhost)" });
      }

      // 2. Exclude administrator's active IP
      if (ip.includes('103.92.155.92')) {
        return res.json({ success: true, message: "Excluded (Admin IP)" });
      }

      // 3. Exclude configured dynamic IPs in the database Settings
      try {
        const excludedRow = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('excluded_tracking_ips') as any;
        if (excludedRow && excludedRow.value && excludedRow.value.trim()) {
          const excludedList = excludedRow.value.split(',').map((item: string) => item.trim()).filter(Boolean);
          for (const exc of excludedList) {
            if (ip.includes(exc)) {
              return res.json({ success: true, message: "Excluded (Configured Excluded IP)" });
            }
          }
        }
      } catch (err) {}

      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO VisitorLogs (id, visitor_id, ip_address, user_agent, path)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, visitorId, ip, String(userAgent), String(path));

      res.json({ success: true });
    } catch (e) {
      console.error("Failed to track visit", e);
      res.status(500).json({ error: "Tracking error" });
    }
  });

  // Admin Endpoints
  const requireRoles = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      const token = req.headers.authorization?.split(' ')[1] || req.query.token;
      // SECURITY: CRON_SECRET is a runtime-generated random token, not a hardcoded string
      if (token === CRON_SECRET && CRON_SECRET.length > 20) {
        req.user = { id: 'cron-system-user', role: 'Super Admin' };
        return next();
      }
      if (!token) return res.status(401).json({ error: 'No token' });
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = db.prepare(`SELECT role FROM Users WHERE id = ?`).get(decoded.id) as any;
        
        if (!user) return res.status(403).json({ error: 'Forbidden' });
        
        let userRole = user.role;
        if (userRole === 'admin') userRole = 'Super Admin';
        
        if (!roles.includes(userRole)) return res.status(403).json({ error: 'Forbidden' });
        
        req.user = { id: decoded.id, role: userRole };
        next();
      } catch(e) {
        res.status(401).json({ error: 'Invalid token' });
      }
    };
  };

  const requireSuperAdmin = requireRoles(['Super Admin']);
  const requireAdmin = requireRoles(['Super Admin', 'Admin']);
  const requireModerator = requireRoles(['Super Admin', 'Admin', 'Moderator']);


  app.get('/api/admin/dashboard/overview', requireAdmin, (req, res) => {
    try {
      const { startDate, endDate, days } = req.query as any;
      let resolvedStartDate: string;
      let resolvedEndDate: string = new Date().toISOString().split('T')[0];

      if (startDate && endDate) {
        resolvedStartDate = startDate;
        resolvedEndDate = endDate;
      } else if (days && days !== 'all') {
        const daysLimit = parseInt(days, 10) || 30;
        const start = new Date();
        start.setDate(start.getDate() - daysLimit + 1);
        resolvedStartDate = start.toISOString().split('T')[0];
      } else if (days === 'all') {
        let minDateStr = (db.prepare(`
          SELECT MIN(d) as minDate From (
            SELECT MIN(date(created_at)) as d FROM FacebookPages
            UNION
            SELECT MIN(date(created_at)) as d FROM Reviews
            UNION
            SELECT MIN(date(created_at)) as d FROM Users
            UNION
            SELECT MIN(date(created_at)) as d FROM Claims
            UNION
            SELECT MIN(date(created_at)) as d FROM Disputes
          )
        `).get() as any)?.minDate;
        
        resolvedStartDate = minDateStr || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else {
        const start = new Date();
        start.setDate(start.getDate() - 29);
        resolvedStartDate = start.toISOString().split('T')[0];
      }

      // Query real daily counts in the resolved range for chart and sparklines
      const pagesDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM FacebookPages WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const reviewsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Reviews WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const usersDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Users WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const claimsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Claims WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const disputesDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Disputes WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const fraudReportsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Reviews WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND review_type = 'Fraud Report' GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const fraudPagesDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM FacebookPages WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status_badge LIKE '%Reported as Fraud%' GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const reportedContactsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM ContactNumbers WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status IN ('Reported', 'Suspicious') GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const claimedPagesDaily = db.prepare(`SELECT date(created_at) as date, COUNT(DISTINCT page_id) as count FROM Claims WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND status = 'Approved' GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const paymentMethodsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM ContactNumbers WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) AND type = 'Payment Method' GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      
      // Visitor Stats (Unique visitors and page views)
      const visitorsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(DISTINCT visitor_id) as count FROM VisitorLogs WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];
      const pageviewsDaily = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM VisitorLogs WHERE date(created_at) >= date(?) AND date(created_at) <= date(?) GROUP BY date(created_at)`).all(resolvedStartDate, resolvedEndDate) as any[];

      // Generate all dates sequentially in range
      const filledDates: string[] = [];
      let current = new Date(resolvedStartDate);
      const end = new Date(resolvedEndDate);
      const dayDiff = Math.ceil((end.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
      const step = dayDiff > 180 ? Math.ceil(dayDiff / 180) : 1;

      let maxDays = 500;
      while (current <= end && maxDays-- > 0) {
        filledDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + step);
      }

      // Map daily counts for activity timeline
      const activity_timeseries = filledDates.map(d => ({
        date: d,
        pages: pagesDaily.find(x => x.date === d)?.count || 0,
        reviews: reviewsDaily.find(x => x.date === d)?.count || 0,
        users: usersDaily.find(x => x.date === d)?.count || 0,
        claims: claimsDaily.find(x => x.date === d)?.count || 0,
        disputes: disputesDaily.find(x => x.date === d)?.count || 0,
        fraudReports: fraudReportsDaily.find(x => x.date === d)?.count || 0,
        visitors: visitorsDaily.find(x => x.date === d)?.count || 0,
        pageviews: pageviewsDaily.find(x => x.date === d)?.count || 0
      }));

      // Calculate sums in period
      const sumPages = pagesDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumReviews = reviewsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumUsers = usersDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumClaims = claimsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumDisputes = disputesDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumFraudReports = fraudReportsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumFraudPages = fraudPagesDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumReportedContacts = reportedContactsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumClaimedPages = claimedPagesDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumPaymentMethods = paymentMethodsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumVisitors = visitorsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);
      const sumPageviews = pageviewsDaily.reduce((acc, curr) => acc + (curr.count || 0), 0);

      // Label for selected period
      const getPeriodLabel = (daysVal: string) => {
        if (daysVal === '7') return 'this week';
        if (daysVal === '30') return 'this month';
        if (daysVal === '90') return 'this quarter';
        if (daysVal === 'all') return 'in total history';
        return 'in active period';
      };
      const periodLabel = getPeriodLabel(days || '30');

      const getTrendStr = (sum: number) => {
        if (sum === 0) return 'No trend yet';
        return `+${sum} ${periodLabel}`;
      };

      // Query total of all time
      const valTotalPages = (db.prepare('SELECT COUNT(*) as count FROM FacebookPages').get() as any).count;
      const valTotalReviews = (db.prepare('SELECT COUNT(*) as count FROM Reviews').get() as any).count;
      const valTotalUsers = (db.prepare('SELECT COUNT(*) as count FROM Users').get() as any).count;
      const valTotalFraudPages = (db.prepare("SELECT COUNT(*) as count FROM FacebookPages WHERE status_badge LIKE '%Reported as Fraud%'").get() as any).count;
      const valReportedContacts = (db.prepare("SELECT COUNT(*) as count FROM ContactNumbers WHERE status IN ('Reported', 'Suspicious')").get() as any).count;
      const valClaimedPages = (db.prepare("SELECT COUNT(DISTINCT page_id) as count FROM Claims WHERE status = 'Approved'").get() as any).count;
      const valPaymentMethods = (db.prepare("SELECT COUNT(*) as count FROM ContactNumbers WHERE type = 'Payment Method'").get() as any).count;
      const valTotalFraudReports = (db.prepare("SELECT COUNT(*) as count FROM Reviews WHERE review_type = 'Fraud Report'").get() as any).count;
      const valTotalVisitors = (db.prepare('SELECT COUNT(DISTINCT visitor_id) as count FROM VisitorLogs').get() as any).count;
      const valTotalPageviews = (db.prepare('SELECT COUNT(*) as count FROM VisitorLogs').get() as any).count;

      const attention_stats = {
        pendingReviews: (db.prepare("SELECT COUNT(*) as count FROM Reviews WHERE status = 'Pending'").get() as any).count,
        openDisputes: (db.prepare("SELECT COUNT(*) as count FROM Disputes WHERE status = 'Open'").get() as any).count,
        pendingClaims: (db.prepare("SELECT COUNT(*) as count FROM Claims WHERE status = 'Pending Verification'").get() as any).count,
        pendingHighProfileFraudReports: (db.prepare("SELECT COUNT(*) as count FROM Reviews r JOIN FacebookPages p ON r.page_id = p.id WHERE r.review_type = 'Fraud Report' AND r.status = 'Pending' AND p.require_manual_fraud_approval = 1").get() as any).count
      };

      const platform_statistics = {
        totalPages: {
          value: valTotalPages,
          change: getTrendStr(sumPages),
          hasHistoricalData: sumPages > 0,
          sparkline: filledDates.map(d => ({ date: d, count: pagesDaily.find(x => x.date === d)?.count || 0 }))
        },
        totalReviews: {
          value: valTotalReviews,
          change: getTrendStr(sumReviews),
          hasHistoricalData: sumReviews > 0,
          sparkline: filledDates.map(d => ({ date: d, count: reviewsDaily.find(x => x.date === d)?.count || 0 }))
        },
        totalUsers: {
          value: valTotalUsers,
          change: getTrendStr(sumUsers),
          hasHistoricalData: sumUsers > 0,
          sparkline: filledDates.map(d => ({ date: d, count: usersDaily.find(x => x.date === d)?.count || 0 }))
        },
        totalVisitors: {
          value: valTotalVisitors,
          change: getTrendStr(sumVisitors),
          hasHistoricalData: sumVisitors > 0,
          sparkline: filledDates.map(d => ({ date: d, count: visitorsDaily.find(x => x.date === d)?.count || 0 }))
        },
        totalPageViews: {
          value: valTotalPageviews,
          change: getTrendStr(sumPageviews),
          hasHistoricalData: sumPageviews > 0,
          sparkline: filledDates.map(d => ({ date: d, count: pageviewsDaily.find(x => x.date === d)?.count || 0 }))
        },
        totalFraudPages: {
          value: valTotalFraudPages,
          change: getTrendStr(sumFraudPages),
          hasHistoricalData: sumFraudPages > 0,
          sparkline: filledDates.map(d => ({ date: d, count: fraudPagesDaily.find(x => x.date === d)?.count || 0 }))
        },
        reportedContacts: {
          value: valReportedContacts,
          change: getTrendStr(sumReportedContacts),
          hasHistoricalData: sumReportedContacts > 0,
          sparkline: filledDates.map(d => ({ date: d, count: reportedContactsDaily.find(x => x.date === d)?.count || 0 }))
        },
        claimedPages: {
          value: valClaimedPages,
          change: getTrendStr(sumClaimedPages),
          hasHistoricalData: sumClaimedPages > 0,
          sparkline: filledDates.map(d => ({ date: d, count: claimedPagesDaily.find(x => x.date === d)?.count || 0 }))
        },
        paymentMethods: {
          value: valPaymentMethods,
          change: getTrendStr(sumPaymentMethods),
          hasHistoricalData: sumPaymentMethods > 0,
          sparkline: filledDates.map(d => ({ date: d, count: paymentMethodsDaily.find(x => x.date === d)?.count || 0 }))
        },
        totalFraudReports: {
          value: valTotalFraudReports,
          change: getTrendStr(sumFraudReports),
          hasHistoricalData: sumFraudReports > 0,
          sparkline: filledDates.map(d => ({ date: d, count: fraudReportsDaily.find(x => x.date === d)?.count || 0 }))
        }
      };

      const recent_activity = db.prepare(`
        SELECT l.*, u.full_name as admin_name 
        FROM AdminLogs l 
        LEFT JOIN Users u ON l.admin_id = u.id 
        ORDER BY l.created_at DESC 
        LIMIT 5
      `).all();

      res.json({
        attention_stats,
        activity_timeseries,
        platform_statistics,
        recent_activity,
        date_range: days || '30'
      });
    } catch(e) {
      console.error("Dashboard overview query failed", e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/chart-data', requireAdmin, (req, res) => {
    try {
      const { startDate, endDate, days } = req.query as any;
      let dateFilter = '';
      let queryParams: any[] = [];
      
      if (startDate && endDate) {
        dateFilter = 'WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)';
        queryParams = [startDate, endDate];
      } else {
        // SECURITY: Parameterized query to prevent SQL injection
        const daysLimit = days ? Math.abs(parseInt(days, 10)) || 30 : 30;
        dateFilter = `WHERE date(created_at) >= date('now', '-' || ? || ' days')`;
        queryParams = [daysLimit];
      }

      const reviews = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Reviews ${dateFilter} GROUP BY date(created_at) ORDER BY date(created_at)`).all(...queryParams) as any[];
      const pages = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM FacebookPages ${dateFilter} GROUP BY date(created_at) ORDER BY date(created_at)`).all(...queryParams) as any[];
      const users = db.prepare(`SELECT date(created_at) as date, COUNT(*) as count FROM Users ${dateFilter} GROUP BY date(created_at) ORDER BY date(created_at)`).all(...queryParams) as any[];
      
      const set = new Set([...reviews.map(r=>r.date), ...pages.map(r=>r.date), ...users.map(r=>r.date)]);
      let allDates = Array.from(set).sort();
      let filledDates: string[] = [];

      if (allDates.length > 0) {
        let current = new Date(allDates[0]);
        const end = new Date(allDates[allDates.length - 1]);
        while (current <= end) {
          filledDates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      } else {
        filledDates = [new Date().toISOString().split('T')[0]];
      }
      
      const chartData = filledDates.map(d => ({
        date: d,
        reviews: reviews.find(r => r.date === d)?.count || 0,
        pages: pages.find(r => r.date === d)?.count || 0,
        users: users.find(r => r.date === d)?.count || 0
      }));
      res.json(chartData);
    } catch(e) {
      console.error("chart data error", e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/backup-db', requireAdmin, async (req, res) => {
    try {
      const archiverLib = require("archiver");
      let archive;
      if (archiverLib.ZipArchive) {
        archive = new archiverLib.ZipArchive({ zlib: { level: 9 } });
      } else {
        const archiver = typeof archiverLib === 'function' ? archiverLib : (archiverLib.default || archiverLib);
        archive = archiver('zip', { zlib: { level: 9 } });
      }
      
      res.attachment('website_full_backup.zip');
      archive.pipe(res);
      


      const dbPath = path.join(process.cwd(), 'data.db');
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'data.db' });
      }
      
      const uploadsPath = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsPath)) {
        archive.directory(uploadsPath, 'uploads');
      }
      
      archive.finalize();
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Backups Manager API Endpoints (WordPress style)
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // 1. Get list of backups stored on the server
  app.get('/api/admin/backups', requireAdmin, (req, res) => {
    try {
      if (!fs.existsSync(backupsDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(backupsDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup_') && file.endsWith('.zip'))
        .map(file => {
          const filePath = path.join(backupsDir, file);
          const stats = fs.statSync(filePath);
          let createdAt = stats.mtime;
          const match = file.match(/backup_(.*)\.zip/);
          if (match && match[1]) {
            try {
              const rawTs = match[1];
              const parts = rawTs.split('T');
              if (parts.length === 2) {
                const datePart = parts[0];
                const timePart = parts[1].replace(/-/g, ':');
                const lastColon = timePart.lastIndexOf(':');
                const formattedTime = timePart.substring(0, lastColon) + '.' + timePart.substring(lastColon + 1);
                const parsedDate = new Date(`${datePart}T${formattedTime}`);
                if (!isNaN(parsedDate.getTime())) {
                  createdAt = parsedDate;
                }
              }
            } catch (err) {}
          }
          return {
            filename: file,
            size: stats.size, // bytes
            createdAt: createdAt.toISOString()
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(backupFiles);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  });

  // 2. Trigger creation of a new backup on the server
  app.post('/api/admin/backups', requireAdmin, async (req, res) => {
    try {
      const archiverLib = require("archiver");
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup_${timestamp}.zip`;
      const zipPath = path.join(backupsDir, filename);

      const output = fs.createWriteStream(zipPath);
      
      let archive;
      if (archiverLib.ZipArchive) {
        archive = new archiverLib.ZipArchive({ zlib: { level: 9 } });
      } else {
        const archiver = typeof archiverLib === 'function' ? archiverLib : (archiverLib.default || archiverLib);
        archive = archiver('zip', { zlib: { level: 9 } });
      }

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);

      // Add database
      const dbPath = path.join(process.cwd(), 'data.db');
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'data.db' });
      }

      // Add uploads directory
      const uploadsPath = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsPath)) {
        archive.directory(uploadsPath, 'uploads');
      }

      output.on('close', () => {
        const stats = fs.statSync(zipPath);
        res.json({
          success: true,
          message: 'Backup created successfully',
          backup: {
            filename,
            size: stats.size,
            createdAt: stats.birthtime || stats.mtime
          }
        });
      });

      archive.finalize();
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  // 3. Download a specific backup by filename
  app.get('/api/admin/backups/download/:filename', requireAdmin, (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      const zipPath = path.join(backupsDir, filename);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      res.download(zipPath, filename);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to download backup' });
    }
  });

  // 4. Restore website directly from a backup file stored on the server
  app.post('/api/admin/backups/restore/:filename', requireAdmin, async (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      const zipPath = path.join(backupsDir, filename);
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }

      const extractLib = require("extract-zip");
      const extract = typeof extractLib === 'function' ? extractLib : (extractLib.default || extractLib);
      const os = require("os");
      const destPath = path.join(os.tmpdir(), 'extracted_backup_' + Date.now());

      await extract(zipPath, { dir: destPath });

      // Overwrite database
      const extractedDb = path.join(destPath, 'data.db');
      const currentDbPath = path.join(process.cwd(), 'data.db');
      if (fs.existsSync(extractedDb)) {
        fs.copyFileSync(extractedDb, currentDbPath);
        if (fs.existsSync(currentDbPath + '-wal')) fs.unlinkSync(currentDbPath + '-wal');
        if (fs.existsSync(currentDbPath + '-shm')) fs.unlinkSync(currentDbPath + '-shm');
      }

      // Overwrite uploads folder
      const extractedUploads = path.join(destPath, 'uploads');
      const currentUploads = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(extractedUploads)) {
        if (fs.existsSync(currentUploads)) fs.rmSync(currentUploads, { recursive: true, force: true });
        fs.cpSync(extractedUploads, currentUploads, { recursive: true });
      }

      // Cleanup extraction folder
      fs.rmSync(destPath, { recursive: true, force: true });

      res.json({ success: true, message: 'Website restored successfully from backup. Server is restarting.' });

      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

  // 5. Delete a specific backup file
  app.delete('/api/admin/backups/:filename', requireAdmin, (req, res) => {
    try {
      const filename = req.params.filename;
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }
      const zipPath = path.join(backupsDir, filename);
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      res.json({ success: true, message: 'Backup deleted successfully' });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  });



  const os = require("os");
  const diskUpload = multer({ dest: path.join(process.cwd(), "uploads") });
  
  app.post("/api/admin/restore-db", requireAdmin, diskUpload.single("dbfile"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({error: 'No file uploaded'});

      const zipPath = req.file.path;
      
      if (req.file.originalname.endsWith('.db') || req.file.originalname.endsWith('.sqlite')) {
          // Backward compatibility for standalone db files
          const dbPath = path.join(process.cwd(), 'data.db');
          fs.copyFileSync(zipPath, dbPath);
          if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
          if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      } else {
          const extractLib = require("extract-zip");
          const extract = typeof extractLib === 'function' ? extractLib : (extractLib.default || extractLib);
          const os = require("os");
          const destPath = path.join(os.tmpdir(), 'extracted_backup_' + Date.now());
          
          await extract(zipPath, { dir: destPath });
          
          const extractedDb = path.join(destPath, 'data.db');
          const currentDbPath = path.join(process.cwd(), 'data.db');
          if (fs.existsSync(extractedDb)) {
            fs.copyFileSync(extractedDb, currentDbPath);
            if (fs.existsSync(currentDbPath + '-wal')) fs.unlinkSync(currentDbPath + '-wal');
            if (fs.existsSync(currentDbPath + '-shm')) fs.unlinkSync(currentDbPath + '-shm');
          }
          
          const extractedUploads = path.join(destPath, 'uploads');
          const currentUploads = path.join(process.cwd(), 'uploads');
          if (fs.existsSync(extractedUploads)) {
            if (fs.existsSync(currentUploads)) fs.rmSync(currentUploads, { recursive: true, force: true });
            fs.cpSync(extractedUploads, currentUploads, { recursive: true });
          }
          
          fs.rmSync(destPath, { recursive: true, force: true });
      }
      
      fs.unlinkSync(zipPath); // clean up the uploaded temp file
      
      res.json({ success: true, message: 'Full Website data restored successfully. Server is restarting.' });
      
      setTimeout(() => {
        process.exit(0);
      }, 1000);
      
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Restore failed' });
    }
  });
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
      const totalPages = (db.prepare('SELECT COUNT(*) as count FROM FacebookPages').get() as any).count;
      const totalReviews = (db.prepare('SELECT COUNT(*) as count FROM Reviews').get() as any).count;
      const pendingReviews = (db.prepare("SELECT COUNT(*) as count FROM Reviews WHERE status = 'Pending'").get() as any).count;
      const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM Users').get() as any).count;
      const totalFraudReports = (db.prepare("SELECT COUNT(*) as count FROM Reviews WHERE review_type = 'Fraud Report'").get() as any).count;
      const pendingClaims = (db.prepare("SELECT COUNT(*) as count FROM Claims WHERE status = 'Pending Verification'").get() as any).count;
      const totalClaimedPages = (db.prepare("SELECT COUNT(DISTINCT page_id) as count FROM Claims WHERE status = 'Approved'").get() as any).count;
      const totalFraudPages = (db.prepare("SELECT COUNT(*) as count FROM FacebookPages WHERE status_badge LIKE '%Reported as Fraud%'").get() as any).count;
      const totalPaymentMethods = (db.prepare("SELECT COUNT(*) as count FROM ContactNumbers WHERE type = 'Payment Method'").get() as any).count;
      const openDisputes = (db.prepare("SELECT COUNT(*) as count FROM Disputes WHERE status = 'Open'").get() as any).count;
      const totalContactNumbers = (db.prepare("SELECT COUNT(*) as count FROM ContactNumbers").get() as any).count;
      const reportedContactNumbers = (db.prepare("SELECT COUNT(*) as count FROM ContactNumbers WHERE status IN ('Reported', 'Suspicious')").get() as any).count;
      const pendingHighProfileFraudReports = (db.prepare("SELECT COUNT(*) as count FROM Reviews r JOIN FacebookPages p ON r.page_id = p.id WHERE r.review_type = 'Fraud Report' AND r.status = 'Pending' AND p.require_manual_fraud_approval = 1").get() as any).count;

      
      const totalCategories = (db.prepare("SELECT COUNT(*) as count FROM Categories").get() as any).count;
      const activeCategories = (db.prepare("SELECT COUNT(*) as count FROM Categories WHERE status = 'Active'").get() as any).count;
      
      const totalBlogPosts = (db.prepare("SELECT COUNT(*) as count FROM BlogPosts").get() as any).count;
      const publishedBlogPosts = (db.prepare("SELECT COUNT(*) as count FROM BlogPosts WHERE status = 'Published'").get() as any).count;
      const draftBlogPosts = (db.prepare("SELECT COUNT(*) as count FROM BlogPosts WHERE status = 'Draft'").get() as any).count;
      
      const openAbuseReports = (db.prepare("SELECT COUNT(*) as count FROM AbuseReports WHERE status = 'Open'").get() as any).count;
      const resolvedAbuseReports = (db.prepare("SELECT COUNT(*) as count FROM AbuseReports WHERE status = 'Resolved'").get() as any).count;
      
      const totalImports = (db.prepare("SELECT COUNT(*) as count FROM BulkImports").get() as any).count;
      const failedImports = (db.prepare("SELECT COUNT(*) as count FROM BulkImports WHERE status = 'Failed'").get() as any).count;
      const lastImport = (db.prepare("SELECT MAX(created_at) as last_date FROM BulkImports").get() as any).last_date || null;

      const recentFraudPages = db.prepare(`
        SELECT p.*, COUNT(r.id) as fraud_count 
        FROM FacebookPages p
        JOIN Reviews r ON p.id = r.page_id
        WHERE r.review_type = 'Fraud Report'
        GROUP BY p.id
        ORDER BY fraud_count DESC
        LIMIT 5
      `).all();

      let isCookieConfigured = false;
      let isCookieExpired = false;
      try {
        const cookieRow = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('facebook_scraper_cookies') as any;
        if (cookieRow && cookieRow.value && cookieRow.value.trim()) {
          isCookieConfigured = true;
          const val = cookieRow.value.trim();
          if (val.startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                const xs = parsed.find((c: any) => c.name === 'xs');
                if (xs && xs.expirationDate) {
                  if (Date.now() > xs.expirationDate * 1000) {
                    isCookieExpired = true;
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (err) {}

      res.json({
        totalPages, totalReviews, pendingReviews, totalUsers, totalFraudReports, totalFraudPages, totalPaymentMethods,
        pendingClaims, openDisputes, totalClaimedPages, pendingHighProfileFraudReports,
        totalContactNumbers, reportedContactNumbers,
        totalCategories, activeCategories,
        totalBlogPosts, publishedBlogPosts, draftBlogPosts,
        openAbuseReports, resolvedAbuseReports,
        totalImports, failedImports, lastImport,
        recentFraudPages,
        isCookieConfigured, isCookieExpired
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/check-cookie-status', requireAdmin, async (req, res) => {
    try {
      const cookieRow = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('facebook_scraper_cookies') as any;
      if (!cookieRow || !cookieRow.value || !cookieRow.value.trim()) {
        return res.json({ status: 'none', message: 'No cookie configured yet.' });
      }

      const val = cookieRow.value.trim();
      let scraperCookie = '';
      let isJson = false;
      let parsedJson: any[] = [];
      
      if (val.startsWith('[')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            parsedJson = parsed;
            isJson = true;
            scraperCookie = parsed.map((c: any) => `${c.name}=${c.value}`).join('; ');
          } else {
            scraperCookie = val;
          }
        } catch (jsonErr) {
          scraperCookie = val;
        }
      } else {
        scraperCookie = val;
      }

      // Fast check: Expiration date validation
      if (isJson && parsedJson.length > 0) {
        const xsCookie = parsedJson.find(c => c.name === 'xs');
        
        if (xsCookie && xsCookie.expirationDate) {
          const expMs = xsCookie.expirationDate * 1000;
          if (Date.now() > expMs) {
            return res.json({ 
              status: 'expired', 
              message: `Expired on ${new Date(expMs).toLocaleDateString()}. Please export fresh JSON cookies.` 
            });
          }
        }
      }

      // Deep Live Check via lightweight curl request
      try {
        const { execSync } = require('child_process');
        const html = execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Cookie: ${scraperCookie.replace(/"/g, '\\"')}" --max-time 6 https://mbasic.facebook.com/profile.php`, { encoding: 'utf-8', timeout: 6000 });
        
        if (html.includes("composer") || html.includes("logout") || html.includes("mbasic_logout_button") || html.includes("xc_message")) {
          let userId = 'Unknown';
          if (isJson) {
            const cUser = parsedJson.find(c => c.name === 'c_user');
            if (cUser) userId = cUser.value;
          } else {
            const match = scraperCookie.match(/c_user=(\d+)/);
            if (match) userId = match[1];
          }

          return res.json({ 
            status: 'valid', 
            message: `Active & Healthy! Logged in as User ID: ${userId}` 
          });
        } else if (html.includes("login_form") || html.includes("login_error") || html.includes("checkpoint") || html.length < 500) {
          return res.json({ 
            status: 'expired', 
            message: 'Session has been invalidated or logged out by Facebook. Please paste new active cookies.' 
          });
        } else {
          return res.json({ 
            status: 'unknown', 
            message: 'Could not fully verify session, but connection succeeded. Scrapes might work.' 
          });
        }
      } catch (curlErr: any) {
        console.error('[CookieCheck] Live verification failed:', curlErr.message);
        return res.json({ 
          status: 'valid_offline', 
          message: 'Saved cookie format is correct, but live verification timed out. Bypassing test.' 
        });
      }
    } catch (e: any) {
      res.status(500).json({ error: 'Server error checking cookie status' });
    }
  });

  app.get('/api/admin/pages', requireModerator, (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'all';
      const claimStatus = typeof req.query.claimStatus === 'string' ? req.query.claimStatus.trim() : 'all';
      const minReviews = req.query.minReviews !== undefined && req.query.minReviews !== '' ? Number(req.query.minReviews) : NaN;
      const maxReviews = req.query.maxReviews !== undefined && req.query.maxReviews !== '' ? Number(req.query.maxReviews) : NaN;
      const minFraud = Number(req.query.minFraud);
      const addedBy = typeof req.query.addedBy === 'string' ? req.query.addedBy.trim() : 'all';
      const dateRange = typeof req.query.dateRange === 'string' ? req.query.dateRange.trim() : 'all';
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10)); // max limit protection 100 for admin
      const offset = (page - 1) * limit;

      let sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : 'created_at';
      let sortOrder = typeof req.query.sortOrder === 'string' ? req.query.sortOrder.trim().toUpperCase() : 'DESC';
      if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
        sortOrder = 'DESC';
      }

      const allowedSortColumns = ['created_at', 'total_reviews', 'fraud_report_count', 'current_name'];
      if (!allowedSortColumns.includes(sortBy)) {
        sortBy = 'created_at';
      }

      let whereClauses: string[] = [];
      let params: any[] = [];

      if (search) {
        whereClauses.push('(current_name LIKE ? OR facebook_url LIKE ?)');
        const likePattern = `%${search}%`;
        params.push(likePattern, likePattern);
      }

      if (dateRange !== 'all') {
        if (dateRange === '7days') {
          whereClauses.push("created_at >= datetime('now', '-7 days')");
        } else if (dateRange === '15days') {
          whereClauses.push("created_at >= datetime('now', '-15 days')");
        } else if (dateRange === '30days') {
          whereClauses.push("created_at >= datetime('now', '-30 days')");
        } else if (dateRange === '6months') {
          whereClauses.push("created_at >= datetime('now', '-6 months')");
        } else if (dateRange === 'custom') {
          if (startDate) {
            whereClauses.push("created_at >= ?");
            params.push(startDate + ' 00:00:00');
          }
          if (endDate) {
            whereClauses.push("created_at <= ?");
            params.push(endDate + ' 23:59:59');
          }
        }
      }

      if (status !== 'all') {
        if (status === 'fraud' || status === 'Reported as Fraud') {
          whereClauses.push("status_badge LIKE '%Reported as Fraud%' AND status_badge NOT LIKE 'Old/Dead Page%'");
        } else if (status === 'clean') {
          whereClauses.push("status_badge NOT LIKE '%Reported as Fraud%'");
        } else if (status === 'Old/Dead Page') {
          whereClauses.push("status_badge LIKE 'Old/Dead Page%' AND status_badge NOT LIKE '%Reported as Fraud%'");
        } else if (status === 'Old/Dead Reported Page') {
          whereClauses.push("status_badge LIKE 'Old/Dead Page%' AND status_badge LIKE '%Reported as Fraud%'");
        } else {
          whereClauses.push("(status_badge = ? OR status_badge LIKE ?)");
          params.push(status);
          params.push('%' + status);
        }
      }

      if (claimStatus !== 'all') {
        if (claimStatus === 'claimed') {
          whereClauses.push("claim_status = 'Claimed'");
        } else if (claimStatus === 'unclaimed') {
          whereClauses.push("claim_status = 'Unclaimed'");
        }
      }

      if (!isNaN(minReviews) && minReviews >= 0) {
        whereClauses.push("total_reviews >= ?");
        params.push(minReviews);
      }

      if (!isNaN(maxReviews) && maxReviews >= 0) {
        whereClauses.push("total_reviews <= ?");
        params.push(maxReviews);
      }

      if (!isNaN(minFraud) && minFraud > 0) {
        whereClauses.push("fraud_report_count >= ?");
        params.push(minFraud);
      }

      if (addedBy !== 'all') {
        whereClauses.push("added_by = ?");
        params.push(addedBy);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      if (req.query.allIds === 'true') {
        const allItems = db.prepare(`SELECT id FROM FacebookPages ${whereSQL}`).all(...params) as { id: string }[];
        return res.json({ ids: allItems.map(item => item.id) });
      }

      const countResult = db.prepare(`SELECT COUNT(*) as total FROM FacebookPages ${whereSQL}`).get(...params) as { total: number };
      const total = countResult ? countResult.total : 0;

      const items = db.prepare(`
        SELECT id, current_name, facebook_url, status_badge, created_at, claim_status, total_reviews, fraud_report_count, added_by, profile_picture 
        FROM FacebookPages 
        ${whereSQL} 
        ORDER BY ${sortBy} ${sortOrder} 
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        items,
        total,
        page,
        limit
      });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

function getFacebookPageId(url: string): string | null {
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
  } catch (e) {}
  return null;
}

function getFacebookAboutUrl(url: string): string {
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
  } catch (e) {}
  return url + '/about';
}

function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFKD')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

  app.post('/api/admin/pages/check-redirects', requireModerator, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No page IDs selected.' });
      }

      const placeholders = ids.map(() => '?').join(',');
      const pages = db.prepare(`SELECT * FROM FacebookPages WHERE id IN (${placeholders})`).all(...ids) as any[];

      const results = [];
      const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      for (const page of pages) {
        const url = page.facebook_url;
        const oldPageId = getFacebookPageId(url);
        if (!oldPageId) continue;

        try {
          let resolvedUrl = url;
          let currentUrl = url;
          let redirectCount = 0;
          const maxRedirects = 5;

          while (redirectCount < maxRedirects) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            
            const response = await fetch(currentUrl, {
              redirect: 'manual',
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            const loc = response.headers.get('location');
            if (response.status >= 300 && response.status < 400 && loc) {
              let nextUrl = loc;
              if (loc.startsWith('/')) {
                nextUrl = 'https://www.facebook.com' + loc;
              } else if (!loc.startsWith('http')) {
                nextUrl = 'https://www.facebook.com/' + loc;
              }
              
              const isLoginRedirect = nextUrl.toLowerCase().includes('/login') || 
                                     nextUrl.toLowerCase().includes('/checkpoint') || 
                                     nextUrl.toLowerCase().includes('login.php');
              
              if (isLoginRedirect) {
                try {
                  const parsedLoc = new URL(nextUrl);
                  const nextParam = parsedLoc.searchParams.get('next');
                  if (nextParam && nextParam.includes('facebook.com') && !nextParam.toLowerCase().includes('/login')) {
                    resolvedUrl = nextParam;
                  }
                } catch(e) {}
                break;
              }

              resolvedUrl = nextUrl;
              currentUrl = nextUrl;
              redirectCount++;
            } else {
              break;
            }
          }

          // Fetch the page HTML to get title/metadata
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(resolvedUrl, {
            redirect: 'follow',
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const html = await response.text();

          let canonicalUrl = resolvedUrl;
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
            resolvedUrl = canonicalUrl;
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
            title = decodeHTMLEntities(title);
          }

          const nameBlacklist = ["facebook", "error", "log in", "log in to facebook", "page not found", "broken link", "loading..."];
          let isRoadblocked = !title || 
                                nameBlacklist.includes(title.toLowerCase().trim()) || 
                                html.includes("This content isn't available") ||
                                html.includes("isn't available at the moment");

          if (isRoadblocked) {
            console.log(`[Redirect REST] Page was roadblocked for "${page.current_name}". Fetching sk=about page fallback...`);
            try {
              const fallbackUrl = getFacebookAboutUrl(resolvedUrl);
              const humanHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              };
              const fbAboutRes = await fetch(fallbackUrl, {
                redirect: 'follow',
                headers: humanHeaders,
                signal: controller.signal
              });
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
                  aboutTitle = decodeHTMLEntities(aboutTitle);
                  if (!nameBlacklist.includes(aboutTitle.toLowerCase().trim())) {
                    title = aboutTitle;
                    isRoadblocked = false;
                    console.log(`[Redirect REST] Fallback success! Retrieved name: "${title}"`);
                  }
                }
              }
            } catch (fallbackErr) {
              console.error(`[Redirect REST] Fallback crawling failed for "${page.current_name}":`, fallbackErr);
            }
          }

          let scrapedName = title;
          if (isRoadblocked) {
            scrapedName = page.current_name;
          }

          const newPageId = getFacebookPageId(resolvedUrl);

          const systemKeywords = ["login", "checkpoint", "home", "groups", "pages", "settings", "help", "policies", "profile.php", "business", "privacy"];
          const isSystemPage = resolvedUrl.toLowerCase().includes('/login') || 
                               resolvedUrl.toLowerCase().includes('/checkpoint') ||
                               resolvedUrl.toLowerCase().includes('login.php') ||
                               (newPageId && systemKeywords.includes(newPageId.toLowerCase()));

          const usernameChanged = newPageId && 
                                  !isSystemPage && 
                                  oldPageId.toLowerCase() !== newPageId.toLowerCase();
          
          const nameChanged = scrapedName && 
                              !isRoadblocked && 
                              !isSystemPage &&
                              normalizeName(page.current_name) !== normalizeName(scrapedName);

          if (usernameChanged || nameChanged) {
            results.push({
              id: page.id,
              originalName: page.current_name,
              originalUrl: page.facebook_url,
              scrapedName: scrapedName,
              scrapedUrl: resolvedUrl,
              usernameChanged,
              nameChanged,
              changeType: usernameChanged && nameChanged ? "BOTH CHANGED" : (usernameChanged ? "URL CHANGED" : "NAME CHANGED")
            });
          }
        } catch (e) {
          console.error(`Failed to check redirect for page ${url}:`, e);
        }
      }

      res.json({ success: true, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/admin/pages/apply-redirects', requireModerator, async (req, res) => {
    try {
      const { redirects } = req.body;
      if (!Array.isArray(redirects) || redirects.length === 0) {
        return res.status(400).json({ error: 'No redirects provided.' });
      }

      for (const item of redirects) {
        const { id, scrapedName, scrapedUrl } = item;

        const oldPage = db.prepare('SELECT * FROM FacebookPages WHERE id = ?').get(id) as any;
        if (!oldPage) continue;

        let newStatus = 'Old/Dead Page';
        if (oldPage.status_badge && oldPage.status_badge !== 'Old/Dead Page') {
          if (!oldPage.status_badge.startsWith('Old/Dead Page - ')) {
            newStatus = `Old/Dead Page - ${oldPage.status_badge}`;
          } else {
            newStatus = oldPage.status_badge;
          }
        }

        const existingNewPage = db.prepare('SELECT id FROM FacebookPages WHERE facebook_url = ?').get(scrapedUrl) as any;
        if (existingNewPage) {
          db.prepare("UPDATE FacebookPages SET status_badge = ? WHERE id = ?").run(newStatus, id);
          continue;
        }

        db.prepare("UPDATE FacebookPages SET status_badge = ? WHERE id = ?").run(newStatus, id);

        const newPageId = crypto.randomUUID();
        const newDetails = `Old Page Name: ${oldPage.current_name}\nOld Page URL: ${oldPage.facebook_url}\n\nOriginal Details:\n${oldPage.page_details || ''}`;
        
        db.prepare(`
          INSERT INTO FacebookPages (
            id, current_name, facebook_url, contact_number, extra_contacts, 
            payment_methods, page_details, status_badge, trust_score, 
            is_fraud_listed, profile_picture
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newPageId,
          scrapedName,
          scrapedUrl,
          oldPage.contact_number || '',
          oldPage.extra_contacts || '',
          oldPage.payment_methods || '',
          newDetails,
          oldPage.status_badge,
          oldPage.trust_score,
          oldPage.is_fraud_listed,
          ''
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/admin/pages/bulk', requireModerator, (req, res) => {
    try {
      const { ids, action, value } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No page IDs provided' });
      }

      const placeholders = ids.map(() => '?').join(',');

      if (action === 'delete') {
        if ((req as any).user.role !== 'Super Admin' && (req as any).user.role !== 'Admin') {
          return res.status(403).json({ error: 'Only admins can mass-delete pages' });
        }
        db.transaction(() => {
          db.prepare(`DELETE FROM OwnerReplies WHERE review_id IN (SELECT id FROM Reviews WHERE page_id IN (${placeholders}))`).run(...ids);
          db.prepare(`DELETE FROM Disputes WHERE page_id IN (${placeholders})`).run(...ids);
          db.prepare(`DELETE FROM Claims WHERE page_id IN (${placeholders})`).run(...ids);
          db.prepare(`DELETE FROM Reviews WHERE page_id IN (${placeholders})`).run(...ids);
          db.prepare(`DELETE FROM GoogleSheetRowMap WHERE database_record_id IN (${placeholders})`).run(...ids);
          db.prepare(`DELETE FROM FacebookPages WHERE id IN (${placeholders})`).run(...ids);
        })();
        return res.json({ success: true, message: `Successfully deleted ${ids.length} pages` });
      }

      if (action === 'mark_fraud') {
        db.prepare(`
          UPDATE FacebookPages 
          SET status_badge = 'Reported as Fraud', 
              is_fraud_listed = 1, 
              fraud_listed_at = CURRENT_TIMESTAMP, 
              trust_score = -100 
          WHERE id IN (${placeholders})
        `).run(...ids);
        return res.json({ success: true, message: `Successfully marked ${ids.length} pages as fraud` });
      }

      if (action === 'clear_fraud') {
        db.prepare(`
          UPDATE FacebookPages 
          SET status_badge = 'Under Review', 
              is_fraud_listed = 0, 
              fraud_listed_at = NULL, 
              trust_score = 0 
          WHERE id IN (${placeholders})
        `).run(...ids);
        return res.json({ success: true, message: `Successfully cleared fraud for ${ids.length} pages` });
      }

      if (action === 'change_status') {
        if (typeof value !== 'string' || !value) {
          return res.status(400).json({ error: 'No status value provided' });
        }
        db.prepare(`
          UPDATE FacebookPages 
          SET status_badge = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
        `).run(value, ...ids);
        return res.json({ success: true, message: `Successfully changed status of ${ids.length} pages to ${value}` });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

  app.get('/api/admin/chrome-extension/check-page', requireModerator, (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: 'URL query parameter is required' });
      }

      const urlParam = String(url).trim();
      const page = db.prepare('SELECT id, current_name, status_badge, trust_score, contact_number, extra_contacts, payment_methods, page_details FROM FacebookPages WHERE facebook_url = ?').get(urlParam) as any;

      if (page) {
        let contact = page.contact_number || '';
        if (page.extra_contacts) {
          try {
            const extra = JSON.parse(page.extra_contacts);
            if (Array.isArray(extra) && extra.length > 0) {
              contact = [contact, ...extra].filter(Boolean).join(', ');
            }
          } catch(e) {}
        }

        let payments = '';
        if (page.payment_methods) {
          try {
            const pms = JSON.parse(page.payment_methods);
            if (Array.isArray(pms)) {
              payments = pms.join(', ');
            }
          } catch(e) {}
        }

        return res.json({
          exists: true,
          page: {
            id: page.id,
            name: page.current_name,
            status: page.status_badge,
            trustScore: page.trust_score,
            contactNumber: contact,
            paymentMethods: payments,
            pageDetails: page.page_details || ''
          }
        });
      }

      return res.json({ exists: false });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error checking page status: ' + e.message });
    }
  });

  app.post('/api/admin/chrome-extension/add-page', requireModerator, async (req, res) => {
    try {
      const { facebookUrl, name, profilePictureUrl, status, contactNumber, paymentMethods, pageDetails } = req.body;

      if (!facebookUrl) {
        return res.status(400).json({ error: 'Facebook URL is required' });
      }

      const urlParam = facebookUrl.trim();
      const decodedName = decodeHTMLEntities(name || '').trim();
      const nameParam = decodedName || 'Unknown Page';
      const validStatuses = ['Reported as Fraud', 'Verified Marketplace Seller', 'Gold Seller', 'Suspicious', 'Under Review'];
      const statusParam = validStatuses.includes(status) ? status : 'Under Review';
      const isFraud = statusParam === 'Reported as Fraud';
      
      let trustScore = 0;
      if (isFraud) trustScore = -100;
      else if (statusParam === 'Suspicious') trustScore = -50;
      else if (statusParam === 'Verified Marketplace Seller' || statusParam === 'Gold Seller') trustScore = 100;

      // Extract details
      const pmList = paymentMethods ? String(paymentMethods).split(',').map(s => s.toLowerCase().trim()).filter(Boolean) : [];
      const contactList = contactNumber ? String(contactNumber).split(',').map(s => s.toLowerCase().trim()).filter(Boolean) : [];
      let mainContact = '';
      let extraContacts: string[] = [];
      if (contactList.length > 0) {
        mainContact = contactList[0];
        extraContacts = contactList.slice(1);
      }

      // Check if page already exists
      const exists = db.prepare('SELECT id, current_name, profile_picture FROM FacebookPages WHERE facebook_url = ? OR current_name = ?').get(urlParam, nameParam) as any;

      // Helper function to download and optimize profile picture
      const downloadAndOptimize = async (imgUrl: string, pId: string) => {
        try {
          const imgRes = await fetch(imgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
          });
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const timestamp = Date.now();
            const filename = `profile-${pId}-${timestamp}.webp`;
            const filepath = path.join(uploadsDir, filename);

            await sharp(buffer)
              .resize(300, 300, { fit: 'cover' })
              .webp({ quality: 80 })
              .toFile(filepath);

            const thumbFilename = `profile-thumb-${pId}-${timestamp}.webp`;
            const thumbFilepath = path.join(uploadsDir, thumbFilename);
            await sharp(buffer)
              .resize(80, 80, { fit: 'cover' })
              .webp({ quality: 70 })
              .toFile(thumbFilepath);

            return `/uploads/${filename}`;
          }
        } catch (imgErr) {
          console.error('[Chrome Extension] Profile picture optimization failed:', imgErr);
        }
        return null;
      };

      if (exists) {
        const pageId = exists.id;
        let profilePicPath = exists.profile_picture;

        // If the profile picture is missing or failed, and the extension provided a new one, download/optimize it!
        if ((!profilePicPath || profilePicPath === 'failed') && profilePictureUrl) {
          const optPic = await downloadAndOptimize(profilePictureUrl, pageId);
          if (optPic) profilePicPath = optPic;
        }

        // Update the existing page
        db.prepare(`
          UPDATE FacebookPages 
          SET current_name = COALESCE(?, current_name),
              facebook_url = COALESCE(?, facebook_url),
              status_badge = ?,
              trust_score = ?,
              is_fraud_listed = ?,
              fraud_listed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE fraud_listed_at END,
              contact_number = COALESCE(?, contact_number),
              extra_contacts = COALESCE(?, extra_contacts),
              payment_methods = COALESCE(?, payment_methods),
              page_details = COALESCE(?, page_details),
              profile_picture = ?
          WHERE id = ?
        `).run(
          nameParam === 'Unknown Page' ? null : nameParam,
          urlParam,
          statusParam,
          trustScore,
          isFraud ? 1 : 0,
          isFraud ? 1 : 0,
          mainContact || null,
          extraContacts.length ? JSON.stringify(extraContacts) : null,
          pmList.length ? JSON.stringify(pmList) : null,
          pageDetails || null,
          profilePicPath,
          pageId
        );

        // Sync contact/payment numbers into ContactNumbers table
        const pm = pmList.length ? pmList.join(',') : (paymentMethods || null);
        const cn = mainContact || null;
        upsertPageNumbers(pageId, cn, pm);

        return res.json({ success: true, message: 'Page details updated successfully!', id: pageId });
      }

      // Completely new page
      const pageId = Date.now().toString() + Math.floor(Math.random() * 1000);
      let profilePicPath = null;
      if (profilePictureUrl) {
        profilePicPath = await downloadAndOptimize(profilePictureUrl, pageId);
      }

      db.prepare(`
        INSERT INTO FacebookPages (
          id, current_name, facebook_url, contact_number, extra_contacts, payment_methods, page_details, status_badge, trust_score, is_fraud_listed, added_by, profile_picture
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?)
      `).run(
        pageId,
        nameParam,
        urlParam,
        mainContact || null,
        extraContacts.length ? JSON.stringify(extraContacts) : null,
        pmList.length ? JSON.stringify(pmList) : null,
        pageDetails || null,
        statusParam,
        trustScore,
        isFraud ? 1 : 0,
        profilePicPath
      );

      // Sync contact/payment numbers into ContactNumbers table
      const pmStr = pmList.length ? pmList.join(',') : null;
      upsertPageNumbers(pageId, mainContact || null, pmStr);

      return res.json({ success: true, message: 'Page successfully added to database!', id: pageId });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error adding page: ' + e.message });
    }
  });

  app.get('/api/admin/pages/sync-pictures-progress', requireModerator, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    let clientConnected = true;
    const safeWrite = (data: string) => {
      if (!clientConnected) return;
      try {
        res.write(data);
      } catch (writeErr) {
        clientConnected = false;
        console.log('[Sync] Client disconnected from progress stream. Loop will continue running safely in the background...');
      }
    };

    try {
      let pages = [];
      const idsParam = req.query.ids as string;
      const mode = (req.query.mode as string) || 'sync';

      if (mode === 'update') {
        if (idsParam) {
          const idList = idsParam.split(',').filter(Boolean);
          if (idList.length > 0) {
            const placeholders = idList.map(() => '?').join(',');
            pages = db.prepare(`SELECT id, facebook_url, current_name FROM FacebookPages WHERE id IN (${placeholders})`).all(...idList) as any[];
          }
        }
      } else {
        // mode === 'sync' - only work for listings which have no profile picture
        if (idsParam) {
          const idList = idsParam.split(',').filter(Boolean);
          if (idList.length > 0) {
            const placeholders = idList.map(() => '?').join(',');
            pages = db.prepare(`SELECT id, facebook_url, current_name FROM FacebookPages WHERE id IN (${placeholders}) AND (profile_picture IS NULL OR profile_picture = '' OR profile_picture = 'failed')`).all(...idList) as any[];
          }
        } else {
          pages = db.prepare("SELECT id, facebook_url, current_name FROM FacebookPages WHERE profile_picture IS NULL OR profile_picture = '' OR profile_picture = 'failed'").all() as any[];
        }
      }

      const total = pages.length;
      console.log(`[Sync] Starting sync/update for ${total} pages in "${mode}" mode`);
      if (total === 0) {
        res.write(`data: ${JSON.stringify({ done: true, total: 0, count: 0 })}\n\n`);
        return res.end();
      }
      // Get scraper cookie if saved (supports both raw cookie string and JSON array from Cookie Editor!)
      let scraperCookie = '';
      try {
        const cookieRow = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('facebook_scraper_cookies') as any;
        if (cookieRow && cookieRow.value) {
          const val = cookieRow.value.trim();
          if (val.startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                scraperCookie = parsed.map((c: any) => `${c.name}=${c.value}`).join('; ');
              } else {
                scraperCookie = val;
              }
            } catch (jsonErr) {
              scraperCookie = val;
            }
          } else {
            scraperCookie = val;
          }
        }
      } catch (err) {
        console.error('[Sync] Error reading facebook_scraper_cookies setting:', err);
      }
      const cookieOption = scraperCookie ? `-H "Cookie: ${scraperCookie.replace(/"/g, '\\"')}"` : '';

      let count = 0;
      let current = 0;
      for (const page of pages) {
        current++;
        safeWrite(`data: ${JSON.stringify({ done: false, current, total, pageName: page.current_name, count })}\n\n`);
        
        if (!page.facebook_url || !page.facebook_url.includes('facebook.com')) {
          console.log(`[Sync] Page "${page.current_name}" skipped: Invalid or missing URL "${page.facebook_url}"`);
          if (mode === 'sync') {
            db.prepare("UPDATE FacebookPages SET profile_picture = 'failed' WHERE id = ?").run(page.id);
          }
          continue;
        }
        
        try {
          const urlNoSlash = page.facebook_url.endsWith('/') ? page.facebook_url.slice(0, -1) : page.facebook_url;
          let username = '';
          try {
            const urlObj = new URL(urlNoSlash.startsWith('http') ? urlNoSlash : 'https://' + urlNoSlash);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            if (pathParts[0] === 'pages' || pathParts[0] === 'people') {
              username = pathParts[2] || pathParts[1] || '';
            } else if (pathParts[0] === 'profile.php') {
              username = urlObj.searchParams.get('id') || '';
            } else {
              username = pathParts[0] || '';
            }
          } catch (urlErr) {
            console.error('[Sync] Error parsing username from URL:', urlErr);
          }

          let tempDownloadedFile = '';

          // 1. Page Plugin fetch via curl
          if (username) {
            console.log(`[Sync] Fetching profile picture via public Page Plugin for username: ${username}`);
            const pluginUrl = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent('https://www.facebook.com/' + username)}&_fb_noscript=1`;
            const tempHtmlFile = path.join(uploadsDir, `temp-sync-plugin-html-${Date.now()}.html`);
            try {
              execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempHtmlFile}" "${pluginUrl}"`, { timeout: 8000 });
              if (fs.existsSync(tempHtmlFile) && fs.statSync(tempHtmlFile).size > 0) {
                const pluginHtml = fs.readFileSync(tempHtmlFile, 'utf-8');
                try { fs.unlinkSync(tempHtmlFile); } catch (e) {}

                let extractedPic = '';
                const profilePicMatch = pluginHtml.match(/"profilePicURL"\s*:\s*"([^"]+)"/i);
                if (profilePicMatch && profilePicMatch[1]) {
                  extractedPic = profilePicMatch[1].replace(/\\/g, '');
                }

                if (!extractedPic) {
                  const scontentMatches = pluginHtml.match(/(?:https?:)?\\?\/\\?\/[^\s\"']*(?:scontent|fbcdn)[^\s\"']+/gi) || [];
                  const cleanUrls = scontentMatches.map(url => url.replace(/\\/g, ''));
                  extractedPic = cleanUrls.find(url => url.includes('-1/')) || 
                                 cleanUrls.find(url => url.includes('-6/')) || 
                                 (cleanUrls.length > 0 ? cleanUrls[0] : '');
                }

                if (extractedPic) {
                  extractedPic = decodeHTMLEntities(extractedPic);
                  if (!extractedPic.startsWith('http')) {
                    extractedPic = 'https:' + extractedPic;
                  }
                  console.log(`[Sync] Downloading plugin picture via curl...`);
                  const tempFile = path.join(uploadsDir, `temp-sync-pic-${Date.now()}.jpg`);
                  execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempFile}" "${extractedPic}"`, { timeout: 8000 });
                  if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                    try {
                      // Validate image before marking as success
                      await sharp(fs.readFileSync(tempFile)).metadata();
                      tempDownloadedFile = tempFile;
                    } catch (sharpErr: any) {
                      console.warn('[Sync] Page Plugin picture downloaded but invalid image format:', sharpErr.message);
                      try { fs.unlinkSync(tempFile); } catch (e) {}
                    }
                  }
                }
              }
            } catch (err: any) {
              console.error('[Sync] Page Plugin picture fetch failed:', err.message);
              try { fs.unlinkSync(tempHtmlFile); } catch (e) {}
            }
          }

          // 2. Direct page fetch via curl
          if (!tempDownloadedFile) {
            console.log(`[Sync] Falling back to direct URL fetch via curl for: ${urlNoSlash}`);
            const tempHtmlFile = path.join(uploadsDir, `temp-sync-direct-html-${Date.now()}.html`);
            try {
              execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempHtmlFile}" "${urlNoSlash}"`, { timeout: 8000 });
              if (fs.existsSync(tempHtmlFile) && fs.statSync(tempHtmlFile).size > 0) {
                const html = fs.readFileSync(tempHtmlFile, 'utf-8');
                try { fs.unlinkSync(tempHtmlFile); } catch (e) {}

                let ogImageUrl = '';
                const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                if (ogImageMatch && ogImageMatch[1]) {
                  ogImageUrl = ogImageMatch[1];
                } else {
                  const scontentMatches = html.match(/(?:https?:)?\\?\/\\?\/[^\s\"']*(?:scontent|fbcdn)[^\s\"']+/gi) || [];
                  const cleanUrls = scontentMatches.map(url => url.replace(/\\/g, ''));
                  ogImageUrl = cleanUrls.find(url => url.includes('-1/')) || 
                               cleanUrls.find(url => url.includes('-6/')) || 
                               (cleanUrls.length > 0 ? cleanUrls[0] : '');
                }

                if (ogImageUrl) {
                  if (!ogImageUrl.startsWith('http')) {
                    ogImageUrl = 'https:' + ogImageUrl;
                  }
                  let cleanedImageUrl = ogImageUrl
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#039;/g, "'");

                  console.log(`[Sync] Downloading direct picture via curl...`);
                  const tempFile = path.join(uploadsDir, `temp-sync-pic-${Date.now()}.jpg`);
                  execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempFile}" "${cleanedImageUrl}"`, { timeout: 8000 });
                  if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                    try {
                      await sharp(fs.readFileSync(tempFile)).metadata();
                      tempDownloadedFile = tempFile;
                    } catch (sharpErr: any) {
                      console.warn('[Sync] Direct picture downloaded but invalid image format:', sharpErr.message);
                      try { fs.unlinkSync(tempFile); } catch (e) {}
                    }
                  }
                }
              }
            } catch (err: any) {
              console.error('[Sync] Direct picture fetch failed:', err.message);
              try { fs.unlinkSync(tempHtmlFile); } catch (e) {}
            }
          }

          // 3. Google Translate Proxy fetch via curl
          if (!tempDownloadedFile) {
            console.log(`[Sync] Falling back to Translate proxy via curl...`);
            const tempHtmlFile = path.join(uploadsDir, `temp-sync-proxy-html-${Date.now()}.html`);
            try {
              const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(urlNoSlash)}`;
              execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempHtmlFile}" "${proxyUrl}"`, { timeout: 8000 });
              if (fs.existsSync(tempHtmlFile) && fs.statSync(tempHtmlFile).size > 0) {
                const html = fs.readFileSync(tempHtmlFile, 'utf-8');
                try { fs.unlinkSync(tempHtmlFile); } catch (e) {}

                let ogImageUrl = '';
                const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
                if (ogImageMatch && ogImageMatch[1]) {
                  ogImageUrl = ogImageMatch[1];
                } else {
                  const scontentMatches = html.match(/(?:https?:)?\\?\/\\?\/[^\s\"']*(?:scontent|fbcdn)[^\s\"']+/gi) || [];
                  const cleanUrls = scontentMatches.map(url => url.replace(/\\/g, ''));
                  ogImageUrl = cleanUrls.find(url => url.includes('-1/')) || 
                               cleanUrls.find(url => url.includes('-6/')) || 
                               (cleanUrls.length > 0 ? cleanUrls[0] : '');
                }

                if (ogImageUrl) {
                  if (!ogImageUrl.startsWith('http')) {
                    ogImageUrl = 'https:' + ogImageUrl;
                  }
                  let cleanedImageUrl = ogImageUrl
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#039;/g, "'");

                  console.log(`[Sync] Downloading proxy picture via curl...`);
                  const tempFile = path.join(uploadsDir, `temp-sync-pic-${Date.now()}.jpg`);
                  execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempFile}" "${cleanedImageUrl}"`, { timeout: 8000 });
                  if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                    try {
                      await sharp(fs.readFileSync(tempFile)).metadata();
                      tempDownloadedFile = tempFile;
                    } catch (sharpErr: any) {
                      console.warn('[Sync] Proxy picture downloaded but invalid image format:', sharpErr.message);
                      try { fs.unlinkSync(tempFile); } catch (e) {}
                    }
                  }
                }
              }
            } catch (err: any) {
              console.error('[Sync] Translate proxy picture fetch failed:', err.message);
              try { fs.unlinkSync(tempHtmlFile); } catch (e) {}
            }
          }

          // 4. Graph API Picture Redirect fetch via curl
          if (!tempDownloadedFile && username) {
            console.log(`[Sync] Falling back to public Graph API picture redirect via curl for username: ${username}`);
            const tempFile = path.join(uploadsDir, `temp-sync-graph-${Date.now()}.jpg`);
            try {
              const graphPicUrl = `https://graph.facebook.com/${username}/picture?type=large`;
              execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempFile}" "${graphPicUrl}"`, { timeout: 8000 });
              if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                try {
                  await sharp(fs.readFileSync(tempFile)).metadata();
                  tempDownloadedFile = tempFile;
                } catch (sharpErr: any) {
                  console.warn('[Sync] Graph API picture downloaded but invalid image format:', sharpErr.message);
                  try { fs.unlinkSync(tempFile); } catch (e) {}
                }
              }
            } catch (err: any) {
              console.error('[Sync] Graph API redirect picture fetch failed:', err.message);
              try { fs.unlinkSync(tempFile); } catch (e) {}
            }
          }

          // Process the picture
          if (tempDownloadedFile && fs.existsSync(tempDownloadedFile)) {
            const imageBuffer = fs.readFileSync(tempDownloadedFile);
            const timestamp = Date.now();
            const filename = `profile-${page.id}-${timestamp}.webp`;
            const filepath = path.join(uploadsDir, filename);

            await sharp(imageBuffer)
              .resize(300, 300, { fit: 'cover' })
              .webp({ quality: 80 })
              .toFile(filepath);

            const thumbFilename = `profile-thumb-${page.id}-${timestamp}.webp`;
            const thumbFilepath = path.join(uploadsDir, thumbFilename);
            await sharp(imageBuffer)
              .resize(80, 80, { fit: 'cover' })
              .webp({ quality: 70 })
              .toFile(thumbFilepath);

            // Retrieve old picture to delete before updating the database (ONLY in 'update' mode!)
            if (mode === 'update') {
              try {
                const oldRow = db.prepare('SELECT profile_picture FROM FacebookPages WHERE id = ?').get(page.id) as { profile_picture: string | null } | undefined;
                if (oldRow && oldRow.profile_picture && oldRow.profile_picture.startsWith('/uploads/')) {
                  const oldRelativePath = oldRow.profile_picture;
                  const oldFilepath = path.join(process.cwd(), oldRelativePath);
                  if (fs.existsSync(oldFilepath)) {
                    fs.unlinkSync(oldFilepath);
                    console.log(`[Sync] Deleted old profile picture file: ${oldFilepath}`);
                  }

                  // Also delete old thumbnail
                  const oldFilename = path.basename(oldRelativePath);
                  if (oldFilename.startsWith('profile-')) {
                    const oldThumbFilename = oldFilename.replace(/^profile-/, 'profile-thumb-');
                    const oldThumbFilepath = path.join(uploadsDir, oldThumbFilename);
                    if (fs.existsSync(oldThumbFilepath)) {
                      fs.unlinkSync(oldThumbFilepath);
                      console.log(`[Sync] Deleted old profile thumbnail file: ${oldThumbFilepath}`);
                    }
                  }
                }
              } catch (delErr: any) {
                console.error(`[Sync] Error during old file deletion:`, delErr.message);
              }
            }

            const profile_picture = `/uploads/${filename}`;
            db.prepare('UPDATE FacebookPages SET profile_picture = ? WHERE id = ?').run(profile_picture, page.id);
            count++;
            console.log(`[Sync] SUCCESS: Saved WebP profile picture for page "${page.current_name}"`);
            try { fs.unlinkSync(tempDownloadedFile); } catch (e) {}
          } else {
            console.warn(`[Sync] Skip page "${page.current_name}": Could not fetch profile picture via any fallback channel`);
            if (mode === 'sync') {
              db.prepare("UPDATE FacebookPages SET profile_picture = 'failed' WHERE id = ?").run(page.id);
            }
          }
        } catch (innerErr: any) {
          console.error(`[Sync] ERROR for page "${page.current_name}":`, innerErr);
        }
        
        // Wait 8-15 seconds per page to act like a real user and guarantee we never get blocked!
        const slowDelay = 8000 + Math.random() * 7000;
        console.log(`[Sync] Waiting ${(slowDelay / 1000).toFixed(1)} seconds before crawling next page to ensure absolute safety...`);
        await new Promise(resolve => setTimeout(resolve, slowDelay));
      }
      
      safeWrite(`data: ${JSON.stringify({ done: true, total, count })}\n\n`);
      if (clientConnected) {
        res.end();
      }
    } catch (e: any) {
      console.error('SSE sync failed:', e);
      safeWrite(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      if (clientConnected) {
        res.end();
      }
    }
  });

  app.get('/api/admin/pages/check-redirects-progress', requireModerator, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) {
        res.write(`data: ${JSON.stringify({ error: 'No page IDs selected.' })}\n\n`);
        return res.end();
      }

      const idList = idsParam.split(',').filter(Boolean);
      if (idList.length === 0) {
        res.write(`data: ${JSON.stringify({ error: 'No page IDs selected.' })}\n\n`);
        return res.end();
      }

      const placeholders = idList.map(() => '?').join(',');
      const pages = db.prepare(`SELECT * FROM FacebookPages WHERE id IN (${placeholders})`).all(...idList) as any[];

      const total = pages.length;
      console.log(`[Redirect] Starting background progress scan for ${total} pages`);

      let clientConnected = true;
      const safeWrite = (data: string) => {
        if (!clientConnected) return;
        try {
          res.write(data);
        } catch (writeErr) {
          clientConnected = false;
          console.log('[Redirect] Client disconnected from progress stream. Loop will continue running safely in the background...');
        }
      };

      const humanHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      let current = 0;
      for (const page of pages) {
        current++;
        console.log(`[Redirect] [${current}/${total}] Checking page "${page.current_name}"`);
        
        safeWrite(`data: ${JSON.stringify({ current, total, pageName: page.current_name })}\n\n`);

        // Human-like random delay between page scans (1.5 to 3.5 seconds) to prevent flagging
        const delay = 1500 + Math.floor(Math.random() * 2000);
        await sleep(delay);

        const url = page.facebook_url;
        const oldPageId = getFacebookPageId(url);
        if (!oldPageId) continue;

        try {
          let resolvedUrl = url;
          let currentUrl = url;
          let redirectCount = 0;
          const maxRedirects = 5;

          while (redirectCount < maxRedirects) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            
            const response = await fetch(currentUrl, {
              redirect: 'manual',
              headers: humanHeaders,
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            const loc = response.headers.get('location');
            if (response.status >= 300 && response.status < 400 && loc) {
              let nextUrl = loc;
              if (loc.startsWith('/')) {
                nextUrl = 'https://www.facebook.com' + loc;
              } else if (!loc.startsWith('http')) {
                nextUrl = 'https://www.facebook.com/' + loc;
              }
              
              const isLoginRedirect = nextUrl.toLowerCase().includes('/login') || 
                                     nextUrl.toLowerCase().includes('/checkpoint') || 
                                     nextUrl.toLowerCase().includes('login.php');
              
              if (isLoginRedirect) {
                try {
                  const parsedLoc = new URL(nextUrl);
                  const nextParam = parsedLoc.searchParams.get('next');
                  if (nextParam && nextParam.includes('facebook.com') && !nextParam.toLowerCase().includes('/login')) {
                    resolvedUrl = nextParam;
                  }
                } catch(e) {}
                break;
              }

              resolvedUrl = nextUrl;
              currentUrl = nextUrl;
              redirectCount++;
            } else {
              break;
            }
          }

          // Fetch the page HTML to get title/metadata using humanHeaders
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(resolvedUrl, {
            redirect: 'follow',
            headers: humanHeaders,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const html = await response.text();

          let canonicalUrl = resolvedUrl;
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
            resolvedUrl = canonicalUrl;
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
            title = decodeHTMLEntities(title);
          }

          const nameBlacklist = ["facebook", "error", "log in", "log in to facebook", "page not found", "broken link", "loading..."];
          let isRoadblocked = !title || 
                                nameBlacklist.includes(title.toLowerCase().trim()) || 
                                html.includes("This content isn't available") ||
                                html.includes("isn't available at the moment");

          if (isRoadblocked) {
            console.log(`[Redirect Progress] Profile page roadblocked for "${page.current_name}". Crawling sk=about page fallback...`);
            try {
              const fallbackUrl = getFacebookAboutUrl(resolvedUrl);
              const fbAboutRes = await fetch(fallbackUrl, {
                redirect: 'follow',
                headers: humanHeaders,
                signal: controller.signal
              });
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
                  aboutTitle = decodeHTMLEntities(aboutTitle);
                  if (!nameBlacklist.includes(aboutTitle.toLowerCase().trim())) {
                    title = aboutTitle;
                    isRoadblocked = false;
                    console.log(`[Redirect Progress] Fallback success! Scraped name: "${title}"`);
                  }
                }
              }
            } catch (fallbackErr) {
              console.error(`[Redirect Progress] Fallback about crawl failed for "${page.current_name}":`, fallbackErr);
            }
          }

          let scrapedName = title;
          if (isRoadblocked) {
            scrapedName = page.current_name;
          }

          const newPageId = getFacebookPageId(resolvedUrl);

          const systemKeywords = ["login", "checkpoint", "home", "groups", "pages", "settings", "help", "policies", "profile.php", "business", "privacy"];
          const isSystemPage = resolvedUrl.toLowerCase().includes('/login') || 
                               resolvedUrl.toLowerCase().includes('/checkpoint') ||
                               resolvedUrl.toLowerCase().includes('login.php') ||
                               (newPageId && systemKeywords.includes(newPageId.toLowerCase()));

          const usernameChanged = newPageId && 
                                  !isSystemPage && 
                                  oldPageId.toLowerCase() !== newPageId.toLowerCase();
          
          const nameChanged = scrapedName && 
                              !isRoadblocked && 
                              !isSystemPage &&
                              normalizeName(page.current_name) !== normalizeName(scrapedName);

          if (usernameChanged || nameChanged) {
            const resultItem = {
              id: page.id,
              originalName: page.current_name,
              originalUrl: page.facebook_url,
              scrapedName: scrapedName,
              scrapedUrl: resolvedUrl,
              usernameChanged,
              nameChanged,
              changeType: usernameChanged && nameChanged ? "BOTH CHANGED" : (usernameChanged ? "URL CHANGED" : "NAME CHANGED")
            };
            console.log(`[Redirect] Live Update Found: "${page.current_name}" -> "${scrapedName}"`);
            safeWrite(`data: ${JSON.stringify({ result: resultItem })}\n\n`);
          }
        } catch (innerErr: any) {
          console.error(`[Redirect] Error checking page "${page.current_name}":`, innerErr);
        }
      }

      console.log(`[Redirect] Scanning complete for session`);
      safeWrite(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("[Redirect] Major crash in redirect loop:", err);
      try {
        res.write(`data: ${JSON.stringify({ error: err.message || 'Server error occurred during scan.' })}\n\n`);
      } catch(e){}
      res.end();
    }
  });

  app.get('/api/admin/pages/export', requireAdmin, (req, res) => {
    try {
      let data = [];
      if (req.query.template) {
        data = [{
          'page name': 'Sample Page',
          'page url': 'https://facebook.com/sample',
          'payment method': '01700000000, 01800000000',
          'contact number': '01700000000, 01800000000',
          'page details': 'Sample details about fraud'
        }];
      } else {
        const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean) : [];
        let pages = [];

        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          pages = db.prepare(`SELECT * FROM FacebookPages WHERE id IN (${placeholders})`).all(...ids) as any[];
        } else {
          const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
          const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'all';
          const claimStatus = typeof req.query.claimStatus === 'string' ? req.query.claimStatus.trim() : 'all';
          const minReviews = req.query.minReviews !== undefined && req.query.minReviews !== '' ? Number(req.query.minReviews) : NaN;
          const maxReviews = req.query.maxReviews !== undefined && req.query.maxReviews !== '' ? Number(req.query.maxReviews) : NaN;
          const minFraud = Number(req.query.minFraud);
          const addedBy = typeof req.query.addedBy === 'string' ? req.query.addedBy.trim() : 'all';
          const dateRange = typeof req.query.dateRange === 'string' ? req.query.dateRange.trim() : 'all';
          const startDate = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
          const endDate = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';

          let whereClauses: string[] = [];
          let params: any[] = [];

          if (search) {
            whereClauses.push('(current_name LIKE ? OR facebook_url LIKE ?)');
            const likePattern = `%${search}%`;
            params.push(likePattern, likePattern);
          }

          if (dateRange !== 'all') {
            if (dateRange === '7days') {
              whereClauses.push("created_at >= datetime('now', '-7 days')");
            } else if (dateRange === '15days') {
              whereClauses.push("created_at >= datetime('now', '-15 days')");
            } else if (dateRange === '30days') {
              whereClauses.push("created_at >= datetime('now', '-30 days')");
            } else if (dateRange === '6months') {
              whereClauses.push("created_at >= datetime('now', '-6 months')");
            } else if (dateRange === 'custom') {
              if (startDate) {
                whereClauses.push("created_at >= ?");
                params.push(startDate + ' 00:00:00');
              }
              if (endDate) {
                whereClauses.push("created_at <= ?");
                params.push(endDate + ' 23:59:59');
              }
            }
          }
          if (status !== 'all') {
            if (status === 'fraud' || status === 'Reported as Fraud') {
              whereClauses.push("status_badge LIKE '%Reported as Fraud%' AND status_badge NOT LIKE 'Old/Dead Page%'");
            } else if (status === 'clean') {
              whereClauses.push("status_badge NOT LIKE '%Reported as Fraud%'");
            } else if (status === 'Old/Dead Page') {
              whereClauses.push("status_badge LIKE 'Old/Dead Page%' AND status_badge NOT LIKE '%Reported as Fraud%'");
            } else if (status === 'Old/Dead Reported Page') {
              whereClauses.push("status_badge LIKE 'Old/Dead Page%' AND status_badge LIKE '%Reported as Fraud%'");
            } else {
              whereClauses.push("(status_badge = ? OR status_badge LIKE ?)");
              params.push(status);
              params.push('%' + status);
            }
          }
          if (claimStatus !== 'all') {
            if (claimStatus === 'claimed') {
              whereClauses.push("claim_status = 'Claimed'");
            } else if (claimStatus === 'unclaimed') {
              whereClauses.push("claim_status = 'Unclaimed'");
            }
          }
          if (!isNaN(minReviews) && minReviews >= 0) {
            whereClauses.push("total_reviews >= ?");
            params.push(minReviews);
          }
          if (!isNaN(maxReviews) && maxReviews >= 0) {
            whereClauses.push("total_reviews <= ?");
            params.push(maxReviews);
          }
          if (!isNaN(minFraud) && minFraud > 0) {
            whereClauses.push("fraud_report_count >= ?");
            params.push(minFraud);
          }
          if (addedBy !== 'all') {
            whereClauses.push("added_by = ?");
            params.push(addedBy);
          }

          const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
          pages = db.prepare(`SELECT * FROM FacebookPages ${whereSQL}`).all(...params) as any[];
        }

        const safeParseArray = (str: string | null): string[] => {
          if (!str) return [];
          try {
            if (str.startsWith('[') && str.endsWith(']')) {
              return JSON.parse(str);
            }
          } catch (e) {}
          return str.split(',').map(s => s.trim()).filter(Boolean);
        };
        data = pages.map(p => ({
          'page name': p.current_name,
          'page url': p.facebook_url,
          'payment method': p.payment_methods ? safeParseArray(p.payment_methods).join(', ') : '',
          'contact number': (p.contact_number || '') + (p.extra_contacts ? ', ' + safeParseArray(p.extra_contacts).join(', ') : ''),
          'page details': p.page_details,
          'status badge': p.status_badge || 'Under Review',
          'claim status': p.claim_status || 'Unclaimed',
          'added by': p.added_by || 'admin',
          'created at': p.created_at || ''
        }));
      }
      
      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, req.query.template ? "Template" : "Facebook Pages");
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', `attachment; filename="${req.query.template ? 'template' : 'facebook-pages-export'}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch(e) {
      res.status(500).json({ error: (e as any).message });
    }
  });

  app.post('/api/admin/pages/import', requireAdmin, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const importType = req.body.import_type || 'Facebook Pages';

      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = xlsx.utils.sheet_to_json(worksheet);

      const admin_id = (req as any).user.id;
      const jobId = startExcelImportJob(admin_id, importType, req.file.originalname || 'upload.xlsx', data);

      res.json({ success: true, jobId });
    } catch(e) {
      res.status(500).json({ error: (e as any).message });
    }
  });
  // IMPORTANT: must come before /api/admin/pages/:id to avoid Express swallowing 'by-ids' as an :id param
  app.get('/api/admin/pages/by-ids', requireModerator, (req, res) => {
    try {
      const raw = typeof req.query.ids === 'string' ? req.query.ids : '';
      const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) return res.json([]);
      const placeholders = ids.map(() => '?').join(',');
      const pages = db.prepare(
        `SELECT id, current_name, facebook_url, profile_picture, status_badge FROM FacebookPages WHERE id IN (${placeholders})`
      ).all(...ids);
      res.json(pages);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/pages/:id', requireModerator, (req, res) => {
    try {
      const page = db.prepare('SELECT * FROM FacebookPages WHERE id = ?').get(req.params.id);
      if (!page) return res.status(404).json({ error: 'Page not found' });
      res.json(page);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Helper: sync a page's contact/payment numbers into the ContactNumbers table
  function upsertPageNumbers(pageId: string, contactNumber: string | null, paymentMethods: string | null) {
    const numberEntries: { num: string; type: string }[] = [];

    if (contactNumber && contactNumber.trim()) {
      contactNumber.split(',').map(n => n.trim()).filter(Boolean).forEach(n => {
        numberEntries.push({ num: n, type: 'Contact Number' });
      });
    }
    if (paymentMethods && paymentMethods.trim()) {
      paymentMethods.split(',').map(n => n.trim()).filter(Boolean).forEach(n => {
        numberEntries.push({ num: n, type: 'Payment Number' });
      });
    }

    for (const entry of numberEntries) {
      try {
        const existing = db.prepare('SELECT id, linked_page_ids, linked_page_count FROM ContactNumbers WHERE number = ?').get(entry.num) as any;
        if (existing) {
          let links: string[] = existing.linked_page_ids ? existing.linked_page_ids.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
          if (!links.includes(pageId)) {
            links.push(pageId);
          }
          db.prepare(`UPDATE ContactNumbers SET linked_page_ids = ?, linked_page_count = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
          ).run(links.join(','), links.length, entry.type, existing.id);
        } else {
          db.prepare(`INSERT INTO ContactNumbers (id, number, type, linked_page_ids, linked_page_count, status, added_by) VALUES (?, ?, ?, ?, 1, 'Normal', 'admin')`
          ).run(crypto.randomUUID(), entry.num, entry.type, pageId);
        }
      } catch (e) {
        console.error('[upsertPageNumbers] error for', entry.num, e);
      }
    }
  }

  app.post('/api/admin/pages', requireAdmin, async (req, res) => {
    try {
      const { 
        current_name, facebook_url, category, sub_category, contact_number, status_badge, trust_score,
        extra_contacts, payment_methods, other_urls, website_url, page_details,
        trusted_ranking_score, featured_trusted_seller, admin_trusted_note,
        business_verification_status, business_verification_note
      } = req.body;
      const id = Date.now().toString();
      
      let profile_picture = req.body.profile_picture;
      if (profile_picture) {
        profile_picture = await optimizeBase64Image(profile_picture, 'profile', id);
      }
      
      db.prepare(`
        INSERT INTO FacebookPages (
          id, current_name, facebook_url, category, sub_category, contact_number, status_badge, trust_score,
          extra_contacts, payment_methods, other_urls, profile_picture, website_url, page_details,
          trusted_ranking_score, featured_trusted_seller, admin_trusted_note,
          business_verification_status, business_verification_note, business_verified_by_admin_id, business_verified_at,
          added_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, current_name, facebook_url, category, sub_category || null, contact_number, status_badge || 'Under Review', trust_score || 0,
        extra_contacts || null, payment_methods || null, other_urls || null, profile_picture || null, website_url || null, page_details || null,
        trusted_ranking_score || 0, featured_trusted_seller || 0, admin_trusted_note || null,
        business_verification_status || 'Normal', business_verification_note || null, business_verification_status && business_verification_status !== 'Normal' ? (req as any).user.id : null, business_verification_status && business_verification_status !== 'Normal' ? new Date().toISOString() : null,
        'admin'
      );
      
      if (business_verification_status && business_verification_status !== 'Normal') {
          db.prepare('INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
              crypto.randomUUID(), (req as any).user.id, 'Business Badge Added/Updated', 'FacebookPage', id, `Status set to ${business_verification_status}. Note: ${business_verification_note || ''}`
          );
      }

      // Sync contact/payment numbers into ContactNumbers table
      upsertPageNumbers(id, contact_number, payment_methods);

      res.json({ success: true, id });
    } catch(e) {
      res.status(500).json({ error: (e as any).message });
    }
  });

  app.put('/api/admin/pages/:id', requireModerator, async (req, res) => {
    try {
      const { 
        current_name, facebook_url, category, sub_category, contact_number, status_badge, trust_score,
        extra_contacts, payment_methods, other_urls, website_url, page_details,
        trusted_ranking_score, featured_trusted_seller, admin_trusted_note,
        business_verification_status, business_verification_note, require_manual_fraud_approval,
        is_fraud_listed, fraud_list_reason, fraud_severity, fraud_internal_note
      } = req.body;
      
      let profile_picture = req.body.profile_picture;
      if (profile_picture) {
        profile_picture = await optimizeBase64Image(profile_picture, 'profile', req.params.id);
      } else if (profile_picture === '') {
        // Explicitly deleted/cleared by the admin!
        try {
          const oldPage = db.prepare('SELECT profile_picture FROM FacebookPages WHERE id = ?').get(req.params.id) as any;
          if (oldPage && oldPage.profile_picture) {
            const oldPath = oldPage.profile_picture;
            const fullPath = path.join(__dirname, oldPath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`[Admin] Deleted old profile picture: ${fullPath}`);
            }
            // Also delete thumbnail
            const dir = path.dirname(fullPath);
            const ext = path.extname(fullPath);
            const base = path.basename(fullPath, ext);
            const thumbPath = path.join(dir, `profile-thumb-${base.replace('profile-', '')}${ext}`);
            if (fs.existsSync(thumbPath)) {
              fs.unlinkSync(thumbPath);
              console.log(`[Admin] Deleted old thumbnail: ${thumbPath}`);
            }
          }
        } catch (err: any) {
          console.error('[Admin] Error deleting profile picture file:', err.message);
        }
        profile_picture = null;
      }

      const prevPage = db.prepare('SELECT business_verification_status, is_fraud_listed, fraud_severity, fraud_list_reason FROM FacebookPages WHERE id = ?').get(req.params.id) as any;

      let resolvedIsFraudListed = is_fraud_listed;
      if (status_badge === 'Reported as Fraud' || status_badge === 'Old/Dead Reported Page') {
        resolvedIsFraudListed = 1;
      } else if (status_badge !== undefined) {
        resolvedIsFraudListed = 0;
      }

      if (prevPage) {
        if (resolvedIsFraudListed !== undefined && Number(prevPage.is_fraud_listed || 0) !== Number(resolvedIsFraudListed || 0)) {
          const action = Number(resolvedIsFraudListed) === 1 ? 'Page added to fraud directory' : 'Page removed from fraud directory';
          db.prepare('INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
            crypto.randomUUID(), (req as any).user.id, action, 'FacebookPage', req.params.id, `Page ${current_name || ''} fraud list state changed to ${resolvedIsFraudListed}`
          );
        }
        if (fraud_severity !== undefined && prevPage.fraud_severity !== fraud_severity) {
          db.prepare('INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
            crypto.randomUUID(), (req as any).user.id, 'Fraud severity changed', 'FacebookPage', req.params.id, `Severity updated to ${fraud_severity}`
          );
        }
        if (fraud_list_reason !== undefined && prevPage.fraud_list_reason !== fraud_list_reason) {
          db.prepare('INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
            crypto.randomUUID(), (req as any).user.id, 'Fraud reason updated', 'FacebookPage', req.params.id, `Reason updated to: ${fraud_list_reason}`
          );
        }
      }

      const fraudListedAtVal = resolvedIsFraudListed ? new Date().toISOString() : (prevPage ? prevPage.fraud_listed_at : null);

      if (business_verification_status !== undefined) {
          db.prepare(`
            UPDATE FacebookPages 
            SET current_name = ?, facebook_url = ?, category = ?, sub_category = ?, contact_number = ?, status_badge = ?, trust_score = ?, updated_at = CURRENT_TIMESTAMP,
                extra_contacts = ?, payment_methods = ?, other_urls = ?, profile_picture = ?, website_url = ?, page_details = ?,
                trusted_ranking_score = ?, featured_trusted_seller = ?, admin_trusted_note = ?,
                business_verification_status = ?, business_verification_note = ?, business_verified_by_admin_id = ?, business_verified_at = CURRENT_TIMESTAMP,
                require_manual_fraud_approval = ?, is_fraud_listed = ?, fraud_list_reason = ?, fraud_severity = ?, fraud_internal_note = ?,
                fraud_listed_by_admin_id = ?, fraud_listed_at = ?
            WHERE id = ?
          `).run(
            current_name, facebook_url, category, sub_category || null, contact_number, status_badge, trust_score || 0,
            extra_contacts || null, payment_methods || null, other_urls || null, profile_picture || null, website_url || null, page_details || null,
            trusted_ranking_score || 0, featured_trusted_seller || 0, admin_trusted_note || null,
            business_verification_status, business_verification_note || null, (req as any).user.id,
            require_manual_fraud_approval || 0,
            resolvedIsFraudListed ? 1 : 0, fraud_list_reason || null, fraud_severity || null, fraud_internal_note || null,
            (req as any).user.id, fraudListedAtVal,
            req.params.id
          );

          if (prevPage && prevPage.business_verification_status !== business_verification_status) {
              const action = business_verification_status === 'Normal' ? 'Business Badge Removed' : 'Business Badge Added/Updated';
              db.prepare('INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(
                  crypto.randomUUID(), (req as any).user.id, action, 'FacebookPage', req.params.id, `Status set to ${business_verification_status}. Note: ${business_verification_note || ''}`
              );
          }
      } else {
        db.prepare(`
          UPDATE FacebookPages 
          SET current_name = ?, facebook_url = ?, category = ?, sub_category = ?, contact_number = ?, status_badge = ?, trust_score = ?, updated_at = CURRENT_TIMESTAMP,
              extra_contacts = ?, payment_methods = ?, other_urls = ?, profile_picture = ?, website_url = ?, page_details = ?,
              trusted_ranking_score = ?, featured_trusted_seller = ?, admin_trusted_note = ?, require_manual_fraud_approval = ?,
              is_fraud_listed = ?, fraud_list_reason = ?, fraud_severity = ?, fraud_internal_note = ?,
              fraud_listed_by_admin_id = ?, fraud_listed_at = ?
          WHERE id = ?
        `).run(
          current_name, facebook_url, category, sub_category || null, contact_number, status_badge, trust_score || 0,
          extra_contacts || null, payment_methods || null, other_urls || null, profile_picture || null, website_url || null, page_details || null,
          trusted_ranking_score || 0, featured_trusted_seller || 0, admin_trusted_note || null, require_manual_fraud_approval || 0,
          resolvedIsFraudListed ? 1 : 0, fraud_list_reason || null, fraud_severity || null, fraud_internal_note || null,
          (req as any).user.id, fraudListedAtVal,
          req.params.id
        );
      }
      // Sync contact/payment numbers into ContactNumbers table
      upsertPageNumbers(req.params.id, contact_number, payment_methods);
      res.json({ success: true });
    } catch(e) {
      res.status(500).json({ error: (e as any).message });
    }
  });


  app.post('/api/admin/pages/:id/recalculate-trust', requireAdmin, (req, res) => {
    try {
      // Fetch dynamic settings or use defaults
      const getScore = (key: string, def: number) => {
        try {
          const setting = db.prepare("SELECT value FROM Settings WHERE key_name = ?").get(key) as any;
          return setting ? Number(setting.value) : def;
        } catch(e) {
          return def;
        }
      };

      const score_safe = getScore('score_safe', 5);
      const score_suspicious = getScore('score_suspicious', -10);
      const score_fraud = getScore('score_fraud', -25);
      const score_neutral = 0; // standard neutral
      
      const reviews = db.prepare('SELECT review_type, star_rating FROM Reviews WHERE page_id = ? AND status IN ("Published", "Verified", "Approved")').all(req.params.id) as any[];
      
      let total_score = 100; // base score? Or start from 0 if you want. 
      // Typically trust score starts from a baseline, say 100 or 50. Let's start at 50.
      total_score = 50;

      let totalReviews = reviews.length;
      let sumRatings = 0;
      let safeReviews = 0;
      let neutralReviews = 0;
      let fraudReviews = 0;
      let suspiciousReviews = 0;

      for (const review of reviews) {
        sumRatings += review.star_rating || 5;
        if (review.review_type === 'Safe' || review.review_type === 'Good') { total_score += score_safe; safeReviews++; }
        else if (review.review_type === 'Suspicious' || review.review_type === 'Bad') { total_score += score_suspicious; suspiciousReviews++; }
        else if (review.review_type === 'Fraud Report') { total_score += score_fraud; fraudReviews++; }
        else if (review.review_type === 'Neutral') { total_score += score_neutral; neutralReviews++; }
      }

      let averageRating = totalReviews > 0 ? (sumRatings / totalReviews) : 0;
      let trustedRankingScore = total_score + (averageRating * 5) + (safeReviews * 2) - (fraudReviews * 10);

      // Bound trust score 0 - 100 or unbounded? Unbounded helps see risk depth, but let's bound 0-100 or similar if needed. 
      // The user wants High Risk Fraud (<0), so unbounded.

      // Recalculate status badge based on new score
      let new_badge = "Under Review";
      if (total_score >= 80) new_badge = "Verified Marketplace Seller";
      else if (total_score < 0) new_badge = "Reported as Fraud";
      else if (total_score < 50) new_badge = "Suspicious";

      db.prepare(`
          UPDATE FacebookPages 
          SET trust_score = ?, status_badge = ?, average_rating = ?, total_reviews = ?, safe_review_count = ?, neutral_review_count = ?, suspicious_report_count = ?, fraud_report_count = ?, trusted_ranking_score = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
      `).run(total_score, new_badge, averageRating, totalReviews, safeReviews, neutralReviews, suspiciousReviews, fraudReviews, trustedRankingScore, req.params.id);
      
      res.json({ success: true, trust_score: total_score, status_badge: new_badge });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/trust-score/recalculate-all', requireAdmin, (req, res) => {
    try {
      const getScore = (key: string, def: number) => {
        try {
          const setting = db.prepare("SELECT value FROM Settings WHERE key_name = ?").get(key) as any;
          return setting ? Number(setting.value) : def;
        } catch(e) {
          return def;
        }
      };

      const score_safe = getScore('score_safe', 5);
      const score_suspicious = getScore('score_suspicious', -10);
      const score_fraud = getScore('score_fraud', -25);
      const score_neutral = 0;

      const pages = db.prepare('SELECT id FROM FacebookPages').all() as any[];
      const getReviews = db.prepare('SELECT review_type, star_rating FROM Reviews WHERE page_id = ? AND status IN ("Published", "Verified", "Approved")');
      const updatePage = db.prepare(`
          UPDATE FacebookPages 
          SET trust_score = ?, status_badge = ?, average_rating = ?, total_reviews = ?, safe_review_count = ?, neutral_review_count = ?, suspicious_report_count = ?, fraud_report_count = ?, trusted_ranking_score = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
      `);

      db.transaction(() => {
        for (const page of pages) {
          const reviews = getReviews.all(page.id) as any[];
          let total_score = 50;
          for (const review of reviews) {
            if (review.review_type === 'Safe' || review.review_type === 'Good') total_score += score_safe;
            else if (review.review_type === 'Suspicious' || review.review_type === 'Bad') total_score += score_suspicious;
            else if (review.review_type === 'Fraud Report') total_score += score_fraud;
            else if (review.review_type === 'Neutral') total_score += score_neutral;
          }

          let new_badge = "Under Review";
          if (total_score >= 80) new_badge = "Verified Marketplace Seller";
          else if (total_score < 0) new_badge = "Reported as Fraud";
          else if (total_score < 50) new_badge = "Suspicious";

          // Calculate average rating and total reviews
          let totalReviews = reviews.length;
          let averageRating = 0;
          let safeReviews = 0;
          let neutralReviews = 0;
          let fraudReviews = 0;
          let suspiciousReviews = 0;

          if (totalReviews > 0) {
            averageRating = reviews.reduce((sum, r) => sum + (r.star_rating || 5), 0) / totalReviews;
            safeReviews = reviews.filter(r => r.review_type === 'Safe' || r.review_type === 'Good').length;
            neutralReviews = reviews.filter(r => r.review_type === 'Neutral').length;
            fraudReviews = reviews.filter(r => r.review_type === 'Fraud Report').length;
            suspiciousReviews = reviews.filter(r => r.review_type === 'Suspicious' || r.review_type === 'Bad').length;
          }

          // Very simple trusted ranking score logic: Trust score + (Avg Rating * 5) + (Safe Reviews * 2) - (Fraud * 10)
          let trustedRankingScore = total_score + (averageRating * 5) + (safeReviews * 2) - (fraudReviews * 10);

          updatePage.run(
              total_score, new_badge, averageRating, totalReviews, safeReviews, neutralReviews, suspiciousReviews, fraudReviews, trustedRankingScore, page.id
          );
        }
      })();

      res.json({ success: true, count: pages.length });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/pages/:id', requireAdmin, (req, res) => {
    try {
      db.transaction(() => {
        db.prepare('DELETE FROM OwnerReplies WHERE review_id IN (SELECT id FROM Reviews WHERE page_id = ?)').run(req.params.id);
        db.prepare('DELETE FROM Disputes WHERE page_id = ?').run(req.params.id);
        db.prepare('DELETE FROM Claims WHERE page_id = ?').run(req.params.id);
        db.prepare('DELETE FROM Reviews WHERE page_id = ?').run(req.params.id);
        db.prepare('DELETE FROM GoogleSheetRowMap WHERE database_record_id = ?').run(req.params.id);
        db.prepare('DELETE FROM FacebookPages WHERE id = ?').run(req.params.id);
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/reviews', requireModerator, (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const rating = typeof req.query.rating === 'string' ? req.query.rating.trim() : 'all';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'all';
      const type = typeof req.query.type === 'string' ? req.query.type.trim() : 'all';

      // Dynamic sorting supported here
      const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : 'created_at';
      const sortOrder = typeof req.query.sortOrder === 'string' && req.query.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      let orderBySQL = 'ORDER BY r.created_at DESC';
      if (sortBy === 'created_at') {
        orderBySQL = `ORDER BY r.created_at ${sortOrder}`;
      } else if (sortBy === 'title') {
        orderBySQL = `ORDER BY r.title ${sortOrder}`;
      } else if (sortBy === 'current_name') {
        orderBySQL = `ORDER BY p.current_name ${sortOrder}`;
      } else if (sortBy === 'rating') {
        orderBySQL = `ORDER BY r.star_rating ${sortOrder}`;
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10)); // max limit protection 100
      const offset = (page - 1) * limit;

      let whereClauses: string[] = [];
      let params: any[] = [];

      if (search) {
        whereClauses.push('(r.title LIKE ? OR r.description LIKE ? OR p.current_name LIKE ? OR p.facebook_url LIKE ?)');
        const likePattern = `%${search}%`;
        params.push(likePattern, likePattern, likePattern, likePattern);
      }

      if (rating !== 'all') {
        whereClauses.push('r.star_rating = ?');
        params.push(Number(rating));
      }

      if (status !== 'all') {
        whereClauses.push('r.status = ?');
        params.push(status);
      }

      if (type !== 'all') {
        if (type === 'Good') {
          whereClauses.push("(r.review_type = 'Good' OR r.review_type = 'Safe')");
        } else if (type === 'Bad') {
          whereClauses.push("(r.review_type = 'Bad' OR r.review_type = 'Suspicious')");
        } else {
          whereClauses.push('r.review_type = ?');
          params.push(type);
        }
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const countResult = db.prepare(`
        SELECT COUNT(*) as total 
        FROM Reviews r
        JOIN FacebookPages p ON r.page_id = p.id
        ${whereSQL}
      `).get(...params) as { total: number };
      const total = countResult ? countResult.total : 0;

      // Select compact columns to save payload size and lag
      const items = db.prepare(`
        SELECT r.id, r.page_id, r.user_id, r.review_type, r.star_rating, r.title, r.status, r.created_at, p.current_name, p.facebook_url
        FROM Reviews r
        JOIN FacebookPages p ON r.page_id = p.id
        ${whereSQL}
        ${orderBySQL}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        items,
        total,
        page,
        limit
      });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

  app.post('/api/admin/reviews/bulk', requireModerator, (req, res) => {
    try {
      const { ids, action, value } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No reviews selected' });
      }

      if (action === 'delete') {
        // Enforce requireAdmin level check
        if ((req as any).user.role !== 'Super Admin' && (req as any).user.role !== 'Admin') {
          return res.status(403).json({ error: 'Forbidden: Only Admins can delete reviews.' });
        }

        const deleteAbuse = db.prepare("DELETE FROM AbuseReports WHERE target_type = 'Review' AND target_id = ?");
        const deleteReplies = db.prepare('DELETE FROM OwnerReplies WHERE review_id = ?');
        const deleteDisputes = db.prepare('DELETE FROM Disputes WHERE review_id = ?');
        const deleteReview = db.prepare('DELETE FROM Reviews WHERE id = ?');

        const transaction = db.transaction((reviewIds) => {
          for (const id of reviewIds) {
            deleteAbuse.run(id);
            deleteReplies.run(id);
            deleteDisputes.run(id);
            deleteReview.run(id);
          }
        });
        transaction(ids);

        return res.json({ success: true, message: `Successfully deleted ${ids.length} reviews.` });
      } else if (action === 'status') {
        const updateStatus = db.prepare('UPDATE Reviews SET status = ? WHERE id = ?');
        const transaction = db.transaction((reviewIds, statusVal) => {
          for (const id of reviewIds) {
            updateStatus.run(statusVal, id);
          }
        });
        transaction(ids, value);

        return res.json({ success: true, message: `Successfully updated ${ids.length} reviews to status: ${value}.` });
      } else {
        return res.status(400).json({ error: 'Invalid bulk action specified.' });
      }
    } catch(err: any) {
      console.error("BULK ACTION ERRROR:", err);
      res.status(500).json({ error: 'Server error: ' + err.message });
    }
  });

  app.get('/api/admin/reviews/:id', requireModerator, (req, res) => {
    try {
      const review = db.prepare(`
        SELECT r.*, p.current_name, u.full_name as author_name, u.username as author_username
        FROM Reviews r
        LEFT JOIN FacebookPages p ON r.page_id = p.id
        LEFT JOIN Users u ON r.user_id = u.id
        WHERE r.id = ?
      `).get(req.params.id);
      if (!review) return res.status(404).json({ error: 'Review not found' });
      res.json(review);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/reviews/:id', requireModerator, (req, res) => {
    try {
      const { status, review_type } = req.body;
      db.prepare(`
        UPDATE Reviews SET status = ?, review_type = ? WHERE id = ?
      `).run(status, review_type, req.params.id);
      res.json({ success: true });
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM AbuseReports WHERE target_type = ? AND target_id = ?').run('Review', req.params.id);
      db.prepare('DELETE FROM OwnerReplies WHERE review_id = ?').run(req.params.id);
      db.prepare('DELETE FROM Disputes WHERE review_id = ?').run(req.params.id);
      db.prepare('DELETE FROM Reviews WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch(e) {
      console.error("DELETE REVIEW ERROR:", e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const role = req.query.role as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string === 'asc' ? 'ASC' : 'DESC';

      let baseQuery = `FROM Users WHERE 1=1`;
      const params: any[] = [];

      if (search) {
        baseQuery += ` AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern);
      }

      if (role && role !== 'all') {
        baseQuery += ` AND role = ?`;
        params.push(role);
      }

      const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const totalCount = countResult ? countResult.count : 0;

      const validSortColumns = ['created_at', 'username', 'email', 'role', 'full_name'];
      const finalSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';

      const users = db.prepare(`
        SELECT id, full_name, username, email, role, created_at 
        ${baseQuery} 
        ORDER BY ${finalSortColumn} ${sortOrder} 
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        data: users,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const { email, password, full_name, username, role } = req.body;
      if (role === 'Super Admin' && (req as any).user.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Only Super Admins can create Super Admins' });
      }
      // SECURITY: Enforce password strength
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
      
      const existing = db.prepare('SELECT id FROM Users WHERE email = ?').get(email);
      if(existing) return res.status(400).json({ error: 'Email already exists' });
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();
      const finalUsername = username || email.split('@')[0] + Math.floor(Math.random()*1000);
      // SECURITY: Column is password_hash, not password
      db.prepare('INSERT INTO Users (id, email, password_hash, full_name, username, role) VALUES (?, ?, ?, ?, ?, ?)').run(userId, email, hashedPassword, full_name, finalUsername, role);
      res.json({ success: true, id: userId });
    } catch(e) {
      console.error('Admin create user error:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const { role, password } = req.body;
      const targetUser = db.prepare('SELECT role FROM Users WHERE id = ?').get(req.params.id) as any;
      if (!targetUser) return res.status(404).json({ error: 'Not found' });
      
      let targetRole = targetUser.role === 'admin' ? 'Super Admin' : targetUser.role;

      if (targetRole === 'Super Admin' && (req as any).user.role !== 'Super Admin') {
        return res.status(403).json({ error: 'Cannot modify a Super Admin' });
      }
      if (role === 'Super Admin' && (req as any).user.role !== 'Super Admin') {
         return res.status(403).json({ error: 'Cannot promote to Super Admin' });
      }
      
      if (password && password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.prepare('UPDATE Users SET role = ?, password_hash = ? WHERE id = ?').run(role, hashedPassword, req.params.id);
      } else {
        db.prepare('UPDATE Users SET role = ? WHERE id = ?').run(role, req.params.id);
      }
      res.json({ success: true });
    } catch(e) {
      console.error('Admin update user error:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const targetUser = db.prepare('SELECT role FROM Users WHERE id = ?').get(req.params.id) as any;
      if (!targetUser) return res.status(404).json({ error: 'Not found' });
      let targetRole = targetUser.role === 'admin' ? 'Super Admin' : targetUser.role;
      if (targetRole === 'Super Admin' && (req as any).user.role !== 'Super Admin') {
         return res.status(403).json({ error: 'Cannot delete a Super Admin' });
      }
      db.prepare('DELETE FROM Users WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/pages/:id/fraud', requireAdmin, (req, res) => {
    try {
      db.prepare(`
        UPDATE FacebookPages 
        SET status_badge = 'Reported as Fraud', 
            is_fraud_listed = 1, 
            fraud_listed_at = CURRENT_TIMESTAMP, 
            trust_score = -100 
        WHERE id = ?
      `).run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/pages/:id/clear-fraud', requireAdmin, (req, res) => {
    try {
      db.prepare(`
        UPDATE FacebookPages 
        SET status_badge = 'Under Review', 
            is_fraud_listed = 0, 
            fraud_listed_at = NULL, 
            trust_score = 0 
        WHERE id = ?
      `).run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/contact-numbers', requireAdmin, (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const type = req.query.type as string;
      const account_type = req.query.account_type as string;
      const status = req.query.status as string;
      const addedBy = req.query.addedBy as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string === 'asc' ? 'ASC' : 'DESC';

      let baseQuery = `FROM ContactNumbers WHERE 1=1`;
      const params: any[] = [];

      if (search) {
        baseQuery += ` AND (number LIKE ? OR display_name LIKE ? OR linked_page_ids LIKE ? OR admin_note LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      if (type && type !== 'all') {
        baseQuery += ` AND type = ?`;
        params.push(type);
      }
      if (account_type && account_type !== 'all') {
        baseQuery += ` AND account_type = ?`;
        params.push(account_type);
      }
      if (status && status !== 'all') {
        baseQuery += ` AND status = ?`;
        params.push(status);
      }
      if (addedBy && addedBy !== 'all') {
        baseQuery += ` AND added_by = ?`;
        params.push(addedBy);
      }

      if (req.query.allIds === 'true') {
        const allItems = db.prepare(`SELECT id ${baseQuery}`).all(...params) as { id: string }[];
        return res.json({ ids: allItems.map(item => item.id) });
      }

      const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const totalCount = countResult ? countResult.count : 0;

      const validSortOptions = ['created_at', 'last_reported_at', 'fraud_report_count', 'suspicious_report_count', 'total_mentions', 'linked_page_count'];
      const finalSortColumn = validSortOptions.includes(sortBy) ? sortBy : 'created_at';

      const numbers = db.prepare(`
        SELECT id, number, type, account_type, display_name, status, total_mentions, fraud_report_count, suspicious_report_count, linked_page_ids, first_reported_at, last_reported_at, created_at, updated_at, added_by
        ${baseQuery}
        ORDER BY ${finalSortColumn} ${sortOrder}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        data: numbers,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/contact-numbers/export', requireAdmin, (req, res) => {
    try {
      if (req.query.template === 'true') {
        const templateData = [
          {
            'Number': '01711223344',
            'Type': 'bKash',
            'Account Type': 'Personal',
            'Display Name': 'Sample Store Name',
            'Status': 'Normal',
            'Admin Note': 'Example note about number'
          },
          {
            'Number': '01911223344',
            'Type': 'Nagad',
            'Account Type': 'Agent',
            'Display Name': 'Sample Nagad Shop',
            'Status': 'Suspicious',
            'Admin Note': 'Flagged for investigation'
          }
        ];
        const worksheet = xlsx.utils.json_to_sheet(templateData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Template");
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="contact-numbers-template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        return res.send(buffer);
      }

      const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean) : [];
      let numbers = [];

      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        numbers = db.prepare(`SELECT * FROM ContactNumbers WHERE id IN (${placeholders})`).all(...ids) as any[];
      } else {
        const search = req.query.search as string;
        const type = req.query.type as string;
        const account_type = req.query.account_type as string;
        const status = req.query.status as string;
        const addedBy = req.query.addedBy as string;

        let query = `SELECT * FROM ContactNumbers WHERE 1=1`;
        const params: any[] = [];

        if (search) {
          query += ` AND (number LIKE ? OR display_name LIKE ? OR linked_page_ids LIKE ? OR admin_note LIKE ?)`;
          const pattern = `%${search}%`;
          params.push(pattern, pattern, pattern, pattern);
        }
        if (type && type !== 'all') {
          query += ` AND type = ?`;
          params.push(type);
        }
        if (account_type && account_type !== 'all') {
          query += ` AND account_type = ?`;
          params.push(account_type);
        }
        if (status && status !== 'all') {
          query += ` AND status = ?`;
          params.push(status);
        }
        if (addedBy && addedBy !== 'all') {
          query += ` AND added_by = ?`;
          params.push(addedBy);
        }

        numbers = db.prepare(query).all(...params) as any[];
      }

      const data = numbers.map(n => ({
        'Number': n.number,
        'Type': n.type || 'Unknown',
        'Account Type': n.account_type || 'Unknown',
        'Display Name': n.display_name || '',
        'Status': n.status || 'Normal',
        'Fraud Report Count': n.fraud_report_count ?? 0,
        'Suspicious Report Count': n.suspicious_report_count ?? 0,
        'Total Mentions': n.total_mentions ?? 0,
        'First Reported At': n.first_reported_at || '',
        'Last Reported At': n.last_reported_at || '',
        'Added By': n.added_by || 'admin',
        'Admin Note': n.admin_note || '',
        'Created At': n.created_at || ''
      }));

      const worksheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Contact Numbers");
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename="contact-numbers-export.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.get('/api/admin/contact-numbers/:id', requireAdmin, (req, res) => {
    try {
      const number = db.prepare('SELECT * FROM ContactNumbers WHERE id = ?').get(req.params.id);
      if (!number) return res.status(404).json({ error: 'Not found' });
      res.json(number);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/contact-numbers/:id', requireAdmin, (req, res) => {
    try {
      const { status, admin_note, type, display_name } = req.body;
      db.prepare(`
        UPDATE ContactNumbers SET status = ?, admin_note = ?, type = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(status, admin_note || '', type, display_name, req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/contact-numbers', requireAdmin, (req, res) => {
    try {
      const { number, type, display_name, status, admin_note } = req.body;
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO ContactNumbers (id, number, type, display_name, status, admin_note, added_by)
        VALUES (?, ?, ?, ?, ?, ?, 'admin')
      `).run(id, number, type || 'Contact Number', display_name, status || 'Normal', admin_note || '');
      res.json({ success: true, id });
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Number already exists' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/contact-numbers/bulk', requireAdmin, (req, res) => {
    try {
      const { ids, action, value } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
      }

      if (action === 'delete') {
        const stmt = db.prepare('DELETE FROM ContactNumbers WHERE id = ?');
        const deleteTx = db.transaction((idsList) => {
          for (const id of idsList) stmt.run(id);
        });
        deleteTx(ids);
        return res.json({ success: true, message: `Successfully deleted ${ids.length} contact numbers.` });
      }

      if (action === 'change_status') {
        if (!value) {
          return res.status(400).json({ error: 'No status value provided' });
        }
        const stmt = db.prepare('UPDATE ContactNumbers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        const updateTx = db.transaction((idsList, statusVal) => {
          for (const id of idsList) stmt.run(statusVal, id);
        });
        updateTx(ids, value);
        return res.json({ success: true, message: `Successfully changed status of ${ids.length} contact numbers to ${value}.` });
      }

      res.status(400).json({ error: 'Invalid bulk action' });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Server error' });
    }
  });

  app.delete('/api/admin/contact-numbers/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM ContactNumbers WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/claims', requireModerator, (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const status = req.query.status as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string === 'asc' ? 'ASC' : 'DESC';

      let baseQuery = `FROM Claims c JOIN FacebookPages p ON c.page_id = p.id WHERE 1=1`;
      const params: any[] = [];

      if (search) {
        baseQuery += ` AND (p.current_name LIKE ? OR p.facebook_url LIKE ? OR c.claimer_username LIKE ? OR c.contact_email LIKE ? OR c.contact_phone LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
      }

      if (status && status !== 'all') {
        baseQuery += ` AND c.status = ?`;
        params.push(status);
      }

      const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const totalCount = countResult ? countResult.count : 0;

      let orderClause = 'ORDER BY c.created_at DESC';
      if (sortBy === 'oldest') {
        orderClause = 'ORDER BY c.created_at ASC';
      } else if (sortBy === 'status') {
        orderClause = 'ORDER BY c.status ASC, c.created_at DESC';
      } else if (sortBy === 'created_at') {
        orderClause = `ORDER BY c.created_at ${sortOrder}`;
      }

      const claims = db.prepare(`
        SELECT c.id, c.page_id, c.user_id, c.claimer_username, c.contact_email, c.contact_phone, c.status, c.created_at, p.current_name as page_name, p.facebook_url 
        ${baseQuery}
        ${orderClause}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        data: claims,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/claims/:id', requireModerator, (req, res) => {
    try {
      const claim = db.prepare(`
        SELECT c.*, p.current_name as page_name, p.facebook_url 
        FROM Claims c 
        JOIN FacebookPages p ON c.page_id = p.id 
        WHERE c.id = ?
      `).get(req.params.id);
      if (!claim) return res.status(404).json({ error: 'Not found' });
      res.json(claim);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/claims/:id/approve', requireModerator, (req, res) => {
    try {
      const claim = db.prepare('SELECT * FROM Claims WHERE id = ?').get(req.params.id) as any;
      if (!claim) return res.status(404).json({ error: 'Not found' });
      
      db.transaction(() => {
        db.prepare('DELETE FROM Claims WHERE id = ?').run(req.params.id);
        
        db.prepare('UPDATE FacebookPages SET claim_status = ?, owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('Claimed', claim.user_id, claim.page_id);
          
        db.prepare('UPDATE Users SET role = ? WHERE id = ? AND role = ?').run('page_owner', claim.user_id, 'user');
      })();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/claims/:id/revoke', requireModerator, (req, res) => {
    try {
      const claim = db.prepare('SELECT * FROM Claims WHERE id = ?').get(req.params.id) as any;
      if (!claim) return res.status(404).json({ error: 'Not found' });
      
      db.transaction(() => {
        db.prepare('UPDATE Claims SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('Revoked', req.body.admin_note || '', req.params.id);
        
        db.prepare('UPDATE FacebookPages SET claim_status = ?, owner_id = null, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('Unclaimed', claim.page_id);
      })();
      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/admin/claims/:id/reject', requireModerator, (req, res) => {
    try {
      const newStatus = req.body.status || 'Rejected';
      db.prepare('UPDATE Claims SET status = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newStatus, req.body.admin_note || '', req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/claims/:id', requireAdmin, (req, res) => {
    try {
      const claim = db.prepare('SELECT status FROM Claims WHERE id = ?').get(req.params.id) as any;
      if (!claim) return res.status(404).json({ error: 'Not found' });
      if (claim.status !== 'Rejected') {
        return res.status(400).json({ error: 'Only rejected claims can be deleted' });
      }
      db.prepare('DELETE FROM Claims WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/disputes', requireModerator, (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const status = req.query.status as string;
      const reason = req.query.reason as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string === 'asc' ? 'ASC' : 'DESC';

      let baseQuery = `FROM Disputes d JOIN FacebookPages p ON d.page_id = p.id LEFT JOIN Reviews r ON d.review_id = r.id LEFT JOIN Users u ON d.user_id = u.id WHERE 1=1`;
      const params: any[] = [];

      if (search) {
        baseQuery += ` AND (p.current_name LIKE ? OR r.title LIKE ? OR d.reason LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
      }

      if (status && status !== 'all') {
        baseQuery += ` AND d.status = ?`;
        params.push(status);
      }

      if (reason && reason !== 'all') {
        baseQuery += ` AND d.reason = ?`;
        params.push(reason);
      }

      const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const totalCount = countResult ? countResult.count : 0;

      let orderClause = 'ORDER BY d.created_at DESC';
      if (sortBy === 'oldest') {
        orderClause = 'ORDER BY d.created_at ASC';
      } else if (sortBy === 'status') {
        orderClause = 'ORDER BY d.status ASC, d.created_at DESC';
      } else if (sortBy === 'created_at') {
        orderClause = `ORDER BY d.created_at ${sortOrder}`;
      }

      const disputes = db.prepare(`
        SELECT d.id, d.page_id, d.review_id, d.user_id, d.reason, d.status, d.created_at, p.current_name as page_name, r.title as review_title, u.full_name as submitted_by
        ${baseQuery}
        ${orderClause}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        data: disputes,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/disputes/:id', requireModerator, (req, res) => {
    try {
      const dispute = db.prepare(`
        SELECT d.*, p.current_name as page_name, p.facebook_url, r.title as review_title, r.description as review_description, r.review_type, u.full_name as submitted_by
        FROM Disputes d
        JOIN FacebookPages p ON d.page_id = p.id
        LEFT JOIN Reviews r ON d.review_id = r.id
        LEFT JOIN Users u ON d.user_id = u.id
        WHERE d.id = ?
      `).get(req.params.id);
      if (!dispute) return res.status(404).json({ error: 'Not found' });
      res.json(dispute);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/disputes/:id', requireModerator, (req, res) => {
    try {
      const { status, admin_decision, admin_note } = req.body;
      
      const prevDispute = db.prepare('SELECT review_id, status FROM Disputes WHERE id = ?').get(req.params.id) as any;

      db.prepare(`
        UPDATE Disputes SET status = ?, admin_decision = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(status, admin_decision || '', admin_note || '', req.params.id);

      if (status === 'Approved' && prevDispute && prevDispute.status !== 'Approved') {
        const reviewId = prevDispute.review_id;
        db.prepare('DELETE FROM AbuseReports WHERE target_type = ? AND target_id = ?').run('Review', reviewId);
        db.prepare('DELETE FROM OwnerReplies WHERE review_id = ?').run(reviewId);
        db.prepare('DELETE FROM Reviews WHERE id = ?').run(reviewId);
      }

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/disputes/:id', requireModerator, (req, res) => {
    try {
      const stmt = db.prepare('DELETE FROM Disputes WHERE id = ?');
      const info = stmt.run(req.params.id);
      if (info.changes > 0) {
        res.json({ success: true, message: 'Dispute deleted successfully' });
      } else {
        res.status(404).json({ error: 'Dispute not found' });
      }
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin Categories
  app.get('/api/admin/categories', requireAdmin, (req, res) => {
    try {
      const cats: any = db.prepare('SELECT * FROM Categories ORDER BY display_order ASC, created_at DESC').all();

      const pageCounts = db.prepare(`SELECT category, COUNT(*) as count, SUM(CASE WHEN (featured_trusted_seller = 1 OR trust_score > 70) AND (status_badge IS NULL OR status_badge != 'Reported as Fraud') THEN 1 ELSE 0 END) as trusted_count FROM FacebookPages WHERE status_badge IS NULL OR status_badge != 'Reported as Fraud' GROUP BY category`).all() as any[];
      const countMap = {};
      pageCounts.forEach(pc => { countMap[pc.category] = { c: pc.count, t: pc.trusted_count }; });
      
      const subCounts = db.prepare(`SELECT sub_category, COUNT(*) as count, SUM(CASE WHEN (featured_trusted_seller = 1 OR trust_score > 70) AND (status_badge IS NULL OR status_badge != 'Reported as Fraud') THEN 1 ELSE 0 END) as trusted_count FROM FacebookPages WHERE status_badge IS NULL OR status_badge != 'Reported as Fraud' GROUP BY sub_category`).all() as any[];
      const subCountMap = {};
      subCounts.forEach(sc => { subCountMap[sc.sub_category] = { c: sc.count, t: sc.trusted_count }; });

      const result = cats.map(c => ({
         ...c,
         pages_count: (c.type === 'main' || !c.parent_id) ? (countMap[c.name]?.c || 0) : (subCountMap[c.name]?.c || 0),
         trusted_count: (c.type === 'main' || !c.parent_id) ? (countMap[c.name]?.t || 0) : (subCountMap[c.name]?.t || 0)
      }));

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/categories/:id', requireAdmin, (req, res) => {
    try {
      const cat = db.prepare('SELECT * FROM Categories WHERE id = ?').get(req.params.id);
      if (!cat) return res.status(404).json({ error: 'Not found' });
      res.json(cat);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    try {
      const { name, slug, description, icon, image, seo_title, seo_description, status, featured, display_order, parent_id, type, show_publicly, admin_note } = req.body;
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO Categories (id, name, slug, description, icon, image, seo_title, seo_description, status, featured, display_order, parent_id, type, show_publicly, admin_note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, slug, description || '', icon || '', image || '', seo_title || '', seo_description || '', status || 'Active', featured ? 1 : 0, display_order || 0, parent_id || null, type || 'main', (show_publicly === false || show_publicly === 0) ? 0 : 1, admin_note || '');
      
      db.prepare(`
        INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), (req as any).user.id, 'CREATE_CATEGORY', 'Category', id, `Created ${type === 'main' ? 'main category' : 'subcategory'} "${name}"`);

      res.json({ success: true, id });
    } catch (e: any) {
      console.error('Error creating category:', e);
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Slug must be unique: ' + e.message });
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

  app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
    try {
      const { name, slug, description, icon, image, seo_title, seo_description, status, featured, display_order, parent_id, type, show_publicly, admin_note } = req.body;
      db.prepare(`
        UPDATE Categories SET name=?, slug=?, description=?, icon=?, image=?, seo_title=?, seo_description=?, status=?, featured=?, display_order=?, parent_id=?, type=?, show_publicly=?, admin_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).run(name, slug, description || '', icon || '', image || '', seo_title || '', seo_description || '', status || 'Active', featured ? 1 : 0, display_order || 0, parent_id || null, type || 'main', (show_publicly === false || show_publicly === 0) ? 0 : 1, admin_note || '', req.params.id);
      
      db.prepare(`
        INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), (req as any).user.id, 'UPDATE_CATEGORY', 'Category', req.params.id, `Updated ${type === 'main' ? 'main category' : 'subcategory'} "${name}"`);

      res.json({ success: true });
    } catch (e: any) {
      console.error('Error updating category:', e);
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Slug must be unique: ' + e.message });
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

  app.put('/api/admin/categories/reorder', requireAdmin, (req, res) => {
    try {
      const items = req.body.items as { id: string, display_order: number }[];
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid payload' });
      const stmt = db.prepare('UPDATE Categories SET display_order = ? WHERE id = ?');
      const transaction = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item.display_order, item.id);
        }
      });
      transaction(items);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    try {
      const sub = db.prepare('SELECT name, id FROM Categories WHERE parent_id = ?').get(req.params.id);
      if (sub) {
        return res.status(400).json({ error: 'Cannot delete category with subcategories.' });
      }
      
      const cat = db.prepare('SELECT name, type FROM Categories WHERE id = ?').get(req.params.id) as any;
      
      db.prepare('DELETE FROM Categories WHERE id = ?').run(req.params.id);
      
      if (cat) {
        db.prepare(`
          INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(crypto.randomUUID(), (req as any).user.id, 'DELETE_CATEGORY', 'Category', req.params.id, `Deleted ${cat.type === 'main' ? 'main category' : 'subcategory'} "${cat.name}"`);
      }
      
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin Blogs
  app.get('/api/admin/blogs', requireAdmin, (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const status = req.query.status as string;
      const category_id = req.query.category_id as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string === 'asc' ? 'ASC' : 'DESC';

      let baseQuery = `FROM BlogPosts b LEFT JOIN Categories c ON b.category_id = c.id WHERE 1=1`;
      const params: any[] = [];

      if (search) {
        baseQuery += ` AND (b.title LIKE ? OR b.slug LIKE ? OR b.excerpt LIKE ? OR c.name LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      if (status && status !== 'all') {
        baseQuery += ` AND b.status = ?`;
        params.push(status);
      }

      if (category_id && category_id !== 'all') {
        baseQuery += ` AND b.category_id = ?`;
        params.push(category_id);
      }

      const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const totalCount = countResult ? countResult.count : 0;

      const validSortOptions = ['created_at', 'published_at', 'updated_at', 'title'];
      const finalSortColumn = validSortOptions.includes(sortBy) ? `b.${sortBy}` : 'b.created_at';

      let orderBy = `ORDER BY ${finalSortColumn} ${sortOrder}`;
      if (sortBy === 'newest') {
        orderBy = 'ORDER BY b.created_at DESC';
      } else if (sortBy === 'oldest') {
        orderBy = 'ORDER BY b.created_at ASC';
      }

      const blogs = db.prepare(`
        SELECT b.id, b.title, b.slug, b.excerpt, b.category_id, b.tags, b.featured_image, b.status, b.is_pinned, b.published_at, b.created_at, b.updated_at, c.name as category_name
        ${baseQuery}
        ${orderBy}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        data: blogs,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/blogs/:id', requireAdmin, (req, res) => {
    try {
      const blog = db.prepare('SELECT * FROM BlogPosts WHERE id = ?').get(req.params.id);
      if (!blog) return res.status(404).json({ error: 'Not found' });
      res.json(blog);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/blogs', requireAdmin, (req, res) => {
    try {
      const { title, slug, excerpt, content, category_id, tags, featured_image, seo_title, seo_description, focus_keyword, og_title, og_description, og_image, status, published_at, is_pinned } = req.body;
      const id = crypto.randomUUID();
      const author_id = (req as any).user.id;
      db.prepare(`
        INSERT INTO BlogPosts (id, title, slug, excerpt, content, category_id, tags, featured_image, seo_title, seo_description, focus_keyword, og_title, og_description, og_image, status, author_id, published_at, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, title, slug, excerpt, content, category_id || '', tags || '', featured_image || '', 
        seo_title || '', seo_description || '', focus_keyword || '', og_title || '', og_description || '', og_image || '', 
        status || 'Draft', author_id, published_at || null, is_pinned ? 1 : 0
      );
      res.json({ success: true, id });
    } catch (e: any) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Slug must be unique' });
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/blogs/:id', requireAdmin, (req, res) => {
    try {
      const { title, slug, excerpt, content, category_id, tags, featured_image, seo_title, seo_description, focus_keyword, og_title, og_description, og_image, status, published_at, is_pinned } = req.body;
      db.prepare(`
        UPDATE BlogPosts SET title=?, slug=?, excerpt=?, content=?, category_id=?, tags=?, featured_image=?, seo_title=?, seo_description=?, focus_keyword=?, og_title=?, og_description=?, og_image=?, status=?, published_at=?, is_pinned=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).run(
        title, slug, excerpt, content, category_id || '', tags || '', featured_image || '', 
        seo_title || '', seo_description || '', focus_keyword || '', og_title || '', og_description || '', og_image || '', 
        status || 'Draft', published_at || null, is_pinned ? 1 : 0, req.params.id
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/blogs/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM BlogPosts WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Media Library CRUD Endpoints
  app.get('/api/admin/media-library', requireAdmin, (req, res) => {
    try {
      const media = db.prepare('SELECT * FROM MediaLibrary ORDER BY created_at DESC').all();
      res.json(media);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch media library items' });
    }
  });

  app.post('/api/admin/media-library/upload', requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const fileId = crypto.randomUUID();
      let finalFilepath = path.join(uploadsDir, `media-${fileId}${path.extname(req.file.originalname) || '.webp'}`);
      let url = `/uploads/media-${fileId}${path.extname(req.file.originalname) || '.webp'}`;

      if (req.file.mimetype && req.file.mimetype.startsWith('image/')) {
        const optimizedFilename = `media-${fileId}.webp`;
        finalFilepath = path.join(uploadsDir, optimizedFilename);
        await sharp(req.file.buffer)
          .resize(1200, undefined, { withoutEnlargement: true, fit: 'inside' })
          .webp({ quality: 80 })
          .toFile(finalFilepath);
        url = `/uploads/${optimizedFilename}`;
      } else {
        fs.writeFileSync(finalFilepath, req.file.buffer);
      }
      
      db.prepare(`
        INSERT INTO MediaLibrary (id, url, filename)
        VALUES (?, ?, ?)
      `).run(fileId, url, req.file.originalname);
      
      res.json({ id: fileId, url, filename: req.file.originalname });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to upload file to media library' });
    }
  });

  app.post('/api/admin/media-library/upload-base64', requireAdmin, async (req, res) => {
    try {
      const { base64, filename } = req.body;
      if (!base64 || !base64.startsWith('data:image')) {
        return res.status(400).json({ error: 'Invalid image data' });
      }
      const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid base64 format' });
      }
      const buffer = Buffer.from(matches[2], 'base64');
      const fileId = crypto.randomUUID();
      const optimizedFilename = `media-${fileId}.webp`;
      const finalFilepath = path.join(uploadsDir, optimizedFilename);
      
      await sharp(buffer)
        .resize(1200, undefined, { withoutEnlargement: true, fit: 'inside' })
        .webp({ quality: 80 })
        .toFile(finalFilepath);
      const url = `/uploads/${optimizedFilename}`;
      
      db.prepare(`
        INSERT INTO MediaLibrary (id, url, filename)
        VALUES (?, ?, ?)
      `).run(fileId, url, filename || optimizedFilename);
      
      res.json({ id: fileId, url, filename: filename || optimizedFilename });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to upload base64 image file' });
    }
  });

  app.delete('/api/admin/media-library/:id', requireAdmin, (req, res) => {
    try {
      const media = db.prepare('SELECT * FROM MediaLibrary WHERE id = ?').get(req.params.id) as any;
      if (media) {
        const filepath = path.join(process.cwd(), media.url.substring(1));
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        db.prepare('DELETE FROM MediaLibrary WHERE id = ?').run(req.params.id);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete media library file' });
    }
  });

  // Admin Abuse Reports
  app.get('/api/admin/abuse-reports', requireAdmin, (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 100) limit = 100;
      const offset = (page - 1) * limit;

      const search = req.query.search as string;
      const status = req.query.status as string;
      const target_type = req.query.target_type as string;
      const report_type = req.query.report_type as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = req.query.sortOrder as string === 'asc' ? 'ASC' : 'DESC';

      let baseQuery = `
        FROM AbuseReports a 
        LEFT JOIN Users r ON a.reporter_id = r.id 
        LEFT JOIN Users target_u ON a.reported_user_id = target_u.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search) {
        baseQuery += ` AND (a.report_type LIKE ? OR a.description LIKE ? OR r.full_name LIKE ? OR target_u.full_name LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern);
      }

      if (status && status !== 'all') {
        baseQuery += ` AND a.status = ?`;
        params.push(status);
      }

      if (target_type && target_type !== 'all') {
        baseQuery += ` AND a.target_type = ?`;
        params.push(target_type);
      }

      if (report_type && report_type !== 'all') {
        baseQuery += ` AND a.report_type = ?`;
        params.push(report_type);
      }

      const countResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const totalCount = countResult ? countResult.count : 0;

      let orderClause = 'ORDER BY a.created_at DESC';
      if (sortBy === 'oldest') {
        orderClause = 'ORDER BY a.created_at ASC';
      } else if (sortBy === 'status') {
        orderClause = 'ORDER BY a.status ASC, a.created_at DESC';
      } else if (sortBy === 'report_type') {
        orderClause = `ORDER BY a.report_type ${sortOrder}`;
      } else if (sortBy === 'created_at') {
        orderClause = `ORDER BY a.created_at ${sortOrder}`;
      }

      const reports = db.prepare(`
        SELECT a.id, a.reporter_id, a.reported_user_id, a.target_type, a.target_id, a.report_type, a.status, a.admin_decision, a.created_at, a.updated_at,
               r.full_name as reporter_name, target_u.full_name as reported_user_name
        ${baseQuery}
        ${orderClause}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);

      res.json({
        data: reports,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/abuse-reports/:id', requireAdmin, (req, res) => {
    try {
      const report = db.prepare('SELECT * FROM AbuseReports WHERE id = ?').get(req.params.id);
      if (!report) return res.status(404).json({ error: 'Not found' });
      res.json(report);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/abuse-reports/:id', requireAdmin, (req, res) => {
    try {
      const { status, admin_decision, admin_note } = req.body;
      db.prepare(`
        UPDATE AbuseReports SET status=?, admin_decision=?, admin_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
      `).run(status, admin_decision || '', admin_note || '', req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin Bulk Imports
  app.get('/api/admin/bulk-imports', requireAdmin, (req, res) => {
    try {
      const imports = db.prepare('SELECT * FROM BulkImports ORDER BY created_at DESC').all();
      res.json(imports);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/bulk-imports/:id', requireAdmin, (req, res) => {
    try {
      const job = db.prepare('SELECT * FROM BulkImports WHERE id = ?').get(req.params.id);
      if (!job) return res.status(404).json({ error: 'Not found' });
      res.json(job);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/bulk-imports', requireAdmin, (req, res) => {
    try {
      const { import_type, file_name, total_rows, successful_rows, failed_rows, status, error_report } = req.body;
      const id = crypto.randomUUID();
      const admin_id = (req as any).user.id;
      db.prepare(`
        INSERT INTO BulkImports (id, admin_id, import_type, file_name, total_rows, successful_rows, failed_rows, status, error_report)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, admin_id, import_type, file_name, total_rows || 0, successful_rows || 0, failed_rows || 0, status || 'Pending', error_report || '');
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin Settings
  app.get('/api/admin/contact-messages', requireAdmin, (req, res) => {
    try {
      const messages = db.prepare('SELECT * FROM ContactMessages ORDER BY created_at DESC').all();
      res.json(messages);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/contact-messages/:id', requireAdmin, (req, res) => {
    try {
      const message = db.prepare('SELECT * FROM ContactMessages WHERE id = ?').get(req.params.id);
      if (!message) return res.status(404).json({ error: 'Message not found' });
      res.json(message);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/contact-messages/:id/read', requireAdmin, (req, res) => {
    try {
      db.prepare('UPDATE ContactMessages SET is_read = 1 WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/contact-messages/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM ContactMessages WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/settings', requireAdmin, (req, res) => {
    try {
      const settings = db.prepare('SELECT * FROM Settings').all();
      res.json(settings);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    try {
      const { settings } = req.body; // array of {group_name, key_name, value, type, description}
      const admin_id = (req as any).user.id;
      const isAdmin = (req as any).user.role !== 'Super Admin';
      const restrictedGroups = ['security', 'roles-permissions', 'advanced', 'import-export'];
      
      const selectStmt = db.prepare('SELECT * FROM Settings WHERE key_name = ?');
      const insertStmt = db.prepare('INSERT INTO Settings (id, group_name, key_name, value, type, description, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const updateStmt = db.prepare('UPDATE Settings SET group_name = ?, value = ?, type = ?, description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?');
      const logStmt = db.prepare('INSERT INTO AdminSettingsHistory (id, setting_group, setting_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?, ?)');
      const adminLogStmt = db.prepare('INSERT INTO AdminLogs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)');

      db.transaction(() => {
        for (const s of settings) {
          const group = s.group_name;
          if (isAdmin && restrictedGroups.includes(group)) {
             continue; // Skip restricted settings for normal admins
          }

          const old = selectStmt.get(s.key_name) as any;
          if (old) {
            if (isAdmin && restrictedGroups.includes(old.group_name)) {
               continue; // Don't allow changing existing restricted groups either
            }
            if (old.value !== s.value) {
              updateStmt.run(s.group_name || old.group_name, s.value, s.type || old.type, s.description || old.description, admin_id, s.key_name);
              logStmt.run(crypto.randomUUID(), s.group_name || old.group_name, s.key_name, old.value, s.value, admin_id);
            }
          } else {
            insertStmt.run(crypto.randomUUID(), s.group_name, s.key_name, s.value, s.type || 'text', s.description || '', admin_id);
            logStmt.run(crypto.randomUUID(), s.group_name, s.key_name, null, s.value, admin_id);
          }
        }
        adminLogStmt.run(crypto.randomUUID(), admin_id, 'Settings Updated', 'Settings', 'Bulk', 'Admin updated settings');
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

  app.get('/api/admin/logs', requireAdmin, (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT l.id, l.admin_id, l.action, l.details, l.created_at, u.full_name as admin_name 
        FROM AdminLogs l
        LEFT JOIN Users u ON l.admin_id = u.id
        ORDER BY l.created_at DESC
        LIMIT 300
      `).all();
      res.json(logs);
    } catch(e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/logs', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM AdminLogs').run();
      res.json({ success: true });
    } catch(e:any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Server error' });
    }
  });

  // Public Categories
  app.get('/api/categories', (req, res) => {
    try {
      const cats: any = db.prepare("SELECT * FROM Categories WHERE status = 'Active' AND show_publicly = 1 ORDER BY display_order ASC, created_at DESC").all();
      
      const pageCounts = db.prepare(`SELECT category, COUNT(*) as count, SUM(CASE WHEN featured_trusted_seller = 1 OR trust_score > 70 THEN 1 ELSE 0 END) as trusted_count FROM FacebookPages GROUP BY category`).all() as any[];
      const countMap = {};
      pageCounts.forEach(pc => { countMap[pc.category] = { c: pc.count, t: pc.trusted_count }; });
      
      const subCounts = db.prepare(`SELECT sub_category, COUNT(*) as count, SUM(CASE WHEN featured_trusted_seller = 1 OR trust_score > 70 THEN 1 ELSE 0 END) as trusted_count FROM FacebookPages GROUP BY sub_category`).all() as any[];
      const subCountMap = {};
      subCounts.forEach(sc => { subCountMap[sc.sub_category] = { c: sc.count, t: sc.trusted_count }; });

      const result = cats.map(c => ({
         ...c,
         pages_count: (c.type === 'main' || !c.parent_id) ? (countMap[c.name]?.c || 0) : (subCountMap[c.name]?.c || 0),
         trusted_count: (c.type === 'main' || !c.parent_id) ? (countMap[c.name]?.t || 0) : (subCountMap[c.name]?.t || 0)
      }));

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/pages/recent-fraud', (req, res) => {
    const pages = db.prepare(`
      SELECT p.*,
             (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.review_type = 'fraud') as fraud_report_count,
             (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id) as review_count,
             (SELECT AVG(star_rating) FROM Reviews r WHERE r.page_id = p.id) as average_rating
      FROM FacebookPages p
      WHERE p.is_fraud_listed = 1
      ORDER BY p.fraud_listed_at DESC, p.created_at DESC 
      LIMIT 25
    `).all();
    res.json(pages);
  });

  app.get('/api/pages/fraud-directory', (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const category = typeof req.query.category === 'string' ? req.query.category.trim() : 'all';
      const severity = typeof req.query.severity === 'string' ? req.query.severity.trim() : 'all';
      const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'all';
      const minReports = Number(req.query.min_fraud_reports) || 0;
      const hasContact = req.query.has_contact === 'true';
      const dateListed = typeof req.query.date_listed === 'string' ? req.query.date_listed.trim() : 'all';
      const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'recently_listed';
      
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      let whereClauses = ['p.is_fraud_listed = 1'];
      let params: any[] = [];

      if (search) {
        whereClauses.push(`(
          p.current_name LIKE ? OR 
          p.facebook_url LIKE ? OR 
          p.current_username LIKE ? OR 
          p.previous_names LIKE ? OR 
          p.previous_usernames LIKE ? OR 
          p.contact_number LIKE ? OR 
          p.extra_contacts LIKE ? OR 
          p.category LIKE ? OR 
          p.fraud_list_reason LIKE ?
        )`);
        const likeSearch = `%${search}%`;
        params.push(likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, likeSearch, likeSearch);
      }

      if (category && category !== 'all') {
        whereClauses.push('p.category = ?');
        params.push(category);
      }

      if (severity && severity !== 'all') {
        whereClauses.push('p.fraud_severity = ?');
        params.push(severity);
      }

      if (status && status !== 'all') {
        whereClauses.push('p.status_badge = ?');
        params.push(status);
      }

      if (hasContact) {
        whereClauses.push("(p.contact_number IS NOT NULL AND p.contact_number != '')");
      }

      if (dateListed && dateListed !== 'all') {
        if (dateListed === 'today') {
          whereClauses.push("p.fraud_listed_at >= date('now')");
        } else if (dateListed === 'this_week') {
          whereClauses.push("p.fraud_listed_at >= date('now', '-7 days')");
        } else if (dateListed === 'this_month') {
          whereClauses.push("p.fraud_listed_at >= date('now', '-30 days')");
        }
      }

      if (minReports > 0) {
        whereClauses.push(`(SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.review_type = 'fraud') >= ?`);
        params.push(minReports);
      }

      const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      let orderSQL = 'ORDER BY p.fraud_listed_at DESC, p.created_at DESC';
      if (sort === 'oldest_listed') {
        orderSQL = 'ORDER BY p.fraud_listed_at ASC, p.created_at ASC';
      } else if (sort === 'report_count' || sort === 'most_fraud_reports') {
        orderSQL = 'ORDER BY fraud_report_count DESC';
      } else if (sort === 'name_asc' || sort === 'a_z') {
        orderSQL = 'ORDER BY p.current_name ASC';
      } else if (sort === 'most_suspicious_reports') {
        orderSQL = 'ORDER BY suspicious_report_count DESC';
      } else if (sort === 'recently_reported') {
        orderSQL = 'ORDER BY last_reported_date DESC';
      } else if (sort === 'highest_severity') {
        orderSQL = `ORDER BY CASE p.fraud_severity
          WHEN 'Critical' THEN 1
          WHEN 'High Risk' THEN 2
          WHEN 'Medium Risk' THEN 3
          WHEN 'Low Risk' THEN 4
          ELSE 5 END ASC, p.created_at DESC`;
      } else if (sort === 'most_reviewed') {
        orderSQL = 'ORDER BY total_reviews DESC';
      } else if (sort === 'z_a') {
        orderSQL = 'ORDER BY p.current_name DESC';
      }

      const dataQuery = `
        SELECT p.id, p.facebook_url, p.current_name, p.current_username, p.category, p.sub_category, p.trust_score, p.claim_status, p.is_fraud_listed, p.fraud_listed_at, p.fraud_severity, p.status_badge, p.created_at, p.profile_picture, p.contact_number, p.fraud_list_reason,
               (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.review_type = 'fraud') as fraud_report_count,
               (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.review_type = 'suspicious') as suspicious_report_count,
               (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id) as total_reviews,
               (SELECT MAX(created_at) FROM Reviews r WHERE r.page_id = p.id) as last_reported_date
        FROM FacebookPages p
        ${whereSQL}
        ${orderSQL}
        LIMIT ? OFFSET ?
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM FacebookPages p
        ${whereSQL}
      `;

      const finalCountParams = [...params];
      const finalDataParams = [...params, limit, offset];

      const totalResult = db.prepare(countQuery).get(...finalCountParams) as { total: number };
      const items = db.prepare(dataQuery).all(...finalDataParams);

      res.json({
        total: totalResult ? totalResult.total : 0,
        page,
        limit,
        items
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error: ' + e.message });
    }
  });

  
  async function scrapeAndAddFacebookPage(facebookUrl: string): Promise<any | null> {
    try {
      let url = facebookUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      // Normalize legacy profile.php URLs or URLs with numeric IDs in query parameter to SEO-friendly /people/Page/{id} format
      if (url.includes('profile.php') && url.includes('id=')) {
        try {
          const urlObj = new URL(url);
          const numericId = urlObj.searchParams.get('id');
          if (numericId && /^\d+$/.test(numericId)) {
            url = `https://www.facebook.com/people/Page/${numericId}/`;
            console.log(`[AutoScrape] Converted legacy profile.php link to SEO-friendly URL: ${url}`);
          }
        } catch (e) {
          const match = url.match(/[?&]id=(\d+)/i);
          if (match && match[1]) {
            url = `https://www.facebook.com/people/Page/${match[1]}/`;
            console.log(`[AutoScrape] Converted legacy profile.php link (regex) to SEO-friendly URL: ${url}`);
          }
        }
      }
      
      try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        if (pathSegments.length === 1 && /^\d+$/.test(pathSegments[0])) {
          url = `https://www.facebook.com/people/Page/${pathSegments[0]}/`;
          console.log(`[AutoScrape] Converted direct numeric ID link to SEO-friendly URL: ${url}`);
        }
      } catch (e) {}

      // Resolve Facebook share shortlinks (e.g. facebook.com/share/...)
      if (url.includes('/share/')) {
        console.log(`[AutoScrape] Facebook share link detected: ${url}. Resolving redirect...`);
        try {
          // Fetch headers using curl without custom user agent to capture 302 location header
          const stdout = execSync(`curl -i -s "${url}"`, { timeout: 8000 }).toString();
          const locationMatch = stdout.match(/^location:\s*([^\r\n]+)/im);
          if (locationMatch && locationMatch[1]) {
            let resolvedUrl = locationMatch[1].trim();
            console.log(`[AutoScrape] Successfully resolved share link to: ${resolvedUrl}`);
            
            // Clean resolved URL (remove parameters like ?rdid=... or &share_url=...)
            try {
              const urlObj = new URL(resolvedUrl);
              urlObj.search = '';
              urlObj.hash = '';
              resolvedUrl = urlObj.toString();
              console.log(`[AutoScrape] Cleaned resolved URL: ${resolvedUrl}`);
            } catch (e) {
              resolvedUrl = resolvedUrl.split('?')[0].split('#')[0];
            }
            
            url = resolvedUrl;
          } else {
            console.warn(`[AutoScrape] Could not find location redirect header in curl output for share link`);
          }
        } catch (resolveErr: any) {
          console.error('[AutoScrape] Failed to resolve Facebook share redirect:', resolveErr.message);
        }
      }
      
      // Normalize url
      let urlNoSlash = url;
      if (url.endsWith('/')) {
        urlNoSlash = url.slice(0, -1);
      }
      const urlWithSlash = urlNoSlash + '/';
      let urlNoWwwNoSlash = urlNoSlash.replace('https://www.', 'https://');
      let urlNoWwwWithSlash = urlWithSlash.replace('https://www.', 'https://');

      // Check database using numeric ID to completely avoid duplicate entries
      let existingPageIdToUpdate = '';
      const queryId = extractFacebookId(url);
      if (queryId) {
        const existingById = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url LIKE ? LIMIT 1').get(`%${queryId}%`) as any;
        if (existingById) {
          const nameLower = (existingById.current_name || '').toLowerCase();
          const isFallback = !existingById.current_name ||
                             nameLower === 'facebook page' ||
                             nameLower === 'unknown page' ||
                             nameLower === 'facebook user' ||
                             /^\d+$/.test(nameLower) ||
                             nameLower.startsWith('facebook page ') ||
                             nameLower.startsWith('facebook user ');
          
          if (!isFallback) {
            console.log(`[AutoScrape] Match found by ID in database: "${existingById.current_name}" (URL: ${existingById.facebook_url}). Returning existing row.`);
            return existingById;
          } else {
            console.log(`[AutoScrape] Match found by ID in database, but has generic fallback name "${existingById.current_name}". Bypassing early return to refresh it.`);
            existingPageIdToUpdate = existingById.id;
          }
        }
      }

      if (!existingPageIdToUpdate) {
        const existing = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url COLLATE NOCASE IN (?, ?, ?, ?) LIMIT 1').get(urlNoSlash, urlWithSlash, urlNoWwwNoSlash, urlNoWwwWithSlash) as any;
        if (existing) {
          const nameLower = (existing.current_name || '').toLowerCase();
          const isFallback = !existing.current_name ||
                             nameLower === 'facebook page' ||
                             nameLower === 'unknown page' ||
                             nameLower === 'facebook user' ||
                             /^\d+$/.test(nameLower) ||
                             nameLower.startsWith('facebook page ') ||
                             nameLower.startsWith('facebook user ');
          
          if (!isFallback) {
            return existing;
          } else {
            console.log(`[AutoScrape] Match found by URL in database, but has generic fallback name "${existing.current_name}". Bypassing early return to refresh it.`);
            existingPageIdToUpdate = existing.id;
          }
        }
      }

      // 1. Get scraper cookie if saved (supports both raw cookie string and JSON array from Cookie Editor!)
      let scraperCookie = '';
      try {
        const cookieRow = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('facebook_scraper_cookies') as any;
        if (cookieRow && cookieRow.value) {
          const val = cookieRow.value.trim();
          if (val.startsWith('[')) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                scraperCookie = parsed.map((c: any) => `${c.name}=${c.value}`).join('; ');
              } else {
                scraperCookie = val;
              }
            } catch (jsonErr) {
              scraperCookie = val;
            }
          } else {
            scraperCookie = val;
          }
        }
      } catch (err) {
        console.error('[AutoScrape] Error reading facebook_scraper_cookies setting:', err);
      }
      const cookieOption = scraperCookie ? `-H "Cookie: ${scraperCookie.replace(/"/g, '\\"')}"` : '';

      // 1. Establish robust fallback details based on URL segment
      let rawTitle = '';
      let username = '';
      try {
        const profileIdMatch = urlNoSlash.match(/[?&]id=(\d+)/i);
        if (profileIdMatch && profileIdMatch[1]) {
          username = profileIdMatch[1];
          rawTitle = 'Facebook Page ' + profileIdMatch[1];
        } else {
          const cleanUrl = urlNoSlash.split('?')[0];
          const parts = cleanUrl.replace(/\/$/, '').split('/');
          const segment = parts[parts.length - 1];
          if (segment && segment !== 'facebook.com' && segment !== 'fb.com' && segment !== 'profile.php') {
            username = segment;
            if (/^\d+$/.test(segment)) {
              // Check if the second to last segment contains a clean name slug (like in /people/Trendy-Fashion-By-Eliza/61576737418745/)
              const prevSegment = parts[parts.length - 2];
              if (prevSegment && prevSegment !== 'people' && prevSegment !== 'Page' && prevSegment !== 'profile.php' && !/^\d+$/.test(prevSegment)) {
                rawTitle = prevSegment.replace(/[-_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              } else {
                rawTitle = 'Facebook Page ' + segment;
              }
            } else {
              rawTitle = segment.replace(/[\.\-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
          }
        }
      } catch (e) {}
      if (!rawTitle) {
        rawTitle = 'Facebook Page';
      }      
      let profilePicture = null;
      let hasPagePluginSuccess = false;      // 1.5. Try using Facebook Page Plugin widget iframe (NEVER blocked by Facebook and does not require login!)
      if (username) {
        console.log(`[AutoScrape] Fetching page metadata via public Page Plugin for username: ${username}`);
        try {
          const pluginUrl = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent('https://www.facebook.com/' + username)}&_fb_noscript=1`;
          const tempHtmlFile = path.join(uploadsDir, `temp-plugin-html-${Date.now()}.html`);
          
          execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempHtmlFile}" "${pluginUrl}"`, { timeout: 8000 });
          
          if (fs.existsSync(tempHtmlFile) && fs.statSync(tempHtmlFile).size > 0) {
            const pluginHtml = fs.readFileSync(tempHtmlFile, 'utf-8');
            try { fs.unlinkSync(tempHtmlFile); } catch (e) {}
            
            // Extract page name
            let extractedName = '';
            // Try title attribute match first (often contains clean name!)
            const titleAttrMatch = pluginHtml.match(/class="[^"]*_1drp[^"]*"[^>]*title="([^"]+)"/i) || 
                                   pluginHtml.match(/title="([^"]+)"[^>]*class="[^"]*_1drp[^"]*"/i);
            if (titleAttrMatch && titleAttrMatch[1]) {
              extractedName = titleAttrMatch[1];
            }
            
            if (!extractedName) {
              const pageNameMatch = pluginHtml.match(/"pageName"\s*:\s*"([^"]+)"/i);
              extractedName = pageNameMatch ? pageNameMatch[1] : '';
            }
            
            // Extract profile pic url with advanced, bulletproof scontent / profilePicURL parser
            let extractedPic = '';
            const profilePicMatch = pluginHtml.match(/"profilePicURL"\s*:\s*"([^"]+)"/i);
            if (profilePicMatch && profilePicMatch[1]) {
              extractedPic = profilePicMatch[1].replace(/\\/g, '');
            }
            
            if (!extractedPic) {
              const scontentMatches = pluginHtml.match(/(?:https?:)?\\?\/\\?\/[^\s\"']*(?:scontent|fbcdn)[^\s\"']+/gi) || [];
              const cleanUrls = scontentMatches.map(url => url.replace(/\\/g, ''));
              
              // 1st priority: contains -1/ (profile avatar)
              extractedPic = cleanUrls.find(url => url.includes('-1/')) || '';
              // 2nd priority: contains -6/
              if (!extractedPic) {
                extractedPic = cleanUrls.find(url => url.includes('-6/')) || '';
              }
              // 3rd priority: first match
              if (!extractedPic && cleanUrls.length > 0) {
                extractedPic = cleanUrls[0];
              }
            }

            if (extractedName && !extractedName.toLowerCase().includes('error')) {
              let decodedName = extractedName.replace(/\\{1,2}u([0-9a-fA-F]{4})/gi, (match, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
              });
              let cleanedName = decodeHTMLEntities(decodedName);
              rawTitle = cleanedName;
              
              console.log(`[AutoScrape] Successfully extracted page name via Page Plugin: "${rawTitle}"`);
              hasPagePluginSuccess = true;

              if (extractedPic) {
                extractedPic = decodeHTMLEntities(extractedPic);
                if (!extractedPic.startsWith('http')) {
                  extractedPic = 'https:' + extractedPic;
                }
                console.log(`[AutoScrape] Fetching profile picture from CDN via curl... URL: ${extractedPic.substring(0, 80)}...`);
                try {
                  const tempFile = path.join(uploadsDir, `temp-plugin-${Date.now()}.jpg`);
                  execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempFile}" "${extractedPic}"`, { timeout: 8000 });

                  if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                    const pageId = Date.now().toString();
                    const imageBuffer = fs.readFileSync(tempFile);
                    const timestamp = Date.now();
                    const filename = `profile-${pageId}-${timestamp}.webp`;
                    const filepath = path.join(uploadsDir, filename);

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

                    profilePicture = `/uploads/${filename}`;
                    console.log(`[AutoScrape] Successfully optimized profile picture: ${profilePicture}`);
                    try { fs.unlinkSync(tempFile); } catch (e) {}
                  } else {
                    console.warn(`[AutoScrape] Curl returned empty file or failed for profile picture`);
                  }
                } catch (imgErr: any) {
                  console.error('[AutoScrape] Error downloading profile picture:', imgErr.message);
                }
              }
            }
          }
        } catch (pluginErr: any) {
          console.error('[AutoScrape] Page Plugin scrape failed:', pluginErr.message);
        }
      }

      // 2. Perform direct fetch only if Page Plugin scrape didn't succeed
      if (!hasPagePluginSuccess) {
        console.log(`[AutoScrape] Fetching page from Facebook: ${urlNoSlash}`);
        try {
          let html = '';
          let isDirectSuccess = false;

          const tempDirectHtmlFile = path.join(uploadsDir, `temp-direct-html-${Date.now()}.html`);
          try {
            execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempDirectHtmlFile}" "${urlNoSlash}"`, { timeout: 8000 });
            if (fs.existsSync(tempDirectHtmlFile) && fs.statSync(tempDirectHtmlFile).size > 0) {
              html = fs.readFileSync(tempDirectHtmlFile, 'utf-8');
              try { fs.unlinkSync(tempDirectHtmlFile); } catch (e) {}

              // Check if roadblock
              const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
              const ogTitleMatch = html.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i);
              const parsedTitle = (ogTitleMatch ? ogTitleMatch[1] : (titleMatch ? titleMatch[1] : '')).toLowerCase().trim();
              const nameBlacklist = ["facebook", "error", "log in", "log in to facebook", "page not found", "broken link", "loading..."];

              const isRoadblocked = !parsedTitle || 
                                    nameBlacklist.includes(parsedTitle) || 
                                    html.includes("This content isn't available") || 
                                    html.includes("isn't available at the moment");

              if (!isRoadblocked) {
                isDirectSuccess = true;
              }
            }
          } catch (directErr: any) {
            console.error('[AutoScrape] Direct fetch timed out or failed:', directErr.message);
            try { fs.unlinkSync(tempDirectHtmlFile); } catch (e) {}
          }

          // Fallback to Google Translate Proxy if direct fetch is blocked / roadblocked
          if (!isDirectSuccess) {
            console.log(`[AutoScrape] Direct fetch failed or was blocked. Bypassing via Google Translate proxy...`);
            const tempProxyHtmlFile = path.join(uploadsDir, `temp-proxy-html-${Date.now()}.html`);
            try {
              const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(urlNoSlash)}`;
              execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempProxyHtmlFile}" "${proxyUrl}"`, { timeout: 8000 });
              if (fs.existsSync(tempProxyHtmlFile) && fs.statSync(tempProxyHtmlFile).size > 0) {
                html = fs.readFileSync(tempProxyHtmlFile, 'utf-8');
                try { fs.unlinkSync(tempProxyHtmlFile); } catch (e) {}
              }
            } catch (proxyErr: any) {
              console.error('[AutoScrape] Google Translate proxy failed:', proxyErr.message);
              try { fs.unlinkSync(tempProxyHtmlFile); } catch (e) {}
            }
          }

          if (html) {
            // Extract title
            let ogTitle = '';
            const ogTitleMatch = html.match(/<meta[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                                 html.match(/<meta[^]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i);
            if (ogTitleMatch && ogTitleMatch[1]) {
              ogTitle = ogTitleMatch[1].split('|')[0].trim();
            }
            if (!ogTitle) {
              const twitterTitle = html.match(/<meta[^>]*(?:name|property)=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
                                   html.match(/<meta[^]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:title["']/i);
              if (twitterTitle && twitterTitle[1]) {
                ogTitle = twitterTitle[1].split('|')[0].trim();
              }
            }
            if (!ogTitle) {
              const metaTitle = html.match(/<meta[^>]*(?:name|property)=["']title["'][^>]*content=["']([^"']+)["']/i) ||
                                html.match(/<meta[^]*content=["']([^"']+)["'][^>]*(?:name|property)=["']title["']/i);
              if (metaTitle && metaTitle[1]) {
                ogTitle = metaTitle[1].split('|')[0].trim();
              }
            }
            if (!ogTitle) {
              const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
              ogTitle = titleMatch ? titleMatch[1].split('|')[0].trim() : '';
            }

            if (ogTitle) {
              ogTitle = decodeHTMLEntities(ogTitle);
              let cleanedTitle = ogTitle.toLowerCase().trim()
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");

              const nameBlacklist = ["facebook", "error", "log in", "log in to facebook", "page not found", "broken link", "loading..."];
              const isRoadblocked = !cleanedTitle || 
                                    nameBlacklist.includes(cleanedTitle) || 
                                    html.includes("This content isn't available") || 
                                    html.includes("isn't available at the moment");

              if (!isRoadblocked) {
                rawTitle = ogTitle;
              }
            }

            // Attempt to extract profile picture with our super-robust scontent matches parser
            let ogImageUrl = '';
            const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
            if (ogImageMatch && ogImageMatch[1]) {
              ogImageUrl = ogImageMatch[1];
            } else {
              const scontentMatches = html.match(/(?:https?:)?\\?\/\\?\/[^\s\"']*(?:scontent|fbcdn)[^\s\"']+/gi) || [];
              const cleanUrls = scontentMatches.map(url => url.replace(/\\/g, ''));
              
              // 1st priority: contains -1/ (profile avatar)
              ogImageUrl = cleanUrls.find(url => url.includes('-1/')) || '';
              // 2nd priority: contains -6/
              if (!ogImageUrl) {
                ogImageUrl = cleanUrls.find(url => url.includes('-6/')) || '';
              }
              // 3rd priority: first match
              if (!ogImageUrl && cleanUrls.length > 0) {
                ogImageUrl = cleanUrls[0];
              }
            }

            if (ogImageUrl) {
              if (!ogImageUrl.startsWith('http')) {
                ogImageUrl = 'https:' + ogImageUrl;
              }
              let cleanedImageUrl = ogImageUrl
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");

              try {
                console.log(`[AutoScrape] Fetching profile picture from CDN via curl... URL: ${cleanedImageUrl.substring(0, 80)}...`);
                const tempFile = path.join(uploadsDir, `temp-direct-${Date.now()}.jpg`);
                execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" ${cookieOption} -o "${tempFile}" "${cleanedImageUrl}"`, { timeout: 8000 });

                if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
                  const pageId = Date.now().toString();
                  const imageBuffer = fs.readFileSync(tempFile);
                  const timestamp = Date.now();
                  const filename = `profile-${pageId}-${timestamp}.webp`;
                  const filepath = path.join(uploadsDir, filename);

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

                  profilePicture = `/uploads/${filename}`;
                  console.log(`[AutoScrape] Successfully optimized profile picture from direct/translate fetch: ${profilePicture}`);
                  try { fs.unlinkSync(tempFile); } catch (e) {}
                } else {
                  console.warn(`[AutoScrape] Curl returned empty file or failed for direct profile picture`);
                }
              } catch (imgErr: any) {
                console.error('[AutoScrape] Error downloading profile picture:', imgErr.message);
              }
            }
          } else {
            console.log(`[AutoScrape] Fetch returned status or failed, falling back to URL-derived metadata`);
          }
        } catch (fetchErr) {
          console.error('[AutoScrape] Fetch timed out or network error, falling back to URL-derived metadata:', fetchErr);
        }
      }

      // 2.5. Ultimate Graph API picture redirect fallback: fetches profile picture directly using the username if it is still empty!
      if (!profilePicture && username) {
        console.log(`[AutoScrape] Fetching profile picture from public Graph API redirect for username: ${username}...`);
        try {
          const graphPicUrl = `https://graph.facebook.com/${username}/picture?type=large`;
          const tempFile = path.join(uploadsDir, `temp-graph-${Date.now()}.jpg`);
          execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempFile}" "${graphPicUrl}"`, { timeout: 8000 });

          if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 0) {
            const pageId = Date.now().toString();
            const imageBuffer = fs.readFileSync(tempFile);
            const timestamp = Date.now();
            const filename = `profile-${pageId}-${timestamp}.webp`;
            const filepath = path.join(uploadsDir, filename);

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

            profilePicture = `/uploads/${filename}`;
            console.log(`[AutoScrape] Successfully extracted profile picture via Graph API redirect: ${profilePicture}`);
            try { fs.unlinkSync(tempFile); } catch (e) {}
          } else {
            console.warn(`[AutoScrape] Curl returned empty file or failed for Graph API redirect profile picture`);
          }
        } catch (graphPicErr: any) {
          console.error('[AutoScrape] Graph API redirect profile picture fallback failed:', graphPicErr.message);
        }
      }

      // Format name beautifully if empty, generic, or a login wall
      const lowerTitle = (rawTitle || '').toLowerCase();
      const isLoginWall = lowerTitle.includes('log in') || 
                          lowerTitle.includes('sign up') || 
                          lowerTitle.includes('sign in') || 
                          lowerTitle.includes('roadblock') ||
                          lowerTitle.includes('checkpoint') ||
                          lowerTitle.includes('लॉग इन') || 
                          lowerTitle.includes('साइन अप') || 
                          lowerTitle.includes('पाहण्यासाठी') ||
                          lowerTitle.includes('লগ ইন') || 
                          lowerTitle.includes('সাইন আপ') ||
                          lowerTitle.includes('প্রবেশ করুন') ||
                          lowerTitle.includes('নিবন্ধন করুন');

      if (!rawTitle || rawTitle.toLowerCase() === 'facebook page' || rawTitle.toLowerCase() === 'error' || isLoginWall) {
        if (username) {
          if (/^\d+$/.test(username)) {
            // Check if the URL path contains a clean name slug before the numeric ID
            try {
              const cleanUrl = urlNoSlash.split('?')[0];
              const parts = cleanUrl.replace(/\/$/, '').split('/');
              const prevSegment = parts[parts.length - 2];
              if (prevSegment && prevSegment !== 'people' && prevSegment !== 'Page' && prevSegment !== 'profile.php' && !/^\d+$/.test(prevSegment)) {
                rawTitle = prevSegment.replace(/[-_.]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              } else {
                rawTitle = 'Facebook Page ' + username;
              }
            } catch (e) {
              rawTitle = 'Facebook Page ' + username;
            }
          } else {
            rawTitle = username
              .replace(/[._-]/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());
          }
        } else {
          rawTitle = 'Facebook Page';
        }
      }

      // 3. Resiliently add or update database! Use 0/NULL for trust_score
      if (existingPageIdToUpdate) {
        db.prepare(`
          UPDATE FacebookPages
          SET current_name = ?,
              current_username = ?,
              profile_picture = COALESCE(?, profile_picture),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(rawTitle, username || null, profilePicture || null, existingPageIdToUpdate);
        console.log(`[AutoScrape] Resiliently updated existing fallback Facebook Page: "${rawTitle}" (ID: ${existingPageIdToUpdate})`);
        
        // Return updated row
        return db.prepare('SELECT * FROM FacebookPages WHERE id = ?').get(existingPageIdToUpdate);
      } else {
        const pageId = Date.now().toString();
        db.prepare(`
          INSERT INTO FacebookPages (
            id, facebook_url, current_name, current_username, 
            claim_status, status_badge, trust_score, is_fraud_listed, 
            profile_picture, created_at, added_by
          ) VALUES (?, ?, ?, ?, 'Unclaimed', 'Under Review', 0, 0, ?, CURRENT_TIMESTAMP, 'auto_search')
        `).run(pageId, urlNoSlash, rawTitle, username || null, profilePicture);

        console.log(`[AutoScrape] Resiliently added discovered Facebook Page: "${rawTitle}" (ID: ${pageId})`);
        
        // Return the newly created page row
        const newPage = db.prepare('SELECT * FROM FacebookPages WHERE id = ?').get(pageId);
        return newPage;
      }
    } catch (err) {
      console.error('[AutoScrape] Critical error in scrapeAndAddFacebookPage:', err);
      return null;
    }
  }

  app.get('/api/pages/by-url', async (req, res) => {
    let { url } = req.query;
    if (!url || typeof url !== 'string') return res.json({ success: false });
    url = url.trim();
    
    // Normalize URL
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    // Normalize legacy profile.php URLs or URLs with numeric IDs in query parameter to SEO-friendly /people/Page/{id} format
    if (url.includes('profile.php') && url.includes('id=')) {
      try {
        const urlObj = new URL(url);
        const numericId = urlObj.searchParams.get('id');
        if (numericId && /^\d+$/.test(numericId)) {
          url = `https://www.facebook.com/people/Page/${numericId}/`;
        }
      } catch (e) {
        const match = url.match(/[?&]id=(\d+)/i);
        if (match && match[1]) {
          url = `https://www.facebook.com/people/Page/${match[1]}/`;
        }
      }
    }
    
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length === 1 && /^\d+$/.test(pathSegments[0])) {
        url = `https://www.facebook.com/people/Page/${pathSegments[0]}/`;
      }
    } catch (e) {}
    
    // Allow matching with or without trailing slash
    let urlNoSlash = url;
    if (url.endsWith('/')) {
        urlNoSlash = url.slice(0, -1);
    }
    const urlWithSlash = urlNoSlash + '/';
    
    // Also try matching without www if provided, or vice versa
    let urlNoWwwNoSlash = urlNoSlash.replace('https://www.', 'https://');
    let urlNoWwwWithSlash = urlWithSlash.replace('https://www.', 'https://');

    let page = null;
    const queryId = extractFacebookId(url);
    if (queryId) {
      page = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url LIKE ? LIMIT 1').get(`%${queryId}%`) as any;
    }

    if (!page) {
      page = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url COLLATE NOCASE IN (?, ?, ?, ?) LIMIT 1').get(urlNoSlash, urlWithSlash, urlNoWwwNoSlash, urlNoWwwWithSlash) as any;
    }

    let isFallbackName = false;
    if (page) {
      const nameLower = (page.current_name || '').toLowerCase();
      isFallbackName = !page.current_name ||
                       nameLower === 'facebook page' ||
                       nameLower === 'unknown page' ||
                       nameLower === 'facebook user' ||
                       /^\d+$/.test(nameLower) ||
                       nameLower.startsWith('facebook page ') ||
                       nameLower.startsWith('facebook user ');
    }

    if (page && !isFallbackName) {
      res.json({ success: true, page });
    } else {
      // Try to scrape and add/update instantly!
      const newPage = await scrapeAndAddFacebookPage(urlNoSlash);
      if (newPage) {
        res.json({ success: true, page: newPage });
      } else {
        if (page) {
          res.json({ success: true, page });
        } else {
          res.json({ success: false });
        }
      }
    }
  });

  const recordSearchQuery = (q: any) => {
    if (typeof q !== 'string') return;
    const cleaned = q.trim();
    if (!cleaned || cleaned.length < 2 || cleaned.length > 50) return;
    if (cleaned.includes('facebook.com') || cleaned.includes('fb.com') || cleaned.includes('http://') || cleaned.includes('https://')) return;
    
    try {
      db.prepare(`
        INSERT INTO SearchQueries (query, count, updated_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(query) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP
      `).run(cleaned);
    } catch (e) {
      console.error('Error tracking search query:', e);
    }
  };

  app.get('/api/popular-searches', (req, res) => {
    try {
      const queries = db.prepare('SELECT query FROM SearchQueries ORDER BY count DESC, updated_at DESC LIMIT 6').all() as { query: string }[];
      res.json(queries.map(q => q.query));
    } catch (e: any) {
      console.error('Failed to get popular searches:', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/pages/trusted-search', (req, res) => {
    let { 
        q, category, subcategory, payment_method, min_rating, min_reviews, 
        sort_by 
    } = req.query;

    if (q) {
      recordSearchQuery(q);
    }

    let filters = [];
    let params: any[] = [];
    
    let baseQuery = `
      SELECT p.id, p.facebook_url, p.current_name, p.current_username, p.category, p.sub_category, p.trust_score, p.claim_status, p.is_fraud_listed, p.fraud_listed_at, p.status_badge, p.created_at, p.profile_picture, p.contact_number, p.fraud_list_reason, p.fraud_severity,
             COUNT(r.id) as review_count,
             AVG(r.star_rating) as avg_rating_fallback,
             SUM(CASE WHEN r.review_type = 'Fraud Report' THEN 1 ELSE 0 END) as dynamic_fraud_count
      FROM FacebookPages p
      LEFT JOIN Reviews r ON p.id = r.page_id
      WHERE (p.status_badge IS NULL OR p.status_badge != 'Reported as Fraud')
    `;

    if (q && typeof q === 'string') {
        const searchTerm = `%${q.trim()}%`;
        filters.push(`(
            p.current_name LIKE ? OR 
            p.current_username LIKE ? OR 
            p.category LIKE ? OR 
            p.sub_category LIKE ? OR 
            p.facebook_url LIKE ?
        )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (category && typeof category === 'string') {
        const catRow = db.prepare('SELECT name FROM Categories WHERE slug = ? COLLATE NOCASE').get(category.trim());
        if (catRow) {
            filters.push('p.category COLLATE NOCASE = ?');
            params.push((catRow as any).name);
        } else {
            filters.push('p.category LIKE ?');
            params.push(`%${category.trim()}%`);
        }
    }

    if (subcategory && typeof subcategory === 'string') {
        const catRow = db.prepare('SELECT name FROM Categories WHERE slug = ? COLLATE NOCASE').get(subcategory.trim());
        if (catRow) {
            filters.push('p.sub_category COLLATE NOCASE = ?');
            params.push((catRow as any).name);
        } else {
            filters.push('p.sub_category LIKE ?');
            params.push(`%${subcategory.trim()}%`);
        }
    }

    if (payment_method && typeof payment_method === 'string') {
        filters.push('p.payment_methods LIKE ?');
        params.push(`%${payment_method.trim()}%`);
    }

    if (min_rating) {
        filters.push('p.average_rating >= ?');
        params.push(Number(min_rating));
    }

    if (min_reviews) {
        filters.push('p.total_reviews >= ?');
        params.push(Number(min_reviews));
    }

    if (filters.length > 0) {
        baseQuery += ' AND ' + filters.join(' AND ');
    }

    baseQuery += ' GROUP BY p.id';

    // Apply sorting
    if (sort_by === 'highest_rated') {
        baseQuery += ' ORDER BY p.average_rating DESC, p.trusted_ranking_score DESC';
    } else if (sort_by === 'most_reviewed') {
        baseQuery += ' ORDER BY p.total_reviews DESC, p.trusted_ranking_score DESC';
    } else if (sort_by === 'lowest_fraud') {
        baseQuery += ' ORDER BY p.fraud_report_count ASC, p.trusted_ranking_score DESC';
    } else {
        // Default to most trusted
        baseQuery += ' ORDER BY p.featured_trusted_seller DESC, p.trusted_ranking_score DESC, p.average_rating DESC';
    }

    baseQuery += ' LIMIT 50';

    try {
        let pages = db.prepare(baseQuery).all(...params) as any[];
        pages = pages.map(p => ({...p, fraud_report_count: Math.max(p.fraud_report_count || 0, p.dynamic_fraud_count || 0)}));
        
        if (q && typeof q === 'string') {
            const isLikeNumber = /^[\d\+\-\s]+$/.test(q.trim());
            if (isLikeNumber) {
                const numSearchTerm = `%${q.trim()}%`;
                const contacts = db.prepare("SELECT id, number, type, status, fraud_report_count FROM ContactNumbers WHERE number LIKE ? AND status IN ('Reported', 'Suspicious') LIMIT 5").all(numSearchTerm) as any[];
                for (const contact of contacts) {
                    pages.push({
                        id: 'number-' + contact.id,
                        current_name: contact.number,
                        category: contact.type || 'Contact Number',
                        status_badge: contact.status === 'Reported' ? 'Reported as Fraud' : 'Suspicious',
                        profile_picture: null,
                        review_count: contact.fraud_report_count || 0,
                        average_rating: 0,
                        is_contact_only: true
                    });
                }
            }
        }
        res.json(pages);
    } catch (e: any) {
        console.error('trusted-search error:', e);
        res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/pages/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    
    recordSearchQuery(q);
    
    const rawTrim = q.trim();
    const queryLike = `%${rawTrim}%`;
    const isLikeNumber = /^[\d\+\-\s]+$/.test(rawTrim) || (rawTrim.replace(/\D/g, '').length >= 8);

    // If search query is a Facebook URL, check if we have it or scrape & add it instantly
    const isUrlQuery = rawTrim.toLowerCase().startsWith('http') || 
                       rawTrim.toLowerCase().includes('facebook.com') || 
                       rawTrim.toLowerCase().includes('fb.com');

    if (isUrlQuery) {
      let normalized = rawTrim;
      if (!normalized.startsWith('http')) {
        normalized = 'https://' + normalized;
      }

      // Normalize legacy profile.php URLs or URLs with numeric IDs in query parameter to SEO-friendly /people/Page/{id} format
      if (normalized.includes('profile.php') && normalized.includes('id=')) {
        try {
          const urlObj = new URL(normalized);
          const numericId = urlObj.searchParams.get('id');
          if (numericId && /^\d+$/.test(numericId)) {
            normalized = `https://www.facebook.com/people/Page/${numericId}/`;
          }
        } catch (e) {
          const match = normalized.match(/[?&]id=(\d+)/i);
          if (match && match[1]) {
            normalized = `https://www.facebook.com/people/Page/${match[1]}/`;
          }
        }
      }
      
      try {
        const urlObj = new URL(normalized);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        if (pathSegments.length === 1 && /^\d+$/.test(pathSegments[0])) {
          normalized = `https://www.facebook.com/people/Page/${pathSegments[0]}/`;
        }
      } catch (e) {}

      let urlNoSlash = normalized;
      if (normalized.endsWith('/')) {
        urlNoSlash = normalized.slice(0, -1);
      }
      const urlWithSlash = urlNoSlash + '/';
      let urlNoWwwNoSlash = urlNoSlash.replace('https://www.', 'https://');
      let urlNoWwwWithSlash = urlWithSlash.replace('https://www.', 'https://');

      let page = null;
      const searchId = extractFacebookId(rawTrim);
      if (searchId) {
        page = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url LIKE ? LIMIT 1').get(`%${searchId}%`) as any;
        if (page) {
          console.log(`[Search] Exact database match found by ID: "${page.current_name}" (URL: ${page.facebook_url})`);
        }
      }

      if (!page) {
        page = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url COLLATE NOCASE IN (?, ?, ?, ?) LIMIT 1').get(urlNoSlash, urlWithSlash, urlNoWwwNoSlash, urlNoWwwWithSlash) as any;
      }
      
      let isFallbackName = false;
      if (page) {
        const nameLower = (page.current_name || '').toLowerCase();
        isFallbackName = !page.current_name ||
                         nameLower === 'facebook page' ||
                         nameLower === 'unknown page' ||
                         nameLower === 'facebook user' ||
                         /^\d+$/.test(nameLower) ||
                         nameLower.startsWith('facebook page ') ||
                         nameLower.startsWith('facebook user ');
      }

      if (!page || isFallbackName) {
        const scraped = await scrapeAndAddFacebookPage(urlNoSlash);
        if (scraped) {
          page = scraped;
        }
      }
      if (page) {
        const wrappedPage = db.prepare(`
          SELECT p.id, p.facebook_url, p.current_name, p.current_username, p.category, p.sub_category, p.trust_score, p.claim_status, p.is_fraud_listed, p.fraud_listed_at, p.status_badge, p.created_at, p.profile_picture, p.contact_number, p.fraud_list_reason, p.fraud_severity,
                 (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.review_type = 'fraud') as fraud_report_count,
                 (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id) as review_count,
                 (SELECT AVG(star_rating) FROM Reviews r WHERE r.page_id = p.id) as average_rating
          FROM FacebookPages p
          WHERE p.id = ?
        `).get(page.id) as any;
        if (wrappedPage) {
          return res.json([wrappedPage]);
        }
      }
    }
    
    // Normalize phone numbers to make contact search bulletproof
    const digits = rawTrim.replace(/\D/g, '');
    let basePhone = '';
    let phoneLike1 = queryLike;
    let phoneLike2 = queryLike;
    let phoneLike3 = queryLike;
    
    if (digits.length >= 8 && digits.length <= 15) {
      if (digits.startsWith('0')) {
        basePhone = digits.substring(1);
      } else if (digits.startsWith('880')) {
        basePhone = digits.substring(3);
      } else {
        basePhone = digits;
      }
      phoneLike1 = `%${basePhone}%`;
      phoneLike2 = `%0${basePhone}%`;
      phoneLike3 = `%880${basePhone}%`;
    }
    
    // Robust URL parsing
    let fbUsername = '';
    let urlLike = queryLike;
    if (rawTrim.toLowerCase().includes('facebook.com') || rawTrim.toLowerCase().includes('fb.com') || rawTrim.toLowerCase().includes('facebook') || rawTrim.includes('/')) {
      try {
        const cleanUrl = rawTrim.split('?')[0].trim();
        const profileIdMatch = rawTrim.match(/[?&]id=(\d+)/i);
        if (profileIdMatch && profileIdMatch[1]) {
          fbUsername = profileIdMatch[1];
        } else {
          const parts = cleanUrl.replace(/\/$/, '').split('/');
          const lastSegment = parts[parts.length - 1];
          if (lastSegment && lastSegment !== 'facebook.com' && lastSegment !== 'fb.com') {
            fbUsername = lastSegment;
          }
        }
      } catch (e) {
        console.error('URL parse error:', e);
      }
      if (fbUsername) {
        urlLike = `%${fbUsername}%`;
      }
    }

    const pages = db.prepare(`
      SELECT p.id, p.facebook_url, p.current_name, p.current_username, p.category, p.sub_category, p.trust_score, p.claim_status, p.is_fraud_listed, p.fraud_listed_at, p.status_badge, p.created_at, p.profile_picture, p.contact_number, p.fraud_list_reason, p.fraud_severity,
             COUNT(r.id) as review_count,
             AVG(r.star_rating) as average_rating,
             SUM(CASE WHEN r.review_type = 'Fraud Report' THEN 1 ELSE 0 END) as dynamic_fraud_count
      FROM FacebookPages p
      LEFT JOIN Reviews r ON p.id = r.page_id
      WHERE (
         p.current_name LIKE ? 
      OR p.current_username LIKE ?
      OR p.facebook_url LIKE ?
      OR p.facebook_url LIKE ?
      OR p.contact_number LIKE ?
      OR p.contact_number LIKE ?
      OR p.contact_number LIKE ?
      OR p.website_url LIKE ?
      OR p.extra_contacts LIKE ?
      OR p.extra_contacts LIKE ?
      OR p.extra_contacts LIKE ?
      OR p.payment_methods LIKE ?
      OR p.payment_methods LIKE ?
      OR p.payment_methods LIKE ?
      OR r.bkash_number LIKE ?
      OR r.bkash_number LIKE ?
      OR r.bkash_number LIKE ?
      OR p.facebook_url = ?
      )
      GROUP BY p.id
      ORDER BY review_count DESC
      LIMIT 50
    `).all(
        queryLike, queryLike, queryLike, urlLike, 
        phoneLike1, phoneLike2, phoneLike3, 
        queryLike, 
        phoneLike1, phoneLike2, phoneLike3,
        phoneLike1, phoneLike2, phoneLike3,
        phoneLike1, phoneLike2, phoneLike3,
        rawTrim
    ).map((p: any) => ({...p, fraud_report_count: Math.max(p.fraud_report_count || 0, p.dynamic_fraud_count || 0)}));

    // Add standalone reported numbers if query resembles a number
    if (isLikeNumber) {
        const contacts = db.prepare(`
          SELECT id, number, type, status, fraud_report_count 
          FROM ContactNumbers 
          WHERE number LIKE ? OR number LIKE ? OR number LIKE ? OR number LIKE ?
          LIMIT 5
        `).all(queryLike, phoneLike1, phoneLike2, phoneLike3) as any[];
        
        for (const contact of contacts) {
            if (pages.some((p: any) => p.current_name === contact.number || p.contact_number === contact.number)) {
                continue;
            }
            pages.push({
                id: 'number-' + contact.id,
                current_name: contact.number,
                category: contact.type || 'Contact Number',
                status_badge: contact.status === 'Reported' || contact.status === 'Suspicious' ? 'Reported as Fraud' : contact.status,
                profile_picture: null,
                review_count: contact.fraud_report_count || 0,
                average_rating: 0,
                is_contact_only: true
            });
        }
    }
    
    res.json(pages);
  });

  app.get('/api/reviews/recent', (req, res) => {
    const reviews = db.prepare(`
      SELECT r.id, r.page_id, r.user_id, r.review_type, r.star_rating, r.title, r.description, r.date_of_experience, r.bkash_number, r.bkash_account_type, r.bkash_display_name, r.facebook_post_link, r.order_amount, r.product_service_type, r.status, r.created_at, r.updated_at,
             p.current_name, p.facebook_url, p.profile_picture,
             CASE WHEN r.is_on_behalf = 1 THEN COALESCE(NULLIF(r.on_behalf_name, ''), 'On behalf') ELSE u.full_name END as reviewer_name
      FROM Reviews r
      JOIN FacebookPages p ON r.page_id = p.id
      LEFT JOIN Users u ON r.user_id = u.id
      WHERE r.status IN ('Published', 'Verified', 'Approved')
      ORDER BY COALESCE(r.updated_at, r.created_at) DESC 
      LIMIT 20
    `).all();
    res.json(reviews);
  });

  app.get('/api/pages/:id', (req, res) => {
    try {
      const page = db.prepare(`
        SELECT p.*,
               (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.status IN ('Published', 'Verified', 'Approved')) as total_reviews,
               (SELECT COUNT(*) FROM Reviews r WHERE r.page_id = p.id AND r.review_type = 'Fraud Report' AND r.status IN ('Published', 'Verified', 'Approved')) as fraud_report_count,
               (SELECT AVG(r.star_rating) FROM Reviews r WHERE r.page_id = p.id AND r.status IN ('Published', 'Verified', 'Approved')) as average_rating
        FROM FacebookPages p
        WHERE p.id = ?
      `).get(req.params.id) as any;

      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json({ page, reviews: [] });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/pages/:id/reviews', (req, res) => {
    try {
      const pageId = req.params.id;
      const pageNum = Math.max(1, parseInt(req.query.page as string || '1'));
      let limit = Math.max(1, parseInt(req.query.limit as string || '10'));
      if (limit > 50) limit = 50;
      const offset = (pageNum - 1) * limit;

      const rating = req.query.rating as string;
      const status = req.query.status as string;
      const sort = req.query.sort as string || 'Recent';
      
      const search = req.query.search as string;
      const ratingsStr = req.query.ratings as string;
      const verifiedOnly = req.query.verifiedOnly === 'true' || status === 'Verified';
      const repliesOnly = req.query.repliesOnly === 'true';
      const dateRange = req.query.dateRange as string || 'all';

      let baseQuery = `FROM Reviews r LEFT JOIN OwnerReplies o ON r.id = o.review_id LEFT JOIN Users u ON r.user_id = u.id WHERE r.page_id = ? AND r.status IN ('Published', 'Verified', 'Approved')`;
      const queryParams: any[] = [pageId];

      if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        baseQuery += ` AND (r.title LIKE ? OR r.description LIKE ? OR u.full_name LIKE ?)`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      if (ratingsStr && ratingsStr.trim()) {
        const stars = ratingsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (stars.length > 0) {
          const placeholders = stars.map(() => '?').join(',');
          baseQuery += ` AND r.star_rating IN (${placeholders})`;
          queryParams.push(...stars);
        }
      } else if (rating && rating !== 'All') {
        baseQuery += ` AND r.star_rating = ?`;
        queryParams.push(parseInt(rating));
      }

      if (verifiedOnly) {
        baseQuery += ` AND r.status = 'Verified'`;
      }

      if (repliesOnly) {
        baseQuery += ` AND o.reply_text IS NOT NULL`;
      }

      if (dateRange === '30days') {
        baseQuery += ` AND COALESCE(r.updated_at, r.created_at) >= datetime('now', '-30 days')`;
      } else if (dateRange === '3months') {
        baseQuery += ` AND COALESCE(r.updated_at, r.created_at) >= datetime('now', '-3 months')`;
      } else if (dateRange === '6months') {
        baseQuery += ` AND COALESCE(r.updated_at, r.created_at) >= datetime('now', '-6 months')`;
      } else if (dateRange === '12months') {
        baseQuery += ` AND COALESCE(r.updated_at, r.created_at) >= datetime('now', '-12 months')`;
      }

      const totalCountResult = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...queryParams) as any;
      const totalCount = totalCountResult ? totalCountResult.count : 0;

      let orderBy = 'ORDER BY COALESCE(r.updated_at, r.created_at) DESC';
      if (sort === 'Oldest') {
        orderBy = 'ORDER BY COALESCE(r.updated_at, r.created_at) ASC';
      }

      const reviewsList = db.prepare(`
        SELECT r.id, r.page_id, r.user_id, r.review_type, r.star_rating, r.title, r.description, r.date_of_experience, r.bkash_number, r.bkash_account_type, r.bkash_display_name, r.facebook_post_link, r.order_amount, r.product_service_type, r.status, r.created_at, r.updated_at, r.useful_count,
               o.reply_text as owner_reply, o.created_at as owner_reply_created_at, 
               CASE WHEN r.is_on_behalf = 1 THEN COALESCE(NULLIF(r.on_behalf_name, ''), 'On behalf') ELSE u.full_name END as current_name
        ${baseQuery}
        ${orderBy}
        LIMIT ? OFFSET ?
      `).all(...queryParams, limit, offset);

      res.json({
        reviews: reviewsList,
        total: totalCount,
        page: pageNum,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/reviews/:id/useful', (req, res) => {
    try {
      const { increment } = req.body;
      const reviewId = req.params.id;
      
      const review = db.prepare('SELECT id, useful_count FROM Reviews WHERE id = ?').get(reviewId) as any;
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      
      let newCount = Number(review.useful_count || 0);
      if (increment) {
        newCount += 1;
      } else {
        newCount = Math.max(0, newCount - 1);
      }
      
      db.prepare('UPDATE Reviews SET useful_count = ? WHERE id = ?').run(newCount, reviewId);
      res.json({ success: true, useful_count: newCount });
    } catch (e: any) {
      console.error('[Useful] Error updating useful count:', e);
      res.status(500).json({ error: 'Failed to update useful count' });
    }
  });

  app.post('/api/reviews/:id/reply', (req, res) => {
    const { id } = req.params;
    const { reply_text, page_id } = req.body;
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user_id = decoded.id;
      
      const page = db.prepare('SELECT * FROM FacebookPages WHERE id = ?').get(page_id) as any;
      if (!page || page.owner_id !== user_id) {
        return res.status(403).json({ error: 'You are not the owner of this page' });
      }

      const existingReply = db.prepare('SELECT * FROM OwnerReplies WHERE review_id = ?').get(id);
      if (existingReply) {
        return res.status(400).json({ error: 'Reply already exists' });
      }

      const replyId = Date.now().toString();
      db.prepare(`
        INSERT INTO OwnerReplies (id, review_id, owner_id, reply_text)
        VALUES (?, ?, ?, ?)
      `).run(replyId, id, user_id, reply_text);
      res.json({ success: true, id: replyId, reply_text, created_at: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    let { 
      page_id, page_name, page_url, website_url, category, sub_category, contact_number, 
      review_type, star_rating, title, description, date_of_experience, bkash_number, 
      order_amount, facebook_post_link,
      extra_contacts, payment_methods, other_urls, profile_picture, page_details,
      on_behalf_name
    } = req.body;
    
    // Auth Check
    let user_id = 'anonymous';
    let is_on_behalf = 0;
    let is_admin_user = false;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        user_id = decoded.id;
        
        // Block business accounts from creating reviews
        if (decoded.role === 'owner' || decoded.role === 'page_owner') {
          return res.status(403).json({ error: 'Business accounts cannot write reviews.' });
        }
        if (decoded.role === 'admin' || decoded.role === 'Super Admin' || decoded.role === 'moderator' || decoded.role === 'Moderator') {
          is_admin_user = true;
          if (req.body.is_on_behalf) {
            is_on_behalf = 1;
          }
        }
      } catch (e) {}
    }

    try {
        if (user_id === 'anonymous') {
            return res.status(401).json({ error: 'Login required to submit a review' });
        }

        // Ensure user actually exists in the database
        const userExists = db.prepare('SELECT id FROM Users WHERE id = ?').get(user_id);
        if (!userExists) {
            return res.status(401).json({ 
                success: false, 
                message: 'Your session is invalid or your user account was not found. Please log out and sign in again.' 
            });
        }
        
        const minLenSetting = db.prepare("SELECT value FROM Settings WHERE key_name = 'min_review_length'").get() as any;
        const maxLenSetting = db.prepare("SELECT value FROM Settings WHERE key_name = 'max_review_length'").get() as any;
        const min_len = minLenSetting ? parseInt(minLenSetting.value) : 20;
        const max_len = maxLenSetting ? parseInt(maxLenSetting.value) : 2000;
        
        if (description && description.length < min_len) {
            return res.status(400).json({ success: false, message: `Description must be at least ${min_len} characters long.` });
        }
        if (description && description.length > max_len) {
            return res.status(400).json({ success: false, message: `Description must be at most ${max_len} characters long.` });
        }
        
        if (req.body.profile_picture) {
          req.body.profile_picture = await optimizeBase64Image(req.body.profile_picture, 'profile', page_id || Date.now().toString());
        }
        let profile_picture = req.body.profile_picture;
        
        if (req.body.proof_images && Array.isArray(req.body.proof_images)) {
          const optimizedImages = [];
          for (let i = 0; i < req.body.proof_images.length; i++) {
             const img = req.body.proof_images[i];
             if (img) {
                 const optimized = await optimizeBase64Image(img, 'proof', `${Date.now()}-${i}`);
                 optimizedImages.push(optimized);
             }
          }
          req.body.proof_image = JSON.stringify(optimizedImages);
        } else if (req.body.proof_image) {
          req.body.proof_image = JSON.stringify([await optimizeBase64Image(req.body.proof_image, 'proof', Date.now().toString())]);
        }

        // Check if page with URL already exists
        if (!page_id) {
          if (page_url) {
            let url = page_url.trim();
            if (!url.startsWith('http')) {
              url = 'https://' + url;
            }
            let urlNoSlash = url;
            if (url.endsWith('/')) {
                urlNoSlash = url.slice(0, -1);
            }
            const urlWithSlash = urlNoSlash + '/';
            let urlNoWwwNoSlash = urlNoSlash.replace('https://www.', 'https://');
            let urlNoWwwWithSlash = urlWithSlash.replace('https://www.', 'https://');
            
            const existing = db.prepare('SELECT id FROM FacebookPages WHERE facebook_url COLLATE NOCASE IN (?, ?, ?, ?) LIMIT 1').get(urlNoSlash, urlWithSlash, urlNoWwwNoSlash, urlNoWwwWithSlash) as any;
            if (existing) {
              page_id = existing.id;
            }
          }
        }

        // Create new page if missing (and somehow didn't exist)
        if (!page_id && page_name) {
          page_id = Date.now().toString();
          db.prepare(`
            INSERT INTO FacebookPages (
              id, current_name, facebook_url, website_url, category, sub_category, contact_number,
              extra_contacts, payment_methods, other_urls, profile_picture, page_details, added_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'users')
          `).run(
            page_id, page_name, page_url || '', website_url || null, category || null, sub_category || null, contact_number || null,
            extra_contacts || null, payment_methods || null, other_urls || null, profile_picture || null, page_details || null
          );
        } else {
          // Update existing page with new info
          const page = db.prepare('SELECT contact_number, website_url, extra_contacts, payment_methods, other_urls, profile_picture, page_details FROM FacebookPages WHERE id = ?').get(page_id) as any;
          if (page) {
            let updates: any[] = [];
            let params: any[] = [];

            if (contact_number) {
               const existing_numbers = page.contact_number ? page.contact_number.split(',').map((s: string) => s.trim()) : [];
               if (!existing_numbers.includes(contact_number)) {
                  existing_numbers.push(contact_number);
                  updates.push('contact_number = ?');
                  params.push(existing_numbers.join(', '));
               }
            }
            if (website_url) {
               const existing_urls = page.website_url ? page.website_url.split(',').map((s: string) => s.trim()) : [];
               if (!existing_urls.includes(website_url)) {
                  existing_urls.push(website_url);
                  updates.push('website_url = ?');
                  params.push(existing_urls.join(', '));
               }
            }
            if (extra_contacts !== undefined && extra_contacts !== '[]') {
                updates.push('extra_contacts = ?');
                params.push(extra_contacts);
            }
            if (payment_methods !== undefined && payment_methods !== '[]') {
                updates.push('payment_methods = ?');
                params.push(payment_methods);
            }
            if (other_urls !== undefined && other_urls !== '[]') {
                updates.push('other_urls = ?');
                params.push(other_urls);
            }
            if (profile_picture) {
                updates.push('profile_picture = ?');
                params.push(profile_picture);
            }
            if (page_details) {
                updates.push('page_details = ?');
                params.push(page_details);
            }

            if (updates.length > 0) {
               const query = `UPDATE FacebookPages SET ${updates.join(', ')} WHERE id = ?`;
               params.push(page_id);
               db.prepare(query).run(...params);
            }
          }
        }

        // Check if bkash number is provided and we need to log it
        if (bkash_number) {
          // If the page exists and the bkash_number doesn't already exist on page's profile, append it
          if (page_id) {
            try {
              const pageObj = db.prepare('SELECT contact_number, extra_contacts FROM FacebookPages WHERE id = ?').get(page_id) as any;
              if (pageObj) {
                const existingNumbers = new Set<string>();
                if (pageObj.contact_number) {
                  pageObj.contact_number.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((n: string) => existingNumbers.add(n));
                }
                if (pageObj.extra_contacts) {
                  try {
                    if (pageObj.extra_contacts.startsWith('[') && pageObj.extra_contacts.endsWith(']')) {
                      const arr = JSON.parse(pageObj.extra_contacts);
                      if (Array.isArray(arr)) {
                        arr.map((s: any) => String(s).trim()).filter(Boolean).forEach((n: string) => existingNumbers.add(n));
                      }
                    } else {
                      pageObj.extra_contacts.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((n: string) => existingNumbers.add(n));
                    }
                  } catch (e) {
                    pageObj.extra_contacts.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((n: string) => existingNumbers.add(n));
                  }
                }

                const trimmedBkash = bkash_number.trim();
                if (trimmedBkash && !existingNumbers.has(trimmedBkash)) {
                  if (!pageObj.contact_number) {
                    db.prepare('UPDATE FacebookPages SET contact_number = ? WHERE id = ?').run(trimmedBkash, page_id);
                  } else {
                    let updatedExtra = '';
                    if (pageObj.extra_contacts) {
                      if (pageObj.extra_contacts.startsWith('[') && pageObj.extra_contacts.endsWith(']')) {
                        try {
                          const arr = JSON.parse(pageObj.extra_contacts);
                          if (Array.isArray(arr)) {
                            arr.push(trimmedBkash);
                            updatedExtra = JSON.stringify(arr);
                          } else {
                            updatedExtra = pageObj.extra_contacts + ', ' + trimmedBkash;
                          }
                        } catch (e) {
                          updatedExtra = pageObj.extra_contacts + ', ' + trimmedBkash;
                        }
                      } else {
                        updatedExtra = pageObj.extra_contacts + ', ' + trimmedBkash;
                      }
                    } else {
                      updatedExtra = trimmedBkash;
                    }
                    db.prepare('UPDATE FacebookPages SET extra_contacts = ? WHERE id = ?').run(updatedExtra, page_id);
                  }
                }
              }
            } catch (err) {
              console.error("Error updating page profile with bkash number:", err);
            }
          }

          const isFraud = review_type === 'Fraud Report';
          const isSuspicious = review_type === 'Suspicious' || review_type === 'Bad';
          let existingNumber = null;
          try {
             existingNumber = db.prepare('SELECT * FROM ContactNumbers WHERE number = ?').get(bkash_number) as any;
          } catch (e) {}

          const pageIdToLink = page_id || '';
          
          if (existingNumber) {
            let parsedLinks = existingNumber.linked_page_ids ? existingNumber.linked_page_ids.split(',').map((s:string) => s.trim()) : [];
            if (pageIdToLink && !parsedLinks.includes(pageIdToLink)) {
              parsedLinks.push(pageIdToLink);
            }
            const newLinkedCount = parsedLinks.filter((s: string) => s).length;
            db.prepare(`
              UPDATE ContactNumbers 
              SET total_mentions = total_mentions + 1,
                  fraud_report_count = fraud_report_count + ?,
                  suspicious_report_count = suspicious_report_count + ?,
                  linked_page_ids = ?,
                  linked_page_count = ?,
                  last_reported_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(
              isFraud ? 1 : 0, 
              isSuspicious ? 1 : 0, 
              parsedLinks.join(','),
              newLinkedCount,
              existingNumber.id
            );
          } else {
            const newCount = pageIdToLink ? 1 : 0;
            db.prepare(`
              INSERT INTO ContactNumbers (id, number, type, total_mentions, fraud_report_count, suspicious_report_count, linked_page_ids, linked_page_count, added_by) 
              VALUES (?, ?, 'Payment Number', 1, ?, ?, ?, ?, 'users')
            `).run(
              crypto.randomUUID(), 
              bkash_number, 
              isFraud ? 1 : 0, 
              isSuspicious ? 1 : 0, 
              pageIdToLink,
              newCount
            );
          }
        }
        
        let id;
        let existingReview: any = null;
        if (req.body.editReviewId) {
            const checkRev = db.prepare('SELECT id, user_id FROM Reviews WHERE id = ?').get(req.body.editReviewId) as any;
            if (checkRev) {
                if (is_admin_user || checkRev.user_id === user_id) {
                    existingReview = checkRev;
                } else {
                    return res.status(403).json({ error: 'You do not have permission to edit this review.' });
                }
            }
        } else if (user_id !== 'anonymous' && is_on_behalf === 0) {
            const limitOne = db.prepare("SELECT value FROM Settings WHERE key_name = 'limit_one_review_per_page'").get() as any;
            if (!limitOne || limitOne.value === 'true') {
                existingReview = db.prepare('SELECT id FROM Reviews WHERE page_id = ? AND user_id = ?').get(page_id, user_id) as any;
            }
        }

        let initialStatus = 'Pending';
        if (is_admin_user) {
            initialStatus = 'Published';
        } else {
            try {
                const autoApprove = db.prepare("SELECT value FROM Settings WHERE key_name = 'auto_approve_reviews'").get() as any;
                if (autoApprove && autoApprove.value === 'true' && (review_type === 'Safe' || review_type === 'Neutral' || review_type === 'Good')) {
                    initialStatus = 'Published';
                }

                if (review_type === 'Fraud Report' || review_type === 'Suspicious' || review_type === 'Bad') {
                    const reqFraudApproveGlob = db.prepare("SELECT value FROM Settings WHERE key_name = 'require_admin_approval_fraud'").get() as any;
                    const globalRequireFraudApprove = !reqFraudApproveGlob || reqFraudApproveGlob.value === 'true'; // Default to true if not set

                    const pageInfo = db.prepare("SELECT require_manual_fraud_approval FROM FacebookPages WHERE id = ?").get(page_id) as any;
                    const pageRequireFraudApprove = pageInfo && pageInfo.require_manual_fraud_approval === 1;

                    if (pageRequireFraudApprove || globalRequireFraudApprove) {
                        initialStatus = 'Pending';
                    } else {
                        initialStatus = 'Published';
                    }
                }
            } catch (e) {}
        }

        if (existingReview) {
            id = existingReview.id;
            try {
                db.prepare(`
                    UPDATE Reviews 
                    SET review_type = ?, star_rating = ?, title = ?, description = ?, date_of_experience = ?, bkash_number = ?, facebook_post_link = ?, order_amount = ?, proof_image = ?, updated_at = CURRENT_TIMESTAMP, is_on_behalf = ?, on_behalf_name = ?
                    WHERE id = ?
                `).run(review_type, parseInt(star_rating) || 5, title, description, date_of_experience, bkash_number, facebook_post_link || null, order_amount || null, req.body.proof_image || null, is_on_behalf, on_behalf_name || null, id);
            } catch (err: any) {
                console.error("Update error:", err);
                console.error("Failing update review parameters:", {
                  id,
                  page_id,
                  user_id,
                  review_type,
                  star_rating,
                  title,
                  bkash_number,
                  facebook_post_link
                });
                return res.status(500).json({ error: 'Server error', message: err.message });
            }
        } else {
            id = Date.now().toString();
            try {
                db.prepare(`
                    INSERT INTO Reviews (id, page_id, user_id, review_type, star_rating, title, description, date_of_experience, bkash_number, facebook_post_link, order_amount, proof_image, status, is_on_behalf, on_behalf_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, page_id, user_id || 'anonymous', review_type, parseInt(star_rating) || 5, title, description, date_of_experience, bkash_number, facebook_post_link || null, order_amount || null, req.body.proof_image || null, initialStatus, is_on_behalf, on_behalf_name || null);
            } catch (err: any) {
                console.error("Insert error:", err);
                console.error("Failing insert review parameters:", {
                  id,
                  page_id,
                  user_id,
                  review_type,
                  star_rating,
                  title,
                  bkash_number,
                  facebook_post_link,
                  initialStatus
                });
                return res.status(500).json({ error: 'Server error', message: err.message });
            }
        }

        // Auto-recalculate page stats so admin columns always reflect real counts
        try {
          const getScore = (key: string, def: number) => {
            try {
              const s = db.prepare("SELECT value FROM Settings WHERE key_name = ?").get(key) as any;
              return s ? Number(s.value) : def;
            } catch { return def; }
          };
          const score_safe = getScore('score_safe', 5);
          const score_suspicious = getScore('score_suspicious', -10);
          const score_fraud = getScore('score_fraud', -25);

          const pageReviews = db.prepare('SELECT review_type, star_rating FROM Reviews WHERE page_id = ? AND status IN ("Published", "Verified", "Approved")').all(page_id) as any[];
          let total_score = 50;
          let totalReviews = pageReviews.length;
          let sumRatings = 0, safeCount = 0, neutralCount = 0, suspiciousCount = 0, fraudCount = 0;
          for (const r of pageReviews) {
            sumRatings += r.star_rating || 5;
            if (r.review_type === 'Safe' || r.review_type === 'Good') { total_score += score_safe; safeCount++; }
            else if (r.review_type === 'Suspicious' || r.review_type === 'Bad') { total_score += score_suspicious; suspiciousCount++; }
            else if (r.review_type === 'Fraud Report') { total_score += score_fraud; fraudCount++; }
            else if (r.review_type === 'Neutral') { neutralCount++; }
          }
          const avgRating = totalReviews > 0 ? sumRatings / totalReviews : 0;
          const trustedScore = total_score + (avgRating * 5) + (safeCount * 2) - (fraudCount * 10);

          let new_badge = 'Under Review';
          if (total_score >= 80) new_badge = 'Verified Marketplace Seller';
          else if (total_score < 0) new_badge = 'Reported as Fraud';
          else if (total_score < 50) new_badge = 'Suspicious';

          // Preserve manual fraud listing overrides
          const pageRow = db.prepare('SELECT status_badge, is_fraud_listed FROM FacebookPages WHERE id = ?').get(page_id) as any;
          if (pageRow?.is_fraud_listed === 1) new_badge = 'Reported as Fraud';

          db.prepare(`
            UPDATE FacebookPages
            SET total_reviews = ?, fraud_report_count = ?, safe_review_count = ?, neutral_review_count = ?, suspicious_report_count = ?,
                average_rating = ?, trust_score = ?, status_badge = ?, trusted_ranking_score = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(totalReviews, fraudCount, safeCount, neutralCount, suspiciousCount, avgRating, total_score, new_badge, trustedScore, page_id);
        } catch (recalcErr) {
          console.error('[Review] Auto-recalculate stats failed:', recalcErr);
        }

        res.json({ success: true, id, page_id });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'Server error', message: e.message });
    }
  });

  app.get('/api/reviews/check/:page_id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.json(null);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const review = db.prepare('SELECT * FROM Reviews WHERE page_id = ? AND user_id = ?').get(req.params.page_id, decoded.id);
      res.json(review || null);
    } catch (e) {
      res.json(null);
    }
  });

  app.get('/api/reviews/:id', (req, res) => {
    try {
      const review = db.prepare('SELECT * FROM Reviews WHERE id = ?').get(req.params.id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      res.json(review);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch review' });
    }
  });

  app.delete('/api/reviews/:id', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const review = db.prepare('SELECT user_id FROM Reviews WHERE id = ?').get(req.params.id) as any;
      if (!review) return res.status(404).json({ error: 'Not found' });
      if (review.user_id !== decoded.id && decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      
      db.prepare('DELETE FROM AbuseReports WHERE target_type = ? AND target_id = ?').run('Review', req.params.id);
      db.prepare('DELETE FROM OwnerReplies WHERE review_id = ?').run(req.params.id);
      db.prepare('DELETE FROM Disputes WHERE review_id = ?').run(req.params.id);
      db.prepare('DELETE FROM Reviews WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/user/reviews', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 50) limit = 50;

      if (req.query.page) {
        const page = Math.max(1, parseInt(req.query.page as string || '1'));
        const offset = (page - 1) * limit;
        const totalCountResult = db.prepare("SELECT COUNT(*) as count FROM Reviews r WHERE r.user_id = ?").get(decoded.id) as any;
        const totalCount = totalCountResult ? totalCountResult.count : 0;
        const reviews = db.prepare(`
          SELECT r.id, r.page_id, r.user_id, r.review_type, r.star_rating, r.title, r.description, r.date_of_experience, r.bkash_number, r.bkash_account_type, r.bkash_display_name, r.status, r.created_at, r.updated_at,
                 p.current_name as page_name, p.profile_picture
          FROM Reviews r
          JOIN FacebookPages p ON r.page_id = p.id
          WHERE r.user_id = ?
          ORDER BY COALESCE(r.updated_at, r.created_at) DESC
          LIMIT ? OFFSET ?
        `).all(decoded.id, limit, offset);
        res.json({
          data: reviews,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        });
      } else {
        const reviews = db.prepare(`
          SELECT r.id, r.page_id, r.user_id, r.review_type, r.star_rating, r.title, r.description, r.date_of_experience, r.bkash_number, r.bkash_account_type, r.bkash_display_name, r.status, r.created_at, r.updated_at,
                 p.current_name as page_name, p.profile_picture
          FROM Reviews r
          JOIN FacebookPages p ON r.page_id = p.id
          WHERE r.user_id = ?
          ORDER BY COALESCE(r.updated_at, r.created_at) DESC
          LIMIT ?
        `).all(decoded.id, limit);
        res.json(reviews);
      }
    } catch (e) {
      console.error(e);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  
  app.post('/api/user/disputes', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { page_id, review_id, reason, description } = req.body;
      
      const existingDispute = db.prepare('SELECT id FROM Disputes WHERE review_id = ? AND user_id = ? AND status IN (?, ?)').get(review_id, decoded.id, 'Open', 'Under Review');
      if (existingDispute) {
        return res.status(400).json({ error: 'You already have an active dispute for this review.' });
      }

      const disputeId = crypto.randomUUID();
      db.prepare('INSERT INTO Disputes (id, page_id, review_id, user_id, reason, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
        .run(disputeId, page_id, review_id, decoded.id, reason, description || '', 'Open');
        
      res.json({ success: true });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/user/claims', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { page_id, claimer_username, contact_email, contact_phone } = req.body;
      
      let target_page_id = req.body.page_id;
      if (!target_page_id || target_page_id === 'new') {
        const { page_url, page_name } = req.body;
        if (!page_url || !page_name) return res.status(400).json({ error: 'Page URL and Name are required to create a new page.' });
        
        target_page_id = Date.now().toString();
        // check if url already exists
        let url = page_url.trim();
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        let urlNoSlash = url;
        if (url.endsWith('/')) {
            urlNoSlash = url.slice(0, -1);
        }
        const urlWithSlash = urlNoSlash + '/';
        let urlNoWwwNoSlash = urlNoSlash.replace('https://www.', 'https://');
        let urlNoWwwWithSlash = urlWithSlash.replace('https://www.', 'https://');
        
        const existing = db.prepare('SELECT id FROM FacebookPages WHERE facebook_url COLLATE NOCASE IN (?, ?, ?, ?) LIMIT 1').get(urlNoSlash, urlWithSlash, urlNoWwwNoSlash, urlNoWwwWithSlash) as any;
        if (existing) {
          target_page_id = existing.id;
        } else {
          db.prepare('INSERT INTO FacebookPages (id, current_name, facebook_url, category, added_by) VALUES (?, ?, ?, ?, \'users\')')
            .run(target_page_id, page_name, page_url.trim(), 'Other');
        }
      }

      const page = db.prepare('SELECT claim_status FROM FacebookPages WHERE id = ?').get(target_page_id) as any;
      if (!page) return res.status(404).json({ error: 'Page not found' });
      if (page.claim_status === 'Claimed') {
        return res.status(400).json({ error: 'This page has already been claimed.' });
      }
      
      const claimId = crypto.randomUUID();
      db.prepare('INSERT INTO Claims (id, page_id, user_id, claimer_username, contact_email, contact_phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
        .run(claimId, target_page_id, decoded.id, claimer_username, contact_email || '', contact_phone || '', 'Pending Verification');
        
      res.json({ success: true });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/user/claims', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 50) limit = 50;

      if (req.query.page) {
        const page = Math.max(1, parseInt(req.query.page as string || '1'));
        const offset = (page - 1) * limit;
        const totalCountResult = db.prepare("SELECT COUNT(*) as count FROM Claims c WHERE c.user_id = ?").get(decoded.id) as any;
        const totalCount = totalCountResult ? totalCountResult.count : 0;
        const claims = db.prepare(`
          SELECT c.id, c.page_id, c.user_id, c.claimer_username, c.contact_email, c.contact_phone, c.status, c.created_at,
                 p.current_name as page_name, p.facebook_url as facebook_url
          FROM Claims c
          JOIN FacebookPages p ON c.page_id = p.id
          WHERE c.user_id = ?
          ORDER BY c.created_at DESC
          LIMIT ? OFFSET ?
        `).all(decoded.id, limit, offset);
        res.json({
          data: claims,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        });
      } else {
        const claims = db.prepare(`
          SELECT c.id, c.page_id, c.user_id, c.claimer_username, c.contact_email, c.contact_phone, c.status, c.created_at,
                 p.current_name as page_name, p.facebook_url as facebook_url
          FROM Claims c
          JOIN FacebookPages p ON c.page_id = p.id
          WHERE c.user_id = ?
          ORDER BY c.created_at DESC
          LIMIT ?
        `).all(decoded.id, limit);
        res.json(claims);
      }
    } catch (e) {
      console.error(e);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.get('/api/user/disputes', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let limit = Math.max(1, parseInt(req.query.limit as string || '20'));
      if (limit > 50) limit = 50;

      if (req.query.page) {
        const page = Math.max(1, parseInt(req.query.page as string || '1'));
        const offset = (page - 1) * limit;
        const totalCountResult = db.prepare("SELECT COUNT(*) as count FROM Disputes d WHERE d.user_id = ?").get(decoded.id) as any;
        const totalCount = totalCountResult ? totalCountResult.count : 0;
        const disputes = db.prepare(`
          SELECT d.id, d.page_id, d.review_id, d.user_id, d.reason, d.description, d.status, d.created_at,
                 p.current_name as page_name, r.title as review_title
          FROM Disputes d
          JOIN FacebookPages p ON d.page_id = p.id
          LEFT JOIN Reviews r ON d.review_id = r.id
          WHERE d.user_id = ?
          ORDER BY d.created_at DESC
          LIMIT ? OFFSET ?
        `).all(decoded.id, limit, offset);
        res.json({
          data: disputes,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        });
      } else {
        const disputes = db.prepare(`
          SELECT d.id, d.page_id, d.review_id, d.user_id, d.reason, d.description, d.status, d.created_at,
                 p.current_name as page_name, r.title as review_title
          FROM Disputes d
          JOIN FacebookPages p ON d.page_id = p.id
          LEFT JOIN Reviews r ON d.review_id = r.id
          WHERE d.user_id = ?
          ORDER BY d.created_at DESC
          LIMIT ?
        `).all(decoded.id, limit);
        res.json(disputes);
      }
    } catch (e) {
      console.error(e);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.get('/api/admin/google-sheet-settings', requireAdmin, (req, res) => {
    try {
      const type = req.query.type as string || 'Facebook Pages';
      const settings = db.prepare('SELECT * FROM GoogleSheetSyncSettings WHERE import_type = ?').get(type);
      res.json(settings || null);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/google-sheet-settings', requireAdmin, (req, res) => {
    try {
      const { enabled, spreadsheet_id, sheet_name, import_type, sync_interval } = req.body;
      const id = req.body.id || crypto.randomUUID();
      
      const existing = db.prepare('SELECT id FROM GoogleSheetSyncSettings WHERE import_type = ?').get(import_type);
      if (existing) {
        db.prepare('UPDATE GoogleSheetSyncSettings SET enabled = ?, spreadsheet_id = ?, sheet_name = ?, sync_interval = ?, updated_at = CURRENT_TIMESTAMP WHERE import_type = ?')
          .run(enabled ? 1 : 0, spreadsheet_id, sheet_name, sync_interval, import_type);
      } else {
        db.prepare('INSERT INTO GoogleSheetSyncSettings (id, enabled, spreadsheet_id, sheet_name, import_type, sync_interval) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, enabled ? 1 : 0, spreadsheet_id, sheet_name, import_type, sync_interval);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/google-sheet-logs', requireAdmin, (req, res) => {
    try {
      const type = req.query.type as string;
      if (!type) return res.json([]);
      
      // Keep only 5 recent logs per type
      db.prepare(`
        DELETE FROM GoogleSheetSyncLogs 
        WHERE import_type = ? AND id NOT IN (
          SELECT id FROM GoogleSheetSyncLogs 
          WHERE import_type = ? 
          ORDER BY started_at DESC 
          LIMIT 5
        )
      `).run(type, type);

      const logs = db.prepare('SELECT * FROM GoogleSheetSyncLogs WHERE import_type = ? ORDER BY started_at DESC LIMIT 5').all(type);
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/google-sheet-sync/trigger', requireAdmin, async (req, res) => {
    // Actually we will implement the mock google sheet trigger or call a function
    try {
      const admin_id = (req as any).user.id;
      const { import_type } = req.body;
      const jobId = startGoogleSheetSyncJob(admin_id, import_type);
      res.json({ success: true, jobId });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    const serveIndexHtml = (req: any, res: any) => {
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          
          // Fetch verification snippet dynamically from SQLite DB
          const row = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('head_verification_code') as any;
          if (row && row.value) {
            html = html.replace('</head>', `${row.value}\n</head>`);
          }
          
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        }
        res.sendFile(indexPath);
      } catch (err) {
        console.error("Error serving dynamic index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    };

    app.get('/', serveIndexHtml);
    app.get('/index.html', serveIndexHtml);

    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, 'utf-8');
          
          // Fetch verification snippet dynamically from SQLite DB
          const row = db.prepare('SELECT value FROM Settings WHERE key_name = ?').get('head_verification_code') as any;
          if (row && row.value) {
            html = html.replace('</head>', `${row.value}\n</head>`);
          }
          
          res.setHeader('Content-Type', 'text/html');
          return res.send(html);
        }
        res.sendFile(indexPath);
      } catch (err) {
        console.error("Error serving dynamic index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  }

  // Instant Auto-Migration for HTML entity names
  try {
    const pagesWithEntities = db.prepare("SELECT id, current_name FROM FacebookPages WHERE current_name LIKE '%&#%'").all() as any[];
    console.log(`[Auto-Migration] Found ${pagesWithEntities.length} pages containing HTML entities in their names.`);
    for (const page of pagesWithEntities) {
      if (page.current_name && page.current_name.includes('&#')) {
        const decoded = decodeHTMLEntities(page.current_name);
        console.log(`[Auto-Migration] Decoding name for page ID ${page.id}: "${page.current_name}" -> "${decoded}"`);
        db.prepare("UPDATE FacebookPages SET current_name = ? WHERE id = ?").run(decoded, page.id);
      }
    }

    const pagesWithUnicode = db.prepare("SELECT id, current_name FROM FacebookPages WHERE current_name LIKE '%\\u%' OR current_name LIKE '%\\U%'").all() as any[];
    console.log(`[Auto-Migration] Found ${pagesWithUnicode.length} pages containing Unicode escape sequences in their names.`);
    for (const page of pagesWithUnicode) {
      const decoded = page.current_name.replace(/\\{1,2}u([0-9a-fA-F]{4})/gi, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
      });
      console.log(`[Auto-Migration] Decoding unicode name for page ID ${page.id}: "${page.current_name}" -> "${decoded}"`);
      db.prepare("UPDATE FacebookPages SET current_name = ? WHERE id = ?").run(decoded, page.id);
    }
  } catch (migErr) {
    console.error(`[Auto-Migration] Failed decoding existing entity page names:`, migErr);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Automated Polling (Cron Job) for Google Sheet Sync
  setInterval(async () => {
    try {
      const settings = db.prepare(`SELECT * FROM GoogleSheetSyncSettings WHERE enabled = 1`).all() as any[];
      const now = new Date();
      for (const setting of settings) {
        if (!setting.sync_interval || setting.sync_interval === 'Manual only') continue;
        
        let shouldSync = false;
        if (!setting.last_sync_at) {
          shouldSync = true;
        } else {
          // SQL returns something like '2023-01-01 10:00:00' normally, but we use string parsing
          let lastSyncStr = setting.last_sync_at;
          lastSyncStr = lastSyncStr.replace(' ', 'T');
          if (!lastSyncStr.endsWith('Z')) lastSyncStr += 'Z';
          const lastSync = new Date(lastSyncStr);
          const diffMs = now.getTime() - lastSync.getTime();
          const diffMins = diffMs / 60000;
          const diffHours = diffMs / 3600000;

          if (setting.sync_interval === 'Every 5 minutes' && diffMins >= 5) shouldSync = true;
          else if (setting.sync_interval === 'Every 10 minutes' && diffMins >= 10) shouldSync = true;
          else if (setting.sync_interval === 'Every 15 minutes' && diffMins >= 15) shouldSync = true;
          else if (setting.sync_interval === 'Every 30 minutes' && diffMins >= 30) shouldSync = true;
          else if (setting.sync_interval === 'Hourly' || setting.sync_interval === 'Every 1 hour') {
             if (diffHours >= 1) shouldSync = true;
          }
          else if (setting.sync_interval === 'Every 6 hours' && diffHours >= 6) shouldSync = true;
          else if (setting.sync_interval === 'Every 12 hours' && diffHours >= 12) shouldSync = true;
          else if (setting.sync_interval === 'Daily' || setting.sync_interval === 'Every 24 hours') {
             if (diffHours >= 24) shouldSync = true;
          }
        }

        if (shouldSync) {
          console.log(`Cron: Triggering automated sync for ${setting.import_type}`);
          await fetch(`http://localhost:${PORT}/api/admin/google-sheet-sync/trigger`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${CRON_SECRET}`
            },
            body: JSON.stringify({ import_type: setting.import_type })
          });
        }
      }
    } catch (e: any) {
      console.error('Error running cron job:', e);
    }
  }, 60000); // Ticks every 1 minute
}

startServer();
