import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Search, ShieldCheck, ShieldAlert, Star, Store, MapPin, SlidersHorizontal, ChevronRight, X, Trophy, Facebook } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function GlobalSearch() {
  const { user } = useAuth();
  const { t, n } = useLanguage();
  
  const location = useLocation();
  const navigate = useNavigate();

  // Parse URL search params
  const searchParams = new URLSearchParams(location.search);
  const urlQuery = searchParams.get('search') || searchParams.get('q') || '';
  
  const [query, setQuery] = useState(urlQuery);
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeRating, setActiveRating] = useState('All'); // 'All', '3+', '4+', '4.5+'
  const [activeReviewsNum, setActiveReviewsNum] = useState('Any'); // 'Any', '25+', '50+', etc.
  const [activeStatus, setActiveStatus] = useState(false);

  useEffect(() => {
    setQuery(urlQuery);
    setCurrentPage(1);
  }, [urlQuery]);

  useEffect(() => {
    if (urlQuery) {
      const controller = new AbortController();
      setLoadingPages(true);
      fetch(`/api/pages/search?q=${encodeURIComponent(urlQuery)}`, {
        signal: controller.signal,
      })
        .then(res => res.json())
        .then(data => {
          setPages(Array.isArray(data) ? data : []);
          setLoadingPages(false);
        })
        .catch(err => {
          if (err.name !== "AbortError") {
            console.error(err);
            setLoadingPages(false);
          }
        });
      return () => controller.abort();
    } else {
      setPages([]);
    }
  }, [urlQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  // Filter application
  const filteredPages = pages.filter((page) => {
    const rating = page.average_rating ? Number(page.average_rating) : 0;
    const reviewCount = page.review_count || 0;
    
    // Rating filter
    if (activeRating === '3+' && rating < 3) return false;
    if (activeRating === '4+' && rating < 4) return false;
    if (activeRating === '4.5+' && rating < 4.5) return false;

    // Review count filter
    if (activeReviewsNum === '25+' && reviewCount < 25) return false;
    if (activeReviewsNum === '50+' && reviewCount < 50) return false;
    if (activeReviewsNum === '100+' && reviewCount < 100) return false;
    if (activeReviewsNum === '250+' && reviewCount < 250) return false;
    if (activeReviewsNum === '500+' && reviewCount < 500) return false;

    // Status filter
    if (activeStatus && page.status_badge !== 'Verified Marketplace Seller' && page.status_badge !== 'Gold Seller') return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      
      {/* Search Input Bar (Simplified) */}
      <div className="border-b border-slate-200 bg-white pt-6 pb-4">
         <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <form onSubmit={handleSearchSubmit} className="relative max-w-3xl flex items-center">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search Facebook Page, brand, or category...")}
                className="w-full py-3.5 pl-4 pr-12 bg-white border border-slate-300 hover:border-slate-400 rounded-full text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-lg shadow-sm"
              />
              <button type="submit" className="absolute right-3 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </form>
         </div>
      </div>

      {/* Subnav Filter Bar (Trustpilot style) */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-30">
         <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3 overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => setIsFilterOpen(true)}
              className="px-4 py-2 flex items-center gap-2 border border-slate-300 rounded-full text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
               <SlidersHorizontal className="w-4 h-4 text-slate-600" />
               {t("All filters")}
            </button>
            <div className="h-4 w-px bg-slate-300 shrink-0"></div>
            <button 
              className="px-4 py-2 border border-slate-300 rounded-full text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
               <Star className="w-4 h-4 text-slate-600 fill-slate-600" />
               {t("Rating")}
            </button>
         </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-20 flex-1 w-full py-8 md:py-12">
        <div className="mb-6 pb-2">
           <h2 className="text-xl font-bold text-slate-900 mb-1">{t("Facebook Pages")} ({n(filteredPages.length)})</h2>
        </div>

        {loadingPages ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin w-8 h-8 rounded-full border-4 border-emerald-500 border-r-transparent"></div>
          </div>
        ) : filteredPages.length > 0 ? (
          <div className="flex flex-col">
            {filteredPages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((page, i) => {
              const rating = page.average_rating ? Number(page.average_rating) : 0;
              
              const urlRegex = /(https?:\/\/[^\s]+)/gi;
              const urlMatch = page.is_contact_only && page.display_name ? page.display_name.match(urlRegex) : null;
              const fbUrl = urlMatch ? urlMatch[0] : null;
              const cleanDesc = page.is_contact_only && page.display_name
                ? page.display_name.replace(urlRegex, '').replace(/\s+/g, ' ').trim()
                : '';
              return (
                <Link
                  to={page.is_contact_only ? '#' : `/page/${page.id}`}
                  onClick={e => { if(page.is_contact_only) e.preventDefault(); }}
                  key={page.id}
                  className="py-6 border-b border-slate-200 group transition-colors block"
                >
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                    <div className="w-[84px] h-[84px] bg-white border border-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                      {page.profile_picture ? (
                        <img src={page.profile_picture} alt="" className="w-full h-full object-contain bg-white" />
                      ) : (
                        <Store className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[20px] font-bold text-[#1c1c1c] leading-tight group-hover:underline">
                          {page.current_name}
                        </h3>
                        {page.status_badge === 'Verified Marketplace Seller' && (
                          <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> {t("Verified Seller")}
                          </span>
                        )}
                        {page.status_badge === 'Gold Seller' && (
                          <span className="shrink-0 bg-amber-50 text-amber-700 border border-amber-300/60 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {t("Gold Seller")}
                          </span>
                        )}
                        {page.status_badge === 'Suspicious' && (
                          <span className="shrink-0 bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                            ⚠️ {t("Suspicious")}
                          </span>
                        )}
                        {page.status_badge === 'Under Review' && (
                          <span className="shrink-0 bg-blue-50 text-[#205cd4] border border-blue-200 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                            🔍 {t("Under Review")}
                          </span>
                        )}
                        {page.status_badge && page.status_badge.includes('Reported as Fraud') && (
                          <span className="shrink-0 bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> {t("Fraud")}
                          </span>
                        )}
                      </div>
                      
                      {page.facebook_url && !page.is_contact_only && (
                        <div className="text-sm text-[#696969] mb-2 truncate">
                           {page.facebook_url.replace(/^https?:\/\/(www\.)?/, '')}
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm gap-2 mt-1">
                        {!page.is_contact_only ? (
                          <>
                            {/* Rating Stars (Trustpilot style array) */}
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                 const isFilled = rating >= star;
                                 const isHalf = rating >= star - 0.5 && rating < star;
                                 const bg = isFilled ? 'bg-[#00b67a]' : isHalf ? 'bg-gradient-to-r from-[#00b67a] 50% to-[#dcdce6] 50%' : 'bg-[#dcdce6]';
                                 return (
                                  <div key={star} className={`w-[18px] h-[18px] flex items-center justify-center ${bg}`}>
                                    <Star className="w-3 h-3 text-white fill-white" />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-[#1c1c1c] font-medium text-[14px]">
                               {rating > 0 ? n(rating.toFixed(1)) : n('0')} 
                               <span className="text-[#696969] ml-2 font-normal">・ {n(page.review_count || 0)} {t("reviews")}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="text-[#1c1c1c] font-medium text-[14px]">
                               <span className="text-[#696969] font-normal">{page.category ? t(page.category) : t("Contact Number")} ・ {n(page.review_count || 0)} {t("reports")}</span>
                            </div>
                            {cleanDesc && (
                              <div className="text-[13px] text-[#696969] font-medium flex items-center gap-1.5 flex-wrap">
                                <span className="truncate max-w-[300px]">{cleanDesc}</span>
                                {fbUrl && (
                                  <a
                                    href={fbUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 p-0.5 shrink-0 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                    title="View Link"
                                  >
                                    <Facebook className="h-3.5 w-3.5 fill-current" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(page.fraud_report_count || 0) > 0 && !page.is_contact_only && (
                           <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded ml-2 text-xs">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {n(page.fraud_report_count)} {t("Fraud Reports")}
                           </div>
                        )}
                        {page.is_contact_only && (
                           <div className="flex items-center gap-1.5 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded ml-2 text-xs border border-rose-100">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {page.status_badge === 'Reported as Fraud' ? t('Reported') : t(page.status_badge || 'Suspicious')}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
            {/* Pagination */}
            {Math.ceil(filteredPages.length / itemsPerPage) > 1 && (
              <div className="flex justify-center mt-12 mb-8">
                 <div className="inline-flex shadow-sm rounded-md" role="group">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-3 text-[14px] font-medium border border-[#dcdce6] bg-white text-[#696969] rounded-l-md hover:bg-[#f1f1f2] disabled:opacity-50 disabled:text-[#696969] transition-colors"
                    >
                      {t("Previous")}
                    </button>
                    {Array.from({ length: Math.ceil(filteredPages.length / itemsPerPage) }).map((_, i) => {
                      const pageNum = i + 1;
                      const isSelected = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`-ml-px px-4 py-3 text-[14px] font-medium border border-[#dcdce6] transition-colors ${
                            isSelected 
                              ? 'bg-[#e7e7f5] text-[#205cd4] z-10 border-b-2 border-b-[#205cd4]' 
                              : 'bg-white text-[#1c1c1c] hover:bg-[#f1f1f2]'
                          }`}
                        >
                          {n(pageNum)}
                        </button>
                      )
                    })}
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredPages.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(filteredPages.length / itemsPerPage)}
                      className="-ml-px px-4 py-3 text-[14px] font-medium border border-[#dcdce6] bg-white text-[#205cd4] rounded-r-md hover:bg-[#f1f1f2] disabled:opacity-50 disabled:text-[#696969] transition-colors"
                    >
                      {t("Next page")}
                    </button>
                 </div>
              </div>
            )}
            
          </div>
        ) : (
            <div className="py-12 max-w-2xl">
             <h3 className="text-xl font-bold text-slate-900 mb-2">{t("No Facebook Pages found")}</h3>
             <p className="text-slate-500 mb-6">
                {t("We couldn't find any Facebook Pages matching your search. Try checking your spelling or using different keywords.")}
             </p>
          </div>
        )}

        {/* Add Company Prompt */}
        {!loadingPages && (
          <div className="mt-16 text-center border-t border-[#dcdce6] pt-12 pb-8">
             <h3 className="text-[20px] font-bold text-[#1c1c1c] mb-2">{t("Can't find a Facebook Page?")}</h3>
             <p className="text-[#1c1c1c] mb-8">{t("It might not be listed on FB Page Review yet. Add it and be the first to write a review.")}</p>
             <Link
               to="/write-review"
               className="inline-flex px-8 py-3 bg-white border-2 border-[#205cd4] text-[#205cd4] hover:bg-[#f1f1f2] rounded-full font-bold text-[15px] transition-colors"
             >
               {t("Add Facebook Page")}
             </Link>
          </div>
        )}
      </div>

      {/* Side Filter Modal (Drawer) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-black/50 transition-opacity" 
             onClick={() => setIsFilterOpen(false)}
           />
           
           {/* Drawer Panel */}
           <div className="relative w-[360px] max-w-full h-full bg-white shadow-2xl flex flex-col pt-[16px] pb-6 px-6 animate-in slide-in-from-right duration-300">
             
             <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
               <h2 className="text-xl font-bold text-[#1c1c1c]">{t("All filters")}</h2>
               <button 
                 onClick={() => setIsFilterOpen(false)}
                 className="p-2 hover:bg-slate-100 rounded-full transition-colors"
               >
                 <X className="w-5 h-5 text-[#1c1c1c]" />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto space-y-8 hide-scrollbar">
               
               {/* Rating Selection */}
               <div>
                  <div className="flex bg-[#f1f1f2] p-1 rounded-lg">
                    {['All', '3+', '4+', '4.5+'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setActiveRating(opt)}
                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1 ${
                          activeRating === opt ? 'bg-white shadow-sm text-[#1c1c1c]' : 'text-[#696969] hover:text-[#1c1c1c]'
                        }`}
                      >
                        {opt !== 'All' && <Star className="w-3.5 h-3.5 fill-current" />}
                        {opt === 'All' ? t('All') : n(opt)}
                      </button>
                    ))}
                  </div>
               </div>

               {/* Company Status */}
               <div>
                 <h3 className="text-sm font-bold text-[#1c1c1c] mb-3">{t("Facebook Page status")}</h3>
                 <label className="flex items-start gap-3 cursor-pointer group">
                   <div className="flex items-center h-6">
                     <input 
                       type="checkbox" 
                       checked={activeStatus}
                       onChange={(e) => setActiveStatus(e.target.checked)}
                       className="w-5 h-5 border-2 border-slate-300 rounded text-emerald-600 focus:ring-emerald-500 checked:border-emerald-600" 
                     />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[15px] font-medium text-[#1c1c1c] bg-transparent group-hover:underline">{t("Verified Seller")}</span>
                     <span className="text-sm text-[#696969]">{t("Facebook Pages that have been verified.")}</span>
                   </div>
                 </label>
               </div>

               {/* Number of reviews */}
               <div>
                 <h3 className="text-sm font-bold text-[#1c1c1c] mb-3">{t("Number of reviews")}</h3>
                 <div className="space-y-4">
                   {['Any', '25+', '50+', '100+', '250+', '500+'].map((opt) => (
                     <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                       <div className="relative flex items-center justify-center">
                         <input 
                           type="radio" 
                           name="reviewCount"
                           checked={activeReviewsNum === opt}
                           onChange={() => setActiveReviewsNum(opt)}
                           className="w-5 h-5 border-2 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer appearance-none rounded-full checked:border-blue-600" 
                         />
                         {activeReviewsNum === opt && (
                            <div className="absolute w-2.5 h-2.5 bg-blue-600 rounded-full pointer-events-none" />
                         )}
                       </div>
                       <span className={`text-[15px] ${activeReviewsNum === opt ? 'font-bold' : 'font-medium'} text-[#1c1c1c] group-hover:underline`}>
                         {opt === 'Any' ? t('Any') : n(opt)}
                       </span>
                     </label>
                   ))}
                 </div>
               </div>

             </div>

             <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-100">
               <button 
                 onClick={() => {
                   setActiveRating('All');
                   setActiveReviewsNum('Any');
                   setActiveStatus(false);
                 }}
                 className="text-sm font-bold text-[#205cd4] hover:text-[#1c4eb8] hover:underline"
               >
                 {t("Reset")}
               </button>
               <button 
                 onClick={() => setIsFilterOpen(false)}
                 className="px-6 py-2.5 bg-[#205cd4] hover:bg-[#1c4eb8] text-white rounded-full font-bold text-[15px] transition-colors"
               >
                 {t("Show Results")}
               </button>
             </div>
             
           </div>
        </div>
      )}

    </div>
  );
}

