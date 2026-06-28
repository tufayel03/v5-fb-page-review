import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown, ChevronLeft, ChevronRight
} from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminPageClaims() {
  const { t, n } = useLanguage();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: 'created_at', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    let sortBy = 'created_at';
    let sortOrder = 'desc';
    if (sortConfig) {
      sortBy = sortConfig.key;
      sortOrder = sortConfig.direction === 'asc' ? 'asc' : 'desc';
    }

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      search: debouncedSearch,
      status: statusFilter,
      sortBy,
      sortOrder,
    });

    fetch(`/api/admin/claims?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then((json) => {
        const data = json.data || (Array.isArray(json) ? json : []);
        setClaims(data);
        setTotalCount(json.totalCount !== undefined ? json.totalCount : data.length);
        setTotalPages(json.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClaims = claims;

  const uniqueStatuses = ["Pending Verification", "Approved", "Rejected", "Revoked"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {t("Page Ownership Claims")}
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            {t("Manage page ownership claim requests.")}
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
              placeholder={t("Search claims...")}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("page_name")}>
                  <div className="flex items-center gap-1">{t("Page")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("claimer_username")}>
                  <div className="flex items-center gap-1">{t("Claimer")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">{t("Status")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("created_at")}>
                  <div className="flex items-center gap-1">{t("Submitted")} <ArrowUpDown className="h-3 w-3"/></div>
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
              ) : claims.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    {t("No page claims found.")}
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim, index) => {
                  return (
                    <tr
                      key={claim.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {n(startIndex + index + 1)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-white/5 border border-white/5 flex items-center justify-center font-bold text-slate-400 shrink-0">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">
                              {claim.page_name}
                            </p>
                            <a
                              href={claim.facebook_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate block mt-0.5"
                            >
                              {t("View Facebook Page")}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-200">
                          @{claim.claimer_username}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {claim.contact_email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                            ${
                              claim.status === "Approved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : claim.status === "Rejected"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : claim.status === "Revoked"
                                    ? "bg-slate-500/10 text-slate-400 border border-[#475569]/30"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }
                          `}
                        >
                          {claim.status === "Pending Verification" && (
                            <Clock className="h-3 w-3" />
                          )}
                          {claim.status === "Approved" && (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          {claim.status === "Rejected" && (
                            <XCircle className="h-3 w-3" />
                          )}
                          {t(claim.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(claim.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/tufayel/page-claims/${claim.id}`}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1"
                        >
                          {t("Review Claim")}
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
           <div className="text-sm text-slate-400 font-semibold font-medium">
              {t("Showing")} {totalCount === 0 ? n(0) : n(startIndex + 1)} {t("to")} {n(Math.min(startIndex + itemsPerPage, totalCount))} {t("of")} {n(totalCount)} {t("entries")}
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
