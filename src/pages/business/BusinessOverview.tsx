import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Star, AlertTriangle, MessageSquare, Briefcase } from 'lucide-react';
import BusinessClaimPage from './BusinessClaimPage';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function BusinessOverview() {
  const { theme } = useTheme();
  const { t, n, language } = useLanguage();
  const dateLocale = language === 'bn' ? 'bn-BD' : 'en-US';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);

  const loadOverview = () => {
    setLoading(true);
    fetch('/api/business/dashboard/overview', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const cContainer = theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0B1120] border-white/5';
  const cText = theme === 'light' ? 'text-slate-900' : 'text-white';
  const cTextMuted = theme === 'light' ? 'text-slate-500' : 'text-slate-400';

  if (loading) return <div className={`p-8 text-center font-medium ${cTextMuted}`}>{t("Loading dashboard...")}</div>;
  
  if (!data || !data.claimedPages || data.claimedPages.length === 0) {
    if (showClaimForm) {
      return (
        <div className="max-w-3xl mx-auto">
          <BusinessClaimPage onSuccess={() => {
            setShowClaimForm(false);
            loadOverview();
          }} />
        </div>
      );
    }
    
    return (
      <div className={`${cContainer} rounded-xl border p-8 text-center max-w-md mx-auto mt-10 space-y-5 shadow-sm`}>
        <Briefcase className="h-12 w-12 text-indigo-400 mx-auto mb-2" />
        <div>
          <h2 className={`text-xl font-bold ${cText}`}>{t("No Approved Pages")}</h2>
          <p className={`text-sm mt-1 leading-relaxed ${cTextMuted}`}>
            {t("You don't have any active/approved business pages in your account yet.")}
          </p>
        </div>
        
        <div className={`p-3.5 rounded-xl border text-left ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
           <p className={`text-xs font-bold leading-normal ${theme === 'light' ? 'text-amber-800' : 'text-amber-400'}`}>
             💡 {t("Just submitted a claim query?")}
           </p>
           <p className={`text-xs mt-0.5 leading-normal font-medium ${theme === 'light' ? 'text-amber-700' : 'text-amber-300'}`}>
             {t("Your claim request is currently pending verification. You can check its review milestones on the")}{" "}<Link to="/business-dashboard/pages" className="underline font-bold">{t("My Pages")}</Link>{" "}{t("tab.")}
           </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button onClick={() => setShowClaimForm(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors inline-flex items-center justify-center cursor-pointer shadow-xs">
            {t("Claim a Facebook Page")}
          </button>
          <Link to="/business-dashboard/pages" className="text-sm text-indigo-600 hover:text-indigo-400 hover:underline font-bold mt-1 inline-block transition-colors">
            {t("View Submitted Claims →")}
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: t('Fraud Reports'), value: data.fraudReports, icon: AlertTriangle, color: theme === 'light' ? 'text-indigo-600' : 'text-indigo-400', bg: theme === 'light' ? 'bg-indigo-50' : 'bg-indigo-500/10' },
    { label: t('Total Reviews'), value: data.totalReviews, icon: MessageSquare, color: theme === 'light' ? 'text-blue-600' : 'text-blue-400', bg: theme === 'light' ? 'bg-blue-50' : 'bg-blue-500/10' },
    { label: t('Average Rating'), value: data.averageRating, icon: Star, color: theme === 'light' ? 'text-amber-500' : 'text-amber-400', bg: theme === 'light' ? 'bg-amber-50' : 'bg-amber-500/10' },
    { label: t('Pending Replies'), value: data.pendingReplies, icon: MessageSquare, color: theme === 'light' ? 'text-orange-500' : 'text-orange-400', bg: theme === 'light' ? 'bg-orange-50' : 'bg-orange-500/10' },
    { label: t('Open Disputes'), value: data.openDisputes, icon: AlertTriangle, color: theme === 'light' ? 'text-rose-500' : 'text-rose-400', bg: theme === 'light' ? 'bg-rose-50' : 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${cText}`}>{t("Overview")}</h1>
        <p className={cTextMuted}>{t("Summary of your claimed Facebook business pages.")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className={`${cContainer} p-5 rounded-xl border shadow-sm flex items-center gap-4`}>
            <div className={`p-3 rounded-lg ${s.bg}`}>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${cTextMuted}`}>{s.label}</p>
              <p className={`text-2xl font-black ${cText}`}>{n(s.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <h2 className={`text-lg font-bold ${cText}`}>{t("Recent Reviews")}</h2>
          <div className={`${cContainer} rounded-xl border shadow-sm overflow-hidden text-sm`}>
            {data.latestReviews && data.latestReviews.length > 0 ? (
              <div className={`divide-y ${theme === 'light' ? 'divide-slate-100' : 'divide-white/5'}`}>
                {data.latestReviews.slice(0, 5).map((r: any) => (
                   <div key={r.id} className={`p-4 transition-colors ${theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className={`font-bold ${cText}`}>{r.page_name}</span>
                              <span className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}>•</span>
                              <span className={`text-xs ${cTextMuted}`}>{new Date(r.created_at).toLocaleDateString(dateLocale)}</span>
                           </div>
                           <h3 className={`font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>{r.title}</h3>
                        </div>
                        <div className={`flex items-center px-2 py-1 rounded text-xs font-bold ${theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                           <Star className="h-3 w-3 text-emerald-500 mr-1 fill-current" /> {n(r.star_rating)}
                        </div>
                     </div>
                     <p className={`${theme === 'light' ? 'text-slate-600' : 'text-slate-400'} line-clamp-2 mt-1`}>{r.description}</p>
                     <div className="mt-3">
                        <Link to={`/business-dashboard/reviews?reviewId=${r.id}`} className="text-indigo-600 font-bold hover:text-indigo-400 hover:underline transition-colors">{t("Reply →")}</Link>
                     </div>
                   </div>
                ))}
              </div>
            ) : (
              <div className={`p-8 text-center ${cTextMuted}`}>{t("No reviews yet.")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
