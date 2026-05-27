import fs from 'fs';

let c = fs.readFileSync('src/pages/admin/AdminDisputes.tsx', 'utf8');

c = c.replace(
  '<th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => handleSort(\'current_name\')}>',
  '<th className="px-6 py-4 border-b border-slate-200 w-16">SL</th>\n                <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => handleSort(\'current_name\')}>'
);

c = c.replace(
  'paginatedDisputes.map((dispute) => {',
  'paginatedDisputes.map((dispute, index) => {'
);


let fallback = `<td className="px-6 py-4">
                        <a
                          href={\`/page/\${dispute.page_id}\`}`;

c = c.replace(fallback, '<td className="px-6 py-4 text-slate-500 font-medium">\n                        {startIndex + index + 1}\n                      </td>\n                      ' + fallback);

fs.writeFileSync('src/pages/admin/AdminDisputes.tsx', c);
console.log('Fixed admin disputes');
