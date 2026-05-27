import Database from 'better-sqlite3';

export function setupFraudEndpoints(app: any, db: Database.Database) {
  app.get('/api/fraud/pages', (req: any, res: any) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string || '';
      const sortBy = req.query.sort_by as string || 'reports_desc';
      
      let baseQuery = `FROM FacebookPages WHERE status_badge = 'Reported as Fraud'`;
      const params = [];
      
      if (search) {
        baseQuery += ` AND (current_name LIKE ? OR facebook_url LIKE ? OR contact_number LIKE ?)`;
        const st = `%${search}%`;
        params.push(st, st, st);
      }
      
      const countObj = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const total = countObj.count;
      
      let orderClause = 'ORDER BY fraud_report_count DESC, trust_score ASC';
      if (sortBy === 'newest') orderClause = 'ORDER BY updated_at DESC';
      if (sortBy === 'oldest') orderClause = 'ORDER BY updated_at ASC';
      
      const pages = db.prepare(`SELECT id, current_name, facebook_url, contact_number, fraud_report_count, trust_score, updated_at, profile_picture ${baseQuery} ${orderClause} LIMIT ? OFFSET ?`).all(...params, limit, offset);
      
      res.json({ data: pages, total, page, limit });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/fraud/numbers', (req: any, res: any) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string || '';
      const sortBy = req.query.sort_by as string || 'reports_desc';
      
      let baseQuery = `FROM ContactNumbers c 
WHERE c.status IN ('Reported', 'Suspicious') 
OR c.fraud_report_count > 0 
OR c.number IN (SELECT contact_number FROM FacebookPages WHERE status_badge = 'Reported as Fraud')
OR EXISTS (
  SELECT 1 FROM FacebookPages p 
  WHERE p.status_badge = 'Reported as Fraud' AND (
    p.extra_contacts LIKE '%' || c.number || '%' 
    OR p.payment_methods LIKE '%' || c.number || '%'
  )
)`;
      const params = [];
      
      if (search) {
        baseQuery += ` AND c.number LIKE ?`;
        params.push(`%${search}%`);
      }
      
      const countObj = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params) as any;
      const total = countObj.count;
      
      let orderClause = 'ORDER BY fraud_report_count DESC, last_reported_at DESC';
      if (sortBy === 'newest') orderClause = 'ORDER BY last_reported_at DESC';
      if (sortBy === 'oldest') orderClause = 'ORDER BY last_reported_at ASC';
      if (sortBy === 'linked_pages_desc') orderClause = `ORDER BY json_array_length((SELECT json_group_array(json_object('id', p.id)) FROM FacebookPages p WHERE p.contact_number = c.number OR p.extra_contacts LIKE '%' || c.number || '%' OR p.payment_methods LIKE '%' || c.number || '%')) DESC`;
      
      const numberInfos = db.prepare(`
        SELECT c.id, c.number, c.type, c.status, c.fraud_report_count, c.suspicious_report_count, c.first_reported_at, c.last_reported_at,
               (SELECT json_group_array(json_object('id', p.id, 'name', p.current_name, 'profile_picture', p.profile_picture)) 
                FROM FacebookPages p 
                WHERE p.contact_number = c.number OR p.extra_contacts LIKE '%' || c.number || '%' OR p.payment_methods LIKE '%' || c.number || '%'
               ) as linked_pages
        ${baseQuery}
        ${orderClause}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset);
      
      res.json({ data: numberInfos, total, page, limit });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
