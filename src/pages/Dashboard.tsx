import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router';
import { 
  Star, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  CheckCircle, 
  Trash2, 
  User, 
  Bell, 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  Search, 
  Mail, 
  Key,
  Calendar,
  SquarePen,
  Filter,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const { t, n } = useLanguage();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviews, setReviews] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // State hooks for advanced reviews sorting, filtering and custom limit sizes
  const [filterType, setFilterType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Recent');
  const [limitVal, setLimitVal] = useState<number>(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [itemsPerPageOpen, setItemsPerPageOpen] = useState(false);

  // Form states to make the panels fully interactive
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [secSuccess, setSecSuccess] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      if (['owner', 'page_owner'].includes(user.role)) {
        navigate('/business-dashboard');
        return;
      }
      
      const promises = [
        fetch('/api/user/reviews', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => {
          const contentType = res.headers.get("content-type");
          if (!res.ok || !contentType || !contentType.includes("application/json")) {
            return [];
          }
          return res.json();
        }),
        fetch('/api/user/disputes', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => {
          const contentType = res.headers.get("content-type");
          if (!res.ok || !contentType || !contentType.includes("application/json")) {
            return [];
          }
          return res.json();
        })
      ];
      
      Promise.all(promises).then((results) => {
        setReviews(Array.isArray(results[0]) ? results[0] : []);
        setDisputes(Array.isArray(results[1]) ? results[1] : []);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  const handleDeleteReview = async (id: string) => {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert(t('Failed to delete review'));
      }
    } catch (e) {
      alert(t('Error deleting review'));
    }
  };

  // Helper to extract initials of a business page
  const getInitials = (name: string) => {
    if (!name) return 'PG';
    const clean = name.replace(/[^\w\s]/g, '');
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to assign high-quality, aesthetic theme colors to avatars
  const getBgColorForPage = (name: string) => {
    const colors = [
      'bg-indigo-600',  // deep indigo
      'bg-purple-600',  // plum/purple
      'bg-rose-500',    // coral/rose
      'bg-[#0fbc6f]',   // platform's signature emerald green
      'bg-amber-600',   // warm honey-amber
      'bg-sky-600',     // vibrant ocean sky
      'bg-teal-600'     // teal-cyan
    ];
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Apply visual-level filter selection in real-time
  const filteredReviews = reviews.filter(r => {
    if (filterType === 'All') return true;
    const type = (r.review_type || '').toLowerCase();
    if (filterType === 'Safe') {
      return type === 'safe' || type.includes('safe');
    }
    if (filterType === 'Suspicious') {
      return type === 'suspicious' || type.includes('suspicious');
    }
    if (filterType === 'Fraud') {
      return type === 'fraud report' || type === 'fraud' || type.includes('fraud');
    }
    return type === filterType.toLowerCase() || (r.review_type || '') === filterType;
  });

  // Apply sorting rules based on chosen criteria
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'Recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'Oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === 'RatingHigh') {
      return parseFloat(b.star_rating || '0') - parseFloat(a.star_rating || '0');
    }
    if (sortBy === 'RatingLow') {
      return parseFloat(a.star_rating || '0') - parseFloat(b.star_rating || '0');
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedReviews.length / limitVal) || 1;
  const displayedReviews = sortedReviews.slice((currentPage - 1) * limitVal, currentPage * limitVal);

  const getMemberSinceDate = (dateString?: string) => {
    if (!dateString) return t('Member since May 2024');
    try {
      const d = new Date(dateString);
      return t("Member since {{date}}", { date: d.toLocaleString(t('en-US'), { month: 'long', year: 'numeric' }) });
    } catch (e) {
      return t('Member since May 2024');
    }
  };

  const navigationItems = [
    { id: 'reviews', label: t('My Reviews'), icon: Star },
    { id: 'disputes', label: t('My Disputes'), icon: ShieldCheck },
    { id: 'settings', label: t('Account Settings'), icon: User },
    { id: 'notifications', label: t('Notification Preferences'), icon: Bell },
    { id: 'security', label: t('Security'), icon: Lock },
    { id: 'logout', label: t('Sign Out'), icon: LogOut },
  ];

  return (
    <div className="bg-[#f8fafc]/60 min-h-screen py-10 flex-grow">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        
        {/* Profile Header Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-xs flex flex-row items-center justify-between gap-6 mb-8 relative select-none">
          <div className="flex flex-row items-center gap-5 md:gap-6 text-left">
            {/* Avatar Badge with verification check */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 md:h-20 md:w-20 bg-emerald-100 text-emerald-700 font-extrabold rounded-full flex items-center justify-center text-xl md:text-2xl uppercase tracking-tighter border border-emerald-200">
                {user.full_name.charAt(0)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 bg-white p-0.5 rounded-full shadow-sm">
                <CheckCircle className="h-5 w-5 md:h-5.5 md:w-5.5 text-[#0fbc6f] fill-white shrink-0" />
              </div>
            </div>
            
            {/* User credentials */}
            <div className="space-y-0.5">
              <h2 className="font-extrabold text-[#0a192f] text-lg md:text-2xl tracking-tight leading-tight">{user.full_name}</h2>
              <p className="text-[11px] md:text-xs font-bold text-slate-400 font-mono uppercase tracking-wide">
                @{user.username.toUpperCase()}
              </p>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1.5 md:mt-2 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{getMemberSinceDate((user as any).created_at)}</span>
              </div>
            </div>
          </div>

          {/* Inspirational quotes sidebar section (PC Version only) */}
          <div className="hidden lg:block max-w-[340px] border-l border-slate-100 pl-6 text-left">
            <div className="relative">
              <span className="text-3xl font-serif text-slate-200 absolute -top-4 -left-2 select-none">“</span>
              <p className="text-slate-400 text-[13px] md:text-sm font-medium italic pl-4 pr-2 leading-relaxed">
                {t("Helping the community by sharing real experiences.")}
              </p>
              <span className="text-3xl font-serif text-slate-200 absolute -bottom-6 -right-2 select-none">”</span>
            </div>
          </div>
        </div>

        {/* Major Dashboard Split Column Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT Sidebar - Desktop Grid System */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-4 bg-white border border-slate-100 rounded-3xl p-4 shadow-3xs select-none">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'logout') {
                        handleLogout();
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                      isActive 
                        ? 'bg-[#0f111a] text-white' 
                        : item.id === 'logout'
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-emerald-500 rounded-r-md"></div>
                    )}
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : item.id === 'logout' ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile navigation stacked structure (Visible only on mobile/tablet) */}
          <div className="block lg:hidden w-full bg-white border border-slate-100 rounded-3xl shadow-3xs overflow-hidden mb-6">
            <div className="divide-y divide-slate-100">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'logout') {
                        handleLogout();
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`w-full relative flex items-center justify-between px-5 py-3.5 font-bold transition-all text-left ${
                      isActive 
                        ? 'bg-[#0f111a] text-white shadow-sm' 
                        : item.id === 'logout'
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isActive && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-md"></div>
                      )}
                      <item.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : item.id === 'logout' ? 'text-rose-500' : 'text-slate-400'}`} />
                      <span className="text-[13px] md:text-sm">{item.label}</span>
                    </div>
                    {item.id !== 'logout' && (
                      <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT VIEW CARD - Active content */}
          <div className="lg:col-span-8 xl:col-span-9 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-3xs min-h-[500px] flex flex-col">
            {loading ? (
              <div className="flex-grow flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0fbc6f]"></div>
              </div>
            ) : (
              <>
                {/* Tab screen: My Reviews */}
                {activeTab === 'reviews' && (
                  <div className="flex-grow flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5 mb-6">
                      <div>
                        <h2 className="text-xl md:text-2xl font-extrabold text-[#0a192f] tracking-tight">{t("My Reviews")}</h2>
                        <p className="text-slate-400 text-xs md:text-sm mt-0.5 font-semibold">
                          {reviews.length === 1 ? t('1 review submitted') : t('{{count}} reviews submitted', { count: n(reviews.length) })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto select-none relative">
                        {/* Filter Dropdown */}
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => {
                              setFilterOpen(!filterOpen);
                              setSortOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-550 bg-white hover:bg-slate-50 shadow-3xs transition-all shrink-0"
                          >
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <span>{t("Filter")}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          </button>
                          
                          {filterOpen && (
                            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-100 rounded-xl shadow-md p-1 z-25 divide-y divide-slate-50 text-left">
                              {[
                                { label: t('All Reviews'), value: 'All' },
                                { label: t('Safe'), value: 'Safe' },
                                { label: t('Suspicious'), value: 'Suspicious' },
                                { label: t('Fraud Report'), value: 'Fraud' }
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setFilterType(opt.value);
                                    setCurrentPage(1);
                                    setFilterOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors ${filterType === opt.value ? 'text-[#0fbc6f] font-bold bg-emerald-55/60' : 'text-slate-600'}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => {
                              setSortOpen(!sortOpen);
                              setFilterOpen(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-550 bg-white hover:bg-slate-50 shadow-3xs transition-all shrink-0"
                          >
                            <span>{sortBy === 'Recent' ? t('Most Recent') : sortBy === 'Oldest' ? t('Oldest First') : sortBy === 'RatingHigh' ? t('Highest Rating') : t('Lowest Rating')}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          </button>

                          {sortOpen && (
                            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-100 rounded-xl shadow-md p-1 z-25 divide-y divide-slate-50 text-left">
                              {[
                                { label: t('Most Recent'), value: 'Recent' },
                                { label: t('Oldest First'), value: 'Oldest' },
                                { label: t('Highest Rating'), value: 'RatingHigh' },
                                { label: t('Lowest Rating'), value: 'RatingLow' }
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setSortBy(opt.value);
                                    setCurrentPage(1);
                                    setSortOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors ${sortBy === opt.value ? 'text-[#0fbc6f] font-bold bg-emerald-55/60' : 'text-slate-600'}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                      <div className="text-center py-12 md:py-16 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center">
                        <Star className="h-10 w-10 text-slate-300 mb-4" />
                        <h3 className="text-lg md:text-xl font-extrabold text-[#0a192f] mb-1">
                          {t("No reviews found matching that filter.")}
                        </h3>
                        <p className="text-slate-400 text-xs md:text-sm max-w-sm mb-6 leading-relaxed font-semibold">
                          {t("Try selection of a different filter query, or clear filters.")}
                        </p>
                        
                        <button 
                          type="button"
                          onClick={() => {
                            setFilterType('All');
                            setSortBy('Recent');
                            setCurrentPage(1);
                          }} 
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0fbc6f] hover:bg-[#0da662] font-bold text-white text-xs sm:text-sm rounded-xl hover:shadow-2xs active:scale-98 transition-all"
                        >
                          {t("Show All Reviews")}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {displayedReviews.map((review) => {
                          const initials = getInitials(review.page_name || 'PG');
                          const colorBg = getBgColorForPage(review.page_name || 'PG');
                          const isConfirmingDelete = deleteConfirmId === review.id;

                          return (
                            <div key={review.id} className="text-left border border-slate-100 rounded-2xl p-5 md:p-6 bg-white shadow-3xs hover:shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
                              
                              {/* Left Content Column */}
                              <div className="flex items-start gap-4 flex-1">
                                {/* Logo Avatar Panel */}
                                <div className="relative shrink-0 select-none">
                                  <div className={`h-14 w-14 rounded-full flex items-center justify-center font-black text-white text-base leading-none tracking-tight ${colorBg} shadow-2sm`}>
                                    {initials}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 bg-white border border-slate-100 p-1.5 rounded-full shadow-4xs flex items-center justify-center shadow-3xs">
                                    <ShoppingBag className="h-3 w-3 text-slate-400" />
                                  </div>
                                </div>

                                {/* Text & rating */}
                                <div className="space-y-0.5 min-w-0">
                                  <Link 
                                    to={`/page/${review.page_id}`} 
                                    className="font-bold text-[#0a192f] hover:text-[#0fbc6f] text-[15px] sm:text-base leading-snug hover:underline duration-150 transition-all block truncate"
                                  >
                                    {review.page_name}
                                  </Link>

                                  {/* Star Rating Line */}
                                  <div className="flex items-center gap-1.5 select-none pt-0.5">
                                    <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`h-3 w-3 ${i < parseInt(review.star_rating || '5') ? 'text-[#0fbc6f] fill-[#0fbc6f]' : 'text-slate-200 fill-slate-200'}`} 
                                        />
                                      ))}
                                    </div>
                                    <span className="text-slate-500 font-bold text-xs select-none mt-0.5">
                                      {n(parseFloat(review.star_rating || '5.0').toFixed(1))}
                                    </span>
                                  </div>

                                  {/* Title block */}
                                  <p className="text-slate-550 text-xs sm:text-[13px] leading-relaxed mt-2.5 font-normal whitespace-pre-wrap word-break min-w-0">
                                    {review.title}
                                  </p>
                                </div>
                              </div>

                              {/* Right Content Column */}
                              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 gap-4 shrink-0">
                                <div className="flex flex-col md:items-end gap-1.5">
                                  {/* Calendar Experience Date */}
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold select-none">
                                    <Calendar className="h-3.5 w-3.5 text-slate-405 shrink-0" />
                                    <span>
                                      {new Date(review.created_at).toLocaleDateString(t('en-US'), { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>

                                  {/* Badges */}
                                  <span className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border select-none
                                    ${(review.review_type === 'Safe' || review.review_type === 'Good') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                       review.review_type === 'Fraud Report' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                       (review.review_type === 'Suspicious' || review.review_type === 'Bad') ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                       'bg-slate-50 text-slate-500 border-slate-150'}
                                  `}>
                                    {review.review_type === 'Fraud Report' ? t('FRAUD REPORT') : 
                                     (review.review_type === 'Safe' || review.review_type === 'Good') ? t('GOOD') :
                                     (review.review_type === 'Suspicious' || review.review_type === 'Bad') ? t('BAD') :
                                     t(review.review_type || 'NEUTRAL').toUpperCase()}
                                  </span>
                                </div>

                                {/* Interactive Edit & Delete Actions */}
                                <div className="flex items-center gap-1.5 select-none">
                                  <Link 
                                    to={`/write-review?pageId=${review.page_id}`} 
                                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-355 rounded-xl text-xs font-bold text-slate-550 hover:text-slate-800 bg-white hover:bg-slate-55 shadow-3xs hover:shadow-2xs active:scale-98 transition-all"
                                  >
                                    <SquarePen className="h-3.5 w-3.5 text-slate-400" />
                                    <span>{t("Edit Review")}</span>
                                  </Link>

                                  {isConfirmingDelete ? (
                                    <button 
                                      type="button"
                                      onClick={() => handleDeleteReview(review.id)} 
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all text-xs shadow-3xs"
                                    >
                                      {t("Confirm Delete")}
                                    </button>
                                  ) : (
                                    <button 
                                      type="button"
                                      onClick={() => setDeleteConfirmId(review.id)} 
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-100/50 hover:border-rose-250 hover:bg-rose-50/50 rounded-xl font-bold text-rose-550 hover:text-rose-700 transition-all text-xs"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-rose-450" />
                                      <span>{t("Delete")}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                            </div>
                          );
                        })}

                        {/* Interactive Pagination controls */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 select-none">
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200 hover:border-slate-350 rounded-xl font-bold text-slate-600 text-xs bg-white hover:bg-slate-52 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-3xs"
                            >
                              <span>{t("Previous")}</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {[...Array(totalPages)].map((_, idx) => {
                                const p = idx + 1;
                                const isCurrent = p === currentPage;
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setCurrentPage(p)}
                                    className={`h-8 w-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                                      isCurrent 
                                        ? 'bg-emerald-100 text-[#0fbc6f] border border-emerald-200' 
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-350 hover:bg-slate-50'
                                    }`}
                                  >
                                    {n(p)}
                                  </button>
                                );
                              })}
                            </div>

                            <button 
                              type="button"
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200 hover:border-slate-350 rounded-xl font-bold text-slate-600 text-xs bg-white hover:bg-slate-52 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-3xs"
                            >
                              <span>{t("Next")}</span>
                            </button>
                          </div>

                          {/* Items per page selection block */}
                          <div className="relative">
                            <button 
                              type="button"
                              onClick={() => setItemsPerPageOpen(!itemsPerPageOpen)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-655 text-xs bg-white hover:bg-slate-50 shadow-3xs transition-all"
                            >
                              <span>{t("{{count}} per page", { count: n(limitVal) })}</span>
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            </button>

                            {itemsPerPageOpen && (
                              <div className="absolute right-0 bottom-full mb-1.5 w-36 bg-white border border-slate-100 rounded-xl shadow-md p-1 z-25 divide-y divide-slate-50 text-left">
                                {[10, 20, 50].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      setLimitVal(val);
                                      setCurrentPage(1);
                                      setItemsPerPageOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors ${limitVal === val ? 'text-emerald-600 font-bold bg-emerald-50/50' : 'text-slate-600'}`}
                                  >
                                    {t("{{count}} per page", { count: n(val) })}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* Tab screen: My Disputes */}
                {activeTab === 'disputes' && (
                  <div>
                    <div className="flex flex-row justify-between items-center border-b border-slate-100 pb-5 mb-6">
                      <div>
                        <h2 className="text-xl md:text-2xl font-extrabold text-[#0a192f] tracking-tight">{t("My Disputes")}</h2>
                        <p className="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">{t("Track response/appeals for contested or flagged reviews.")}</p>
                      </div>
                    </div>

                    {disputes.length === 0 ? (
                      <div className="text-center py-16 bg-slate-50/50 border border-dashed border-slate-200/80 rounded-3xl p-6">
                         <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                         <h3 className="font-extrabold text-slate-700 text-base mb-1">{t("You haven't submitted any disputes.")}</h3>
                         <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                           {t("Disputes are made when page owners raise compliance flags on your reviews and you request a secondary admin review.")}
                         </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {disputes.map((dispute) => (
                          <div key={dispute.id} className="border border-slate-100 rounded-2xl p-5 hover:border-emerald-200 transition-colors bg-white">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 pb-3 border-b border-slate-55">
                              <div>
                                <h3 className="font-bold text-[#0a192f] text-base">{t("Dispute for {{name}}", { name: dispute.page_name })}</h3>
                                <p className="text-[11px] text-slate-400 mt-1">{t("Submitted on {{date}}", { date: new Date(dispute.created_at).toLocaleDateString() })}</p>
                              </div>
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 border
                                  ${['Approved', 'Resolved'].includes(dispute.status) ? 'bg-emerald-55 text-emerald-700 border-emerald-150' :
                                     dispute.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-150' :
                                     'bg-amber-50 text-amber-700 border-amber-150'}
                               `}>
                                {['Approved', 'Resolved'].includes(dispute.status) && <CheckCircle className="h-3 w-3" />}
                                {t(dispute.status)}
                              </span>
                            </div>

                            <div className="space-y-1.5 mt-2">
                              <span className="text-xs font-bold text-slate-450 block">{t("contested review:")} <span className="text-slate-750 font-extrabold">"{dispute.review_title}"</span></span>
                              <p className="text-slate-550 text-xs sm:text-sm bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">{dispute.reason}</p>
                            </div>

                            {dispute.admin_decision && (
                              <div className="mt-4 bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/50">
                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1.5">{t("Admin Resolution Decision:")}</h4>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{dispute.admin_decision}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab screen: Account Settings */}
                {activeTab === 'settings' && (
                  <div>
                    <div className="border-b border-slate-100 pb-5 mb-6">
                      <h2 className="text-xl md:text-2xl font-extrabold text-[#0a192f] tracking-tight">{t("Account Settings")}</h2>
                      <p className="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">{t("Update profile representation & register account details.")}</p>
                    </div>

                    {profileSuccess && (
                      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-[#0fbc6f] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t("Profile properties updated successfully!")}
                      </div>
                    )}

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setProfileSuccess(true);
                      setTimeout(() => setProfileSuccess(false), 4000);
                    }} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black text-slate-455 uppercase tracking-wider mb-2">{t("Full Name")}</label>
                          <div className="relative">
                            <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                            <input 
                              type="text" 
                              defaultValue={user.full_name} 
                              onChange={(e) => {
                                setUser({ ...user, full_name: e.target.value });
                              }}
                              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-3xs"
                              placeholder={t("John Doe")}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-455 uppercase tracking-wider mb-2">{t("Username")}</label>
                          <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-400 font-mono text-sm">@</span>
                            <input 
                              type="text" 
                              defaultValue={user.username} 
                              onChange={(e) => {
                                setUser({ ...user, username: e.target.value });
                              }}
                              className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-3xs"
                              placeholder={t("username")}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-455 uppercase tracking-wider mb-2">{t("Email Address")}</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <input 
                            type="email" 
                            defaultValue={user.email} 
                            onChange={(e) => {
                              setUser({ ...user, email: e.target.value });
                            }}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-3xs"
                            placeholder="yourname@gmail.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                          type="submit"
                          className="px-6 py-3 bg-[#0fbc6f] hover:bg-[#0da662] font-semibold text-white text-xs sm:text-sm rounded-xl hover:shadow-2xs active:scale-98 transition-all"
                        >
                          {t("Save Changes")}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tab screen: Notification Preferences */}
                {activeTab === 'notifications' && (
                  <div>
                    <div className="border-b border-slate-100 pb-5 mb-6">
                      <h2 className="text-xl md:text-2xl font-extrabold text-[#0a192f] tracking-tight">{t("Notification Preferences")}</h2>
                      <p className="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">{t("Manage how and when you receive review updates.")}</p>
                    </div>

                    {prefSuccess && (
                      <div className="mb-6 p-4 bg-emerald-55 border border-emerald-200 text-[#0fbc6f] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t("Preferences updated successfully!")}
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <label className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors cursor-pointer block text-left">
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="mt-1 h-4 w-4 rounded text-[#0fbc6f] focus:ring-[#0fbc6f] border-slate-300 shrink-0"
                          />
                          <div>
                            <span className="block font-bold text-slate-800 text-xs sm:text-sm">{t("Email alerts upon replies")}</span>
                            <span className="block text-slate-400 text-[11px] sm:text-xs mt-0.5 leading-relaxed">{t("Receive immediate emails when users or business owners reply to your reviews.")}</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors cursor-pointer block text-left">
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="mt-1 h-4 w-4 rounded text-[#0fbc6f] focus:ring-[#0fbc6f] border-slate-300 shrink-0"
                          />
                          <div>
                            <span className="block font-bold text-slate-800 text-xs sm:text-sm">{t("Dispute resolution alerts")}</span>
                            <span className="block text-slate-400 text-[11px] sm:text-xs mt-0.5 leading-relaxed">{t("Get notified immediately when an admin reaches a decision regarding a dispute on your reviews.")}</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors cursor-pointer block text-left">
                          <input 
                            type="checkbox" 
                            className="mt-1 h-4 w-4 rounded text-[#0fbc6f] focus:ring-[#0fbc6f] border-slate-300 shrink-0"
                          />
                          <div>
                            <span className="block font-bold text-slate-800 text-xs sm:text-sm">{t("Monthly digest logs")}</span>
                            <span className="block text-slate-400 text-[11px] sm:text-xs mt-0.5 leading-relaxed">{t("Receive a monthly summary of your contributions, views, and trust community level.")}</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors cursor-pointer block text-left">
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="mt-1 h-4 w-4 rounded text-[#0fbc6f] focus:ring-[#0fbc6f] border-slate-300 shrink-0"
                          />
                          <div>
                            <span className="block font-bold text-slate-800 text-xs sm:text-sm">{t("Identity & security updates")}</span>
                            <span className="block text-slate-400 text-[11px] sm:text-xs mt-0.5 leading-relaxed">{t("Alert me of complex API operations, new logins from untried devices, or password actions.")}</span>
                          </div>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                          type="button"
                          onClick={() => {
                            setPrefSuccess(true);
                            setTimeout(() => setPrefSuccess(false), 4000);
                          }}
                          className="px-6 py-3 bg-[#0fbc6f] hover:bg-[#0da662] font-semibold text-white text-xs sm:text-sm rounded-xl hover:shadow-2xs active:scale-98 transition-all"
                        >
                          {t("Save Preferences")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab screen: Security */}
                {activeTab === 'security' && (
                  <div>
                    <div className="border-b border-slate-100 pb-5 mb-6">
                      <h2 className="text-xl md:text-2xl font-extrabold text-[#0a192f] tracking-tight">{t("Security")}</h2>
                      <p className="text-slate-400 text-xs md:text-sm mt-0.5 font-medium">{t("Protect your account with encrypted passwords and managed active sessions.")}</p>
                    </div>

                    {secSuccess && (
                      <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-[#0fbc6f] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t("Credentials updated successfully!")}
                      </div>
                    )}

                    <div className="space-y-8">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        setSecSuccess(true);
                        setTimeout(() => setSecSuccess(false), 4000);
                      }} className="space-y-4">
                        <h3 className="font-bold text-slate-800 text-[14px]">{t("Update Security Password")}</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t("Current Password")}</label>
                            <div className="relative">
                              <Key className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                              <input 
                                type="password" 
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-3xs"
                                placeholder="••••••••"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t("New Password")}</label>
                              <div className="relative">
                                <Key className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                <input 
                                  type="password" 
                                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-3xs"
                                  placeholder="••••••••"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{t("Confirm Password")}</label>
                              <div className="relative">
                                <Key className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                <input 
                                  type="password" 
                                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-xl text-slate-800 font-medium text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-3xs"
                                  placeholder="••••••••"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button 
                            type="submit"
                            className="px-5 py-2.5 bg-[#0fbc6f] hover:bg-[#0da662] font-semibold text-white text-xs rounded-xl shadow-3xs transition-all"
                          >
                            {t("Update Password")}
                          </button>
                        </div>
                      </form>

                      {/* Browser session logs */}
                      <div className="pt-6 border-t border-slate-100">
                        <h3 className="font-extrabold text-[#0a192f] text-sm sm:text-base mb-3 leading-tight">{t("Active Login Sessions")}</h3>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 block text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-50 text-[#0fbc6f] flex items-center justify-center shrink-0">
                              <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="block font-bold text-slate-800 text-xs sm:text-sm">
                                {t("Chrome on Windows (Current Active Device)")}
                                <span className="inline-block text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded ml-1.5 uppercase">{t("Current")}</span>
                              </span>
                              <span className="block text-slate-400 text-[11px] mt-0.5 font-medium">{t("IP Address: 103.111.173.22 • Active right now")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
