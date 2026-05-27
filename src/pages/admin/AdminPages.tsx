import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { ShieldAlert, Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, ShieldCheck } from "lucide-react";

export default function AdminPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [claimFilter, setClaimFilter] = useState("all");
  const [minReviewsFilter, setMinReviewsFilter] = useState("");
  const [minFraudFilter, setMinFraudFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: "created_at", direction: "desc" });

  // Bulk action states
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStatusValue, setBulkStatusValue] = useState("Under Review");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPages();
    }, 250); // 250ms debounce for admin search actions
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, claimFilter, minReviewsFilter, minFraudFilter, sortConfig]);

  const fetchPages = () => {
    setLoading(true);
    const queryParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      search: searchQuery,
      status: statusFilter,
      claimStatus: claimFilter,
      minReviews: minReviewsFilter,
      minFraud: minFraudFilter,
    });

    if (sortConfig) {
      queryParams.append("sortBy", sortConfig.key);
      queryParams.append("sortOrder", sortConfig.direction);
    }

    fetch(`/api/admin/pages?${queryParams}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setPages(data.items);
          setTotal(data.total || 0);
        } else {
          setPages([]);
          setTotal(0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPages([]);
        setTotal(0);
        setLoading(false);
      });
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const toggleFraudStatus = async (pageId: string, currentIsFraud: boolean) => {
    try {
      const endpoint = currentIsFraud
        ? `/api/admin/pages/${pageId}/clear-fraud`
        : `/api/admin/pages/${pageId}/fraud`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        fetchPages();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to update fraud status");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    if (!pages || pages.length === 0) return;
    const headers = ['ID', 'Name', 'URL', 'Status Badge', 'Claim Status', 'Total Reviews', 'Fraud Reports', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...pages.map(p => [
        p.id,
        '"' + (p.current_name || '').replace(/"/g, '""') + '"',
        p.facebook_url || '',
        p.status_badge || '',
        p.claim_status || 'Unclaimed',
        p.total_reviews ?? 0,
        p.fraud_report_count ?? 0,
        p.created_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'pages_dir_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (pageId: string) => {
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        // Clean up choice if selected
        setSelectedPageIds(prev => prev.filter(id => id !== pageId));
        fetchPages();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete page");
      }
    } catch (e) {
      alert("Error deleting page");
    }
  };

  const executeBulkAction = async () => {
    if (selectedPageIds.length === 0) return;
    if (!bulkAction) {
      alert("Please select a valid bulk action.");
      return;
    }

    if (bulkAction === 'delete') {
      const confirmDelete = window.confirm(`⚠️ Permanently delete ${selectedPageIds.length} selected pages? This cannot be undone and will delete all trace information!`);
      if (!confirmDelete) return;
    }

    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/pages/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ids: selectedPageIds,
          action: bulkAction,
          value: bulkAction === 'change_status' ? bulkStatusValue : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute bulk action');
      }

      alert(data.message || 'Bulk action completed successfully!');
      setSelectedPageIds([]);
      setBulkAction("");
      fetchPages();
    } catch(err: any) {
      console.error(err);
      alert(err.message || 'An error occurred during bulk operations.');
    } finally {
      setBulkLoading(false);
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Facebook Pages
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            Manage all pages in the directory.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={handleExportCSV} className="bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto cursor-pointer">
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          <Link to="/tufayel/pages/new" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors whitespace-nowrap w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Page
          </Link>
        </div>
      </div>

      {/* Advanced Filter Workspace Panel */}
      <div className="bg-[#091124] border border-white/5 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 select-none">
          <Filter className="h-3 w-3 text-emerald-500" /> Search & Advanced Filters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* Page Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="clean">Clean (Not Fraud)</option>
              <option value="fraud">Fraud Listed</option>
            </select>
          </div>

          {/* Page Claim Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Claim Type</label>
            <select
              value={claimFilter}
              onChange={(e) => { setClaimFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Pages</option>
              <option value="claimed">Claimed Pages</option>
              <option value="unclaimed">Unclaimed Pages</option>
            </select>
          </div>

          {/* Min Reviews Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Min reviews</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 5"
              value={minReviewsFilter}
              onChange={(e) => { setMinReviewsFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder-slate-750 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Min Fraud Reports Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Min Fraud reports</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 2"
              value={minFraudFilter}
              onChange={(e) => { setMinFraudFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder-slate-750 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Search Term */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quick Search</label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Name or Facebook URL"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Clear filter indicator */}
        {(statusFilter !== "all" || claimFilter !== "all" || minReviewsFilter !== "" || minFraudFilter !== "" || searchQuery !== "") && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => {
                setStatusFilter("all");
                setClaimFilter("all");
                setMinReviewsFilter("");
                setMinFraudFilter("");
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-all flex items-center gap-1.5"
            >
              ✕ Reset All Active Filters
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Workspace Banner */}
      {selectedPageIds.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-7 px-3 rounded-full bg-emerald-500 text-[#050b18] text-xs font-black flex items-center justify-center select-none shadow">
              {selectedPageIds.length} Selected
            </div>
            <p className="text-sm text-slate-200 mt-1 lg:mt-0 font-semibold">
              Select an action to apply to the directory pages chosen above.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bg-[#050b18] border border-white/10 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">-- Bulk Actions --</option>
              <option value="mark_fraud">Bulk Mark as Fraud (-100 Score)</option>
              <option value="clear_fraud">Bulk Clear Fraud (Under Review)</option>
              <option value="change_status">Bulk Change Status Badge...</option>
              <option value="delete">Bulk Permanently Delete</option>
            </select>

            {bulkAction === "change_status" && (
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className="bg-[#050b18] border border-white/10 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="Under Review">Under Review</option>
                <option value="Reported as Fraud">Reported as Fraud</option>
                <option value="Trusted">Trusted</option>
                <option value="Suspicious">Suspicious</option>
                <option value="Safe">Safe</option>
                <option value="Verifying">Verifying</option>
                <option value="Verified Vendor">Verified Vendor</option>
              </select>
            )}

            <button
              disabled={bulkLoading || !bulkAction}
              onClick={executeBulkAction}
              className="bg-emerald-600 hover:bg-emerald-500 font-extrabold text-[#050b18] text-emerald-950 px-4 py-2 rounded-lg text-sm transition-all shadow hover:shadow-md select-none active:scale-97 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {bulkLoading ? "Running..." : "Apply to Chosen"}
            </button>
            <button
              onClick={() => setSelectedPageIds([])}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-2 py-1 transition-all"
            >
              Clear choices
            </button>
          </div>
        </div>
      )}

      {/* Pages table container */}
      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-black text-[11px] tracking-wider select-none">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={pages.length > 0 && selectedPageIds.length === pages.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPageIds(pages.map(p => p.id));
                        } else {
                          setSelectedPageIds([]);
                        }
                      }}
                      className="rounded border-slate-700 bg-[#050b18] text-emerald-500 focus:ring-emerald-500/20 h-4 w-4 shrink-0"
                    />
                    <span>SL</span>
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('current_name')}>
                  <div className="flex items-center gap-1.5">
                    Page Details 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "current_name" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('total_reviews')}>
                  <div className="flex items-center gap-1.5">
                    Total Reviews 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "total_reviews" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('fraud_report_count')}>
                  <div className="flex items-center gap-1.5">
                    Fraud Reports 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "fraud_report_count" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('status_badge')}>
                  <div className="flex items-center gap-1.5">
                    Status 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "status_badge" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1.5">
                    Added 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "created_at" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                      <span className="font-bold text-xs uppercase tracking-wider animate-pulse">Running directory query...</span>
                    </div>
                  </td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500 italic"
                  >
                    No Facebook pages found matching your selected search query and active parameters.
                  </td>
                </tr>
              ) : (
                pages.map((page, index) => {
                  const isFraud = page.status_badge === "Reported as Fraud";
                  const isClaimed = page.claim_status === "Claimed";
                  const isSelected = selectedPageIds.includes(page.id);
                  return (
                    <tr
                      key={page.id}
                      className={`hover:bg-white/[0.02] transition-all ${isSelected ? "bg-emerald-500/[0.04] text-white" : ""}`}
                    >
                      <td className="px-6 py-4 text-slate-400 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPageIds(prev => [...prev, page.id]);
                              } else {
                                setSelectedPageIds(prev => prev.filter(id => id !== page.id));
                              }
                            }}
                            className="rounded border-slate-700 bg-[#050b18] text-emerald-500 focus:ring-emerald-500/20 h-4 w-4 shrink-0"
                          />
                          <span className="font-mono text-xs text-slate-500">{startIndex + index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#050b18] border border-white/5 flex items-center justify-center font-black text-slate-300 shrink-0 select-none">
                            {page.current_name ? page.current_name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <a
                                href={`/page/${page.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-slate-100 hover:text-emerald-400 hover:underline truncate block"
                              >
                                {page.current_name}
                              </a>
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                isClaimed
                                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                  : "bg-slate-500/10 text-slate-400 border border-slate-500/10"
                              }`}>
                                {page.claim_status || "Unclaimed"}
                              </span>
                            </div>
                            <p
                              className="text-xs text-slate-400 truncate w-48 mt-0.5"
                              title={page.facebook_url}
                            >
                              {page.facebook_url}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-slate-200 font-extrabold text-sm">
                          {page.total_reviews ?? 0}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`font-mono font-extrabold text-sm ${page.fraud_report_count > 0 ? "text-rose-400 font-black" : "text-slate-400"}`}>
                          {page.fraud_report_count ?? 0}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                            ${isFraud 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                              : page.status_badge === "Trusted" || page.status_badge === "Safe" || page.status_badge === "Verified Vendor"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }
                          `}
                        >
                          {isFraud ? (
                            <ShieldAlert className="h-2.5 w-2.5" />
                          ) : page.status_badge === "Trusted" || page.status_badge === "Verified Vendor" ? (
                            <ShieldCheck className="h-2.5 w-2.5" />
                          ) : null}
                          {page.status_badge}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-450 font-mono text-xs whitespace-nowrap">
                        {page.created_at ? new Date(page.created_at).toLocaleDateString() : ""}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                             to={`/tufayel/pages/${page.id}`}
                             className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1 transition-colors"
                          >
                             Edit
                          </Link>
                          {deleteConfirmId === page.id ? (
                            <button
                              onClick={() => handleDelete(page.id)}
                              className="text-xs font-black text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg shadow transition-colors cursor-pointer"
                            >
                               Confirm
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(page.id)}
                              className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 transition-colors"
                            >
                               Delete
                            </button>
                          )}
                          <button
                            onClick={() => toggleFraudStatus(page.id, isFraud)}
                            className={`text-xs font-black px-2.5 py-1.5 rounded-lg transition-all border cursor-pointer ${
                              isFraud
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            }`}
                          >
                            {isFraud ? "Clear Fraud" : "Mark Fraud"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer / Pagination controls */}
        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#050b18]/40 gap-4 select-none">
           <div className="text-sm text-slate-400 font-medium">
              Showing {pages.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pages.length, total)} of {total} entries
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-semibold text-xs uppercase tracking-wider">Show:</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-[#091124] border border-white/5 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200 cursor-pointer"
                >
                   <option value={10}>10</option>
                   <option value={20}>20</option>
                   <option value={50}>50</option>
                   <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-xs font-black min-w-10 text-center px-1 text-slate-300">{currentPage} / {Math.max(1, totalPages)}</span>
                 <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all"
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
