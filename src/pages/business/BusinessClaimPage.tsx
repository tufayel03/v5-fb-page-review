import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ArrowRight, ShieldCheck, HelpCircle, AlertCircle, ExternalLink, Facebook } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface BusinessClaimPageProps {
  onSuccess?: () => void;
}

export default function BusinessClaimPage({ onSuccess }: BusinessClaimPageProps) {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get('pageId');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [page, setPage] = useState<any>(null);
  const [targetPageId, setTargetPageId] = useState<string | null>(pageId);
  const [pageUrl, setPageUrl] = useState('');
  const [pageName, setPageName] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isNewPage, setIsNewPage] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [facebookPageUrl, setFacebookPageUrl] = useState('');

  useEffect(() => {
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.facebook_page_url) {
          setFacebookPageUrl(data.facebook_page_url);
        }
      })
      .catch(err => console.error("Error loading public settings:", err));
  }, []);

  useEffect(() => {
    if (pageId) {
      fetch('/api/pages/' + pageId).then(res => res.json()).then(data => {
        if (!data.error) {
          if (data.claim_status === 'Claimed') {
            setError(t('This page has already been claimed.'));
            setTargetPageId(null);
            setPage(null);
          } else {
            setPage(data);
            setTargetPageId(data.id.toString());
            setPageUrl(data.facebook_url || '');
            setPageName(data.current_name || '');
          }
        }
      });
    }
  }, [pageId, t]);

  const verifyPageUrl = async (): Promise<any> => {
    if (!pageUrl) return null;
    setSearchError('');
    setIsNewPage(false);
    try {
      const res = await fetch('/api/pages/by-url?url=' + encodeURIComponent(pageUrl));
      const data = await res.json();
      const verifiedPage = data?.page || (data?.id ? data : null);
      if (verifiedPage && verifiedPage.id) {
        if (verifiedPage.claim_status === 'Claimed') {
          setPage(null);
          setTargetPageId(null);
          setSearchError(t('This page has already been claimed.'));
          return null;
        } else {
          setPage(verifiedPage);
          setTargetPageId(verifiedPage.id.toString());
          setError('');
          return verifiedPage;
        }
      } else {
        setPage(null);
        setTargetPageId('new');
        setIsNewPage(true);
        setSearchError('');
        setError('');
        return 'new';
      }
    } catch (e) {
      setSearchError(t('Failed to verify page URL.'));
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    let currentTargetId = targetPageId;
    let isNew = isNewPage;
    
    setLoading(true);

    // 1. If we don't have a verified targetPageId yet, try to auto-verify it now
    if (!currentTargetId) {
      if (!pageUrl) {
         setError(t('No page selected to claim. Please enter a valid Facebook Page URL.'));
         setLoading(false);
         return;
      }
      
      const verifyResult = await verifyPageUrl();
      if (!verifyResult) {
        // Validation/already claimed message was set in state inside verifyPageUrl
        setLoading(false);
        return;
      }
      
      if (verifyResult === 'new') {
        currentTargetId = 'new';
        isNew = true;
      } else {
        currentTargetId = verifyResult.id.toString();
        isNew = false;
      }
    }
    
    // 2. If it's a new page and the name is missing, prompt the user to input the name
    if (isNew && !pageName.trim()) {
      setError(t('This Facebook page is not listed yet. Please enter a Page Name in the field below to list and claim it.'));
      setLoading(false);
      return;
    }
    
    // 3. Submit Claim Request
    try {
      const res = await fetch('/api/user/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          page_id: currentTargetId,
          page_url: pageUrl,
          page_name: pageName,
          claimer_username: user?.username || '',
          contact_email: user?.email || '',
          contact_phone: contactPhone
        })
      });
      if (res.ok) {
        setSearchError('');
        setError('');
        setIsSuccess(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate('/business-dashboard/pages');
          }
        }, 2500);
      } else {
        const errData = await res.json();
        setError(errData.error || t('Failed to submit claim request.'));
      }
    } catch(err) {
      setError(t('An error occurred while submitting your request.'));
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div id="claim-success-screen" className="bg-white p-8 border border-neutral-200 rounded-3xl shadow-sm text-center py-12 space-y-6 max-w-xl mx-auto">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
          <ShieldCheck className="h-10 w-10 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">{t("Claim Request Submitted!")}</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            {t("Your claim request for")} <span className="font-extrabold text-emerald-800">{pageName || pageUrl}</span> {t("has been received, pending verification.")}
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left space-y-2 dark:bg-amber-500/5">
          <p className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5 leading-none">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" /> {t("Ownership Verification Needed")}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-200 font-semibold leading-relaxed">
            {t("To activate ownership, you")}{" "}
            {facebookPageUrl ? (
              <a
                href={facebookPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#1877f2] dark:text-[#5890ff] font-extrabold underline hover:no-underline align-middle"
              >
                <Facebook className="h-3.5 w-3.5 fill-[#1877f2] dark:fill-[#5890ff] shrink-0" /> {t("must message us")}
              </a>
            ) : (
              <span className="underline font-black">{t("must message us")}</span>
            )}{" "}
            {t("your claim username")} (<strong className="text-indigo-900 dark:text-indigo-300 font-bold">{user?.username}</strong>) {t("or email")} (<strong className="text-[#1877f2] dark:text-[#5890ff] font-bold">{user?.email}</strong>){" "}
            <strong className="font-black text-amber-900 dark:text-amber-100">{t("directly from the claimed Facebook Page's inbox")}</strong> {t("to our official page.")}
          </p>
          {facebookPageUrl && (
            <a
              href={facebookPageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 text-xs bg-[#1877f2] hover:bg-[#166fe5] text-white font-extrabold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors shadow-xs"
            >
              {t("Go to Our Facebook Page")} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          {t("Redirecting automatically to your business dashboard pages...")}
        </p>
        <button 
          id="btn-goto-pages"
          onClick={() => {
            if (onSuccess) {
              onSuccess();
            } else {
              navigate('/business-dashboard/pages');
            }
          }}
          className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {t("Go to My Pages")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-slate-900">{t("Claim Your Facebook Page")}</h1>
      <p className="text-slate-500 mb-6">{t("Verify ownership of your Facebook page to reply to reviews and build trust.")}</p>

      <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3 dark:bg-indigo-950/20">
        <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-extrabold text-indigo-900 dark:text-indigo-300">{t("How claiming works:")}</p>
          <p className="text-xs text-indigo-800 dark:text-indigo-200 font-semibold leading-relaxed">
            {t("After submitting your claim request, you must")}{" "}
            {facebookPageUrl ? (
              <a
                href={facebookPageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#1877f2] dark:text-[#5890ff] font-extrabold underline hover:no-underline align-middle"
              >
                <Facebook className="h-3.5 w-3.5 fill-[#1877f2] dark:fill-[#5890ff] shrink-0" /> {t("send us a message")}
              </a>
            ) : (
              <span className="underline font-black">{t("send us a message")}</span>
            )}{" "}
            {t("with your claim username/email to our official Facebook page")}{( " " )}
            <strong className="font-extrabold text-[#1877f2] dark:text-[#5890ff]">{t("directly from your Facebook Page you are claiming")}</strong> {t("to complete the verification.")}
          </p>
        </div>
      </div>

      <div className="bg-white p-8 border border-neutral-200 rounded-3xl shadow-sm">
        {error && <div id="claim-submission-error" className="mb-4 p-3.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm font-semibold">{error}</div>}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {!pageId && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("Facebook Page URL")}</label>
              <input
                id="input-page-url"
                type="url"
                required
                value={pageUrl}
                onChange={e => {
                  setPageUrl(e.target.value);
                  if (targetPageId) {
                    setTargetPageId(null);
                    setIsNewPage(false);
                  }
                }}
                onBlur={verifyPageUrl}
                className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="https://facebook.com/yourpage"
              />
              {searchError && <p id="search-error-msg" className="text-red-500 text-xs font-bold mt-1.5">{searchError}</p>}
            </div>
          )}
          {isNewPage && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-3">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                   <h3 className="font-bold text-slate-900 text-sm">{t("Create New Page Listing")}</h3>
                   <p className="text-xs text-slate-500">{t("This Facebook page isn't listed on our portal yet. Give it a name to create its profile and submit your claim request automatically!")}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("Page Name")}</label>
                <input 
                  id="input-page-name"
                  type="text" 
                  required
                  value={pageName}
                  onChange={e => setPageName(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
                  placeholder={t("e.g. My Awesome Business")} 
                />
              </div>
            </div>
          )}
          {page && !isNewPage && (
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100/80 flex items-center gap-3">
               <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
               <p className="text-sm font-medium text-emerald-800">
                 {t("Claiming Listing:")} <span className="font-extrabold">{page.current_name}</span>
               </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t("Contact Phone (Optional)")}</label>
            <input 
              id="input-contact-phone"
              type="text" 
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              className="w-full border border-neutral-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" 
              placeholder={t("Optionally provide a contact number")} 
            />
          </div>
          <button 
            id="btn-submit-claim"
            type="submit" 
            disabled={loading} 
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            {loading ? t('Processing...') : t('Submit Claim Request')}
          </button>
        </form>
      </div>
    </div>
  );
}

