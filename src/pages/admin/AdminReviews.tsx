import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Search, Filter, ShieldAlert, Star, ShieldCheck, ArrowUpDown, ChevronLeft, ChevronRight, FileDown } from "lucide-react";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Bulk selection and actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews();
    }, 250); // Debounce reviews queries
    return () => clearTimeout(timer);
  }, [currentPage, itemsPerPage, searchQuery, ratingFilter, statusFilter, typeFilter, sortConfig]);

  const fetchReviews = () => {
    setLoading(true);
    const queryParams = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      search: searchQuery,
      rating: ratingFilter,
      status: statusFilter,
      type: typeFilter,
      sortBy: sortConfig?.key || "created_at",
      sortOrder: sortConfig?.direction ? sortConfig.direction.toUpperCase() : "DESC",
    });

    // Clear selections whenever queries/pages change to prevent stale selection ids
    setSelectedIds([]);
    setBulkConfirmDelete(false);
    setBulkActionError(null);

    fetch(`/api/admin/reviews?${queryParams}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setReviews(data.items);
          setTotal(data.total || 0);
        } else {
          setReviews([]);
          setTotal(0);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setReviews([]);
        setTotal(0);
        setLoading(false);
      });
  };

  const handleBulkAction = async (action: 'status' | 'delete', value?: string) => {
    if (selectedIds.length === 0) return;
    
    setBulkActionLoading(true);
    setBulkActionError(null);
    try {
      const res = await fetch('/api/admin/reviews/bulk', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          value,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setSelectedIds([]);
        setBulkConfirmDelete(false);
        fetchReviews();
      } else {
        setBulkActionError(resData.error || `Bulk action failed`);
      }
    } catch (e: any) {
      console.error(e);
      setBulkActionError(e.message || "An unexpected error occurred.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const uniquePages = useMemo(() => {
    const pages = new Map();
    reviews.forEach(r => {
      if (r.page_id && r.current_name) {
        pages.set(r.page_id, r.current_name);
      }
    });
    return Array.from(pages.entries()).map(([id, name]) => ({ id, name }));
  }, [reviews]);

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchReviews(); // Refresh the list
      } else {
        alert("Failed to delete review.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting the review.");
    }
  };

  const handleExportCSV = () => {
    if (!reviews || reviews.length === 0) return;
    const headers = ['ID', 'User ID', 'Page ID', 'Review Type', 'Rating', 'Title', 'Status', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...reviews.map(r => [
        r.id,
        r.user_id || '',
        r.page_id || '',
        r.review_type || '',
        r.star_rating || 0,
        '"' + (r.title || '').replace(/"/g, '""') + '"',
        r.status || '',
        r.created_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'reviews_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReviews = reviews;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Reviews
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            Manage and moderate all reviews. (Type a page name in search to quickly moderate reviews for that page).
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-wrap justify-end">
          <button onClick={handleExportCSV} className="bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto">
            <FileDown className="h-4 w-4" /> Export CSV
          </button>
          
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
             {/* Unified Sorting Filter */}
             <select
                 value={`${sortConfig?.key}-${sortConfig?.direction}`}
                 onChange={(e) => {
                   const [key, direction] = e.target.value.split('-');
                   setSortConfig({ key, direction: direction as 'asc' | 'desc' });
                   setCurrentPage(1);
                 }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="created_at-desc" className="bg-[#091124]">Sort: Recent First</option>
                 <option value="created_at-asc" className="bg-[#091124]">Sort: Oldest First</option>
                 <option value="rating-desc" className="bg-[#091124]">Sort: Rating (High to Low)</option>
                 <option value="rating-asc" className="bg-[#091124]">Sort: Rating (Low to High)</option>
              </select>

             <select
                 value={statusFilter}
                 onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Statuses</option>
                 <option value="Pending" className="bg-[#091124]">Pending</option>
                 <option value="Published" className="bg-[#091124]">Published</option>
                 <option value="Verified" className="bg-[#091124]">Verified</option>
                 <option value="Rejected" className="bg-[#091124]">Rejected</option>
                 <option value="Under Review" className="bg-[#091124]">Under Review</option>
              </select>

             <select
                 value={typeFilter}
                 onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Types</option>
                 <option value="Good" className="bg-[#091124]">Good</option>
                 <option value="Fraud Report" className="bg-[#091124]">Fraud Report</option>
                 <option value="Bad" className="bg-[#091124]">Bad</option>
              </select>

             <select
                 value={ratingFilter}
                 onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
                 className="bg-[#091124] border border-white/5 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                 <option value="all" className="bg-[#091124]">All Ratings</option>
                 <option value="5" className="bg-[#091124]">5 Stars</option>
                 <option value="4" className="bg-[#091124]">4 Stars</option>
                 <option value="3" className="bg-[#091124]">3 Stars</option>
                 <option value="2" className="bg-[#091124]">2 Stars</option>
                 <option value="1" className="bg-[#091124]">1 Star</option>
              </select>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by URL, page name, text..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

      </div>

      {/* Bulk actions header panel */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-100">
              Selected <span className="text-indigo-400 text-base font-black">{selectedIds.length}</span> {selectedIds.length === 1 ? 'review' : 'reviews'} for bulk actions
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs bg-[#091124] hover:bg-[#050b18] border border-white/5 text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 rounded"
            >
              Clear Selection
            </button>
          </div>

          {bulkActionError && (
            <p className="text-xs text-rose-400 font-bold">{bulkActionError}</p>
          )}

          <div className="flex items-center gap-4 w-full md:w-auto justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Change Status:</span>
              <select
                disabled={bulkActionLoading}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction('status', e.target.value);
                    e.target.value = "";
                  }
                }}
                className="bg-[#091124] border border-white/10 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="">-- Choose Status --</option>
                <option value="Published" className="bg-[#091124]">Published</option>
                <option value="Verified" className="bg-[#091124]">Verified</option>
                <option value="Pending" className="bg-[#091124]">Pending</option>
                <option value="Rejected" className="bg-[#091124]">Rejected</option>
                <option value="Under Review" className="bg-[#091124]">Under Review</option>
              </select>
            </div>

            {bulkConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-black">Are you sure?</span>
                <button
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkAction('delete')}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Yes, Delete Selected
                </button>
                <button
                  disabled={bulkActionLoading}
                  onClick={() => setBulkConfirmDelete(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                disabled={bulkActionLoading}
                onClick={() => setBulkConfirmDelete(true)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-4 py-4 border-b border-white/5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={reviews.length > 0 && selectedIds.length === reviews.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(reviews.map((r) => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-[#050b18]/45 border-white/10 focus:ring-emerald-500/30 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 border-b border-white/5 w-16">SL</th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1">Review <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('current_name')}>
                  <div className="flex items-center gap-1">Page <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('rating')}>
                  <div className="flex items-center gap-1">Rating <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 w-32 bg-white/5 mx-auto rounded"></div>
                  </td>
                </tr>
              ) : paginatedReviews.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    No reviews found.
                  </td>
                </tr>
              ) : (
                paginatedReviews.map((review, index) => {
                  return (
                    <tr
                      key={review.id}
                      className={`hover:bg-white/[0.02] transition-colors ${selectedIds.includes(review.id) ? 'bg-indigo-600/5' : ''}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(review.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, review.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== review.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-500 bg-[#050b18]/45 border-white/10 focus:ring-emerald-500/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 max-w-[250px]">
                        <p className="font-bold text-white truncate">
                          {review.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {review.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-emerald-400">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-xs font-bold">
                            {review.star_rating}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 animate-duration-150">
                        <a
                          href={`/page/${review.page_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-slate-200 hover:text-emerald-400 hover:underline truncate block w-40 transition-colors"
                        >
                          {review.current_name || "Unknown Page"}
                        </a>
                      </td>
                       <td className="px-6 py-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                            ${
                              (review.review_type === "Safe" || review.review_type === "Good")
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : review.review_type === "Fraud Report"
                                  ? "bg-[#fb7185]/10 text-rose-400 border border-rose-500/20"
                                  : (review.review_type === "Suspicious" || review.review_type === "Bad")
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-slate-500/10 text-slate-400 border border-[#475569]/30"
                            }
                          `}
                        >
                          {review.review_type === "Fraud Report" ? (
                            <span className="flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Fraud
                            </span>
                          ) : (review.review_type === "Safe" || review.review_type === "Good") ? (
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Good
                            </span>
                          ) : (review.review_type === "Suspicious" || review.review_type === "Bad") ? (
                            <span className="flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3 text-amber-400" /> Bad
                            </span>
                          ) : (
                            review.review_type
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-200 font-bold text-xs uppercase tracking-wide">
                          {review.status}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/tufayel/reviews/${review.id}`} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline px-2 py-1">
                          View
                        </Link>
                        {deleteConfirmId === review.id ? (
                          <button onClick={() => handleDeleteReview(review.id)} className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded cursor-pointer">
                            Confirm
                          </button>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(review.id)} className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline px-2 py-1 ml-1 cursor-pointer">
                            Delete
                          </button>
                        )}
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
              Showing {reviews.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + reviews.length, total)} of {total} entries
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-medium">Show:</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-[#091124] border border-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200"
                >
                   <option value={10} className="bg-[#091124]">10</option>
                   <option value={20} className="bg-[#091124]">20</option>
                   <option value={50} className="bg-[#091124]">50</option>
                   <option value={100} className="bg-[#091124]">100</option>
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
                 <span className="text-xs font-bold px-2 text-slate-300">{currentPage} / {Math.max(1, totalPages)}</span>
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
