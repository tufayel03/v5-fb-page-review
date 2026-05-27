import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const getByUrlEndpoint = `
  app.get('/api/pages/by-url', (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.json({ success: false });
    const page = db.prepare('SELECT * FROM FacebookPages WHERE facebook_url = ? LIMIT 1').get(url.trim());
    if (page) {
      res.json({ success: true, page });
    } else {
      res.json({ success: false });
    }
  });
`;

code = code.replace("app.get('/api/pages/search'", getByUrlEndpoint + "\n  app.get('/api/pages/search'");

code = code.replace(
  "        // Create new page if missing\n        if (!page_id || page_id === '1e4a64ef-4b44-4b55-a226-d3a373cf58bb' && page_name) {",
  `        // Check if page with URL already exists
        if (!page_id || page_id === '1e4a64ef-4b44-4b55-a226-d3a373cf58bb') {
          if (page_url) {
            const existing = db.prepare('SELECT id FROM FacebookPages WHERE facebook_url = ? COLLATE NOCASE LIMIT 1').get(page_url.trim()) as any;
            if (existing) {
              page_id = existing.id;
            }
          }
        }

        // Create new page if missing (and somehow didn't exist)
        if (!page_id || page_id === '1e4a64ef-4b44-4b55-a226-d3a373cf58bb' && page_name) {`
);

fs.writeFileSync('server.ts', code);
console.log('Updated server.ts');
