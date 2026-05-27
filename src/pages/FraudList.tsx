import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ShieldAlert, Search, Filter, ChevronLeft, ChevronRight, Store, AlertTriangle, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FraudList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pages'|'numbers'>('pages');
  
  const [pagesData, setPagesData] = useState<any[]>([]);
  const [pagesTotal, setPagesTotal] = useState(0);
  
  const [numbersData, setNumbersData] = useState<any[]>([]);
  const [numbersTotal, setNumbersTotal] = useState(0);
  
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('reports_desc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pages' ? '/api/fraud/pages' : '/api/fraud/numbers';
      const res = await fetch(`${endpoint}?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(search)}&sort_by=${sortBy}`);
      const json = await res.json();
      if (activeTab === 'pages') {
        setPagesData(json.data || []);
        setPagesTotal(json.total || 0);
      } else {
        setNumbersData(json.data || []);
        setNumbersTotal(json.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentTotal = activeTab === 'pages' ? pagesTotal : numbersTotal;
  const currentData = activeTab === 'pages' ? pagesData : numbersData;
  const totalPages = Math.ceil(currentTotal / limit) || 1;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 1) setCurrentPage(1);
    else fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fraud Database</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl">
            A comprehensive list of reported Facebook pages and contact numbers associated with fraudulent activities.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto shrink-0">
            <button 
              onClick={() => { setActiveTab('pages'); setCurrentPage(1); }}
              className={`flex-1 md:w-32 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pages' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Fraud Pages
            </button>
            <button 
              onClick={() => { setActiveTab('numbers'); setCurrentPage(1); }}
              className={`flex-1 md:w-32 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'numbers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Fraud Numbers
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto md:flex-1 md:justify-end">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder={activeTab === 'pages' ? "Search page name..." : "Search number..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-medium"
              />
            </form>

            <div className="relative w-full sm:w-40 shrink-0">
               <select 
                 value={sortBy} 
                 onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                 className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold text-sm text-slate-700"
               >
                 <option value="reports_desc">Most Reported</option>
                 <option value="newest">Recently Updated</option>
                 <option value="oldest">Oldest First</option>
                 {activeTab === 'numbers' && <option value="linked_pages_desc">Most Linked Pages</option>}
               </select>
               <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  {activeTab === 'pages' ? (
                    <>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">#</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Page Details</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Primary Contact</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Reports</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">#</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact Number</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Linked Pages</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Reports</th>
                      <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                        Loading data...
                      </div>
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {activeTab === 'pages' ? (
                        <>
                          <td className="py-4 px-4 text-sm font-semibold text-slate-400">
                            {(currentPage - 1) * limit + index + 1}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.profile_picture ? (
                                  <img src={item.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Store className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <Link to={`/page/${item.id}`} className="font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                                  {item.current_name}
                                </Link>
                                {item.facebook_url && (
                                  <a href={item.facebook_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline inline-block truncate max-w-[200px]">
                                    Facebook Link
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-semibold text-slate-700 bg-slate-100 py-1 px-2 rounded-md">
                              {item.contact_number || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                {item.fraud_report_count || 0} Reports
                              </span>
                              <span className="text-xs text-slate-400 font-medium mt-0.5">
                                Updated {formatDate(item.updated_at)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Link to={`/page/${item.id}`} className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 transition-colors">
                              View Details
                            </Link>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-4 text-sm font-semibold text-slate-400">
                            {(currentPage - 1) * limit + index + 1}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-500">
                                <Phone className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{item.number}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {item.type || 'Contact'}
                                  </span>
                                  {(() => {
                                      let isReported = item.status?.toLowerCase() === 'reported';
                                      let linked = [];
                                      try { linked = JSON.parse(item.linked_pages); } catch(e){}
                                      let hasFraudPage = linked.some((p: any) => p.status_badge === 'Reported as Fraud');
                                      let isFraud = isReported || hasFraudPage;
                                      return isFraud ? (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                          Reported
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                          Suspicious
                                        </span>
                                      );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 max-w-[250px]">
                            {(() => {
                               let linked = [];
                               try { linked = JSON.parse(item.linked_pages); } catch(e){}
                               if (!linked || linked.length === 0) return <span className="text-sm text-slate-400 italic">0 linked pages</span>;
                               return (
                                 <div className="flex flex-col gap-2">
                                   <div className="text-xs font-bold text-slate-500">{linked.length} Linked Page{linked.length !== 1 ? 's' : ''}</div>
                                   <div className="flex flex-wrap gap-2">
                                     {linked.map((p: any, i: number) => (
                                      <Link key={i} to={`/page/${p.id}`} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                                        <div className="w-4 h-4 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                                            {p.profile_picture ? <img src={p.profile_picture} alt="" className="w-full h-full object-cover" /> : <Store className="w-2.5 h-2.5 text-slate-400" />}
                                        </div>
                                        <span className="truncate max-w-[120px]">{p.name || 'Unnamed Page'}</span>
                                      </Link>
                                   ))}
                                   </div>
                                 </div>
                               );
                            })()}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                {item.fraud_report_count || 0} Reports
                              </span>
                              <span className="text-xs text-slate-400 font-medium mt-0.5">
                                Since {formatDate(item.first_reported_at)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                             {(!user || (user.role !== 'owner' && user.role !== 'page_owner' && user.role !== 'admin' && user.role !== 'super_admin')) && (
                               <Link to={`/write-review?type=fraud&number=${item.number}`} className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-xs hover:bg-rose-100 transition-colors">
                                 Report again
                               </Link>
                             )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-wrap gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        currentPage === p 
                          ? 'bg-rose-500 text-white shadow-md' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer'
                      }`}
                    >
                      {p}
                    </button>
                  );
                }
                if (p === currentPage - 2 || p === currentPage + 2) {
                  return <span key={p} className="w-10 h-10 flex items-center justify-center text-slate-400">...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
