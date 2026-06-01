import React, { useState, useEffect } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, Download, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const { user } = useAuth();

  const [cookieChecking, setCookieChecking] = useState(false);
  const [cookieCheckResult, setCookieCheckResult] = useState<{ status: string, message: string } | null>(null);

  const checkCookieStatus = async () => {
    setCookieChecking(true);
    setCookieCheckResult(null);
    try {
      const response = await fetch("/api/admin/check-cookie-status", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCookieCheckResult(data);
      } else {
        setCookieCheckResult({ status: 'error', message: 'Failed to communicate with server status check.' });
      }
    } catch (err: any) {
      setCookieCheckResult({ status: 'error', message: 'Network error verifying cookie status.' });
    } finally {
      setCookieChecking(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      try {
        const response = await fetch("/api/admin/media-library/upload-base64", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({
            base64: base64Str,
            filename: file.name
          })
        });

        if (response.ok) {
          const uploaded = await response.json();
          updateSetting('site_logo', uploaded.url, 'branding');
          setMessage({ type: 'success', text: 'Logo uploaded successfully. Remember to Save Changes!' });
        } else {
          setMessage({ type: 'error', text: 'Failed to upload logo image' });
        }
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'An error occurred during logo upload' });
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const allTabs = [
    { id: "general", label: "General Settings" },
    { id: "branding", label: "Website Branding" },
    { id: "reviews", label: "Review Settings" },
    { id: "claims", label: "Claim Settings" },
    { id: "contact-numbers", label: "bKash / Numbers" },
    { id: "advertising", label: "Advertising Settings" },
    { id: "blog-seo", label: "Blog & SEO" },
    { id: "notifications", label: "Notifications" },
    { id: "smtp", label: "Email / SMTP Config" },
    { id: "security", label: "Security Settings" },
    { id: "roles-permissions", label: "Roles & Permissions" },
    { id: "import-export", label: "Import / Export" },
    { id: "legal-policy", label: "Legal & Policy" },
    { id: "advanced", label: "Advanced" },
  ];

  const restrictedTabs = ["security", "roles-permissions", "advanced", "import-export"];
  const tabs = user?.role === 'Super Admin' 
    ? allTabs 
    : allTabs.filter(r => !restrictedTabs.includes(r.id));

  // Default structure to help generate fields
  const getSettingValue = (key: string, defaultValue: any) => {
    const s = settings.find(s => s.key_name === key);
    return s ? s.value : defaultValue;
  };

  const updateSetting = (key: string, value: string, group: string, type: string = 'text', description: string = '') => {
    const newSettings = [...settings];
    const index = newSettings.findIndex(s => s.key_name === key);
    if (index >= 0) {
      newSettings[index].value = value;
    } else {
      newSettings.push({ key_name: key, value, group_name: group, type, description });
    }
    setSettings(newSettings);
  };

  // We load settings from server
  useEffect(() => {
    fetchSettings();
    checkCookieStatus();
  }, []);

  const fetchSettings = () => {
    fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSettings(data);
        setLoading(false);
      });
  };

  const handleSave = () => {
    // Basic validation
    const emailKey = settings.find(s => s.key_name === 'contact_email')?.value;
    const supportEmailKey = settings.find(s => s.key_name === 'support_email')?.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailKey && !emailRegex.test(emailKey)) {
      setMessage({ type: 'error', text: 'Invalid Contact Email format' });
      return;
    }
    if (supportEmailKey && !emailRegex.test(supportEmailKey)) {
      setMessage({ type: 'error', text: 'Invalid Support Email format' });
      return;
    }

    setSaving(true);
    setMessage(null);
    fetch("/api/admin/settings", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}` 
      },
      body: JSON.stringify({ settings })
    })
      .then(res => res.json())
      .then(data => {
        setSaving(false);
        if (data.error) {
          setMessage({ type: 'error', text: data.error });
        } else {
          setMessage({ type: 'success', text: "Settings saved successfully" });
          setTimeout(() => setMessage(null), 3000);
        }
      });
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm">Manage website, review, claim, security, SEO, and admin preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="px-4 py-2 bg-white/5 border border-white/5 text-slate-300 font-bold text-sm rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => { if(window.confirm('Reset unsaved changes?')) fetchSettings(); }}
          >
            Reset
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'}`}>
          {message.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Mobile Tabs Dropdown */}
        <div className="w-full lg:hidden">
          <select 
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full bg-[#050b18]/45 border border-white/5 rounded-lg p-3 font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        {/* Desktop Sidebar Tabs */}
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-1">
          {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`text-left px-4 py-3 rounded-lg text-sm font-bold transition-colors ${
                 activeTab === tab.id 
                   ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                   : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
               }`}
             >
               {tab.label}
             </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 w-full bg-[#091124] border border-white/5 rounded-xl shadow-xl p-6 lg:p-8 min-h-[600px]">
          
          {activeTab === "general" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">General Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Site Name</label>
                  <input type="text" value={getSettingValue('site_name', 'FB Page Review')} onChange={e => updateSetting('site_name', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Site Tagline</label>
                  <input type="text" value={getSettingValue('site_tagline', 'Check Facebook Pages Before You Pay')} onChange={e => updateSetting('site_tagline', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Contact Email</label>
                  <input type="email" value={getSettingValue('contact_email', 'admin@example.com')} onChange={e => updateSetting('contact_email', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Facebook Page URL</label>
                  <input type="url" value={getSettingValue('facebook_page_url', 'https://facebook.com')} onChange={e => updateSetting('facebook_page_url', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="https://facebook.com/your-page" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Support Email</label>
                  <input type="email" value={getSettingValue('support_email', 'support@example.com')} onChange={e => updateSetting('support_email', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Country</label>
                  <select value={getSettingValue('country', 'BD')} onChange={e => updateSetting('country', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none">
                    <option value="BD" className="bg-[#091124]">Bangladesh</option>
                    <option value="IN" className="bg-[#091124]">India</option>
                    <option value="US" className="bg-[#091124]">United States</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Currency</label>
                  <select value={getSettingValue('currency', 'BDT')} onChange={e => updateSetting('currency', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none">
                    <option value="BDT" className="bg-[#091124]">BDT (৳)</option>
                    <option value="USD" className="bg-[#091124]">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Timezone</label>
                  <select value={getSettingValue('timezone', 'Asia/Dhaka')} onChange={e => updateSetting('timezone', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none">
                    <option value="Asia/Dhaka" className="bg-[#091124]">Asia/Dhaka (GMT+6)</option>
                    <option value="UTC" className="bg-[#091124]">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Language</label>
                  <select value={getSettingValue('language', 'en')} onChange={e => updateSetting('language', e.target.value, 'general')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none">
                    <option value="en" className="bg-[#091124]">English</option>
                    <option value="bn" className="bg-[#091124]">Bengali</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300">Facebook Cookie String / JSON (For Scraping)</label>
                  <p className="text-xs text-slate-400 mt-1">Paste your active Facebook session cookie string or raw exported JSON array from Cookie-Editor here. This is used by the server to safely crawl, authenticate, and search profiles directly when URLs are pasted in the search box.</p>
                </div>
                <textarea rows={4} value={getSettingValue('facebook_scraper_cookies', '')} onChange={e => updateSetting('facebook_scraper_cookies', e.target.value, 'general', 'textarea')} className="w-full border border-white/5 bg-[#050b18]/45 text-[#00ffcc] rounded-lg p-3 focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono text-xs" placeholder='[{"name": "c_user", "value": "..."}, ...]' />
                
                {/* Live Cookie Status Validation Card */}
                <div className="p-4 border border-white/5 bg-[#050b18]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Cookie Session Status:</span>
                      {cookieChecking ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <RefreshCw className="h-3 w-3 animate-spin" /> Verifying Live...
                        </span>
                      ) : cookieCheckResult?.status === 'valid' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                          ● Active & Verified
                        </span>
                      ) : cookieCheckResult?.status === 'valid_offline' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          ● Offline Checked
                        </span>
                      ) : cookieCheckResult?.status === 'expired' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.1)] animate-pulse">
                          ● Expired / Invalid
                        </span>
                      ) : cookieCheckResult?.status === 'none' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-[#475569]/30">
                          ● Not Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-700/30">
                          ● Unknown Status
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                      {cookieChecking 
                        ? 'Checking live authentication link to Facebook servers...' 
                        : cookieCheckResult?.message || 'Click live verify to test current session credentials.'}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={checkCookieStatus}
                    disabled={cookieChecking}
                    className="shrink-0 px-4 py-2 border border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${cookieChecking ? 'animate-spin' : ''}`} />
                    Live Verify Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "branding" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Website Branding</h2>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Primary Color (Hex)</label>
                  <div className="flex items-center gap-3">
                     <input type="color" value={getSettingValue('primary_color', '#10b981')} onChange={e => updateSetting('primary_color', e.target.value, 'branding')} className="h-10 w-10 border-0 p-0 rounded bg-transparent" />
                     <input type="text" value={getSettingValue('primary_color', '#10b981')} onChange={e => updateSetting('primary_color', e.target.value, 'branding')} className="w-32 border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20 outline-none uppercase" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Site Logo</label>
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full space-y-2">
                      <input 
                        type="text" 
                        value={getSettingValue('site_logo', '')} 
                        onChange={e => updateSetting('site_logo', e.target.value, 'branding')} 
                        className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                        placeholder="Or enter logo URL: https://example.com/logo.png" 
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="logo-local-file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={logoUploading}
                          onClick={() => document.getElementById('logo-local-file')?.click()}
                          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-600/30 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>{logoUploading ? 'Uploading...' : 'Upload Local Logo'}</span>
                        </button>
                        {getSettingValue('site_logo', '') && (
                          <button
                            type="button"
                            onClick={() => updateSetting('site_logo', '', 'branding')}
                            className="px-3 py-1.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold hover:bg-rose-600/30 transition-all cursor-pointer"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                    {getSettingValue('site_logo', '') ? (
                      <div className="bg-[#050b18]/45 border border-white/5 p-3 rounded-xl flex items-center justify-center shrink-0 min-w-[128px] max-w-[192px] h-20 overflow-hidden">
                        <img 
                          src={getSettingValue('site_logo', '')} 
                          alt="Company Logo Preview" 
                          referrerPolicy="no-referrer"
                          className="max-h-14 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="bg-[#050b18]/45 border border-white/5 border-dashed p-3 rounded-xl flex items-center justify-center shrink-0 min-w-[128px] max-w-[192px] h-20">
                        <span className="text-xs text-slate-500 font-medium">No Logo Saved</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Homepage Hero Title</label>
                   <input type="text" value={getSettingValue('hero_title', 'Check Facebook Pages Before You Pay')} onChange={e => updateSetting('hero_title', e.target.value, 'branding')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Homepage Hero Subtitle</label>
                   <textarea rows={2} value={getSettingValue('hero_subtitle', 'Search Facebook pages, sellers, usernames, and bKash numbers before sending money.')} onChange={e => updateSetting('hero_subtitle', e.target.value, 'branding')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"></textarea>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Footer Description</label>
                   <textarea rows={3} value={getSettingValue('footer_desc', 'FB Page Review helps users check Facebook pages, seller profiles, reviews, fraud reports, and payment numbers before buying online.')} onChange={e => updateSetting('footer_desc', e.target.value, 'branding')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"></textarea>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Review Settings</h2>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('auto_approve_reviews', 'false') === 'true'} onChange={e => updateSetting('auto_approve_reviews', e.target.checked ? 'true' : 'false', 'reviews')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Auto approve positive/neutral reviews</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('require_admin_approval_fraud', 'true') === 'true'} onChange={e => updateSetting('require_admin_approval_fraud', e.target.checked ? 'true' : 'false', 'reviews')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Require admin approval for Fraud Reports</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('limit_one_review_per_page', 'true') === 'true'} onChange={e => updateSetting('limit_one_review_per_page', e.target.checked ? 'true' : 'false', 'reviews')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Limit one review per user per page</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('allow_image_proof', 'true') === 'true'} onChange={e => updateSetting('allow_image_proof', e.target.checked ? 'true' : 'false', 'reviews')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Allow users to upload image proof in reviews</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">Max Description Length</label>
                    <input type="number" value={getSettingValue('max_review_length', '2000')} onChange={e => updateSetting('max_review_length', e.target.value, 'reviews')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-300 mb-1">Min Description Length</label>
                    <input type="number" value={getSettingValue('min_review_length', '20')} onChange={e => updateSetting('min_review_length', e.target.value, 'reviews')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                 </div>
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-rose-400 border-b border-white/5 pb-4 mt-8">
                <ShieldAlert className="h-5 w-5" /> Danger Zone & Advanced
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer p-4 border border-rose-500/15 rounded-lg bg-rose-500/5">
                  <input type="checkbox" checked={getSettingValue('maintenance_mode', 'false') === 'true'} onChange={e => updateSetting('maintenance_mode', e.target.checked ? 'true' : 'false', 'advanced')} className="w-4 h-4 text-rose-500 rounded accent-rose-600 bg-transparent border-rose-500/15" />
                  <div>
                     <span className="font-bold text-rose-400 block">Maintenance Mode</span>
                     <span className="text-xs font-medium text-rose-300">Disables public access. Only admins can view the site.</span>
                  </div>
                </label>

                <div className="flex items-center justify-between p-4 border border-white/5 bg-[#050b18]/45 rounded-lg">
                   <div>
                     <h3 className="font-bold text-slate-200">Clear Application Cache</h3>
                     <p className="text-sm text-slate-400">Clears compiled search indexes and fast-loading cached data.</p>
                   </div>
                   <button className="px-4 py-2 bg-white/5 border border-white/5 text-slate-300 font-bold rounded hover:bg-white/10 text-sm transition-colors">Clear Cache</button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-white/5 bg-[#050b18]/45 rounded-lg">
                   <div>
                     <h3 className="font-bold text-slate-200">Full Backup (DB + Uploads)</h3>
                     <p className="text-sm text-slate-400">Download a complete archive of all database contents and user uploads.</p>
                   </div>
                   <a href="/api/admin/backup-db" download className="px-4 py-2 bg-blue-500/10 border border-blue-500/15 font-bold text-blue-400 rounded hover:bg-blue-500/20 text-sm flex items-center gap-2 transition-all">
                     <Download className="w-4 h-4" /> Backup DB
                   </a>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-rose-500/15 rounded-lg bg-rose-500/5">
                   <div className="mb-3 sm:mb-0">
                     <h3 className="font-bold text-rose-400">Restore Full Backup</h3>
                     <p className="text-sm text-rose-300 max-w-md">Upload a full backup or a database file. This will <span className="font-bold">OVERWRITE</span> all current data, uploads and configuration. The server will restart automatically.</p>
                   </div>
                   <div>
                     <input type="file" id="db-upload" className="hidden" accept=".db,.sqlite,.sqlite3,.zip" onChange={async (e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       if (!window.confirm('WARNING: This will OVERWRITE ALL existing data & user uploads! This action cannot be undone. Are you absolutely sure you want to proceed?')) return;
                       
                       const formData = new FormData();
                       formData.append('dbfile', file);
                       
                       try {
                         const res = await fetch('/api/admin/restore-db', {
                           method: 'POST',
                           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                           body: formData
                         });
                         if (res.ok) {
                           alert('Full Website Data restored successfully. The server is restarting, please log in again after a few seconds.');
                           window.location.reload();
                         } else {
                           alert('Failed to restore database.');
                         }
                       } catch (err) {
                         alert('Error occurred while restoring the database.');
                       }
                     }} />
                     <button onClick={() => document.getElementById('db-upload')?.click()} className="px-4 py-2 bg-rose-500/10 border border-rose-500/15 font-bold text-rose-405 rounded hover:bg-rose-500/20 text-sm flex items-center gap-2 transition-all">
                       <Upload className="w-4 h-4" /> Restore Backup
                     </button>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "claims" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Claim Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('enable_claims', 'true') === 'true'} onChange={e => updateSetting('enable_claims', e.target.checked ? 'true' : 'false', 'claims')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Enable page claim system</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('manual_claim_approval', 'true') === 'true'} onChange={e => updateSetting('manual_claim_approval', e.target.checked ? 'true' : 'false', 'claims')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Manual approval only</span>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-6 mt-6">
                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Official FB Page URL (For claims verification)</label>
                   <input type="text" value={getSettingValue('official_fb_url', 'https://facebook.com/OfficialFBPageReview')} onChange={e => updateSetting('official_fb_url', e.target.value, 'claims')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Claim Instruction Text</label>
                   <textarea rows={3} value={getSettingValue('claim_instructions', 'To claim this page, send your FB Page Review username from your official Facebook page to our FB Page Review Facebook page inbox.')} onChange={e => updateSetting('claim_instructions', e.target.value, 'claims')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"></textarea>
                </div>
              </div>
            </div>
          )}

          {activeTab === "contact-numbers" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">bKash / Contact Number Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('allow_bkash', 'true') === 'true'} onChange={e => updateSetting('allow_bkash', e.target.checked ? 'true' : 'false', 'contact-numbers')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Allow bKash number submission</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('allow_nagad', 'true') === 'true'} onChange={e => updateSetting('allow_nagad', e.target.checked ? 'true' : 'false', 'contact-numbers')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Allow Nagad number submission</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('show_publicly', 'true') === 'true'} onChange={e => updateSetting('show_publicly', e.target.checked ? 'true' : 'false', 'contact-numbers')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Show numbers publicly</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={getSettingValue('mask_numbers', 'true') === 'true'} onChange={e => updateSetting('mask_numbers', e.target.checked ? 'true' : 'false', 'contact-numbers')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                  <span className="font-bold text-slate-300">Mask numbers publicly (e.g., 01XXX-XXX-123)</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "blog-seo" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Blog & SEO Settings</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Default Meta Title</label>
                   <input type="text" value={getSettingValue('meta_title', 'FB Page Review | Check before you pay')} onChange={e => updateSetting('meta_title', e.target.value, 'blog-seo')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Default Meta Description</label>
                   <textarea rows={2} value={getSettingValue('meta_desc', 'Verify Facebook pages and bKash numbers to avoid fraud. Read trusted reviews.')} onChange={e => updateSetting('meta_desc', e.target.value, 'blog-seo')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"></textarea>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-300 mb-1">Page Profile SEO Title Format</label>
                   <input type="text" value={getSettingValue('seo_profile_format', '{page_name} Reviews, Rating & Fraud Reports')} onChange={e => updateSetting('seo_profile_format', e.target.value, 'blog-seo')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Notification Settings</h2>
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                     <h3 className="font-bold text-slate-200">Admin Email Notifications</h3>
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={getSettingValue('notify_new_review', 'true') === 'true'} onChange={e => updateSetting('notify_new_review', e.target.checked ? 'true' : 'false', 'notifications')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                        <span className="text-sm font-bold text-slate-300">New review submitted</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={getSettingValue('notify_fraud_report', 'true') === 'true'} onChange={e => updateSetting('notify_fraud_report', e.target.checked ? 'true' : 'false', 'notifications')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                        <span className="text-sm font-bold text-slate-300">New fraud report submitted</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={getSettingValue('notify_page_claim', 'true') === 'true'} onChange={e => updateSetting('notify_page_claim', e.target.checked ? 'true' : 'false', 'notifications')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                        <span className="text-sm font-bold text-slate-300">New page claim request</span>
                     </label>
                   </div>
                   <div className="space-y-4">
                      <h3 className="font-bold text-slate-200">System Emails</h3>
                      <div>
                         <label className="block text-sm font-bold text-slate-300 mb-1">From Email Address</label>
                         <input type="email" value={getSettingValue('system_from_email', 'noreply@fbpagereview.com')} onChange={e => updateSetting('system_from_email', e.target.value, 'notifications')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                      </div>
                      <div>
                         <label className="block text-sm font-bold text-slate-300 mb-1">From Name</label>
                         <input type="text" value={getSettingValue('system_from_name', 'FB Page Review Admin')} onChange={e => updateSetting('system_from_name', e.target.value, 'notifications')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                      </div>
                   </div>
                </div>
             </div>
          )}          {activeTab === "smtp" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">SMTP Email Configuration (Namecheap)</h2>
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
                   <div className="md:col-span-2">
                        <p className="text-sm text-slate-400">Configure your Namecheap Private Email or other SMTP settings to enable forgot password features and system emails.</p>
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-300 mb-1">SMTP Host</label>
                      <input type="text" value={getSettingValue('smtp_host', 'mail.privateemail.com')} onChange={e => updateSetting('smtp_host', e.target.value, 'smtp')} placeholder="mail.privateemail.com" className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-300 mb-1">SMTP Port</label>
                      <input type="number" value={getSettingValue('smtp_port', '465')} onChange={e => updateSetting('smtp_port', e.target.value, 'smtp')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div>
                      <label className="flex items-center gap-3 cursor-pointer pt-8">
                        <input type="checkbox" checked={getSettingValue('smtp_secure', 'true') === 'true'} onChange={e => updateSetting('smtp_secure', e.target.checked ? 'true' : 'false', 'smtp')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                        <span className="text-sm font-bold text-slate-300">Use SSL/TLS (Secure)</span>
                      </label>
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-300 mb-1">SMTP Username (Email Address)</label>
                      <input type="text" value={getSettingValue('smtp_user', '')} onChange={e => updateSetting('smtp_user', e.target.value, 'smtp')} placeholder="you@yourdomain.com" className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-300 mb-1">SMTP Password</label>
                      <input type="password" value={getSettingValue('smtp_pass', '')} onChange={e => updateSetting('smtp_pass', e.target.value, 'smtp')} placeholder="********" className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-300 mb-1">From Name & Email Fallback</label>
                      <p className="text-xs text-slate-400 mb-2">Configure these under the Notifications tab over System Emails.</p>
                   </div>
                </div>
             </div>
          )}

          {activeTab === "security" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Security Settings</h2>
                <div className="space-y-4 max-w-sm">
                   <div>
                      <label className="block text-sm font-bold text-slate-300 mb-1">Login Attempt Limit</label>
                      <input type="number" value={getSettingValue('login_attempts', '5')} onChange={e => updateSetting('login_attempts', e.target.value, 'security')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-300 mb-1">Lockout Duration (Minutes)</label>
                      <input type="number" value={getSettingValue('lockout_duration', '15')} onChange={e => updateSetting('lockout_duration', e.target.value, 'security')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-300 mb-1">Minimum Password Length</label>
                      <input type="number" value={getSettingValue('min_password_length', '8')} onChange={e => updateSetting('min_password_length', e.target.value, 'security')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <label className="flex items-center gap-3 cursor-pointer pt-2">
                     <input type="checkbox" checked={getSettingValue('require_strong_password', 'true') === 'true'} onChange={e => updateSetting('require_strong_password', e.target.checked ? 'true' : 'false', 'security')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                     <span className="text-sm font-bold text-slate-300">Require strong password (Uppercase, Number, Special Char)</span>
                   </label>
                </div>
             </div>
          )}

          {activeTab === "roles-permissions" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Roles & Permissions</h2>
                <div className="bg-[#050b18]/45 border border-white/5 rounded-lg p-6">
                   <p className="font-bold text-slate-200 mb-2">Role Management Details</p>
                   <ul className="list-disc list-inside text-sm text-slate-350 space-y-1">
                      <li><b>Super Admin:</b> Full access to all settings and deletion capabilities.</li>
                      <li><b>Admin:</b> Cannot modify security settings or delete Super Admins.</li>
                      <li><b>Moderator:</b> Can approve reviews and claims, but no settings access.</li>
                   </ul>
                </div>
             </div>
          )}

          {activeTab === "import-export" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Import / Export Settings</h2>
                <div className="space-y-4">
                   <label className="flex items-center gap-3 cursor-pointer">
                     <input type="checkbox" checked={getSettingValue('enable_import', 'true') === 'true'} onChange={e => updateSetting('enable_import', e.target.checked ? 'true' : 'false', 'import-export')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                     <span className="text-sm font-bold text-slate-300">Enable bulk import from dashboard</span>
                   </label>
                   <label className="flex items-center gap-3 cursor-pointer">
                     <input type="checkbox" checked={getSettingValue('enable_export', 'true') === 'true'} onChange={e => updateSetting('enable_export', e.target.checked ? 'true' : 'false', 'import-export')} className="w-4 h-4 text-emerald-500 bg-[#050b18]/45 border-white/5 rounded" />
                     <span className="text-sm font-bold text-slate-300">Enable bulk export</span>
                   </label>
                   <div className="max-w-sm pt-2">
                      <label className="block text-sm font-bold text-slate-300 mb-1">Export Row Limit</label>
                      <input type="number" value={getSettingValue('export_limit', '50000')} onChange={e => updateSetting('export_limit', e.target.value, 'import-export')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                </div>
             </div>
          )}           {activeTab === "legal-policy" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Legal & Policy Settings</h2>
                <div className="grid grid-cols-1 gap-6">
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Global Review Disclaimer</label>
                     <textarea rows={3} value={getSettingValue('review_disclaimer', 'Reviews and reports are submitted by users. FB Page Review does not make final legal claims about any business or Facebook page. Users should review available evidence and make their own decision before buying or sending money.')} onChange={e => updateSetting('review_disclaimer', e.target.value, 'legal-policy')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none"></textarea>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Privacy Policy Link URL</label>
                     <input type="text" value={getSettingValue('privacy_url', '/privacy-policy')} onChange={e => updateSetting('privacy_url', e.target.value, 'legal-policy')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Terms of Service Link URL</label>
                     <input type="text" value={getSettingValue('terms_url', '/terms-of-service')} onChange={e => updateSetting('terms_url', e.target.value, 'legal-policy')} className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                   </div>
                </div>
             </div>
          )}

          {activeTab === "advertising" && (
             <div className="space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Advertising & Verification Settings</h2>
                <p className="text-sm text-slate-400">
                  Manage scripts, ads, and verification tags from Google AdSense, Adsterra, or other networks.
                </p>
                <div className="grid grid-cols-1 gap-6">
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Verify Site Ownership / Head Code (Google AdSense Code snippet, Ads.txt snippet, Meta tag)</label>
                     <textarea rows={6} value={getSettingValue('head_verification_code', '')} onChange={e => updateSetting('head_verification_code', e.target.value, 'advertising', 'textarea', 'Verification code snippet / script pasted between <head></head> tags')} className="w-full border border-white/5 bg-[#050b18]/45 text-[#00ffcc] font-mono text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="e.g. <script async src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js...'></script> or <meta name='google-site-verification' ... />" />
                     <p className="text-xs text-slate-500 mt-1">To get your site ready to show ads, copy and paste your AdSense verification code snippet or site ownership meta tags here. It will automatically load on all pages.</p>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Profile Page Left Sidebar Adsterra Banner Ad Code (160x600 Skyscraper)</label>
                     <textarea rows={6} value={getSettingValue('profile_sidebar_adsterra_code', '')} onChange={e => updateSetting('profile_sidebar_adsterra_code', e.target.value, 'advertising', 'textarea', 'Adsterra vertical skyscraper ad code for the profile page sidebar')} className="w-full border border-white/5 bg-[#050b18]/45 text-[#00ffcc] font-mono text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="e.g. <script type='text/javascript'>...</script> or <iframe src='...'></iframe>" />
                     <p className="text-xs text-slate-500 mt-1">Paste the exact HTML or Javascript snippet (typically 160x600 size) provided by your Adsterra publisher dashboard.</p>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Homepage Adsterra Banner Ad Code (HTML / Script / iframe)</label>
                     <textarea rows={6} value={getSettingValue('homepage_adsterra_code', '')} onChange={e => updateSetting('homepage_adsterra_code', e.target.value, 'advertising', 'textarea', 'Adsterra banner ad code for the homepage')} className="w-full border border-white/5 bg-[#050b18]/45 text-[#00ffcc] font-mono text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="e.g. <script type='text/javascript'>...</script> or <iframe src='...'></iframe>" />
                     <p className="text-xs text-slate-500 mt-1">Paste the exact HTML or Javascript snippet provided by your Adsterra publisher dashboard.</p>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-300 mb-1">Google AdSense Banner Ad Code (HTML / Script)</label>
                     <textarea rows={6} value={getSettingValue('homepage_adsense_code', '')} onChange={e => updateSetting('homepage_adsense_code', e.target.value, 'advertising', 'textarea', 'Google AdSense banner ad code for the homepage')} className="w-full border border-white/5 bg-[#050b18]/45 text-[#00ffcc] font-mono text-xs rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="e.g. <script async src='https://pagead2.googlesyndication.com...'></script><ins class='adsbygoogle' ...></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>" />
                     <p className="text-xs text-slate-500 mt-1">Paste your auto-ads script snippet or custom custom display ad block code from your AdSense console.</p>
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
