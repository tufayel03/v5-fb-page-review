import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Edit, Plus, Clock, HelpCircle, AlertCircle, Facebook } from 'lucide-react';
import BusinessClaimPage from './BusinessClaimPage';

export default function BusinessPages() {
  const [pages, setPages] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [facebookPageUrl, setFacebookPageUrl] = useState('');

  const pendingClaims = claims.filter(c => c.status !== 'Approved');

  const loadData = () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    Promise.all([
      fetch('/api/business/pages', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('/api/user/claims', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()),
      fetch('/api/public-settings').then(res => res.json()).catch(() => ({}))
    ])
    .then(([pagesData, claimsData, settingsData]) => {
      setPages(Array.isArray(pagesData) ? pagesData : []);
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      if (settingsData && settingsData.facebook_page_url) {
        setFacebookPageUrl(settingsData.facebook_page_url);
      }
      setLoading(false);
    })
    .catch(e => {
      console.error('Error fetching pages or claims:', e);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading pages...</div>;

  if (showClaimForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Claim Another Page</h1>
            <p className="text-slate-500">Submit a request to manage another Facebook business page.</p>
          </div>
          <button onClick={() => setShowClaimForm(false)} className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer">
            Cancel
          </button>
        </div>
        <div className="max-w-3xl border border-slate-200 p-8 rounded-2xl bg-white shadow-sm">
          <BusinessClaimPage onSuccess={() => {
            setShowClaimForm(false);
            loadData();
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Pages</h1>
            <p className="text-slate-500">Manage your claimed and verified Facebook business pages.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {pages.length === 0 ? (
            <div className="col-span-2 p-10 bg-white text-center text-slate-500 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg text-slate-800 mb-1">No Claimed Pages Yet</h3>
              <p className="text-slate-400 text-sm mb-4">You do not have any approved/active business page listings in your profile.</p>
              {pendingClaims.length === 0 && (
                <div className="mt-4">
                  <button onClick={() => setShowClaimForm(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors inline-flex items-center justify-center">
                    Claim a Facebook Page
                  </button>
                </div>
              )}
              {pendingClaims.length > 0 && (
                <p className="text-indigo-600 text-sm font-semibold mt-4">You have a claim request pending approval.</p>
              )}
            </div>
          ) : (
            pages.map(page => (
              <div key={page.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-start gap-4">
                  {page.profile_picture ? (
                    <img src={page.profile_picture} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xl">
                      {page.current_name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900">{page.current_name}</h3>
                    <a href={page.facebook_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1 break-all">
                      {page.facebook_url} <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-slate-500">Status Badge</p>
                    <p className="font-bold text-slate-900">{page.status_badge}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Reviews</p>
                    <p className="font-bold text-slate-900">{page.total_reviews}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Average Rating</p>
                    <p className="font-bold text-slate-900">{page.average_rating}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Fraud Reports</p>
                    <p className="font-bold text-rose-600">{page.fraud_report_count}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex gap-2">
                  <Link to={`/page/${page.id}`} target="_blank" className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-lg text-sm font-bold transition-colors">
                    View Public
                  </Link>
                  <Link to="/business-dashboard/profile-info" className="flex-1 flex justify-center items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-lg text-sm font-bold transition-colors">
                    <Edit className="h-4 w-4"/> Edit Info
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Submitted Claim Requests */}
      {pendingClaims.length > 0 && (
        <div id="submitted-claims-section" className="space-y-4 border-t border-slate-200/80 pt-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 select-none">
              <Clock className="h-5 w-5 text-indigo-500" /> Submitted Claim Requests
            </h2>
            <p className="text-sm text-slate-500">These claims are pending manual administrator verification. You will gain profile access once approved.</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 dark:bg-amber-500/5">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 md:mt-0" />
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-amber-800 dark:text-amber-300">Required Verification Action:</p>
                <p className="text-xs text-amber-700 dark:text-amber-200 leading-relaxed font-semibold">
                  To verify ownership, you <strong className="font-extrabold text-amber-900 dark:text-amber-100">must send a message</strong> containing your <span className="underline font-black">Claim Username</span> or <span className="underline font-black">Contact Email</span> to our{" "}
                  {facebookPageUrl ? (
                    <a
                      href={facebookPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#1877f2] dark:text-[#5890ff] font-extrabold underline hover:no-underline"
                    >
                      <Facebook className="h-3.5 w-3.5 fill-[#1877f2] dark:fill-[#5890ff] shrink-0" /> Facebook Page
                    </a>
                  ) : (
                    <span className="font-extrabold">Facebook Page</span>
                  )}{" "}
                  <strong className="font-extrabold text-amber-900 dark:text-amber-100">directly from the Facebook Page you are claiming</strong>. This allows us to confirm ownership and approve your access immediately.
                </p>
              </div>
            </div>
            {facebookPageUrl && (
              <a
                href={facebookPageUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full md:w-auto text-center shrink-0 bg-[#1877f2] hover:bg-[#166fe5] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                Send Message on Facebook <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {pendingClaims.map(claim => (
              <div key={claim.id} id={`claim-item-${claim.id}`} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-800 text-md truncate">{claim.page_name || 'Unlisted Page'}</h3>
                    <a href={claim.facebook_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1 break-all">
                       {claim.facebook_url || 'Unknown URL'} <ExternalLink className="h-2.5 w-2.5 shrink-0 inline" />
                    </a>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm ${
                    claim.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    claim.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    claim.status === 'Revoked' ? 'bg-zinc-100 text-zinc-800 border border-zinc-200' :
                    'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                  }`}>
                    {claim.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white border border-slate-100 p-3 rounded-xl shadow-xs">
                   <div>
                     <p className="text-slate-400 font-medium select-none">Claim Username</p>
                     <p className="font-bold text-slate-700">{claim.claimer_username || '-'}</p>
                   </div>
                   <div>
                     <p className="text-slate-400 font-medium select-none">Submitted At</p>
                     <p className="font-bold text-slate-700">{new Date(claim.created_at).toLocaleDateString()}</p>
                   </div>
                   {claim.contact_email && (
                     <div className="col-span-2 mt-1">
                       <p className="text-slate-400 font-medium select-none">Contact Email</p>
                       <p className="font-bold text-slate-700 truncate">{claim.contact_email}</p>
                     </div>
                   )}
                </div>

                {claim.admin_note && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1 text-xs">
                     <p className="font-bold text-indigo-900 flex items-center gap-1 select-none">
                       <AlertCircle className="h-3.5 w-3.5 text-indigo-600" /> Admin Note
                     </p>
                     <p className="text-indigo-800 leading-normal">{claim.admin_note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

