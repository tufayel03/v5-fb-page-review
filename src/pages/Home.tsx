import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import {
  Search,
  ShieldAlert,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Store,
  Users,
  Lock,
  Zap,
  SquarePen,
  MessageSquare,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

function AdBanner({ htmlCode }: { htmlCode: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    if (!htmlCode) return;

    try {
      const range = document.createRange();
      range.selectNode(containerRef.current);
      const fragment = range.createContextualFragment(htmlCode);
      containerRef.current.appendChild(fragment);
    } catch (e) {
      console.error("Ad script render error:", e);
    }
  }, [htmlCode]);

  if (!htmlCode) {
    return <div className="hidden" />;
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full max-w-4xl mx-auto my-4 overflow-hidden flex justify-center items-center min-h-[90px] bg-slate-50/50 rounded-xl" 
    />
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [recentPages, setRecentPages] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [publicSettings, setPublicSettings] = useState<any>({});
  const scrollContainerRefPages = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktopDropdownOpen = showDropdown && !isMobileSearchActive;

  useEffect(() => {
    fetch("/api/pages/recent-fraud")
      .then((res) => res.json())
      .then((data) => {
        setRecentPages(Array.isArray(data) ? data : []);
        setIsLoadingPages(false);
      })
      .catch((err) => {
        console.error("Error fetching recent pages:", err);
        setIsLoadingPages(false);
      });

    fetch("/api/reviews/recent")
      .then((res) => res.json())
      .then((data) => {
        setRecentReviews(Array.isArray(data) ? data : []);
        setIsLoadingReviews(false);
      })
      .catch((err) => {
        console.error("Error fetching recent reviews:", err);
        setIsLoadingReviews(false);
      });

    fetch("/api/popular-searches")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPopularSearches(data);
        }
      })
      .catch((err) => console.error("Error fetching popular searches:", err));

    fetch("/api/public-settings")
      .then((res) => res.json())
      .then((data) => setPublicSettings(data || {}))
      .catch((err) => console.error("Error fetching public settings:", err));
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length >= 2) {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        fetch(`/api/pages/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        })
          .then((res) => res.json())
          .then((data) => {
            setSearchResults(data);
            setShowDropdown(true);
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.error("Search error:", err);
            }
          });
      }, 300);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenSearch = () => {
      if (window.innerWidth < 768) {
        setIsMobileSearchActive(true);
      }
    };

    window.addEventListener("open-mobile-search", handleOpenSearch);

    const params = new URLSearchParams(window.location.search);
    if (params.get("search") === "true" && window.innerWidth < 768) {
      setIsMobileSearchActive(true);
      // Clean up the URL parameter
      window.history.replaceState({}, "", "/");
    }

    return () =>
      window.removeEventListener("open-mobile-search", handleOpenSearch);
  }, []);

  useEffect(() => {
    if (isMobileSearchActive) {
      document.body.classList.add("mobile-search-active");
    } else {
      document.body.classList.remove("mobile-search-active");
    }
    return () => {
      document.body.classList.remove("mobile-search-active");
    };
  }, [isMobileSearchActive]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-12 md:pb-16 px-4 md:px-8 bg-white border-b border-slate-100 text-center">
        {/* Decorative ambient background blur vectors */}
        <div className="absolute top-[-80px] left-[-80px] w-[260px] h-[260px] bg-[#0fbc6f]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[15%] right-[-100px] w-[350px] h-[350px] bg-[#0fbc6f]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto z-10 relative">
          {/* Badge */}
          <div className="flex justify-center mb-5 select-none">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#e6f7ef] text-[#0fbc6f] text-xs font-black tracking-wider uppercase rounded-full border border-[#0fbc6f]/10 shadow-3xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0fbc6f]" />
              SHOP SMART, STAY SAFE
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-[54px] font-black tracking-tight text-slate-900 mb-5 leading-[1.1] select-none">
            Check Facebook Pages <br />
            <span className="text-[#0fbc6f]">Before You Pay</span>
          </h1>

          <p className="text-[14px] sm:text-[15px] md:text-[17px] text-slate-500 font-semibold max-w-2xl mx-auto mb-8 leading-relaxed">
            Search sellers, usernames, and bKash numbers to avoid fraud and shop
            with confidence.
          </p>

          {/* Search container */}
          <div
            className={
              isMobileSearchActive
                ? "fixed inset-0 z-[100] bg-white flex flex-col md:relative md:inset-auto md:z-auto md:block w-full md:max-w-2xl md:mx-auto md:mb-4"
                : "relative w-full max-w-2xl mx-auto mb-4"
            }
            ref={searchContainerRef}
          >
            {/* Mobile Header when active */}
            {isMobileSearchActive && (
              <div className="md:hidden flex items-center border-b border-slate-200 px-4 h-[60px] shrink-0 bg-white">
                <Search className="h-5 w-5 text-[#0fbc6f] shrink-0" />
                <form
                  onSubmit={handleSearch}
                  className="flex-1 mx-3 h-full flex"
                >
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (e.target.value.trim().length >= 2)
                        setShowDropdown(true);
                    }}
                    placeholder="Search page name, page URL, bKash / Nagad number..."
                    className="w-full h-full bg-transparent border-none outline-none text-slate-900 text-[15px] font-medium"
                  />
                </form>
                <button
                  onClick={() => {
                    setIsMobileSearchActive(false);
                    setShowDropdown(false);
                  }}
                  className="shrink-0 p-2 -mr-2 cursor-pointer outline-none"
                >
                  <X className="h-6 w-6 text-slate-500 hover:text-slate-900" />
                </button>
              </div>
            )}

            {/* Desktop Form OR Mobile inactive Form */}
            <form
              onSubmit={handleSearch}
              className={`relative group z-20 ${isMobileSearchActive ? "hidden md:block" : ""}`}
            >
              <div className="absolute inset-y-0 left-4 md:left-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 md:h-6 md:w-6 text-[#0fbc6f] group-focus-within:text-[#0da662] transition-colors" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) setShowDropdown(true);
                }}
                onFocus={() => {
                  if (window.innerWidth < 768) {
                    setIsMobileSearchActive(true);
                  }
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Search page name, page URL, bKash / Nagad number..."
                className={`w-full py-4 md:py-5 pl-12 md:pl-16 pr-16 md:pr-20 bg-white text-base md:text-lg font-medium outline-none text-slate-900 placeholder-slate-400 transition-all duration-150 ${
                  isDesktopDropdownOpen
                    ? "rounded-t-[28px] rounded-b-none border-t border-x border-b border-slate-200 shadow-xl"
                    : "rounded-full border border-slate-200 hover:border-slate-350 focus:border-[#0fbc6f]/50 shadow-sm focus:shadow-md"
                }`}
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-900 text-white rounded-full hover:bg-[#0fbc6f] focus:bg-[#0fbc6f] transition-colors flex items-center justify-center shadow-sm group/btn cursor-pointer"
              >
                <Search className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:scale-110 transition-transform" />
              </button>
            </form>

            {showDropdown && (
              <div
                className={`text-left bg-white ${
                  isMobileSearchActive
                    ? "flex-1 overflow-y-auto md:absolute md:top-full md:left-0 md:right-0 md:mt-2 md:rounded-2xl md:shadow-xl md:border md:border-slate-200 md:z-30 md:max-h-[400px]"
                    : "absolute top-full left-0 right-0 mt-0 rounded-b-[28px] shadow-xl border-x border-b border-slate-200 overflow-hidden z-30 max-h-[400px] overflow-y-auto"
                }`}
              >
                <div className="p-2">
                  <div className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Pages
                  </div>
                  {searchResults.length > 0 ? (
                    searchResults.slice(0, 5).map((page) => {
                      const rating = page.average_rating
                        ? Number(page.average_rating)
                        : 0;
                      return (
                        <Link
                          key={page.id}
                          to={page.is_contact_only ? "#" : `/page/${page.id}`}
                          onClick={(e) => {
                            if (page.is_contact_only) {
                              e.preventDefault();
                            } else {
                              setShowDropdown(false);
                              setIsMobileSearchActive(false);
                            }
                          }}
                          className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${page.is_contact_only ? "cursor-default" : "hover:bg-slate-50"}`}
                        >
                          <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center overflow-hidden bg-slate-100 shrink-0">
                            {page.profile_picture ? (
                              <img
                                referrerPolicy="no-referrer"
                                src={page.profile_picture}
                                alt=""
                                width="40"
                                height="40"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="font-bold text-slate-500">
                                {page.current_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 truncate max-w-full">
                                {page.current_name}
                              </h4>
                              {page.status_badge === 'Verified Marketplace Seller' && (
                                <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Verified Seller
                                </span>
                              )}
                              {page.status_badge === 'Gold Seller' && (
                                <span className="shrink-0 bg-amber-50 text-amber-700 border border-amber-300/60 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-amber-500 fill-amber-500" /> Gold Seller
                                </span>
                              )}
                              {page.status_badge === 'Suspicious' && (
                                <span className="shrink-0 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                                  ⚠️ Suspicious
                                </span>
                              )}
                              {page.status_badge === 'Under Review' && (
                                <span className="shrink-0 bg-blue-50 text-[#205cd4] border border-blue-200 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                                  🔍 Under Review
                                </span>
                              )}
                              {page.status_badge && page.status_badge.includes('Reported as Fraud') && (
                                <span className="shrink-0 bg-rose-50 text-rose-600 border border-rose-250 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" /> Fraud
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-slate-500 truncate">
                              {page.current_username
                                ? `@${page.current_username}`
                                : "Facebook Page"}{" "}
                              • {page.review_count || 0} reviews
                            </p>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {(page.fraud_report_count || 0) > 0 && (
                              <div
                                title="Risk Reports"
                                className="flex items-center bg-rose-50 border border-rose-100 px-2 py-1 rounded"
                              >
                                <ShieldAlert className="h-3 w-3 mr-1 text-rose-500 shrink-0" />
                                <span className="text-xs font-bold text-rose-700">
                                  {page.fraud_report_count}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center bg-emerald-50 px-2 py-1 rounded">
                              <Star
                                className={`h-3 w-3 mr-1 ${rating > 0 ? "text-emerald-500 fill-emerald-500" : "text-slate-400 fill-slate-400"}`}
                              />
                              <span className="text-sm font-bold text-emerald-700">
                                {rating > 0 ? rating.toFixed(1) : "0.0"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-slate-500 italic text-sm">
                      No exact matches found. Search for close matches or create
                      a new page.
                    </div>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <button
                    onClick={(e) => {
                      handleSearch(e);
                      setIsMobileSearchActive(false);
                    }}
                    className="w-full p-4 bg-[#0fbc6f] hover:bg-[#0da662] text-white font-bold flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer"
                  >
                    Show all results <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {isMobileSearchActive &&
              !showDropdown &&
              popularSearches.length > 0 && (
                <div className="md:hidden flex-1 overflow-y-auto bg-white p-4 text-left">
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Popular Searches
                  </div>
                  <div className="flex flex-col gap-3">
                    {popularSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          navigate(`/search?q=${encodeURIComponent(term)}`);
                          setIsMobileSearchActive(false);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium transition-colors text-left w-full cursor-pointer outline-none"
                      >
                        <Search className="h-4 w-4 text-[#0fbc6f]" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Interactive Suggestions under search */}
          <div className="text-[12px] md:text-sm text-slate-400 font-bold mb-6 px-4 leading-normal select-none">
            Examples:{" "}
            <span
              className="text-[#0fbc6f] hover:text-[#0da662] cursor-pointer hover:underline underline-offset-2 duration-150"
              onClick={() => {
                setQuery("Gadget Zone");
              }}
            >
              Gadget Zone
            </span>
            ,{" "}
            <span
              className="text-[#0fbc6f] hover:text-[#0da662] cursor-pointer hover:underline underline-offset-2 duration-150"
              onClick={() => {
                setQuery("https://facebook.com/gadgetzonebd");
              }}
            >
              https://facebook.com/gadgetzonebd
            </span>
            ,{" "}
            <span
              className="text-[#0fbc6f] hover:text-[#0da662] cursor-pointer hover:underline underline-offset-2 duration-150"
              onClick={() => {
                setQuery("017XXXXXXXX");
              }}
            >
              017XXXXXXXX
            </span>
          </div>

          {/* Action Buttons: Report a Fraud / Claim My Page */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 mb-4 select-none">
            <Link
              to="/write-review?type=fraud"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-rose-50 border border-rose-200 text-rose-700 hover:text-rose-800 rounded-2xl font-bold hover:bg-rose-100 active:scale-98 transition-all shadow-3xs"
            >
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
              Report a Fraud
            </Link>
            <Link
              to="/business/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:text-emerald-800 rounded-2xl font-bold hover:bg-emerald-100 active:scale-98 transition-all shadow-3xs"
            >
              <ShieldCheck className="h-5 w-5 text-[#0fbc6f] shrink-0" />
              Claim My Page
            </Link>
          </div>

          {/* Adsterra and Google AdSense Banner Ads Slots */}
          <AdBanner htmlCode={publicSettings.homepage_adsterra_code} />
          <AdBanner htmlCode={publicSettings.homepage_adsense_code} />

          {/* Core Feature Row with Divider spacing */}
          <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-slate-100 select-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 md:divide-x md:divide-slate-200">
              {/* Feature 1 */}
              <div className="flex flex-col items-center text-center px-2">
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#0fbc6f] flex items-center justify-center mb-3 border border-emerald-100/50 shadow-3xs">
                  <ShieldCheck className="w-[19px] h-[19px]" />
                </div>
                <h4 className="font-extrabold text-[13.5px] text-slate-800 mb-1">
                  Avoid Scams
                </h4>
                <p className="text-[11px] text-slate-400 font-bold leading-normal max-w-[150px]">
                  Check risky pages before you buy
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col items-center text-center px-2">
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#0fbc6f] flex items-center justify-center mb-3 border border-emerald-100/50 shadow-3xs">
                  <Users className="w-[19px] h-[19px]" />
                </div>
                <h4 className="font-extrabold text-[13.5px] text-slate-800 mb-1">
                  Real Reviews
                </h4>
                <p className="text-[11px] text-slate-400 font-bold leading-normal max-w-[150px]">
                  See real experiences from buyers
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col items-center text-center px-2">
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#0fbc6f] flex items-center justify-center mb-3 border border-emerald-100/50 shadow-3xs">
                  <Lock className="w-[19px] h-[19px]" />
                </div>
                <h4 className="font-extrabold text-[13.5px] text-slate-800 mb-1">
                  Trusted Community
                </h4>
                <p className="text-[11px] text-slate-400 font-bold leading-normal max-w-[150px]">
                  Help build safer shopping pages
                </p>
              </div>

              {/* Feature 4 */}
              <div className="flex flex-col items-center text-center px-2">
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#0fbc6f] flex items-center justify-center mb-3 border border-emerald-100/50 shadow-3xs">
                  <Zap className="w-[19px] h-[19px]" />
                </div>
                <h4 className="font-extrabold text-[13.5px] text-slate-800 mb-1">
                  Fast & Easy
                </h4>
                <p className="text-[11px] text-slate-400 font-bold leading-normal max-w-[150px]">
                  Quick search, instant results
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Recently Blacklisted Section */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-[21px] h-[21px] text-[#f43f5e] shrink-0" />
              <h2 className="text-[16px] sm:text-[18px] lg:text-[21px] font-black tracking-tight text-slate-900 leading-none">
                Recently Blacklisted Fraud Pages
              </h2>
            </div>
            <Link
              to="/fraud-pages"
              className="text-xs font-black text-[#0fbc6f] hover:text-[#0da662] hover:underline flex items-center gap-1 select-none"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoadingPages ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[...Array(isMobile ? 4 : 10)].map((_, idx) => (
                <div key={idx} className="flex flex-col bg-white p-5 rounded-2xl border border-slate-200/80 animate-pulse">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-start">
                    <div className="h-6 bg-slate-200 rounded-lg w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentPages.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-150 text-center text-slate-500 italic text-sm">
              Currently no threat entries indexed.
            </div>
          ) : isMobile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {recentPages.slice(0, 4).map((page) => {
                const letter = page.current_name
                  ? page.current_name.charAt(0).toUpperCase()
                  : "F";
                const listedDate = page.fraud_listed_at
                  ? new Date(page.fraud_listed_at).toLocaleDateString("en", {
                      day: "numeric",
                      month: "short",
                    })
                  : "May 22";

                return (
                  <Link
                    to={`/page/${page.id}`}
                    key={page.id}
                    className="flex flex-col bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-350 hover:shadow-sm transition-all relative group"
                  >
                    <div className="flex items-center gap-3.5 mb-4">
                      {page.profile_picture ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-205 shrink-0 bg-slate-100">
                          <img
                            referrerPolicy="no-referrer"
                            src={page.profile_picture}
                            alt=""
                            width="40"
                            height="40"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-rose-50 text-[#f43f5e] border border-rose-200/60 flex items-center justify-center font-extrabold text-[15px] shrink-0 select-none">
                          {letter}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-850 text-[13.5px] truncate leading-tight group-hover:text-[#f43f5e] transition-colors">
                          {page.current_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-bold truncate">
                            {listedDate}
                          </span>
                          <span className="shrink-0 bg-rose-50 text-[#f43f5e] border border-rose-100/85 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md">
                            Fraud
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* PC Version: Smooth Infinite Scrolling Marquee Carousel */
            <div className="w-full overflow-hidden relative py-2 select-none">
              {/* Left and Right overlay gradients for beautiful fade effect */}
              <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none" />
              
              <div className="flex gap-4 w-max animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused] will-change-transform">
                {/* Duplicate items for a perfect seamless infinite loop */}
                {[...recentPages, ...recentPages].map((page, index) => {
                  const letter = page.current_name
                    ? page.current_name.charAt(0).toUpperCase()
                    : "F";
                  const listedDate = page.fraud_listed_at
                    ? new Date(page.fraud_listed_at).toLocaleDateString("en", {
                        day: "numeric",
                        month: "short",
                      })
                    : "May 22";

                  return (
                    <Link
                      to={`/page/${page.id}`}
                      key={`${page.id}-${index}`}
                      className="flex flex-col bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-350 hover:shadow-md transition-all relative group w-[240px] shrink-0"
                    >
                      <div className="flex items-center gap-3.5">
                        {page.profile_picture ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-205 shrink-0 bg-slate-100">
                            <img
                              referrerPolicy="no-referrer"
                              src={page.profile_picture}
                              alt=""
                              width="40"
                              height="40"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-rose-50 text-[#f43f5e] border border-rose-200/60 flex items-center justify-center font-extrabold text-[15px] shrink-0 select-none">
                            {letter}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-850 text-[13.5px] truncate leading-tight group-hover:text-[#f43f5e] transition-colors">
                            {page.current_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-bold truncate">
                              {listedDate}
                            </span>
                            <span className="shrink-0 bg-rose-50 text-[#f43f5e] border border-rose-100/85 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md">
                              Fraud
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Recent Reviews Section */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-[19px] h-[19px] text-[#0fbc6f] shrink-0" />
              <h2 className="text-[16px] sm:text-[18px] lg:text-[21px] font-black tracking-tight text-slate-900 leading-none">
                Recent Reviews
              </h2>
            </div>
          </div>

          {isLoadingReviews ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(isMobile ? 4 : 8)].map((_, idx) => (
                <div key={idx} className="flex flex-col bg-white border border-slate-200/80 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1">
                        <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-1.5" />
                        <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-5 bg-slate-200 rounded w-10 shrink-0" />
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-11/12" />
                    <div className="h-3 bg-slate-200 rounded w-4/5" />
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2.5 shrink-0">
                    <div className="h-7 w-7 rounded-lg bg-slate-200 shrink-0" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentReviews.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-150 text-center text-slate-400 italic text-sm">
              Currently no public reviews registered.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recentReviews.slice(0, isMobile ? 4 : 8).map((review: any) => {
                const starRating = parseInt(review.star_rating || "5");
                const isGood = starRating >= 4;
                const isCritical = starRating < 3;

                // Format reviewer avatar label
                const reviewerLetter =
                  review.user_id === "anonymous"
                    ? "A"
                    : review.reviewer_name
                      ? review.reviewer_name.charAt(0).toUpperCase()
                      : "U";
                const reviewerName =
                  review.user_id === "anonymous"
                    ? "Anonymous User"
                    : review.reviewer_name || "Verified User";

                return (
                  <Link
                    to={`/page/${review.page_id}`}
                    key={review.id}
                    className="flex flex-col bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-xs hover:border-slate-350 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 select-none ${
                            review.user_id === "anonymous"
                              ? "bg-slate-700"
                              : "bg-blue-600"
                          }`}
                        >
                          {reviewerLetter}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-[13px] text-slate-900 leading-tight truncate">
                            {reviewerName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {review.created_at
                              ? format(
                                  new Date(review.created_at),
                                  "MMM dd, yyyy",
                                )
                              : "Recently"}
                          </p>
                        </div>
                      </div>

                      {/* Star rating icons instead of text */}
                      <div className="flex items-center gap-[3px] select-none shrink-0">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-4.5 w-4.5 rounded-[3px] flex items-center justify-center ${
                              i <= starRating
                                ? starRating >= 4
                                  ? "bg-[#00b67a]"
                                  : starRating === 3
                                    ? "bg-[#ffb600]"
                                    : "bg-[#ff3722]"
                                : "bg-[#e5e5eb]"
                            }`}
                          >
                            <Star className="h-3 w-3 text-white fill-white" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-slate-600 text-[13px] font-medium leading-relaxed mb-6 line-clamp-3">
                      {review.description}
                    </p>

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2.5 shrink-0">
                      {review.profile_picture ? (
                        <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                          <img
                            referrerPolicy="no-referrer"
                            src={review.profile_picture}
                            alt=""
                            width="28"
                            height="28"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-lg shrink-0 flex items-center justify-center font-extrabold text-xs uppercase bg-[#e6f7ef] text-[#0fbc6f]">
                          {(review.current_name || "F").charAt(0)}
                        </div>
                      )}
                      <span className="font-extrabold text-[12.5px] text-slate-800 truncate group-hover:text-[#0fbc6f] transition-colors leading-none">
                        {review.current_name || "Facebook Page"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Dynamic community callout banner from Figma/Mockup */}
        <section className="bg-[#edfbf4] rounded-3xl border border-emerald-100/80 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden select-none">
          <div className="absolute top-[-50px] left-[-30px] w-40 h-40 bg-[#0fbc6f]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-emerald-200/50 text-[#0fbc6f] shrink-0 shadow-3xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] sm:text-[18px] font-black text-slate-900 leading-tight">
                Together, we can make Facebook a safer place to buy and sell.
              </h3>
              <p className="text-slate-500 text-xs sm:text-[13px] font-bold mt-1 max-w-xl">
                Your reviews help protect others. Share your experiences with
                other online buyers.
              </p>
            </div>
          </div>

          <Link
            to="/write-review"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-[#0fbc6f] hover:text-[#0da662] border border-emerald-200/70 rounded-xl font-extrabold text-[13px] tracking-tight shadow-3xs transition-all cursor-pointer outline-none"
          >
            <SquarePen className="w-4.5 h-4.5" />
            <span>Write a Review</span>
          </Link>
        </section>

        {/* Detailed How It Works / Trust Process Mockup recreation */}
        <section className="flex flex-col items-center select-none text-center pt-8">
          {/* Badge */}
          <span className="inline-flex items-center px-4 py-1.5 border border-[#0fbc6f]/15 bg-emerald-50/20 text-[#0fbc6f] text-[11px] font-black tracking-widest uppercase rounded-full">
            HOW IT WORKS
          </span>

          {/* Secondary Display Heading */}
          <h2 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight mt-4">
            4 simple steps to shop with confidence
          </h2>

          {/* Subheading text */}
          <p className="text-[13px] md:text-[14px] text-slate-500 font-semibold max-w-xl mx-auto mt-3 leading-relaxed">
            FB Page Review helps you research any Facebook page or seller using
            real community feedback and trust signals.
          </p>

          {/* Connected Grid Cards and Wave Layout */}
          <div className="w-full relative mt-10 md:mt-32">
            {/* Curved Path Overlay behind the step indicators (only on desktop) */}
            <div className="absolute -top-24 inset-x-0 h-12 pointer-events-none hidden md:block z-0">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 1000 48"
                fill="none"
                preserveAspectRatio="none"
              >
                {/* Clean emerald wavy line passing exactly through bubble centers: x = 125, 375, 625, 875 */}
                <path
                  d="M 125 24 C 180 24, 200 44, 250 44 C 300 44, 320 24, 375 24 C 430 24, 450 44, 500 44 C 550 44, 570 24, 625 24 C 680 24, 700 44, 750 44 C 800 44, 820 24, 875 24 C 910 24, 930 18, 950 16"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Arrow head ending */}
                <path
                  d="M 942 22 L 950 16 L 943 10"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Steps Container Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-6 px-4 sm:px-6 md:px-0">
              {/* Step 1 */}
              <div className="flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-0 relative group text-left md:text-center">
                {/* Vertical Snake Connector to Step 2 for Mobile (Centered under LEFT bubble) */}
                <div className="absolute left-[20px] -translate-x-1/2 w-14 top-1/2 h-[calc(100%+24px)] md:hidden pointer-events-none z-0">
                  <svg
                    className="w-full h-full text-[#10b981] overflow-visible"
                    fill="none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 50 0 C 10 25, 10 75, 50 100"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Mobile Left Indicator Bubble */}
                <div className="w-10 h-10 bg-white border-2 border-[#10b981] rounded-full flex md:hidden items-center justify-center font-black text-[#10b981] text-[13px] shadow-sm z-10 select-none shrink-0">
                  1
                </div>

                {/* Desktop Top Bubble */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-12 h-12 bg-white border-2 border-[#10b981] rounded-full hidden md:flex items-center justify-center font-black text-[#10b981] text-[15px] shadow-sm z-10 select-none">
                  1
                </div>

                {/* Card Content */}
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-4 sm:p-5 md:p-8 md:pt-12 shadow-[0_2px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:border-slate-350 transition-all duration-300 flex flex-col items-start md:items-center">
                  {/* Icons inside beautiful custom light green container */}
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-emerald-50/70 text-[#10b981] rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-5 shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Search className="w-5.5 h-5.5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-[14px] md:text-[15px] mb-1 md:mb-2">
                    Search seller/page
                  </h3>
                  <p className="text-slate-400 text-[10.5px] md:text-[11.5px] font-bold leading-relaxed">
                    Look up a Facebook page or bKash number to pull up reports
                    and ratings.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-0 relative group text-left md:text-center">
                {/* Vertical Snake Connector to Step 3 for Mobile (Centered under LEFT bubble) */}
                <div className="absolute left-[20px] -translate-x-1/2 w-14 top-1/2 h-[calc(100%+24px)] md:hidden pointer-events-none z-0">
                  <svg
                    className="w-full h-full text-[#10b981] overflow-visible"
                    fill="none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 50 0 C 90 25, 90 75, 50 100"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Mobile Left Indicator Bubble */}
                <div className="w-10 h-10 bg-white border-2 border-[#10b981] rounded-full flex md:hidden items-center justify-center font-black text-[#10b981] text-[13px] shadow-sm z-10 select-none shrink-0">
                  2
                </div>

                {/* Desktop Top Bubble */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-12 h-12 bg-white border-2 border-[#10b981] rounded-full hidden md:flex items-center justify-center font-black text-[#10b981] text-[15px] shadow-sm z-10 select-none">
                  2
                </div>

                {/* Card Content */}
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-4 sm:p-5 md:p-8 md:pt-12 shadow-[0_2px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:border-slate-350 transition-all duration-300 flex flex-col items-start md:items-center">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-emerald-50/70 text-[#10b981] rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-5 shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <MessageSquare className="w-5.5 h-5.5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-[14px] md:text-[15px] mb-1 md:mb-2">
                    Review community feedback
                  </h3>
                  <p className="text-slate-400 text-[10.5px] md:text-[11.5px] font-bold leading-relaxed">
                    Read reviews, verified transaction dates, scam tags, and
                    buyer experiences.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-0 relative group text-left md:text-center">
                {/* Vertical Snake Connector to Step 4 for Mobile (Centered under LEFT bubble) */}
                <div className="absolute left-[20px] -translate-x-1/2 w-14 top-1/2 h-[calc(100%+24px)] md:hidden pointer-events-none z-0">
                  <svg
                    className="w-full h-full text-[#10b981] overflow-visible"
                    fill="none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 50 0 C 10 25, 10 75, 50 100"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Mobile Left Indicator Bubble */}
                <div className="w-10 h-10 bg-white border-2 border-[#10b981] rounded-full flex md:hidden items-center justify-center font-black text-[#10b981] text-[13px] shadow-sm z-10 select-none shrink-0">
                  3
                </div>

                {/* Desktop Top Bubble */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-12 h-12 bg-white border-2 border-[#10b981] rounded-full hidden md:flex items-center justify-center font-black text-[#10b981] text-[15px] shadow-sm z-10 select-none">
                  3
                </div>

                {/* Card Content */}
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-4 sm:p-5 md:p-8 md:pt-12 shadow-[0_2px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:border-slate-350 transition-all duration-300 flex flex-col items-start md:items-center">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-emerald-50/70 text-[#10b981] rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-5 shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <ShieldCheck className="w-5.5 h-5.5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-[14px] md:text-[15px] mb-1 md:mb-2">
                    Check seller ratings and fraud warnings
                  </h3>
                  <p className="text-slate-400 text-[10.5px] md:text-[11.5px] font-bold leading-relaxed">
                    See customer reviews, verification badges, and automated risk
                    alerts.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-0 relative group text-left md:text-center">
                {/* Mobile Left Indicator Bubble */}
                <div className="w-10 h-10 bg-white border-2 border-[#10b981] rounded-full flex md:hidden items-center justify-center font-black text-[#10b981] text-[13px] shadow-sm z-10 select-none shrink-0">
                  4
                </div>

                {/* Desktop Top Bubble */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-12 h-12 bg-white border-2 border-[#10b981] rounded-full hidden md:flex items-center justify-center font-black text-[#10b981] text-[15px] shadow-sm z-10 select-none">
                  4
                </div>

                {/* Card Content */}
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 p-4 sm:p-5 md:p-8 md:pt-12 shadow-[0_2px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:border-slate-350 transition-all duration-300 flex flex-col items-start md:items-center">
                  <div className="w-11 h-11 md:w-14 md:h-14 bg-emerald-50/70 text-[#10b981] rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-5 shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Lock className="w-5.5 h-5.5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-[14px] md:text-[15px] mb-1 md:mb-2">
                    Act safely
                  </h3>
                  <p className="text-slate-400 text-[10.5px] md:text-[11.5px] font-bold leading-relaxed">
                    Make informed decisions, avoid risky pages, and shop with
                    peace of mind.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stronger together highlight banner */}
          <div className="w-full bg-[#f2fcf7] rounded-3xl border border-[#0fbc6f]/10 p-5 md:p-6 mt-12 flex flex-col xl:flex-row items-center justify-between gap-6 text-left">
            <div className="flex items-center gap-4 mr-auto">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border border-emerald-100/50 text-[#0fbc6f] shrink-0 shadow-3xs">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-[14.5px] leading-tight">
                  Stronger together, safer marketplace.
                </h4>
                <p className="text-slate-500 text-[12px] font-bold mt-0.5 leading-normal max-w-xl">
                  Real reviews from real buyers help everyone make smarter,
                  safer choices.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-5 sm:gap-6 w-full xl:w-auto xl:justify-end border-t border-emerald-100/30 pt-5 xl:pt-0 xl:border-t-0">
              <div className="flex items-center gap-3 font-extrabold text-slate-800 text-[13px] shrink-0">
                <Users className="w-5 h-5 text-[#0fbc6f]" />
                <span>Community Powered</span>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
              <div className="flex items-center gap-3 font-extrabold text-slate-800 text-[13px] shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#0fbc6f]" />
                <span>Transparent & Reliable</span>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
              <div className="flex items-center gap-3 font-extrabold text-slate-800 text-[13px] shrink-0">
                <Lock className="w-5 h-5 text-[#0fbc6f]" />
                <span>Privacy Focused</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
