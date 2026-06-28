import React, { useState, useEffect, useMemo } from "react";
import { Activity, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminLogs() {
  const { t, n } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const confirmDelete = () => {
      setShowConfirmModal(true);
  };

  const handleDeleteAll = async () => {
    setShowConfirmModal(false);
    try {
      const res = await fetch("/api/admin/logs", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setLogs([]);
      } else {
        alert(t("Failed to delete logs."));
      }
    } catch (err) {
      console.error(err);
      alert(t("Error deleting logs."));
    }
  };
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    fetch("/api/admin/logs", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setLogs(data);
        setLoading(false);
      });
  };

  
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];

    if (searchTerm) {
      result = result.filter(
        (log) =>
          (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.admin_name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || "";
        const valB = b[sortConfig.key] || "";
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [logs, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredAndSortedLogs.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">{t("Loading logs...")}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t("Admin Logs")}</h1>
          <p className="text-slate-400 text-sm font-semibold mt-1">{t("System activity and audit logs for admin actions.")}</p>
        </div>
        <button
          onClick={confirmDelete}
          className="px-4 py-2 bg-red-950/30 text-rose-400 hover:bg-red-900/30 font-bold rounded-lg border border-red-900/30 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t("Delete All Logs")}
        </button>
      </div>

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-[#050b18]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("Search logs...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button className="bg-[#091124] border border-white/5 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-white/5 transition-colors w-full sm:w-auto justify-center">
            <Filter className="h-4 w-4" /> {t("Filter")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">{t("SL")}</th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1">{t("Date")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("admin_name")}>
                  <div className="flex items-center gap-1">{t("Admin")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("action")}>
                  <div className="flex items-center gap-1">{t("Action")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5">{t("Details")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {filteredAndSortedLogs.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-bold italic">{t("No logs found")}</td>
                 </tr>
               ) : (
                 paginatedLogs.map((log, index) => (
                   <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap font-mono">
                         {n(startIndex + index + 1)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap font-semibold">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0">
                               <Activity className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                               <div className="text-sm font-bold text-slate-200">{log.admin_name || t('System Admin')}</div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {t(log.action)}
                         </span>
                         {log.target_type && (
                             <span className="ml-2 text-xs font-semibold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                {t(log.target_type)} {log.target_id && `(${log.target_id.slice(0,8)})`}
                             </span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 max-w-sm truncate font-medium">
                         {log.details || t('No details provided')}
                      </td>
                   </tr>
                 ))
               )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#050b18]/40 gap-4">
           <div className="text-sm text-slate-400 font-medium">
              {t("Showing {{start}} to {{end}} of {{total}} entries", {
                start: n(filteredAndSortedLogs.length === 0 ? 0 : startIndex + 1),
                end: n(Math.min(startIndex + itemsPerPage, filteredAndSortedLogs.length)),
                total: n(filteredAndSortedLogs.length)
              })}
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-medium">{t("Show:")}</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-[#091124] border border-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200"
                >
                   <option value={10} className="bg-[#091124]">{n(10)}</option>
                   <option value={20} className="bg-[#091124]">{n(20)}</option>
                   <option value={50} className="bg-[#091124]">{n(50)}</option>
                   <option value={100} className="bg-[#091124]">{n(100)}</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-xs font-bold px-2 text-slate-300">{n(currentPage)} / {n(Math.max(1, totalPages))}</span>
                 <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30"
                 >
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
           </div>
        </div>

      </div>
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050b18]/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#091124] border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-2">{t("Delete All Logs?")}</h3>
            <p className="text-slate-400 font-semibold text-sm mb-6">{t("Are you sure you want to permanently delete ALL admin logs? This action cannot be undone.")}</p>
            <div className="flex items-center gap-3 justify-end">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg font-bold transition-colors"
              >
                {t("Cancel")}
              </button>
              <button 
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-rose-600/20"
              >
                {t("Delete Logs")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
