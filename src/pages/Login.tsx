import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MessageSquare, BarChart3, User, Lock, Users, ChevronRight, Eye, EyeOff, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { t, n } = useLanguage();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_or_username: emailOrUsername, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      login(data.token, data.user);
      
      const isBusiness = location.pathname.startsWith('/business');
      let defaultRedirect = '/dashboard';
      if (isBusiness) {
        defaultRedirect = ['owner', 'page_owner', 'admin', 'super_admin'].includes(data.user.role) ? '/business-dashboard' : '/business-dashboard';
      }
      
      const from = location.state?.from || defaultRedirect;
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isBusiness = location.pathname.startsWith('/business');
  const forgotPasswordLink = isBusiness ? '/business/forgot-password' : '/forgot-password';
  const registerLink = isBusiness ? '/business/register' : '/register';

  if (isBusiness) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-16 md:py-24 relative select-none flex-1 flex flex-col items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute left-[-15%] top-[20%] w-[450px] h-[450px] rounded-full bg-blue-200/40 mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none hidden lg:block" />
        
        <div className="absolute right-[-50px] top-[15%] w-48 h-48 opacity-25 pointer-events-none hidden lg:block select-none">
          <div className="grid grid-cols-6 gap-3.5">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-3xl overflow-hidden shadow-sm w-full max-w-5.2xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
            {/* LEFT COLUMN: Features List */}
            <div className="lg:col-span-6 p-8 sm:p-12 bg-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
              <div>
                <h1 className="text-[32px] font-black text-[#0f172a] tracking-tight leading-tight">{t("Business Log In")}</h1>
                <p className="text-slate-500 text-[14.5px] leading-relaxed mt-3.5 font-medium max-w-md">
                  {t("Secure access to your Facebook Page Review business dashboard and tools.")}
                </p>
                
                {/* Visual Accent Green Bar */}
                <div className="w-11 h-1 bg-[#10b981] rounded-full mt-6 mb-8" />
                
                {/* Desktop layout features list */}
                <div className="space-y-6">
                  {/* Item 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#10b981] shrink-0 mt-0.5 shadow-3xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15.5px] font-bold text-slate-900">{t("Claimed Page Management")}</h3>
                      <p className="text-slate-500 text-[13.5px] leading-relaxed mt-1 font-medium">
                        {t("Manage and verify your claimed pages with ease.")}
                      </p>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#10b981] shrink-0 mt-0.5 shadow-3xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15.5px] font-bold text-slate-900">{t("Reply to Reviews")}</h3>
                      <p className="text-slate-500 text-[13.5px] leading-relaxed mt-1 font-medium">
                        {t("Engage with customers by replying to reviews directly.")}
                      </p>
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#10b981] shrink-0 mt-0.5 shadow-3xs">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15.5px] font-bold text-slate-900">{t("Business Dashboard")}</h3>
                      <p className="text-slate-500 text-[13.5px] leading-relaxed mt-1 font-medium">
                        {t("Track performance, insights, and activity in one place.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Business Login Form */}
            <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center">
              <div className="lg:hidden mb-6">
                <h1 className="text-2xl font-black text-slate-900">{t("Business Log In")}</h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  {t("Secure access to your Facebook Page Review business dashboard and tools.")}
                </p>
                
                {/* Visual Accent Green Bar */}
                <div className="w-11 h-1 bg-[#10b981] rounded-full mt-3.5 mb-2" />
              </div>

              {error && (
                <div className="bg-rose-50 text-rose-600 text-[13.5px] font-bold p-3.5 rounded-xl mb-6 border border-rose-100">
                  {t(error)}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4.5 text-left">
                {/* Email input */}
                <div>
                  <label className="block text-[13px] font-extrabold text-[#0f172a] mb-1.5">{t("Email or Username")}</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      placeholder={t("Enter email or username")}
                      value={emailOrUsername}
                      onChange={e => setEmailOrUsername(e.target.value)}
                      className="w-full border border-slate-200/90 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] font-medium text-slate-900 bg-slate-50/40 text-[13.5px] transition-all placeholder:text-slate-400" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450">
                      <User className="w-4.5 h-4.5" />
                    </div>
                  </div>
                </div>

                {/* Password input */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-[13px] font-extrabold text-[#0f172a] mb-1.5">{t("Password")}</label>
                    <Link to={forgotPasswordLink} className="text-[12px] text-[#10b981] font-extrabold hover:underline transition-colors pb-1.5">
                      {t("Forgot password?")}
                    </Link>
                  </div>
                  <div className="relative">
                    <input 
                      required
                      type={showPassword ? "text" : "password"} 
                      placeholder={t("Enter your password")}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border border-slate-200/90 rounded-xl pl-11 pr-11 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] font-medium text-slate-900 bg-slate-50/40 text-[13.5px] transition-all placeholder:text-slate-400" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450">
                      <Lock className="w-4.5 h-4.5" />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Log In Button */}
                <button 
                  disabled={loading} 
                  type="submit" 
                  className="w-full bg-[#0b1329] hover:bg-slate-900 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>{loading ? t('Logging in...') : t('Log In')}</span>
                </button>
              </form>

              {/* Or divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3 text-slate-400 font-extrabold text-[12px] uppercase tracking-wider">{t("or")}</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Signup Link */}
              <p className="text-center text-[13.5px] text-slate-500 font-bold">
                {t("Don't have an account?")}{' '}
                <Link to={registerLink} className="text-[#10b981] font-extrabold hover:underline">
                  {t("Sign Up")}
                </Link>
              </p>

              {/* Switching back to regular user */}
              <Link 
                to="/login" 
                className="mt-6 flex items-center justify-between p-4 bg-[#e6f7ef] hover:bg-[#dbf3e7] border border-[#bbf2d4]/50 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#10b981]/15 flex items-center justify-center text-[#10b981] shrink-0">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[#064e3b] font-bold text-[12.5px] leading-tight">{t("Not a business owner?")}</p>
                    <p className="text-[#059669] font-extrabold text-[13px] hover:underline mt-0.5">{t("Log in as a regular user")}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#10b981] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Features List Container */}
        <div className="w-full mt-6 bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-3xs space-y-4 lg:hidden">
          <div className="border-b border-slate-100 pb-3 mb-2">
            <h3 className="font-extrabold text-slate-900 text-sm">{t("Why FB Page Review for Business?")}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between group py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#10b981] shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h4 className="text-[13.5px] font-bold text-slate-900">{t("Claimed Page Management")}</h4>
                  <p className="text-slate-500 text-[11.5px] font-medium leading-normal mt-0.5">{t("Manage and verify your claimed pages with ease.")}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>

            <div className="flex items-center justify-between group py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#10b981] shrink-0">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h4 className="text-[13.5px] font-bold text-slate-900">{t("Reply to Reviews")}</h4>
                  <p className="text-slate-500 text-[11.5px] font-medium leading-normal mt-0.5">{t("Engage with customers by replying to reviews directly.")}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>

            <div className="flex items-center justify-between group py-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#10b981] shrink-0">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h4 className="text-[13.5px] font-bold text-slate-900">{t("Business Dashboard")}</h4>
                  <p className="text-slate-500 text-[11.5px] font-medium leading-normal mt-0.5">{t("Track performance, insights, and activity in one place.")}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular login layout styling
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-16 lg:py-20 relative select-none flex-1 flex flex-col justify-center">
      {/* Background blobs for realistic visual quality */}
      <div className="absolute left-[-10%] top-[10%] w-[380px] h-[380px] rounded-full bg-emerald-100/35 mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none hidden lg:block" />
      <div className="absolute right-[-10%] bottom-[10%] w-[380px] h-[380px] rounded-full bg-emerald-100/35 mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none hidden lg:block" />
      
      {/* Two Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center relative z-10 w-full">
        
        {/* LEFT COLUMN: Graphic Presentation & Features - Hidden on mobile view */}
        <div className="lg:col-span-6 space-y-8 text-left hidden lg:block">
          <div>
            <h1 className="text-4xl lg:text-5.5.xl font-black text-slate-900 tracking-tight leading-none">
              {t("Join the community")}<br />
              <span className="text-[#10b981]">{t("that shops smarter.")}</span>
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed mt-4 max-w-lg font-medium">
              {t("FB Page Review helps you check Facebook pages, share real experiences, and protect others from scams.")}
            </p>
          </div>

          {/* Feature Badges in dynamic wrapped layout */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2.5 bg-[#f4fbf7] border border-[#bbf2d4]/40 px-3.5 py-2 rounded-full shadow-3xs">
              <div className="w-7 h-7 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-600 font-medium">
                <strong className="text-slate-900 font-bold">{t("Detect")}</strong> {t("risky Facebook pages")}
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-[#f4fbf7] border border-[#bbf2d4]/40 px-3.5 py-2 rounded-full shadow-3xs">
              <div className="w-7 h-7 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-600 font-medium">
                <strong className="text-slate-900 font-bold">{t("Real reviews")}</strong> {t("from verified users")}
              </span>
            </div>

            <div className="flex items-center gap-2.5 bg-[#f4fbf7] border border-[#bbf2d4]/40 px-3.5 py-2 rounded-full shadow-3xs">
              <div className="w-7 h-7 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-600 font-medium">
                <strong className="text-slate-900 font-bold">{t("Help build")}</strong> {t("a safer community")}
              </span>
            </div>
          </div>

          {/* Brand/Merchant trust cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/20 transition-all">
              <div className="flex justify-between items-start mb-2.5">
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 rounded-full">{t("Trusted")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-950 flex items-center justify-center text-white font-black text-[11px] shrink-0">LW</div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">LuxeWear</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">@luxewear.fashion</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-50 text-[10px] font-bold text-slate-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span>{n(4.8)}</span>
                <span className="text-slate-400 font-normal">({n(256)})</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/20 transition-all">
              <div className="flex justify-between items-start mb-2.5">
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/10 text-amber-600 rounded-full">{t("Caution")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#10b981]/10 flex items-center justify-center text-rose-500 font-black text-[11px] shrink-0">GH</div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">Gizmo Hub</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">@gizmohub.store</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-50 text-[10px] font-bold text-slate-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span>{n(3.1)}</span>
                <span className="text-slate-400 font-normal">({n(42)})</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-rose-500/20 transition-all">
              <div className="flex justify-between items-start mb-2.5">
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-500/10 text-rose-600 rounded-full">{t("High Risk")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-[11px] shrink-0">MD</div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">Mega Deals</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">@megadeals.shop</p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-50 text-[10px] font-bold text-slate-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span>{n(1.2)}</span>
                <span className="text-slate-400 font-normal">({n(18)})</span>
              </div>
            </div>
          </div>

          {/* Review Quotation block */}
          <div className="bg-[#f0fdf4]/65 border border-emerald-500/15 rounded-2xl p-5 sm:p-6 shadow-3xs">
            <div className="text-[#10b981] font-black text-4xl leading-none font-serif select-none mb-2">“</div>
            <p className="text-slate-700 font-semibold text-[14.5px] leading-relaxed">
              {t("FB Page Review saved me from a scam. Now I always check before I buy!")}
            </p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#10b981]/15 text-[#10b981] font-black flex items-center justify-center text-xs shrink-0">JD</div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">{t("Jane D.")}</h5>
                  <span className="text-[#10b981] font-extrabold text-[9px] tracking-wider uppercase block mt-0.5">{t("Verified Reviewer")}</span>
                </div>
              </div>
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current text-[#10b981]" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Card */}
        <div className="lg:col-span-6 flex flex-col justify-center items-center w-full">
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 sm:p-10 shadow-xl w-full max-w-[480px]">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center sm:text-left">{t("Log In")}</h2>
            <p className="text-slate-450 text-sm font-medium mt-1 text-center sm:text-left">
              {t("Welcome back! Please enter your details.")}
            </p>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-xs font-bold p-3.5 rounded-xl mt-4 border border-rose-100 text-left block w-full">
                {t(error)}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4.5 text-left mt-6">
              {/* Email/Username */}
              <div>
                <label className="block text-[13px] font-extrabold text-[#0f172a] mb-1.5">{t("Email or Username")}</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    placeholder={t("Enter email or username")}
                    value={emailOrUsername}
                    onChange={e => setEmailOrUsername(e.target.value)}
                    className="w-full border border-slate-200/90 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] font-medium text-slate-900 bg-slate-50/40 text-[13.5px] transition-all placeholder:text-slate-400" 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-[13px] font-extrabold text-[#0f172a] mb-1.5">{t("Password")}</label>
                  <Link to={forgotPasswordLink} className="text-[12px] text-[#10b981] font-extrabold hover:underline transition-colors pb-1.5">
                    {t("Forgot password?")}
                  </Link>
                </div>
                <div className="relative">
                  <input 
                    required
                    type={showPassword ? "text" : "password"} 
                    placeholder={t("Enter your password")}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-slate-200/90 rounded-xl pl-11 pr-11 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-[#10b981] font-medium text-slate-900 bg-slate-50/40 text-[13.5px] transition-all placeholder:text-slate-400" 
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-455">
                    <Lock className="w-4.5 h-4.5" />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-455 hover:text-slate-655 outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                disabled={loading} 
                type="submit" 
                className="w-full bg-[#0b1329] hover:bg-slate-900 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-between px-6 text-sm shadow-sm cursor-pointer mt-5 group"
              >
                <span className="flex-1 text-center">{loading ? t('Logging in...') : t('Log In')}</span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </form>

            {/* Signup Link */}
            <p className="text-center text-[13.5px] text-slate-500 font-bold mt-6">
              {t("Don't have an account?")}{' '}
              <Link to={registerLink} className="text-[#10b981] font-extrabold hover:underline">
                {t("Sign Up")}
              </Link>
            </p>

            {/* Switching to business login */}
            <Link 
              to="/business/login" 
              className="mt-6 flex items-center justify-between p-3.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#10b981]/15 flex items-center justify-center text-[#10b981] shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="text-[#064e3b] font-bold text-[12px] leading-tight font-sans">{t("Are you a business owner?")}</p>
                  <p className="text-[#059669] font-extrabold text-[12px] hover:underline mt-0.5 font-sans">{t("Log in as a business owner")}</p>
                </div>
              </div>
              <ChevronRight className="w-4.5 h-4.5 text-[#10b981] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Simple compact Features indicator card on mobile view directly matching the wireframe */}
          <div className="w-full max-w-[480px] mt-6 bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm grid grid-cols-3 divide-x divide-slate-100 lg:hidden text-center z-10 relative">
            {/* Column 1 */}
            <div className="flex flex-col items-center px-1 justify-center">
              <div className="w-9 h-9 rounded-full bg-[#e6f7ef] text-[#10b981] flex items-center justify-center mb-2 shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[10.5px] font-extrabold text-slate-900 leading-tight">
                {t("Detect")}{' '}
                <span className="text-[10px] text-slate-500 font-medium">{t("risky")}</span>
              </h4>
              <p className="text-slate-555 text-[10px] font-medium leading-tight">{t("Facebook pages")}</p>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col items-center px-1 justify-center">
              <div className="w-9 h-9 rounded-full bg-[#e6f7ef] text-[#10b981] flex items-center justify-center mb-2 shrink-0">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[10.5px] font-extrabold text-slate-900 leading-tight">
                {t("Real reviews")}{' '}
                <span className="text-[10px] text-slate-500 font-medium">{t("from")}</span>
              </h4>
              <p className="text-slate-555 text-[10px] font-medium leading-tight">{t("verified users")}</p>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col items-center px-1 justify-center">
              <div className="w-9 h-9 rounded-full bg-[#e6f7ef] text-[#10b981] flex items-center justify-center mb-2 shrink-0">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-[10.5px] font-extrabold text-slate-900 leading-tight">
                {t("Help")}{' '}
                <span className="text-[10px] text-slate-500 font-medium">{t("build a safer")}</span>
              </h4>
              <p className="text-slate-555 text-[10px] font-medium leading-tight">{t("shopping community")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
