import { db } from './database.js';
console.log(db.prepare("SELECT * FROM Reviews WHERE page_id IN (SELECT id FROM FacebookPages WHERE current_name LIKE '%Bid and steal%')").all());
