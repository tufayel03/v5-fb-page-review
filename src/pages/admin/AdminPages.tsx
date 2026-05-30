import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { ShieldAlert, Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, ShieldCheck, Image, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

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
  const [addedByFilter, setAddedByFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: "created_at", direction: "desc" });

  // Bulk action states
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStatusValue, setBulkStatusValue] = useState("Under Review");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);

  // Redirect check states
  const [redirectModalOpen, setRedirectModalOpen] = useState(false);
  const [redirectChecking, setRedirectChecking] = useState(false);
  const [redirectResults, setRedirectResults] = useState<any[]>([]);
  const [selectedRedirects, setSelectedRedirects] = useState<string[]>([]);
  const [applyingRedirects, setApplyingRedirects] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; pageName: string; count: number } | null>(null);

  const handleSyncPictures = (ids?: string[]) => {
    const isBulk = Array.isArray(ids) && ids.length > 0;
    const confirmMsg = isBulk 
      ? `Are you sure you want to auto-fetch and optimize profile pictures for the ${ids.length} selected page(s)?`
      : "Are you sure you want to auto-fetch and optimize profile pictures for pages that do not have one? This will run in the background on the VPS.";

    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0, pageName: "Initializing...", count: 0 });
    
    const token = localStorage.getItem("token") || "";
    let url = `/api/admin/pages/sync-pictures-progress?token=${encodeURIComponent(token)}`;
    if (isBulk) {
      url += `&ids=${encodeURIComponent(ids.join(','))}`;
    }
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        alert("Failed to sync: " + data.error);
        eventSource.close();
        setIsSyncing(false);
        setSyncProgress(null);
      } else if (data.done) {
        alert(`Successfully fetched and optimized ${data.count} profile pictures!`);
        eventSource.close();
        setIsSyncing(false);
        setSyncProgress(null);
        setSelectedPageIds([]);
        fetchPages();
      } else {
        setSyncProgress({
          current: data.current,
          total: data.total,
          pageName: data.pageName,
          count: data.count
        });
      }
    };
    
    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      alert("Failed to sync profile pictures: Connection lost or server error");
      eventSource.close();
      setIsSyncing(false);
      setSyncProgress(null);
    };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPages();
    }, 250); // 250ms debounce for admin search actions
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, claimFilter, minReviewsFilter, minFraudFilter, addedByFilter, dateRangeFilter, startDateFilter, endDateFilter, sortConfig]);

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
      addedBy: addedByFilter,
      dateRange: dateRangeFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
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

  const selectAllMatchingPages = async () => {
    setSelectingAllMatching(true);
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        status: statusFilter,
        claimStatus: claimFilter,
        minReviews: minReviewsFilter,
        minFraud: minFraudFilter,
        addedBy: addedByFilter,
        dateRange: dateRangeFilter,
        startDate: startDateFilter,
        endDate: endDateFilter,
        allIds: "true"
      });
      const res = await fetch(`/api/admin/pages?${queryParams}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.ids)) {
          setSelectedPageIds(data.ids);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSelectingAllMatching(false);
    }
  };

  const handleExportExcel = () => {
    const queryParams = new URLSearchParams();
    if (selectedPageIds.length > 0) {
      queryParams.append("ids", selectedPageIds.join(","));
    } else {
      queryParams.append("search", searchQuery);
      queryParams.append("status", statusFilter);
      queryParams.append("claimStatus", claimFilter);
      queryParams.append("minReviews", minReviewsFilter);
      queryParams.append("minFraud", minFraudFilter);
      queryParams.append("addedBy", addedByFilter);
      queryParams.append("dateRange", dateRangeFilter);
      queryParams.append("startDate", startDateFilter);
      queryParams.append("endDate", endDateFilter);
    }

    const token = localStorage.getItem("token") || "";
    fetch(`/api/admin/pages/export?${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to export");
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `facebook-pages-export-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => {
        alert(err.message || "Export failed");
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

  const handleCheckRedirects = async () => {
    setRedirectModalOpen(true);
    setRedirectChecking(true);
    setRedirectResults([]);
    setSelectedRedirects([]);
    
    try {
      const res = await fetch('/api/admin/pages/check-redirects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ids: selectedPageIds })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        setRedirectResults(data.results);
        setSelectedRedirects(data.results.map((r: any) => r.id));
      } else {
        alert(data.error || 'Failed to check page redirects.');
        setRedirectModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred while checking redirects.');
      setRedirectModalOpen(false);
    } finally {
      setRedirectChecking(false);
    }
  };

  const handleApplyRedirects = async () => {
    if (selectedRedirects.length === 0) {
      alert("Please select at least one redirect to list.");
      return;
    }

    const itemsToApply = redirectResults.filter((r: any) => selectedRedirects.includes(r.id));
    setApplyingRedirects(true);

    try {
      const res = await fetch('/api/admin/pages/apply-redirects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ redirects: itemsToApply })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Selected redirects applied successfully! New replacement pages listed, and old pages marked as Old/Dead.");
        setRedirectModalOpen(false);
        setSelectedPageIds([]);
        setBulkAction("");
        fetchPages();
      } else {
        alert(data.error || 'Failed to apply redirects.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred while applying redirects.');
    } finally {
      setApplyingRedirects(false);
    }
  };

  const executeBulkAction = async () => {
    if (selectedPageIds.length === 0) return;
    if (!bulkAction) {
      alert("Please select a valid bulk action.");
      return;
    }

    if (bulkAction === 'check_redirects') {
      handleCheckRedirects();
      return;
    }

    if (bulkAction === 'sync_pictures') {
      handleSyncPictures(selectedPageIds);
      setBulkAction("");
      return;
    }

    if (bulkAction === 'export') {
      handleExportExcel();
      setSelectedPageIds([]);
      setBulkAction("");
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

  if (redirectModalOpen) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Full Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: redirectChecking ? '3s' : '0s' }} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  Live Facebook Page Redirection Checker
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  Scrapes and traces name changes and username/URL relocations on the live platform.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!redirectChecking && !applyingRedirects && (
              <button
                type="button"
                onClick={() => setRedirectModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer font-bold disabled:opacity-30"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Checker Core Area */}
        <div className="bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/5 rounded-xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
          {redirectChecking ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Search className="h-5 w-5 text-emerald-500 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Analyzing live Facebook pages...</p>
                <p className="text-xs text-slate-500 dark:text-slate-550">Checking for canonical URL forwards, username updates, and branding revisions.</p>
              </div>
            </div>
          ) : redirectResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800/40 text-emerald-500">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">No URL or Page Name Changes Detected</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">All scanned profiles are pointing to their original recorded usernames and names.</p>
              </div>
              <button
                onClick={() => setRedirectModalOpen(false)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm transition-all font-black shadow-md cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/20 rounded-xl flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Found <strong>{redirectResults.length}</strong> pages with live updates. Check the ones you wish to record in the database. Scraped pages will be listed as active, and original pages will be kept and marked as <strong>Old/Dead Page</strong>.
                </p>
              </div>

              <div className="space-y-3">
                {redirectResults.map((result: any) => {
                  const isSelected = selectedRedirects.includes(result.id);
                  return (
                    <div 
                      key={result.id}
                      className={`p-4 border rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30' 
                          : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-white/5 opacity-75 hover:opacity-100'
                      }`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedRedirects(prev => prev.filter(id => id !== result.id));
                        } else {
                          setSelectedRedirects(prev => [...prev, result.id]);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-white/10 bg-white dark:bg-[#050b18] text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <div className="space-y-2">
                          <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {result.changeType}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider block">Original / Old</span>
                              <strong className="text-xs text-slate-700 dark:text-slate-300 block">{result.originalName}</strong>
                              <a href={result.originalUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline line-clamp-1">{result.originalUrl}</a>
                            </div>
                            <div>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Live Scraped / New</span>
                              <strong className="text-xs text-emerald-700 dark:text-emerald-400 block">{result.scrapedName}</strong>
                              <a href={result.scrapedUrl} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-600 dark:text-emerald-500 hover:underline line-clamp-1">{result.scrapedUrl}</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action bar */}
              <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-[#050b18]/50 flex items-center justify-between rounded-xl">
                <div>
                  <button
                    onClick={() => {
                      if (selectedRedirects.length === redirectResults.length) {
                        setSelectedRedirects([]);
                      } else {
                        setSelectedRedirects(redirectResults.map((r: any) => r.id));
                      }
                    }}
                    className="text-xs text-slate-505 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all font-semibold cursor-pointer"
                  >
                    {selectedRedirects.length === redirectResults.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={applyingRedirects}
                    onClick={() => setRedirectModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer font-bold disabled:opacity-30"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={applyingRedirects || selectedRedirects.length === 0}
                    onClick={handleApplyRedirects}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white dark:text-[#050b18] px-5 py-2 rounded-lg text-sm transition-all cursor-pointer font-black disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/10"
                  >
                    {applyingRedirects ? "Applying Changes..." : `Apply & List ${selectedRedirects.length} New Pages`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          <button onClick={handleExportExcel} className="bg-indigo-600/15 hover:bg-[#131d36] text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto cursor-pointer">
            <FileDown className="h-4 w-4" /> Export Excel
          </button>
          <Link to="/tufayel/pages/new" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors whitespace-nowrap w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Add Page
          </Link>
        </div>
      </div>

      {isSyncing && syncProgress && (
        <div className="bg-sky-950/20 border border-sky-500/20 rounded-xl p-4 flex flex-col gap-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              <span>Fetching profile pictures: <strong className="text-white">{syncProgress.pageName}</strong></span>
            </div>
            <span>{syncProgress.current} / {syncProgress.total} Pages ({syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0}%)</span>
          </div>
          <div className="w-full bg-slate-800/50 rounded-full h-2.5 overflow-hidden border border-slate-700/30">
            <div 
              className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300 rounded-full" 
              style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
            <span>Fetched & optimized {syncProgress.count} profile pictures successfully.</span>
            <span>Please keep this page open until completion.</span>
          </div>
        </div>
      )}

      {/* Advanced Filter Workspace Panel */}
      <div className="bg-[#091124] border border-white/5 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 select-none">
          <Filter className="h-3 w-3 text-emerald-500" /> Search & Advanced Filters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          
          {/* Page Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="Reported as Fraud">🛑 Reported as Fraud</option>
              <option value="Verified Marketplace Seller">⭐ Verified Seller</option>
              <option value="Under Review">🔍 Under Review</option>
              <option value="Old/Dead Page">💀 Old/Dead Pages</option>
              <option value="Old/Dead Reported Page">💀🚩 Old/Dead Reported Pages</option>
              <option value="clean">🛡️ Clean (Not Fraud)</option>
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

          {/* Added By Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Added By</label>
            <select
              value={addedByFilter}
              onChange={(e) => { setAddedByFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Sources</option>
              <option value="admin">Admin</option>
              <option value="users">Users</option>
            </select>
          </div>

          {/* Added Time Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Added Time</label>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                if (e.target.value !== "custom") {
                  setStartDateFilter("");
                  setEndDateFilter("");
                }
                setCurrentPage(1);
              }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="15days">Last 15 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="6months">Last 6 Months</option>
              <option value="custom">📅 Custom Range...</option>
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

        {/* Custom Date Range Picker */}
        {dateRangeFilter === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#050b18] border border-white/5 rounded-xl transition-all duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">End Date</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        )}

        {/* Clear filter indicator */}
        {(statusFilter !== "all" || claimFilter !== "all" || minReviewsFilter !== "" || minFraudFilter !== "" || addedByFilter !== "all" || dateRangeFilter !== "all" || startDateFilter !== "" || endDateFilter !== "" || searchQuery !== "") && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => {
                setStatusFilter("all");
                setClaimFilter("all");
                setMinReviewsFilter("");
                setMinFraudFilter("");
                setAddedByFilter("all");
                setDateRangeFilter("all");
                setStartDateFilter("");
                setEndDateFilter("");
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-7 px-3 rounded-full bg-emerald-500 text-[#050b18] text-xs font-black flex items-center justify-center select-none shadow">
              {selectedPageIds.length} Selected
            </div>
            <p className="text-sm text-slate-200 mt-1 lg:mt-0 font-semibold">
              Select an action to apply to the directory pages chosen above.
            </p>
            {selectedPageIds.length === pages.length && total > pages.length && (
              <button
                disabled={selectingAllMatching}
                onClick={selectAllMatchingPages}
                className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/30 text-emerald-400 text-xs font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {selectingAllMatching ? "Loading all..." : `Select all ${total} pages`}
              </button>
            )}
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
              <option value="check_redirects">🔍 Check Name/URL Redirects</option>
              <option value="sync_pictures">🖼️ Auto-Fetch Profile Pictures</option>
              <option value="export">Bulk Export to Excel</option>
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
                <option value="Verified Marketplace Seller">Verified Marketplace Seller</option>
                <option value="Old/Dead Page">Old/Dead Page</option>
                <option value="Clean">Clean</option>
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
                  const isFraud = page.status_badge && page.status_badge.includes("Reported as Fraud");
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
                      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                        <div className="text-slate-300">
                          {page.created_at ? new Date(page.created_at).toLocaleDateString() : ""}
                        </div>
                        <div className="mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-black uppercase ${
                            page.added_by === 'users'
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                              : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {page.added_by === 'users' ? 'User' : 'Admin'}
                          </span>
                        </div>
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
