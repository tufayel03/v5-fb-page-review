import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { ShieldAlert, Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, Upload } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const TablePageAvatar = ({ page }: { page: any }) => {
  const [error, setError] = useState(false);
  return (
    <div className="w-10 h-10 rounded-lg bg-[#050b18] border border-white/5 flex items-center justify-center font-black text-slate-300 shrink-0 select-none overflow-hidden">
      {page.profile_picture && !error ? (
        <img
          src={page.profile_picture}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span>{page.current_name ? page.current_name.charAt(0).toUpperCase() : "?"}</span>
      )}
    </div>
  );
};

export default function AdminPages() {
  const { t, n } = useLanguage();
  const [pages, setPages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const setCurrentPage = (newPageVal: number | ((prev: number) => number)) => {
    const nextVal = typeof newPageVal === "function" ? newPageVal(currentPage) : newPageVal;
    setSearchParams(prev => {
      prev.set("page", String(nextVal));
      return prev;
    });
  };
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [claimFilter, setClaimFilter] = useState("all");
  const [minReviewsFilter, setMinReviewsFilter] = useState("");
  const [maxReviewsFilter, setMaxReviewsFilter] = useState("");
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

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importJobId, setImportJobId] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (importJobId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/admin/bulk-imports/${importJobId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          const data = await res.json();
          if (data && data.total_rows > 0) {
            const processed = data.successful_rows + data.failed_rows;
            const pct = Math.min(99, Math.round((processed / data.total_rows) * 100));
            setImportProgress(pct);
            
            if (data.status === 'Completed' || data.status === 'Completed With Errors' || data.status === 'Failed') {
              clearInterval(interval);
              setImportProgress(100);
              setTimeout(() => {
                setImportProgress(null);
                setImportJobId(null);
                alert(t(`Import {{status}}! Added: {{added}}, Failed: {{failed}}`, { status: t(data.status), added: n(data.successful_rows), failed: n(data.failed_rows) }));
                setShowImportModal(false);
                setImportFile(null);
                fetchPages();
              }, 500);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [importJobId, t, n]);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return alert(t("Please select an Excel file first."));

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('import_type', 'Facebook Pages');

    setImportProgress(0);

    try {
      const res = await fetch('/api/admin/pages/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        setImportJobId(data.jobId);
        setImportProgress(5);
      } else {
        alert(t("Import failed: ") + (data.error || t("Unknown error")));
        setImportProgress(null);
      }
    } catch (err) {
      alert(t("Network error occurred during import."));
      setImportProgress(null);
    }
  };

  // Redirect check states
  const [redirectModalOpen, setRedirectModalOpen] = useState(false);
  const [redirectChecking, setRedirectChecking] = useState(false);
  const [redirectResults, setRedirectResults] = useState<any[]>([]);
  const [selectedRedirects, setSelectedRedirects] = useState<string[]>([]);
  const [redirectProgress, setRedirectProgress] = useState<{ current: number; total: number; pageName: string } | null>(null);
  const [applyingRedirects, setApplyingRedirects] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; pageName: string; count: number } | null>(null);
  const [extensionInstalled, setExtensionInstalled] = useState(false);

  // Check if Chrome extension is active
  useEffect(() => {
    const checkStatus = () => {
      const hasAttr = document.documentElement.getAttribute('data-fb-page-review-extension-installed') === 'true';
      const hasWindow = !!(window as any).__fbPageReviewExtensionInstalled;
      if (hasAttr || hasWindow) {
        setExtensionInstalled(true);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 500);
    window.addEventListener('FB_PAGE_REVIEW_EXTENSION_READY', checkStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('FB_PAGE_REVIEW_EXTENSION_READY', checkStatus);
    };
  }, []);

  // Listen for sync progress messages from Chrome extension bridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ignore React DevTools messages
      if (!event.data || event.data.source === 'react-devtools') return;

      if (event.data.type === "FB_PAGE_REVIEW_SYNC_PROGRESS") {
        const { current, total, pageName, count, done, error } = event.data;
        if (error) {
          alert(t("Extension Sync Failed: ") + error);
          setIsSyncing(false);
          setSyncProgress(null);
        } else if (done) {
          alert(t("Successfully fetched and optimized {{count}} profile pictures via Extension!", { count: n(count) }));
          setIsSyncing(false);
          setSyncProgress(null);
          setSelectedPageIds([]);
          fetchPages();
        } else {
          setIsSyncing(true);
          setSyncProgress({
            current,
            total,
            pageName,
            count
          });
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [t, n]);

  const handleSyncPictures = (ids?: string[], mode: 'sync' | 'update' = 'sync') => {
    const isBulk = Array.isArray(ids) && ids.length > 0;
    const confirmMsg = mode === 'update'
      ? t(`Are you sure you want to FORCE update profile pictures for the {{count}} selected page(s)? This will download the latest profile picture and delete the old one from the server.`, { count: n(ids?.length || 0) })
      : isBulk 
        ? t(`Are you sure you want to auto-fetch profile pictures for the selected page(s) that DO NOT have a picture?`)
        : t("Are you sure you want to auto-fetch profile pictures for all directory pages that do not have one? This will run in the background on the VPS.");

    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0, pageName: t("Initializing..."), count: 0 });
    
    const token = localStorage.getItem("token") || "";

    // PRIORITY: If the Chrome extension is connected, run the sync in the browser to bypass VPS CDN blocks!
    const isExtensionActive = extensionInstalled || 
                              document.documentElement.getAttribute('data-fb-page-review-extension-installed') === 'true' || 
                              !!(window as any).__fbPageReviewExtensionInstalled;

    if (isExtensionActive) {
      console.log('[Sync] Delegating profile picture sync to Chrome Extension...');
      window.postMessage({
        type: 'FB_PAGE_REVIEW_START_SYNC',
        ids: isBulk ? ids : null,
        mode,
        token,
        serverUrl: window.location.origin
      }, '*');
      return;
    }

    // Fallback: Ask if we should queue for remote extension worker
    const useRemoteQueue = window.confirm(
      t("No local Chrome Extension found on this browser.\n\n") +
      t("Would you like to queue these pages for your remote extension worker? (Choose this if you have the extension running on another active device to bypass Facebook IP blocks)")
    );

    if (useRemoteQueue) {
      console.log('[Sync] Queueing pages for remote extension worker...');
      fetch('/api/admin/pages/queue-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: isBulk ? ids : null, mode })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          throw new Error(data.error || t('Failed to queue pages'));
        }

        const totalQueued = data.queuedCount;
        if (totalQueued === 0) {
          alert(t("No pages needed syncing!"));
          setIsSyncing(false);
          setSyncProgress(null);
          return;
        }

        setSyncProgress({
          current: 0,
          total: totalQueued,
          pageName: t(`Remote worker queue initialized ({{count}} pages). Waiting for remote device...`, { count: n(totalQueued) }),
          count: 0
        });

        // Start polling the queue count to show progress
        const pollInterval = setInterval(() => {
          fetch(`/api/admin/chrome-extension/pending-sync-pages?mode=queue`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(r => r.json())
          .then(pollData => {
            const remaining = (pollData.pages || []).length;
            const current = totalQueued - remaining;

            setSyncProgress({
              current,
              total: totalQueued,
              pageName: remaining > 0
                ? t(`Remote worker processing queue ({{count}} pages remaining)...`, { count: n(remaining) })
                : t("Completing sync..."),
              count: current
            });

            if (remaining === 0) {
              clearInterval(pollInterval);
              alert(t("Successfully synced profile pictures via remote extension worker!"));
              setIsSyncing(false);
              setSyncProgress(null);
              setSelectedPageIds([]);
              fetchPages();
            }
          })
          .catch(err => {
            console.error('[Sync Queue Poll] Error:', err);
          });
        }, 3000);
      })
      .catch(err => {
        alert(t("Failed to queue pages: ") + err.message);
        setIsSyncing(false);
        setSyncProgress(null);
      });
      return;
    }

    // Fallback: server SSE
    console.log('[Sync] Chrome Extension not found. Falling back to server-side scraping...');
    let url = `/api/admin/pages/sync-pictures-progress?token=${encodeURIComponent(token)}&mode=${mode}`;
    if (isBulk) {
      url += `&ids=${encodeURIComponent(ids.join(','))}`;
    }
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        alert(t("Failed to sync: ") + data.error);
        eventSource.close();
        setIsSyncing(false);
        setSyncProgress(null);
      } else if (data.done) {
        alert(t("Successfully fetched and optimized {{count}} profile pictures!", { count: n(data.count) }));
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
      alert(t("Failed to sync profile pictures: Connection lost or server error"));
      eventSource.close();
      setIsSyncing(false);
      setSyncProgress(null);
    };
  };

  // Scroll Restoration Logic
  const isInitialMount = useRef(true);

  // Restore scroll position when loading transitions from true to false
  useEffect(() => {
    if (!loading) {
      const savedScroll = sessionStorage.getItem("admin_pages_scroll_y");
      if (savedScroll) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo(0, parseInt(savedScroll, 10));
          });
        });
      }
    }
  }, [loading]);

  // Monitor and save window scroll position
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("admin_pages_scroll_y", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Clear saved scroll position when filters or page changes (after initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    sessionStorage.removeItem("admin_pages_scroll_y");
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, claimFilter, minReviewsFilter, maxReviewsFilter, minFraudFilter, addedByFilter, dateRangeFilter, startDateFilter, endDateFilter, sortConfig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPages();
    }, 250); // 250ms debounce for admin search actions
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, searchQuery, statusFilter, claimFilter, minReviewsFilter, maxReviewsFilter, minFraudFilter, addedByFilter, dateRangeFilter, startDateFilter, endDateFilter, sortConfig]);

  const fetchPages = () => {
    setLoading(true);
    const queryParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      search: searchQuery,
      status: statusFilter,
      claimStatus: claimFilter,
      minReviews: minReviewsFilter,
      maxReviews: maxReviewsFilter,
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
        maxReviews: maxReviewsFilter,
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
      queryParams.append("maxReviews", maxReviewsFilter);
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
        alert(t(err.message || "Export failed"));
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
        alert(t(errorData.error || "Failed to update fraud status"));
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
        alert(t(data.error || "Failed to delete page"));
      }
    } catch (e) {
      alert(t("Error deleting page"));
    }
  };

  const handleCheckRedirects = async () => {
    setRedirectModalOpen(true);
    setRedirectChecking(true);
    setRedirectResults([]);
    setSelectedRedirects([]);
    setRedirectProgress({ current: 0, total: selectedPageIds.length, pageName: t("Initializing...") });
    
    const token = localStorage.getItem("token") || "";
    const url = `/api/admin/pages/check-redirects-progress?token=${encodeURIComponent(token)}&ids=${encodeURIComponent(selectedPageIds.join(','))}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        alert(t("Failed to check redirects: ") + data.error);
        eventSource.close();
        setRedirectChecking(false);
        setRedirectProgress(null);
        setRedirectModalOpen(false);
      } else if (data.result) {
        setRedirectResults(prev => {
          const exists = prev.some(r => r.id === data.result.id);
          const next = exists ? prev : [...prev, data.result];
          setSelectedRedirects(next.map(r => r.id));
          return next;
        });
      } else if (data.done) {
        eventSource.close();
        setRedirectChecking(false);
        setRedirectProgress(null);
      } else {
        setRedirectProgress({
          current: data.current,
          total: data.total,
          pageName: data.pageName
        });
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Redirect Checker connection error:", err);
      alert(t("Lost connection to server or scanning finished."));
      eventSource.close();
      setRedirectChecking(false);
      setRedirectProgress(null);
    };
  };

  const handleApplyRedirects = async () => {
    if (selectedRedirects.length === 0) {
      alert(t("Please select at least one redirect to list."));
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
        alert(t("Selected redirects applied successfully! New replacement pages listed, and old pages marked as Old/Dead."));
        setRedirectModalOpen(false);
        setSelectedPageIds([]);
        setBulkAction("");
        fetchPages();
      } else {
        alert(t(data.error || 'Failed to apply redirects.'));
      }
    } catch (err: any) {
      console.error(err);
      alert(t(err.message || 'An error occurred while applying redirects.'));
    } finally {
      setApplyingRedirects(false);
    }
  };

  const executeBulkAction = async () => {
    if (selectedPageIds.length === 0) return;
    if (!bulkAction) {
      alert(t("Please select a valid bulk action."));
      return;
    }

    if (bulkAction === 'check_redirects') {
      handleCheckRedirects();
      return;
    }

    if (bulkAction === 'sync_pictures') {
      handleSyncPictures(selectedPageIds, 'sync');
      setBulkAction("");
      return;
    }

    if (bulkAction === 'update_pictures') {
      handleSyncPictures(selectedPageIds, 'update');
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
      const confirmDelete = window.confirm(t("⚠️ Permanently delete {{count}} selected pages? This cannot be undone and will delete all trace information!", { count: n(selectedPageIds.length) }));
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
        throw new Error(data.error || t('Failed to execute bulk action'));
      }

      alert(t(data.message || 'Bulk action completed successfully!'));
      setSelectedPageIds([]);
      setBulkAction("");
      fetchPages();
    } catch(err: any) {
      console.error(err);
      alert(t(err.message || 'An error occurred during bulk operations.'));
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
                  {t("Live Facebook Page Redirection Checker")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  {t("Scrapes and traces name changes and username/URL relocations on the live platform.")}
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
                {t("Back to Dashboard")}
              </button>
            )}
          </div>
        </div>

        {/* Checker Core Area */}
        <div className="bg-white dark:bg-[#091124] border border-slate-200 dark:border-white/5 rounded-xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
          {redirectChecking && redirectProgress && (
            <div className="bg-sky-950/20 border border-sky-500/20 rounded-xl p-5 flex flex-col gap-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
                <span>🔄 {t("PROGRESS:")} {n(Math.round((redirectProgress.current / redirectProgress.total) * 100))}%</span>
                <span>{n(redirectProgress.current)} / {n(redirectProgress.total)} {t("Pages")}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-sky-500 h-full rounded-full transition-all duration-300 animate-pulse" 
                  style={{ width: `${(redirectProgress.current / redirectProgress.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mt-1">
                <div className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                <span>{t("Checking:")} <strong className="text-slate-700 dark:text-slate-100">{redirectProgress.pageName}</strong></span>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-0.5">{t("Using secure human-mimicking requests with random delays to protect the scraper from Facebook bot checkpoints.")}</p>
            </div>
          )}

          {!redirectChecking && redirectResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800/40 text-emerald-500">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{t("No URL or Page Name Changes Detected")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("All scanned profiles are pointing to their original recorded usernames and names.")}</p>
              </div>
              <button
                onClick={() => setRedirectModalOpen(false)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm transition-all font-black shadow-md cursor-pointer"
              >
                {t("Return to Dashboard")}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/20 rounded-xl flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  {t("Found {{count}} pages with live updates. Check the ones you wish to record in the database. Scraped pages will be listed as active, and original pages will be kept and marked as Old/Dead Page.", { count: n(redirectResults.length) })}
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
                            {t(result.changeType)}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider block">{t("Original / Old")}</span>
                              <strong className="text-xs text-slate-700 dark:text-slate-300 block">{result.originalName}</strong>
                              <a href={result.originalUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline line-clamp-1">{result.originalUrl}</a>
                            </div>
                            <div>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">{t("Live Scraped / New")}</span>
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
                    {selectedRedirects.length === redirectResults.length ? t("Deselect All") : t("Select All")}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={applyingRedirects}
                    onClick={() => setRedirectModalOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm transition-all cursor-pointer font-bold disabled:opacity-30"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={applyingRedirects || selectedRedirects.length === 0}
                    onClick={handleApplyRedirects}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white dark:text-[#050b18] px-5 py-2 rounded-lg text-sm transition-all cursor-pointer font-black disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/10"
                  >
                    {applyingRedirects ? t("Applying Changes...") : t("Apply & List {{count}} New Pages", { count: n(selectedRedirects.length) })}
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t("Facebook Pages")}
            </h1>
            {extensionInstalled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("Extension Connected")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 select-none animate-pulse">
                {t("Extension Disconnected")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            {t("Manage all pages in the directory.")} {!extensionInstalled && <span className="text-amber-400 font-bold block sm:inline mt-1 sm:mt-0">{t("⚠️ Install/enable the Chrome Extension to bypass Facebook IP blocks for profile picture fetching!")}</span>}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={() => setShowImportModal(true)} className="bg-sky-600/15 hover:bg-sky-600/25 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto cursor-pointer">
            <Upload className="h-4 w-4" /> {t("Import Excel")}
          </button>
          <button onClick={handleExportExcel} className="bg-indigo-600/15 hover:bg-[#131d36] text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto cursor-pointer">
            <FileDown className="h-4 w-4" /> {t("Export Excel")}
          </button>
          <Link to="/tufayel/pages/new" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors whitespace-nowrap w-full sm:w-auto">
            <Plus className="h-4 w-4" /> {t("Add Page")}
          </Link>
        </div>
      </div>

      {isSyncing && syncProgress && (
        <div className="bg-sky-950/20 border border-sky-500/20 rounded-xl p-4 flex flex-col gap-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-sky-400 font-bold">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              <span>{t("Fetching profile pictures:")} <strong className="text-white">{syncProgress.pageName}</strong></span>
            </div>
            <span>{n(syncProgress.current)} / {n(syncProgress.total)} {t("Pages")} ({syncProgress.total > 0 ? n(Math.round((syncProgress.current / syncProgress.total) * 100)) : n(0)}%)</span>
          </div>
          <div className="w-full bg-slate-800/50 rounded-full h-2.5 overflow-hidden border border-slate-700/30">
            <div 
              className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300 rounded-full" 
              style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-0.5">
            <span>{t("Fetched & optimized {{count}} profile pictures successfully.", { count: n(syncProgress.count) })}</span>
            <span>{t("Please keep this page open until completion.")}</span>
          </div>
        </div>
      )}

      {/* Advanced Filter Workspace Panel */}
      <div className="bg-[#091124] border border-white/5 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 select-none">
          <Filter className="h-3.5 w-3.5 text-emerald-500" /> {t("Search & Advanced Filters")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Search Term */}
          <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Quick Search")}</label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t("Search by Name or Facebook URL...")}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />
            </div>
          </div>

          {/* Page Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Status")}</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer"
            >
              <option value="all">{t("All Statuses")}</option>
              <option value="Reported as Fraud">{t("🛑 Reported as Fraud")}</option>
              <option value="Verified Marketplace Seller">{t("⭐ Verified Seller")}</option>
              <option value="Gold Seller">{t("🏆 Gold Seller")}</option>
              <option value="Suspicious">{t("⚠️ Suspicious")}</option>
              <option value="Under Review">{t("🔍 Under Review")}</option>
              <option value="Old/Dead Page">{t("💀 Old/Dead Pages")}</option>
              <option value="Old/Dead Reported Page">{t("💀🚩 Old/Dead Reported Pages")}</option>
              <option value="clean">{t("🛡️ Clean (Not Fraud)")}</option>
            </select>
          </div>

          {/* Page Claim Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Claim Type")}</label>
            <select
              value={claimFilter}
              onChange={(e) => { setClaimFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer"
            >
              <option value="all">{t("All Pages")}</option>
              <option value="claimed">{t("Claimed Pages")}</option>
              <option value="unclaimed">{t("Unclaimed Pages")}</option>
            </select>
          </div>

          {/* Added By Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Added By")}</label>
            <select
              value={addedByFilter}
              onChange={(e) => { setAddedByFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer"
            >
              <option value="all">{t("All Sources")}</option>
              <option value="admin">{t("Admin")}</option>
              <option value="users">{t("Users")}</option>
              <option value="auto_search">{t("Search")}</option>
            </select>
          </div>

          {/* Added Time Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Added Time")}</label>
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
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer"
            >
              <option value="all">{t("All Time")}</option>
              <option value="7days">{t("Last 7 Days")}</option>
              <option value="15days">{t("Last 15 Days")}</option>
              <option value="30days">{t("Last 30 Days")}</option>
              <option value="6months">{t("Last 6 Months")}</option>
              <option value="custom">{t("📅 Custom Range...")}</option>
            </select>
          </div>

          {/* Reviews Range Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Reviews (Min - Max)")}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                placeholder={t("Min")}
                value={minReviewsFilter}
                onChange={(e) => { setMinReviewsFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-2.5 py-2 text-sm placeholder-slate-700 text-center focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />
              <span className="text-slate-500 text-xs font-bold">{t("to")}</span>
              <input
                type="number"
                min="0"
                placeholder={t("Max")}
                value={maxReviewsFilter}
                onChange={(e) => { setMaxReviewsFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-2.5 py-2 text-sm placeholder-slate-700 text-center focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all"
              />
            </div>
          </div>

          {/* Min Fraud Reports Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Min Fraud reports")}</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 2"
              value={minFraudFilter}
              onChange={(e) => { setMinFraudFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all"
            />
          </div>

        </div>

        {/* Custom Date Range Picker */}
        {dateRangeFilter === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#050b18] border border-white/5 rounded-xl transition-all duration-300">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("Start Date")}</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t("End Date")}</label>
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
        {(statusFilter !== "all" || claimFilter !== "all" || minReviewsFilter !== "" || maxReviewsFilter !== "" || minFraudFilter !== "" || addedByFilter !== "all" || dateRangeFilter !== "all" || startDateFilter !== "" || endDateFilter !== "" || searchQuery !== "") && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => {
                setStatusFilter("all");
                setClaimFilter("all");
                setMinReviewsFilter("");
                setMaxReviewsFilter("");
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
              ✕ {t("Reset All Active Filters")}
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Workspace Banner */}
      {selectedPageIds.length > 0 && (
        <div className="bg-[#0a142c]/90 border border-indigo-500/20 backdrop-blur-md shadow-2xl shadow-indigo-950/20 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-7 px-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-black flex items-center justify-center gap-1.5 select-none shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              {t("{{count}} Selected", { count: n(selectedPageIds.length) })}
            </div>
            <p className="text-sm text-slate-300 mt-1 lg:mt-0 font-medium">
              {t("Choose an action to perform on the selected pages:")}
            </p>
            {selectedPageIds.length === pages.length && total > pages.length && (
              <button
                disabled={selectingAllMatching}
                onClick={selectAllMatchingPages}
                className="bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 text-indigo-300 text-xs font-black px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {selectingAllMatching ? t("Loading all...") : t("Select all {{count}} pages", { count: n(total) })}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bg-[#050b18] border border-white/10 text-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer h-9"
            >
              <option value="">-- {t("Bulk Actions")} --</option>
              <option value="mark_fraud">{t("Bulk Mark as Fraud (-100 Score)")}</option>
              <option value="clear_fraud">{t("Bulk Clear Fraud (Under Review)")}</option>
              <option value="change_status">{t("Bulk Change Status Badge...")}</option>
              <option value="check_redirects">{t("🔍 Check Name/URL Redirects")}</option>
              <option value="sync_pictures">{t("🖼️ Auto-Fetch Profile Pictures")}</option>
              <option value="update_pictures">{t("🔄 Update Profile Pictures")}</option>
              <option value="export">{t("Bulk Export to Excel")}</option>
              <option value="delete">{t("Bulk Permanently Delete")}</option>
            </select>

            {bulkAction === "change_status" && (
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className="bg-[#050b18] border border-white/10 text-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer h-9"
              >
                <option value="Under Review">{t("Under Review")}</option>
                <option value="Reported as Fraud">{t("Reported as Fraud")}</option>
                <option value="Verified Marketplace Seller">{t("Verified Marketplace Seller")}</option>
                <option value="Gold Seller">{t("Gold Seller")}</option>
                <option value="Suspicious">{t("Suspicious")}</option>
                <option value="Old/Dead Page">{t("Old/Dead Page")}</option>
                <option value="Clean">{t("Clean")}</option>
              </select>
            )}

            <button
              disabled={bulkLoading || !bulkAction}
              onClick={executeBulkAction}
              className="bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-extrabold px-4 py-2 rounded-lg text-xs shadow-lg shadow-indigo-500/10 transition-all select-none hover:brightness-110 active:scale-97 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed h-9 flex items-center justify-center"
            >
              {bulkLoading ? t("Running...") : t("Apply to Chosen")}
            </button>
            <button
              onClick={() => setSelectedPageIds([])}
              className="bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 font-bold px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer h-9 flex items-center justify-center"
            >
              {t("Clear choices")}
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
                    <span>{t("SL")}</span>
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('current_name')}>
                  <div className="flex items-center gap-1.5">
                    {t("Page Details")} 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "current_name" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('total_reviews')}>
                  <div className="flex items-center gap-1.5">
                    {t("Total Reviews")} 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "total_reviews" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('fraud_report_count')}>
                  <div className="flex items-center gap-1.5">
                    {t("Fraud Reports")} 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "fraud_report_count" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('status_badge')}>
                  <div className="flex items-center gap-1.5">
                    {t("Status")} 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "status_badge" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all text-slate-200" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1.5">
                    {t("Added")} 
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortConfig?.key === "created_at" ? "text-emerald-500" : "text-slate-500"}`} />
                  </div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  {t("Actions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                      <span className="font-bold text-xs uppercase tracking-wider animate-pulse">{t("Running directory query...")}</span>
                    </div>
                  </td>
                </tr>
              ) : pages.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500 italic"
                  >
                    {t("No Facebook pages found matching your selected search query and active parameters.")}
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
                          <span className="font-mono text-xs text-slate-500">{n(startIndex + index + 1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <TablePageAvatar page={page} />
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
                                {t(page.claim_status || "Unclaimed")}
                              </span>
                            </div>
                            <a
                              href={page.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 hover:text-emerald-400 hover:underline truncate w-48 mt-0.5 block"
                              title={page.facebook_url}
                            >
                              {page.facebook_url}
                            </a>
                            {page.contact_number && (
                              <div className="text-[11px] text-slate-350 mt-1 flex items-center gap-1">
                                <span className="text-slate-500 font-medium text-[10px]">{t("Contact:")}</span>
                                <span className="font-mono text-emerald-400">{page.contact_number}</span>
                              </div>
                            )}
                            {page.payment_methods && (() => {
                              try {
                                const parsed = typeof page.payment_methods === 'string' && page.payment_methods.startsWith('[')
                                  ? JSON.parse(page.payment_methods)
                                  : page.payment_methods;
                                const methods = Array.isArray(parsed) ? parsed : (typeof parsed === 'string' ? parsed.split(',').map((s: string)=>s.trim()).filter(Boolean) : []);
                                if (methods.length > 0) {
                                  return (
                                    <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1 items-center">
                                      <span className="text-slate-500 font-medium text-[9px]">{t("Payments:")}</span>
                                      {methods.map((m: string, i: number) => (
                                        <span key={i} className="px-1 py-0.5 bg-slate-800 text-slate-350 rounded border border-white/10 font-black text-[9px] uppercase tracking-wide">
                                          {t(m)}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                              } catch(e) {}
                              return null;
                             })()}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-slate-200 font-extrabold text-sm">
                          {n(page.total_reviews ?? 0)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`font-mono font-extrabold text-sm ${page.fraud_report_count > 0 ? "text-rose-400 font-black" : "text-slate-400"}`}>
                          {n(page.fraud_report_count ?? 0)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {page.status_badge && page.status_badge.includes("Reported as Fraud") && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <ShieldAlert className="h-2.5 w-2.5" /> {t("Fraud")}
                          </span>
                        )}
                        {page.status_badge === "Verified Marketplace Seller" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="h-2.5 w-2.5" /> {t("Verified Seller")}
                          </span>
                        )}
                        {page.status_badge === "Gold Seller" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            🏆 {t("Gold Seller")}
                          </span>
                        )}
                        {page.status_badge === "Under Review" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            🔍 {t("Under Review")}
                          </span>
                        )}
                        {page.status_badge === "Suspicious" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⚠️ {t("Suspicious")}
                          </span>
                        )}
                        {page.status_badge && page.status_badge.startsWith("Old/Dead Page") && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/25">
                            💀 {t("Old/Dead Page")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                        <div className="text-slate-300">
                          {page.created_at ? new Date(page.created_at).toLocaleDateString() : ""}
                        </div>
                        <div className="mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-black uppercase ${
                            page.added_by === 'users'
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                              : page.added_by === 'auto_search'
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {page.added_by === 'users' 
                              ? t('User') 
                              : page.added_by === 'auto_search' 
                                ? t('Search') 
                                : t('Admin')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                             to={`/tufayel/pages/${page.id}`}
                             className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline px-2 py-1 transition-colors"
                          >
                             {t("Edit")}
                          </Link>
                          {deleteConfirmId === page.id ? (
                            <button
                              onClick={() => handleDelete(page.id)}
                              className="text-xs font-black text-white bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 rounded-lg shadow transition-colors cursor-pointer"
                            >
                               {t("Confirm")}
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(page.id)}
                              className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 transition-colors"
                            >
                               {t("Delete")}
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
                            {isFraud ? t("Clear Fraud") : t("Mark Fraud")}
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
              {t("Showing")} {pages.length === 0 ? n(0) : n(startIndex + 1)} {t("to")} {n(Math.min(startIndex + pages.length, total))} {t("of")} {n(total)} {t("entries")}
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-semibold text-xs uppercase tracking-wider">{t("Show:")}</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-[#091124] border border-white/5 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200 cursor-pointer"
                >
                   <option value={10}>{n(10)}</option>
                   <option value={20}>{n(20)}</option>
                   <option value={50}>{n(50)}</option>
                   <option value={100}>{n(100)}</option>
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
                 <span className="text-xs font-black min-w-10 text-center px-1 text-slate-300">{n(currentPage)} / {n(Math.max(1, totalPages))}</span>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-[#050b18]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in animate-duration-150">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#050b18]/40">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-sky-400" />
                {t("Import Facebook Pages")}
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportProgress(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleImportSubmit} className="p-5 space-y-4">
              <div className={`border-2 ${importProgress !== null ? 'border-sky-500/30 bg-sky-900/10' : 'border-dashed border-white/10'} rounded-xl p-6 text-center hover:bg-white/[0.01] transition-colors relative overflow-hidden`}>
                {importProgress !== null ? (
                  <div className="flex flex-col items-center justify-center p-2">
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                      <div className="bg-sky-500 h-3 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                    </div>
                    <div className="text-lg font-extrabold text-sky-400 mb-1">{n(importProgress)}%</div>
                    <div className="text-xs text-slate-400 font-semibold">{t("Processing file, please do not close...")}</div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    <div className="text-xs font-bold text-slate-200 mb-1">
                      {t("Drag & drop your Excel file here or click below")}
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3">
                      {t("Supports XLSX sheets only (Max 10MB)")}
                    </p>
                    <input
                      type="file"
                      required
                      accept=".xlsx"
                      onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                      className="text-xs text-slate-350 mx-auto block max-w-[200px]"
                    />
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    window.open('/api/admin/pages/export?template=true&token=' + localStorage.getItem('token'), '_blank');
                  }}
                  disabled={importProgress !== null}
                  className={`text-xs font-bold flex items-center gap-1 transition-colors ${importProgress !== null ? 'text-slate-500 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                >
                  <FileDown className="h-4 w-4" /> {t("Download Sample Template")}
                </button>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                    }}
                    disabled={importProgress !== null}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white font-bold cursor-pointer disabled:opacity-40"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={importProgress !== null || !importFile}
                    className={`px-4 py-1.5 rounded-lg text-xs font-extrabold text-[#050b18] cursor-pointer flex items-center gap-1.5 transition-all ${
                      importProgress !== null || !importFile
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-sky-400 hover:bg-sky-500 shadow-md shadow-sky-500/10'
                    }`}
                  >
                    {importProgress !== null ? t('Importing...') : t('Upload & Import')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
