const fs = require('fs');

let c = fs.readFileSync('src/pages/admin/AdminPages.tsx', 'utf8');

const importLines = `import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { ShieldAlert, Search, Filter, Edit, Trash2, Plus, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";`;

c = c.replace(/import React.*?from "react";\nimport { Link }.*?;\nimport { ShieldAlert.*?;/, importLines);

const stateAndFetch = `export default function AdminPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchPages();
  }, []);`;

c = c.replace(/export default function AdminPages\(\) \{[\s\S]*?fetchPages\(\);\n  \}, \[\]\);/, stateAndFetch);

const fetchPagesEnd = c.indexOf('const toggleFraudStatus');

const handleSortCode = `
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedPages = useMemo(() => {
    let result = [...pages];

    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.current_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.facebook_url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
       if (statusFilter === "fraud") {
          result = result.filter((p) => p.status_badge === "Reported as Fraud");
       } else {
          result = result.filter((p) => p.status_badge !== "Reported as Fraud");
       }
    }

    if (categoryFilter !== "all") {
       result = result.filter((p) => p.category === categoryFilter);
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [pages, searchQuery, sortConfig, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredAndSortedPages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPages = filteredAndSortedPages.slice(startIndex, startIndex + itemsPerPage);

  const uniqueCategories = Array.from(new Set(pages.map(p => p.category).filter(Boolean)));
`;

c = c.substring(0, fetchPagesEnd) + handleSortCode + '\n  ' + c.substring(fetchPagesEnd);

c = c.replace(/const filteredPages = pages\.filter\([\s\S]*?\);\n/g, "");

const headerControls = `
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <select
                 value={statusFilter}
                 onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all">All Statuses</option>
                 <option value="clean">Clean</option>
                 <option value="fraud">Fraud</option>
              </select>
             <select
                 value={categoryFilter}
                 onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[150px] truncate"
              >
                 <option value="all">Categories</option>
                 {uniqueCategories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
              </select>
          </div>
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Link to="/tufayel/pages/new" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors whitespace-nowrap w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Page
          </Link>
        </div>
`;

c = c.replace(/<div className="flex items-center gap-3 w-full sm:w-auto">[\s\S]*?<\/div>\n      <\/div>\n\n      <div className="bg-white/, headerControls + '\n      </div>\n\n      <div className="bg-white');

const theadReplace = `
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('current_name')}>
                  <div className="flex items-center gap-1">Page Details <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status_badge')}>
                  <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-slate-200 text-right">
                  Actions
                </th>
              </tr>
            </thead>
`;
c = c.replace(/<thead[\s\S]*?<\/thead>/, theadReplace);

c = c.replace(/filteredPages/g, "paginatedPages");

const paginationControls = `
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
           <div className="text-sm text-slate-500">
              Showing {filteredAndSortedPages.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedPages.length)} of {filteredAndSortedPages.length} entries
           </div>
           <div className="flex items-center gap-2">
              <select 
                 value={itemsPerPage} 
                 onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                 className="bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value={10}>10 / page</option>
                 <option value={20}>20 / page</option>
                 <option value={50}>50 / page</option>
              </select>
              <div className="flex items-center gap-1">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                 >
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
           </div>
        </div>
`;

c = c.replace(/<\/table>\n        <\/div>\n      <\/div>/, `</table>\n        </div>\n${paginationControls}\n      </div>`);

fs.writeFileSync('src/pages/admin/AdminPages.tsx', c);
