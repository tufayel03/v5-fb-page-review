import React, { useState, useEffect, useRef, Suspense } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Star,
  FileText,
  Phone,
  Users,
  ShieldCheck,
  MessageSquareWarning,
  Columns,
  FileEdit,
  Flag,
  Upload,
  Target,
  Settings,
  ScrollText,
  Menu,
  X,
  LogOut,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Sun,
  Moon,
  Mail,
  Image
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import RouteLoader from "../../components/RouteLoader";

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          return;
        }

        const data = await res.json();
        
        const notifs = [];
        if (data.pendingReviews > 0) notifs.push({ type: 'review', count: data.pendingReviews, message: 'Pending reviews need approval', link: '/tufayel/reviews' });
        if (data.openDisputes > 0) notifs.push({ type: 'dispute', count: data.openDisputes, message: 'Open disputes require action', link: '/tufayel/disputes' });
        if (data.pendingClaims > 0) notifs.push({ type: 'claim', count: data.pendingClaims, message: 'Pending page claims to verify', link: '/tufayel/page-claims' });
        if (data.pendingHighProfileFraudReports > 0) notifs.push({ type: 'fraud', count: data.pendingHighProfileFraudReports, message: 'High profile fraud reports pending', link: '/tufayel/reviews' });
        
        setNotifications(notifs);

        const lastViewedStr = localStorage.getItem('lastViewedNotifications');
        const lastViewed = lastViewedStr ? JSON.parse(lastViewedStr) : {};
        
        let unread = false;
        for (const n of notifs) {
            if (!lastViewed[n.type] || lastViewed[n.type] < n.count) {
                unread = true;
                break;
            }
        }
        setHasUnread(unread);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const allNavItems = [
    { name: "Dashboard", path: "/tufayel", icon: LayoutDashboard },
    { name: "Reviews", path: "/tufayel/reviews", icon: Star },
    { name: "Facebook Pages", path: "/tufayel/pages", icon: FileText },
    { name: "bKash / Contact", path: "/tufayel/contact-numbers", icon: Phone },
    { name: "Users", path: "/tufayel/users", icon: Users },
    { name: "Page Claims", path: "/tufayel/page-claims", icon: ShieldCheck },
    { name: "Disputes", path: "/tufayel/disputes", icon: MessageSquareWarning },
    { name: "Blog Posts", path: "/tufayel/blog-posts", icon: FileEdit },
    { name: "Media Library", path: "/tufayel/media-library", icon: Image },
    { name: "Reports / Abuse", path: "/tufayel/reports-abuse", icon: Flag },
    { name: "Bulk Import / Export", path: "/tufayel/bulk-import", icon: Upload },
    { name: "Contact Messages", path: "/tufayel/messages", icon: Mail },
    { name: "Settings", path: "/tufayel/settings", icon: Settings },
    { name: "Admin Logs", path: "/tufayel/logs", icon: ScrollText },
  ];

  const moderatorHiddenPaths = ["/tufayel", "/tufayel/users", "/tufayel/bulk-import", "/tufayel/settings", "/tufayel/logs"];
  const navItems = user?.role === 'Moderator' 
    ? allNavItems.filter(item => !moderatorHiddenPaths.includes(item.path))
    : allNavItems;

  useEffect(() => {
    if (user?.role === 'Moderator' && moderatorHiddenPaths.includes(location.pathname)) {
      navigate('/tufayel/reviews', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className={`min-h-screen bg-[#050b18] flex flex-col md:flex-row text-slate-100 font-sans relative overflow-x-hidden admin-panel ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      {/* Mobile Header */}
      <div className="md:hidden bg-[#060b15] border-b border-white/5 text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="font-bold text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#10b981]" /> Admin
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
        fixed top-0 bottom-0 left-0 h-screen ${isCollapsed ? 'w-20' : 'w-[250px]'} bg-[#060b15] border-r border-white/5 text-slate-300 flex flex-col z-40 transition-all duration-300 overflow-hidden shrink-0
      `}
      >
        <div className={`p-6 shrink-0 hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} font-bold text-lg text-white`}>
          <div className="bg-[#10b981]/15 border border-[#10b981]/25 rounded-lg p-1.5 flex items-center justify-center text-[#10b981]">
            <ShieldCheck className="h-5 w-5 text-[#10b981]" />
          </div>
          {!isCollapsed && <span className="text-[15.5px] font-black tracking-tight text-white">FB Page Review</span>}
        </div>

        <nav className="flex-1 px-3 pb-6 space-y-1 mt-4 md:mt-0 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                title={item.name}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-[#10b981]/10 text-white border border-[#10b981]/30 shadow-[0_0_15px_rgba(16,185,129,0.12)] font-bold"
                    : "text-[#94a3b8] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? "text-[#10b981]" : "text-[#475569]"}`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* System Status Container */}
        {!isCollapsed && (
          <div className="mx-4 my-2 p-4 bg-[#091124] border border-white/5 rounded-2xl relative overflow-hidden group mt-auto shrink-0 select-none">
            {/* Wave sparkline background at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 opacity-30 select-none pointer-events-none">
              <svg className="w-full h-full animate-pulse" viewBox="0 0 120 40" preserveAspectRatio="none">
                <path
                  d="M0,35 Q15,10 30,25 T60,15 T90,30 T120,5 L120,40 L0,40 Z"
                  fill="url(#sidebarWaveGlow)"
                />
                <path
                  d="M0,35 Q15,10 30,25 T60,15 T90,30 T120,5"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <defs>
                  <linearGradient id="sidebarWaveGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <p className="text-[10px] font-black text-slate-500 tracking-wider uppercase">System Status</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
              </span>
              <span className="text-sm font-bold text-white leading-none">Healthy</span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1 relative z-10">All systems operational</p>
          </div>
        )}

        <div className="p-4 border-t border-white/5 shrink-0 hidden md:block mt-auto">
           <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs font-semibold"
           >
             {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
             {!isCollapsed && <span>Collapse</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-[250px]'}`}>
        {/* Top Navbar */}
        <header className="bg-[#050b18] border-b border-white/5 h-16 shrink-0 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex-1 max-w-xl hidden sm:flex items-center gap-2 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder="Search pages, reviews, users..."
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-xl pl-9 pr-12 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 focus:border-[#10b981]/40"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-[#050b18] border border-slate-800 rounded select-none">
              ⌘K
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  const newShow = !showNotifications;
                  setShowNotifications(newShow);
                  if (newShow && hasUnread) {
                    setHasUnread(false);
                    const currentViewed: Record<string, number> = {};
                    notifications.forEach(n => currentViewed[n.type] = n.count);
                    localStorage.setItem('lastViewedNotifications', JSON.stringify(currentViewed));
                  }
                }}
                className="relative p-2 text-slate-400 hover:bg-white/5 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#10b981] rounded-full border border-[#050b18] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0d1527] rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden text-left">
                  <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#091124]">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 flex flex-col items-center">
                        <Bell className="h-8 w-8 text-slate-600 mb-2" />
                        <p className="text-sm font-semibold">No new notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {notifications.map((notif, idx) => (
                          <Link 
                            key={idx} 
                            to={notif.link}
                            onClick={() => setShowNotifications(false)}
                            className="p-4 hover:bg-white/5 flex items-start gap-3 transition-colors group"
                          >
                            <div className="mt-0.5 bg-rose-500/15 text-rose-500 p-1.5 rounded-lg">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-[#10b981] transition-colors">
                                {notif.count} {notif.type}{notif.count > 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">{notif.message}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark/Light mode theme toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer outline-none"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Moon className="h-5 w-5 text-[#10b981] animate-pulse" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500 hover:rotate-45 transition-transform duration-300" />
              )}
            </button>

            <div className="w-px h-6 bg-white/5 mx-2"></div>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#10b981] text-slate-950 flex items-center justify-center font-black uppercase text-xs select-none shadow-[0_0_10px_rgba(16,185,129,0.35)]">
                {user?.username?.substring(0, 2).toUpperCase() || "SA"}
              </div>
              <div className="hidden md:block text-left text-xs select-none leading-normal">
                <p className="font-extrabold text-white">
                  {user?.full_name || "System Admin"}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                  {user?.role || "Admin"}
                </p>
              </div>
              <svg className="h-4 w-4 text-slate-500 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-500 transition-colors ml-1"
                title="Log Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#050b18]">
          <Suspense fallback={<RouteLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#050b18]/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}
