import React, { useState, useEffect, useMemo } from "react";
import { Search, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminAbuseReports() {
  const { t, n } = useLanguage();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/abuse-reports", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setReports(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedReports = useMemo(() => {
    let result = [...reports];

    if (searchQuery) {
      result = result.filter(
        (r) =>
          (r.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.target_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.report_type || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
       result = result.filter((r) => r.status === statusFilter);
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
  }, [reports, searchQuery, sortConfig, statusFilter]);

  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = filteredAndSortedReports.slice(startIndex, startIndex + itemsPerPage);

  const uniqueStatuses = Array.from(new Set(reports.map(r => r.status).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> {t("Abuse Reports")}
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            {t("Manage user reports of spam, fake reviews, and abuse.")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <select
                 value={statusFilter}
                 onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">{t("All Statuses")}</option>
                 {uniqueStatuses.map(s => <option key={s as string} value={s as string} className="bg-[#091124]">{t(s as string)}</option>)}
              </select>
          </div>
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t("Search reports...")}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-[#10b981]/20 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">{t("SL")}</th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-1">{t("Report ID")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("target_type")}>
                  <div className="flex items-center gap-1">{t("Target")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("report_type")}>
                  <div className="flex items-center gap-1">{t("Type")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">{t("Status")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  {t("Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 w-32 bg-white/5 mx-auto rounded"></div>
                  </td>
                </tr>
              ) : filteredAndSortedReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    {t("No abuse reports found.")}
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report, index) => {
                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-400 font-medium font-mono">
                        {n(startIndex + index + 1)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-slate-400">
                          {report.id.substring(0, 8)}...
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-bold">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-300 capitalize">
                        {t(report.target_type)}
                      </td>
                      <td className="px-6 py-4 font-bold text-amber-500">
                        {t(report.report_type)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                            ${
                              report.status === "Resolved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : report.status === "Open"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : report.status === "Rejected"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-slate-500/10 text-slate-400 border border-[#475569]/30"
                            }
                          `}
                        >
                          {t(report.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/tufayel/reports-abuse/${report.id}`}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1"
                        >
                          {t("Review")}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#050b18]/40 gap-4">
           <div className="text-sm text-slate-400 font-medium">
              {t("Showing")} {filteredAndSortedReports.length === 0 ? n(0) : n(startIndex + 1)} {t("to")} {n(Math.min(startIndex + itemsPerPage, filteredAndSortedReports.length))} {t("of")} {n(filteredAndSortedReports.length)} {t("entries")}
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
    </div>
  );
}
