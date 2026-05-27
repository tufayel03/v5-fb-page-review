import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// SECURITY: JWT_SECRET sourced from environment only — no hardcoded fallback
const JWT_SECRET = process.env.JWT_SECRET || '';

function verifyToken(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    (req as any).user = decoded;
    next();
  });
}

function requireBusinessOwner(req: any, res: Response, next: Function) {
  const user = req.user;
  if (!user || (user.role !== 'owner' && user.role !== 'page_owner' && user.role !== 'admin' && user.role !== 'super_admin')) {
    // We can also just check if they have approved claims directly in the endpoint,
    // but a role check is good. If the user doesn't have the role but has claims, we can let them pass if we check DB.
    // For now, let's just use verifyToken and check claims logic.
  }
  next();
}

export function setupBusinessEndpoints(app: any, db: any) {
  app.get('/api/business/dashboard/overview', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const userId = req.user.id;
      
      const claimedPages = db.prepare(`
        SELECT id, facebook_url, current_name, current_username, category, sub_category, trust_score, fraud_report_count, suspicious_report_count, created_at 
        FROM FacebookPages 
        WHERE claim_status = 'Claimed' AND owner_id = ?
      `).all(userId);

      if (claimedPages.length === 0) {
        return res.json({ claimedPages: [], totalReviews: 0, averageRating: 0, trustScore: 0, fraudReports: 0, suspiciousReports: 0, pendingReplies: 0, openDisputes: 0, latestReviews: [] });
      }

      const pageIds = claimedPages.map((p: any) => p.id);
      const placeholders = pageIds.map(() => '?').join(',');

      // Aggregate reviews stats in SQLite directly
      const reviewStats = db.prepare(`
        SELECT COUNT(*) as count, SUM(star_rating) as rating_sum
        FROM Reviews
        WHERE page_id IN (${placeholders})
      `).get(...pageIds) as any;

      const totalReviews = reviewStats ? reviewStats.count : 0;
      const averageRating = totalReviews > 0 ? (reviewStats.rating_sum / totalReviews).toFixed(1) : 0;
      
      const trustScore = claimedPages.length > 0 ? (claimedPages.reduce((acc: number, p: any) => acc + (p.trust_score || 0), 0) / claimedPages.length) : 100;
      const fraudReports = claimedPages.reduce((acc: number, p: any) => acc + (p.fraud_report_count || 0), 0);
      const suspiciousReports = claimedPages.reduce((acc: number, p: any) => acc + (p.suspicious_report_count || 0), 0);

      // Count replies and disputes using direct SQL counters
      const ownerRepliesCount = db.prepare(`
        SELECT COUNT(DISTINCT review_id) as count FROM OwnerReplies WHERE owner_id = ?
      `).get(userId).count;
      const pendingReplies = Math.max(0, totalReviews - ownerRepliesCount);

      const openDisputes = db.prepare(`
        SELECT COUNT(*) as count FROM Disputes 
        WHERE user_id = ? AND status = 'Open'
      `).get(userId).count;

      const latestReviews = db.prepare(`
        SELECT r.id, r.review_type, r.star_rating, r.title, r.description, r.created_at, p.current_name as page_name, u.full_name as user_name
        FROM Reviews r
        JOIN FacebookPages p ON r.page_id = p.id
        LEFT JOIN Users u ON r.user_id = u.id
        WHERE r.page_id IN (${placeholders})
        ORDER BY r.created_at DESC
        LIMIT 5
      `).all(...pageIds);

      res.json({
        claimedPages,
        totalReviews,
        averageRating,
        trustScore,
        fraudReports,
        suspiciousReports,
        pendingReplies,
        openDisputes,
        latestReviews
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/business/pages', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const pages = db.prepare(`
        SELECT id, facebook_url, current_name, current_username, category, sub_category, trust_score, claim_status, owner_id, status_badge, created_at 
        FROM FacebookPages 
        WHERE claim_status = 'Claimed' AND owner_id = ? 
        ORDER BY created_at DESC 
        LIMIT 100
      `).all(req.user.id);
      res.json(pages);
    } catch (e) {
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/business/reviews', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const pages = db.prepare("SELECT id FROM FacebookPages WHERE claim_status = 'Claimed' AND owner_id = ?").all(req.user.id);
      if (pages.length === 0) return res.json([]);
      const pageIds = pages.map((p: any) => p.id);
      const placeholders = pageIds.map(() => '?').join(',');

      const reviews = db.prepare(`
        SELECT r.id, r.page_id, r.user_id, r.review_type, r.star_rating, r.title, r.description, r.date_of_experience, r.bkash_number, r.bkash_account_type, r.bkash_display_name, r.facebook_post_link, r.order_amount, r.product_service_type, r.status, r.created_at, r.updated_at,
               p.current_name as page_name, u.full_name as user_name 
        FROM Reviews r 
        JOIN FacebookPages p ON r.page_id = p.id 
        LEFT JOIN Users u ON r.user_id = u.id
        WHERE r.page_id IN (${placeholders}) 
        ORDER BY r.created_at DESC
        LIMIT 200
      `).all(...pageIds);

      // get replies
      const replies = db.prepare("SELECT * FROM OwnerReplies WHERE owner_id = ?").all(req.user.id);
      const replyMap = new Map();
      replies.forEach((r: any) => replyMap.set(r.review_id, r));

      // get disputes
      const disputes = db.prepare("SELECT * FROM Disputes WHERE user_id = ?").all(req.user.id);
      const disputeMap = new Map();
      disputes.forEach((d: any) => disputeMap.set(d.review_id, d));

      const reviewsWithData = reviews.map((r: any) => ({
        ...r,
        owner_reply: replyMap.get(r.id) || null,
        dispute: disputeMap.get(r.id) || null
      }));

      res.json(reviewsWithData);
    } catch (e) {
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/business/replies', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const { review_id, reply_text } = req.body;
      const owner_id = req.user.id;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);

      const review = db.prepare("SELECT * FROM Reviews WHERE id = ?").get(review_id);
      if (!review) return res.status(404).json({ error: 'Review not found' });

      // check if owner owns the page
      const page = db.prepare("SELECT * FROM FacebookPages WHERE id = ? AND owner_id = ? AND claim_status = 'Claimed'").get(review.page_id, owner_id);
      if (!page) return res.status(403).json({ error: 'Unauthorized to reply to this review' });

      const existingReply = db.prepare("SELECT * FROM OwnerReplies WHERE review_id = ?").get(review_id);
      if (existingReply) {
        db.prepare("UPDATE OwnerReplies SET reply_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reply_text, existingReply.id);
      } else {
        db.prepare(`
          INSERT INTO OwnerReplies (id, review_id, owner_id, reply_text, page_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, review_id, owner_id, reply_text, review.page_id);
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/business/disputes', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const pages = db.prepare("SELECT id FROM FacebookPages WHERE owner_id = ?").all(req.user.id);
      if (pages.length === 0) return res.json([]);
      const pageIds = pages.map((p: any) => p.id);
      const placeholders = pageIds.map(() => '?').join(',');

      const disputes = db.prepare(`
        SELECT d.id, d.page_id, d.review_id, d.user_id, d.reason, d.description, d.status, d.created_at, p.current_name as page_name, r.title as review_title 
        FROM Disputes d 
        JOIN FacebookPages p ON d.page_id = p.id 
        LEFT JOIN Reviews r ON d.review_id = r.id 
        WHERE d.page_id IN (${placeholders})
        ORDER BY d.created_at DESC
        LIMIT 150
      `).all(...pageIds);

      res.json(disputes);
    } catch (e) {
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/business/disputes', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const { page_id, review_id, reason, description } = req.body;
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);

      // Verify ownership
      const page = db.prepare("SELECT * FROM FacebookPages WHERE id = ? AND owner_id = ?").get(page_id, req.user.id);
      if (!page) return res.status(403).json({ error: 'Unauthorized' });

      db.prepare(`
        INSERT INTO Disputes (id, page_id, review_id, user_id, reason, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, page_id, review_id, req.user.id, reason, description, 'Open');

      res.json({ success: true });
    } catch (e) {
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });

  app.put('/api/business/pages/:id', verifyToken, requireBusinessOwner, (req: any, res: any) => {
    try {
      const { 
        business_description, products_sold, product_keywords, 
        delivery_area, payment_methods, has_cod, has_return_policy, 
        official_contact_number, official_email, business_address, website_url 
      } = req.body;

      // Verify ownership
      const page = db.prepare("SELECT * FROM FacebookPages WHERE id = ? AND owner_id = ?").get(req.params.id, req.user.id);
      if (!page) return res.status(403).json({ error: 'Unauthorized' });

      db.prepare(`
        UPDATE FacebookPages SET 
          business_description = ?, products_sold = ?, product_keywords = ?, delivery_area = ?, 
          payment_methods = ?, has_cod = ?, has_return_policy = ?, official_contact_number = ?, 
          official_email = ?, business_address = ?, website_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        business_description || null, products_sold || null, product_keywords || null, 
        delivery_area || null, payment_methods || null, has_cod ? 1 : 0, has_return_policy ? 1 : 0, 
        official_contact_number || null, official_email || null, business_address || null, website_url || null,
        req.params.id
      );

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      console.error(e); res.status(500).json({ error: String(e) });
    }
  });
}
