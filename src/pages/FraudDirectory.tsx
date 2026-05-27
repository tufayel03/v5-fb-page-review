import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Sliders,
} from "lucide-react";

export default function FraudDirectory() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10); // Standard default aligned with mockup selection
  const [loading, setLoading] = useState(true);

  // Filters state corresponding to sidebar controls
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [dateListed, setDateListed] = useState("all");
  const [hasContact, setHasContact] = useState(false);
  const [sort, setSort] = useState("recently_listed");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDirectory = () => {
    const trimmedSearch = search.trim();
    if (trimmedSearch.length > 0 && trimmedSearch.length < 2) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    const queryParams = new URLSearchParams({
      search: trimmedSearch,
      category,
      severity: "all", // Standard api security schema compliance
      date_listed: dateListed,
      has_contact: hasContact ? "true" : "false",
      sort,
      page: String(page),
      limit: String(limit),
    });

    fetch(`/api/pages/fraud-directory?${queryParams}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setItems(data.items);
          setTotal(data.total);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error(err);
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [page, limit, category, dateListed, hasContact, sort]);

  // Debounced search trigger for user-friendly searches
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDirectory();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Clean filters reset
  const handleResetFilters = () => {
    setSearch("");
    setCategory("all");
    setDateListed("all");
    setHasContact(false);
    setSort("recently_listed");
    setLimit(10);
    setPage(1);
  };

  // Generate page numbers for custom paginating
  const totalPages = Math.ceil(total / limit) || 1;
  const getPageNumbers = () => {
    const pagesList: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pagesList.push(i);
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pagesList.push(i);
        pagesList.push(-1); // ellipsis
        pagesList.push(totalPages);
      } else if (page >= totalPages - 2) {
        pagesList.push(1);
        pagesList.push(-1); // ellipsis
        for (let i = totalPages - 3; i <= totalPages; i++) pagesList.push(i);
      } else {
        pagesList.push(1);
        pagesList.push(-1); // ellipsis
        pagesList.push(page - 1);
        pagesList.push(page);
        pagesList.push(page + 1);
        pagesList.push(-1); // ellipsis
        pagesList.push(totalPages);
      }
    }
    return pagesList;
  };

  const showingStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      {/* Maximum utilize horizontal width matching mockup container guidelines */}
      <div className="max-w-7xl mx-auto w-full">
        {/* Main Side by Side grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column Sidebar Filters (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1 lg:space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              {/* Header inside Filters box */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-150 mb-5">
                <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  Filters
                </h2>
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              </div>

              {/* Filter inputs flow */}
              <div className="space-y-5">
                {/* Search input field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">
                    Search Page
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search page name"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>



                {/* Select Listed Date field with Calendar icon inside select block */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">
                    Listed Date
                  </label>
                  <div className="relative">
                    <select
                      value={dateListed}
                      onChange={(e) => {
                        setDateListed(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all font-medium text-slate-700 cursor-pointer appearance-none"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today Only</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
                    </select>
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Page Size limit chooser fields */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">
                    Page Size
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all font-medium text-slate-700 cursor-pointer"
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>

                {/* Only show billing phone contacts checkbox */}
                <div className="pt-2 border-t border-slate-100 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="billing-contacts-filter"
                    checked={hasContact}
                    onChange={(e) => {
                      setHasContact(e.target.checked);
                      setPage(1);
                    }}
                    className="w-4 h-4 mt-0.5 text-emerald-600 border-slate-200 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label
                    htmlFor="billing-contacts-filter"
                    className="text-xs text-slate-500 font-medium select-none cursor-pointer leading-tight"
                  >
                    Only verified billing numbers (bKash/Nagad/Phone)
                  </label>
                </div>

                {/* Reset Filters green outlined button matching the mock */}
                <div className="pt-2">
                  <button
                    onClick={handleResetFilters}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#059669] hover:bg-emerald-50 bg-white border border-[#10b981] rounded-xl cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Title, Total Banner & Records Table */}
          <div className="lg:col-span-3 space-y-5">
            {/* Elegant Header and Total counter side-by-side row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Detected Fraud Pages
                </h1>
                <p className="mt-1 text-[11px] sm:text-sm text-slate-500 font-medium max-w-xl leading-relaxed">
                  Review and monitor Facebook pages that have been flagged for
                  fraudulent activity.
                </p>
              </div>

              {/* Total Flagged Count Badge matching mockup exactly */}
              <div className="bg-[#fafafb] border border-[#e2e8f0] rounded-xl px-3 py-1.5 sm:px-5 sm:py-2.5 text-center shrink-0 min-w-[95px] sm:min-w-[130px] shadow-2xs">
                <span className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Flagged
                </span>
                <span className="text-base sm:text-2xl font-black text-[#10b981] leading-tight block mt-0.5">
                  {total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Mobile Search & Quick Filters Bar (Visible on mobile only) */}
            <div className="block lg:hidden space-y-3">
              {/* Search input field */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search page name"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#10b981]/15 focus:border-[#10b981] transition-all font-medium text-slate-800 placeholder-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>

              {/* Two key quick controls */}
              <div className="grid grid-cols-2 gap-3">
                {/* Filters Trigger Button */}
                <button
                  onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                  className={`inline-flex items-center justify-center gap-1.5 bg-white border rounded-xl py-2 px-2.5 text-xs font-bold transition-all h-10 cursor-pointer ${
                    mobileFiltersOpen
                      ? "border-[#10b981] bg-emerald-50 text-[#10b981]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                </button>

                {/* Sort Option dropdown selection */}
                <div className="relative h-10">
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-full bg-white border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-bold rounded-xl px-2 py-2 hover:bg-slate-50 transition-colors cursor-pointer appearance-none text-center"
                  >
                    <option value="recently_listed">Sort: Newest</option>
                    <option value="oldest_listed">Sort: Oldest</option>
                    <option value="report_count">Sort: Reports</option>
                    <option value="trust_score">Sort: Trust Score</option>
                    <option value="name_asc">Sort: A-Z</option>
                  </select>
                </div>
              </div>

              {/* Collapsible Mobile Extra Filters Container */}
              {mobileFiltersOpen && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                      Filter Options
                    </span>
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Close
                    </button>
                  </div>



                  {/* Listed Date Filter */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">
                      Listed Date
                    </label>
                    <select
                      value={dateListed}
                      onChange={(e) => {
                        setDateListed(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-medium text-slate-700 cursor-pointer"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today Only</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
                    </select>
                  </div>

                  {/* Limit filter option */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">
                      Page Size
                    </label>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-medium text-slate-700 cursor-pointer"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  {/* Checkbox item */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="mobile-extra-billing-filter"
                      checked={hasContact}
                      onChange={(e) => {
                        setHasContact(e.target.checked);
                        setPage(1);
                      }}
                      className="w-4 h-4 text-emerald-600 border-slate-200 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="mobile-extra-billing-filter"
                      className="text-xs text-slate-500 font-medium leading-tight cursor-pointer selection:bg-transparent select-none"
                    >
                      Only verified billing numbers (bKash/Nagad/Phone)
                    </label>
                  </div>

                  {/* Reset Filters */}
                  <div className="pt-2">
                    <button
                      onClick={handleResetFilters}
                      className="w-full py-2 bg-white border border-rose-500 hover:bg-rose-50 text-xs font-bold text-rose-600 rounded-xl cursor-pointer transition-colors"
                    >
                      Reset All Options
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main table content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                <div className="relative flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-emerald-600"></div>
                  <ShieldAlert className="w-5 h-5 text-emerald-600 absolute animate-pulse" />
                </div>
                <p className="text-xs text-slate-400 font-bold mt-4">
                  Retrieving blacklisted page directory...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-xs px-6">
                <div className="w-14 h-14 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sliders className="w-6 h-6 text-slate-350" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  No records found
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  No fraud profiles matched your current search and select
                  inputs. Try clicking Reset Filters above.
                </p>
              </div>
            ) : (
              <div className="md:bg-white md:border md:border-[#e2e8f0] md:rounded-2xl md:shadow-xs overflow-hidden">
                {/* Desktop View Table: Aligned with the mockup */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse table-auto">
                    <thead>
                      <tr className="bg-[#f8fafc] text-slate-500 font-bold text-xs border-b border-[#e2e8f0] uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-16">SL</th>
                        <th className="py-3.5 px-4">Page</th>
                        <th className="py-3.5 px-4 w-44">Listed Date</th>
                        <th className="py-3.5 px-4 text-right w-32">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] text-sm text-slate-800">
                      {items.map((item, index) => {
                        const serialNumber = (page - 1) * limit + index + 1;
                        const listedDateStr = item.fraud_listed_at
                          ? new Date(item.fraud_listed_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "N/A";

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            {/* SL (Centered column) */}
                            <td className="py-3.5 px-4 text-center text-slate-500 font-mono font-medium">
                              {serialNumber}
                            </td>

                            {/* Page avatar & title & FB External Link icon */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {item.profile_picture ? (
                                  <img
                                    src={item.profile_picture}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 select-none text-white">
                                    {item.current_name.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-semibold text-slate-800 truncate block">
                                    {item.current_name}
                                  </span>

                                  {/* Facebook Link icon right next to name, matching mockup */}
                                  <a
                                    href={item.facebook_url}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 transition-colors shrink-0 inline-flex"
                                    title="Go to Facebook Profile"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            </td>



                            {/* Listed Date Column */}
                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              {listedDateStr}
                            </td>

                            {/* View Action matching green button style */}
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                to={`/page/${item.id}`}
                                className="inline-flex items-center gap-1 text-[#10b981] hover:bg-emerald-50 bg-white border border-[#10b981] rounded-lg py-1 px-3 text-xs font-bold transition-all shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#10b981]" />
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View elegant separate cards matching mockup exactly */}
                <div className="block md:hidden space-y-3">
                  {items.map((item, index) => {
                    const serialNumber = (page - 1) * limit + index + 1;
                    const listedDateStr = item.fraud_listed_at
                      ? new Date(item.fraud_listed_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : "N/A";

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-3xs"
                      >
                        {/* Serial number & Avatar column layout */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* SL */}
                          <span className="text-sm font-semibold font-mono text-slate-400 w-5 shrink-0 text-center select-none">
                            {serialNumber}
                          </span>

                          {/* Avatar */}
                          {item.profile_picture ? (
                            <img
                              src={item.profile_picture}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-150 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-200 flex items-center justify-center font-bold text-xs text-white shrink-0 select-none">
                              {item.current_name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Details */}
                          <div className="min-w-0 pl-0.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-extrabold text-[#0f172a] text-[13.5px] truncate block leading-tight">
                                {item.current_name}
                              </span>
                              <a
                                href={item.facebook_url}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-500 transition-colors shrink-0 inline-flex mt-0.5"
                                title="Go to Facebook Profile"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate flex items-center gap-1.5 leading-none">
                              <span>{listedDateStr}</span>
                            </div>
                          </div>
                        </div>

                        {/* View Button */}
                        <Link
                          to={`/page/${item.id}`}
                          className="inline-flex items-center gap-1 text-[#10b981] hover:bg-emerald-50 bg-white border border-[#10b981] rounded-lg py-1.5 px-3.5 text-xs font-bold transition-all shadow-3xs shrink-0 select-none"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#10b981]" />
                          View
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop view footer entries statistics and modern green pagination bar */}
                <div className="hidden md:flex bg-[#f8fafc] border-t border-[#e2e8f0] py-4 px-5 flex-row items-center justify-between gap-4">
                  {/* Results Text */}
                  <span className="text-xs font-semibold text-slate-500">
                    Showing {showingStart} to {showingEnd} of{" "}
                    {total.toLocaleString()} entries
                  </span>

                  {/* High Quality Pagination Control matching mockup layout directly */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    {/* First Page */}
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 select-none text-slate-600 transition-colors cursor-pointer"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Prev Page */}
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 select-none text-slate-600 transition-colors cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Number buttons list page map */}
                    {getPageNumbers().map((num, idx) => {
                      if (num === -1) {
                        return (
                          <span
                            key={`ellip-${idx}`}
                            className="text-slate-400 px-1 select-none font-mono"
                          >
                            ...
                          </span>
                        );
                      }
                      const active = page === num;
                      return (
                        <button
                          key={`pg-num-${num}`}
                          onClick={() => setPage(num)}
                          className={`text-xs font-bold w-8 h-8 rounded-lg transition-all cursor-pointer ${
                            active
                              ? "bg-[#10b981] text-white border border-[#10b981] font-extrabold shadow-xs"
                              : "border border-slate-250 hover:bg-slate-50 text-slate-600 bg-white"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}

                    {/* Next Page */}
                    <button
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 select-none text-slate-600 transition-colors cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(totalPages)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 select-none text-slate-600 transition-colors cursor-pointer"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile View pagination controls block centered underneath */}
                <div className="block md:hidden mt-6 space-y-4">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    {/* First Page */}
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer h-9 w-9 flex items-center justify-center"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Prev Page */}
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer h-9 w-9 flex items-center justify-center"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((num, idx) => {
                      if (num === -1) {
                        return (
                          <span
                            key={`ellip-m-${idx}`}
                            className="text-slate-400 px-0.5 select-none font-mono"
                          >
                            ...
                          </span>
                        );
                      }
                      const active = page === num;
                      return (
                        <button
                          key={`pg-num-m-${num}`}
                          onClick={() => setPage(num)}
                          className={`text-xs font-bold w-9 h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                            active
                              ? "bg-[#10b981] text-white border border-[#10b981] font-extrabold shadow-sm"
                              : "border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white"
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}

                    {/* Next Page */}
                    <button
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer h-9 w-9 flex items-center justify-center"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(totalPages)}
                      className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors cursor-pointer h-9 w-9 flex items-center justify-center"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Centered Results Text */}
                  <div className="text-center pb-2">
                    <span className="text-[12px] font-semibold text-slate-400">
                      Showing {showingStart} to {showingEnd} of{" "}
                      {total.toLocaleString()} entries
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
