import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { 
  Link2, 
  Building, 
  ShieldCheck, 
  Shield, 
  Mail, 
  Facebook, 
  Headphones, 
  ChevronRight, 
  ChevronDown, 
  Lock 
} from 'lucide-react';

export default function Footer() {
  const [settings, setSettings] = useState<any>({});
  
  // Accordion state for mobile view
  const [openSections, setOpenSections] = useState({
    quickLinks: false,
    company: false,
    safety: false,
  });

  useEffect(() => {
    fetch('/api/public-settings')
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {};
      })
      .then(data => {
        setSettings(data);
      })
      .catch(() => {});
  }, []);

  const toggleSection = (section: 'quickLinks' | 'company' | 'safety') => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Safe fallback values
  const fbDisplayUrl = settings.facebook_page_url 
    ? settings.facebook_page_url.replace(/^https?:\/\/(www\.)?/, '') 
    : 'facebook.com/fbpagereview';
    
  const fbTargetUrl = settings.facebook_page_url || 'https://facebook.com/fbpagereview';
    
  const emailDisplay = settings.contact_email || 'support@fbpagereview.com';

  return (
    <footer className="bg-[#fcfdfd] border-t border-slate-100 pt-16 shrink-0 mt-auto select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================= DESKTOP FOOTER (lg and up) ================= */}
        <div className="hidden lg:grid grid-cols-12 gap-8 mb-16 items-stretch">
          
          {/* Left Block: FB Page Review Brand Card */}
          <div className="col-span-3 h-full flex flex-col">
            <div className="bg-[#f4fbf7] border border-[#e2f0e9] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-full shadow-3xs">
              
              {/* Decorative concentric arches in bottom right */}
              <svg className="absolute bottom-0 right-0 w-32 h-32 text-emerald-500/10 pointer-events-none translate-x-4 translate-y-4" viewBox="0 0 100 100" fill="none">
                <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="5" />
                <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="5" />
                <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="5" />
              </svg>

              <div>
                <Link to="/" className="flex items-center gap-3 mb-5 group">
                  {settings.site_logo ? (
                    <img
                      src={settings.site_logo}
                      alt={settings.site_name || "Logo"}
                      referrerPolicy="no-referrer"
                      className="max-h-12 max-w-[160px] object-contain select-none"
                    />
                  ) : (
                    <>
                      <div className="w-11 h-11 shrink-0 bg-[#0fbc6f] rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-xs select-none group-hover:bg-[#0da662] transition-colors">
                        {(settings.site_name || "FB Page Review").charAt(0)}
                      </div>
                      <span className="text-[20px] font-black tracking-tight text-slate-900 select-none">
                        {settings.site_name ? (
                          settings.site_name
                        ) : (
                          <>
                            FB <span className="text-[#0fbc6f]">Page Review</span>
                          </>
                        )}
                      </span>
                    </>
                  )}
                </Link>
                
                <p className="text-slate-600 text-[13.5px] leading-relaxed mb-6 font-medium">
                  {settings.footer_desc || "FB Page Review helps users check Facebook pages, seller profiles, reviews, fraud reports, and payment numbers before buying online."}
                </p>
              </div>

              {/* Trusted Banner */}
              <div className="flex items-center gap-3 mt-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#0fbc6f] shrink-0 shadow-3xs border border-[#bbf2d4]/30">
                  <ShieldCheck className="w-5 h-5 text-[#0fbc6f]" />
                </div>
                <p className="text-slate-600 text-[12px] font-bold leading-tight">
                  Trusted by thousands of <br />
                  users to <span className="text-[#0fbc6f] font-extrabold">shop safely.</span>
                </p>
              </div>

            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="col-span-2 h-full flex flex-col justify-start">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#0fbc6f] shadow-3xs">
                  <Link2 className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-[12px] tracking-widest text-slate-800 uppercase">Quick Links</span>
                  <div className="h-[2px] bg-[#0fbc6f] w-8 mt-1.5 rounded-full" />
                </div>
              </div>
              
              <ul className="flex flex-col">
                <li className="border-b border-slate-100">
                  <Link to="/" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Home</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0fbc6f] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/write-review" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Write a Review</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0fbc6f] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/business" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Claim Your Page</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0fbc6f] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/blog" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Blog</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0fbc6f] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 3: Company */}
          <div className="col-span-2 h-full flex flex-col justify-start">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb] shadow-3xs">
                  <Building className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-[12px] tracking-widest text-slate-800 uppercase">Company</span>
                  <div className="h-[2px] bg-[#2563eb] w-8 mt-1.5 rounded-full" />
                </div>
              </div>

              <ul className="flex flex-col">
                <li className="border-b border-slate-100">
                  <Link to="/about" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>About Us</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/contact" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Contact Us</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/privacy-policy" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Privacy Policy</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/terms" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Terms & Conditions</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/disclaimer" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Disclaimer</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563eb] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 4: Safety */}
          <div className="col-span-2 h-full flex flex-col justify-start">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#ef4444] shadow-3xs">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-[12px] tracking-widest text-slate-800 uppercase">Safety</span>
                  <div className="h-[2px] bg-[#ef4444] w-8 mt-1.5 rounded-full" />
                </div>
              </div>

              <ul className="flex flex-col">
                <li className="border-b border-slate-100">
                  <Link to="/write-review?type=fraud" className="py-3 flex items-center justify-between group text-[13.5px] text-[#ef4444] hover:text-red-700 transition-colors font-bold">
                    <span>Report a Fraud Page</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#ef4444] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/review-guidelines" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Review Guidelines</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#ef4444] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/how-reviews-work" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>How Reviews Work</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#ef4444] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/dispute-policy" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Dispute Policy</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#ef4444] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
                <li className="border-b border-slate-100">
                  <Link to="/content-removal-policy" className="py-3 flex items-center justify-between group text-[13.5px] text-slate-600 hover:text-slate-900 transition-colors font-semibold">
                    <span>Content Removal Policy</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#ef4444] group-hover:translate-x-1 transition-all" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Column 5: Need Help Card */}
          <div className="col-span-3 h-full flex flex-col">
            <div className="bg-[#f0f5ff] border border-[#e2ebf8] rounded-3xl p-6 flex flex-col justify-between h-full shadow-3xs">
              <div>
                <div className="w-11 h-11 bg-[#0b1329] rounded-2xl flex items-center justify-center text-white mb-4 shadow-sm shrink-0">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                
                <h3 className="font-extrabold text-slate-950 text-[15px] tracking-tight">Need Help?</h3>
                <p className="text-slate-600 text-[13px] leading-relaxed mt-1 font-medium">
                  We're here to help you shop with confidence.
                </p>

                <div className="border-t border-[#dce4f4] my-4"></div>

                <div className="space-y-4">
                  {/* Email block */}
                  <a href={`mailto:${emailDisplay}`} className="flex items-center gap-3 hover:opacity-95 block">
                    <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#0fbc6f] shrink-0 border border-[#bbf2d4]/30 shadow-3xs">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-slate-500 font-extrabold text-[10.5px] tracking-wider uppercase">Email Us</p>
                      <span className="text-[#0fbc6f] font-extrabold text-[12.5px] hover:underline block truncate max-w-[160px]">
                        {emailDisplay}
                      </span>
                    </div>
                  </a>

                  {/* Facebook block */}
                  <a 
                    href={fbTargetUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 group/fb hover:opacity-90 block"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb] shrink-0 border border-[#d6e4ff]/30 shadow-3xs group-hover/fb:bg-[#e0ebff] transition-colors">
                      <Facebook className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-500 font-extrabold text-[10.5px] tracking-wider uppercase group-hover/fb:text-[#2563eb] transition-colors">Follow Us</p>
                      <span className="text-[#2563eb] font-extrabold text-[12.5px] truncate block max-w-[160px] group-hover/fb:underline">
                        {fbDisplayUrl}
                      </span>
                    </div>
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ================= MOBILE FOOTER (under lg screens) ================= */}
        <div className="block lg:hidden space-y-6 mb-12">
          
          {/* Brand Card Block inside Mobile */}
          <div className="bg-[#f4fbf7] border border-[#e2f0e9] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-3xs">
            {/* Decorative concentric arches */}
            <svg className="absolute bottom-0 right-0 w-28 h-28 text-emerald-500/10 pointer-events-none translate-x-4 translate-y-4" viewBox="0 0 100 100" fill="none">
              <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="6" />
              <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="6" />
              <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="6" />
            </svg>

            <div>
              <Link to="/" className="flex items-center gap-3 mb-4 group">
                {settings.site_logo ? (
                  <img
                    src={settings.site_logo}
                    alt={settings.site_name || "Logo"}
                    referrerPolicy="no-referrer"
                    className="max-h-11 max-w-[140px] object-contain select-none"
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 shrink-0 bg-[#0fbc6f] rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-xs">
                      {(settings.site_name || "FB Page Review").charAt(0)}
                    </div>
                    <span className="text-[19px] font-black tracking-tight text-slate-900">
                      {settings.site_name ? (
                        settings.site_name
                      ) : (
                        <>
                          FB <span className="text-[#0fbc6f]">Page Review</span>
                        </>
                      )}
                    </span>
                  </>
                )}
              </Link>
              
              <p className="text-slate-600 text-[13px] leading-relaxed mb-5 font-medium">
                {settings.footer_desc || "FB Page Review helps users check Facebook pages, seller profiles, reviews, fraud reports, and payment numbers before buying online."}
              </p>
            </div>

            {/* Trusted Stamp */}
            <div className="flex items-center gap-3 mt-5 relative z-10">
              <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#0fbc6f] shrink-0 border border-[#bbf2d4]/30 shadow-3xs">
                <ShieldCheck className="w-4.5 h-4.5 text-[#0fbc6f]" />
              </div>
              <p className="text-slate-600 text-[11.5px] font-bold leading-tight">
                Trusted by thousands of users <br />
                to <span className="text-[#0fbc6f] font-extrabold">shop safely.</span>
              </p>
            </div>
          </div>

          {/* Links Accordions Container */}
          <div className="space-y-3">
            
            {/* Quick Links Accordion */}
            <div className="border border-slate-200/60 rounded-2xl bg-white overflow-hidden shadow-3xs transition-all">
              <button 
                onClick={() => toggleSection('quickLinks')}
                className="w-full flex items-center justify-between p-4 cursor-pointer outline-none select-none bg-white font-sans text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#0fbc6f]">
                    <Link2 className="w-4.5 h-4.5" />
                  </div>
                  <span className="font-extrabold text-[12.5px] tracking-wider text-slate-800 uppercase">Quick Links</span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openSections.quickLinks ? 'rotate-180 text-slate-700' : ''}`} 
                />
              </button>
              
              {openSections.quickLinks && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50">
                  <ul className="flex flex-col">
                    <li className="border-b border-slate-100">
                      <Link to="/" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Home</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/write-review" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Write a Review</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/business" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Claim Your Page</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/blog" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Blog</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Company Accordion */}
            <div className="border border-slate-200/60 rounded-2xl bg-white overflow-hidden shadow-3xs transition-all">
              <button 
                onClick={() => toggleSection('company')}
                className="w-full flex items-center justify-between p-4 cursor-pointer outline-none select-none bg-white font-sans text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb]">
                    <Building className="w-4.5 h-4.5" />
                  </div>
                  <span className="font-extrabold text-[12.5px] tracking-wider text-slate-800 uppercase">Company</span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openSections.company ? 'rotate-180 text-slate-700' : ''}`} 
                />
              </button>
              
              {openSections.company && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50">
                  <ul className="flex flex-col">
                    <li className="border-b border-slate-100">
                      <Link to="/about" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>About Us</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/contact" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Contact Us</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/privacy-policy" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Privacy Policy</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/terms" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Terms & Conditions</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/disclaimer" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Disclaimer</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Safety Accordion */}
            <div className="border border-slate-200/60 rounded-2xl bg-white overflow-hidden shadow-3xs transition-all">
              <button 
                onClick={() => toggleSection('safety')}
                className="w-full flex items-center justify-between p-4 cursor-pointer outline-none select-none bg-white font-sans text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#fef2f2] flex items-center justify-center text-[#ef4444]">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <span className="font-extrabold text-[12.5px] tracking-wider text-slate-800 uppercase">Safety</span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openSections.safety ? 'rotate-180 text-slate-700' : ''}`} 
                />
              </button>
              
              {openSections.safety && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50">
                  <ul className="flex flex-col">
                    <li className="border-b border-slate-100">
                      <Link to="/write-review?type=fraud" className="py-3 flex items-center justify-between group text-[13px] text-[#ef4444] hover:text-red-700 font-bold">
                        <span>Report a Fraud Page</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/review-guidelines" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Review Guidelines</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/how-reviews-work" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>How Reviews Work</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/dispute-policy" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Dispute Policy</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                    <li className="border-b border-slate-100">
                      <Link to="/content-removal-policy" className="py-3 flex items-center justify-between group text-[13px] text-slate-600 hover:text-slate-900 font-semibold">
                        <span>Content Removal Policy</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>

          </div>

          {/* Need Help Card on Mobile */}
          <div className="bg-[#f0f5ff] border border-[#e2ebf8] rounded-2xl p-5 shadow-3xs">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#0b1329] rounded-2xl flex items-center justify-center text-white shrink-0">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-[14.5px] text-slate-950">Need Help?</h3>
                <p className="text-slate-600 text-[12px] font-medium leading-tight mt-0.5">We're here to help you shop with confidence.</p>
              </div>
            </div>

            <div className="border-t border-[#dce4f4] my-4"></div>

            <div className="space-y-3.5">
              
              {/* Email Us */}
              <a href={`mailto:${emailDisplay}`} className="flex items-center justify-between bg-white/50 hover:bg-white border border-slate-100 rounded-xl p-3.5 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#e6f7ef] flex items-center justify-center text-[#0fbc6f] shrink-0 border border-[#bbf2d4]/30 shadow-3xs">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Email Us</p>
                    <p className="text-[#0fbc6f] font-extrabold text-[12.5px] mt-0.5">{emailDisplay}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0fbc6f] group-hover:translate-x-0.5 transition-all" />
              </a>

              {/* Follow Us */}
              <a href={fbTargetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-white/50 hover:bg-white border border-slate-100 rounded-xl p-3.5 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#2563eb] shrink-0 border border-[#d6e4ff]/30 shadow-3xs">
                    <Facebook className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Follow Us</p>
                    <p className="text-[#2563eb] font-extrabold text-[12.5px] mt-0.5">{fbDisplayUrl}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
              </a>

            </div>

          </div>

        </div>

      </div>

      {/* ================= BOTTOM DEEP NAVY SUB-BAR ================= */}
      <div className="bg-[#03132e] border-t-3 sm:border-t-4 border-[#0fbc6f] text-slate-300 py-6 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Left Block: Check Shield & Copyright */}
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0fbc6f] shrink-0" />
              <p className="text-[12.5px] text-white/90 font-bold tracking-normal">
                &copy; 2026 <span className="text-[#0fbc6f] font-black">FB Page Review BD</span>. All rights reserved.
              </p>
            </div>

            {/* Right Block: Lock & Legal Disclaimer sentence (align in same line) */}
            <div className="flex items-center gap-3 lg:max-w-2xl">
              <Lock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              <p className="text-[12.5px] text-slate-400 font-semibold leading-normal">
                For support, corrections, or business inquiries, contact us by email or Facebook.
              </p>
            </div>

          </div>

        </div>
      </div>

    </footer>
  );
}
