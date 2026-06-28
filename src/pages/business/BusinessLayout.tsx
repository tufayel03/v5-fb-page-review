import React, { useState, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Store, Star, User, Phone, Settings, Menu, X, ArrowLeft, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import RouteLoader from '../../components/RouteLoader';

export default function BusinessLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const navigation = [
    { name: t('Overview'), href: '/business-dashboard', icon: LayoutDashboard },
    { name: t('My Pages'), href: '/business-dashboard/pages', icon: Store },
    { name: t('Reviews'), href: '/business-dashboard/reviews', icon: Star },
    { name: t('Profile Info'), href: '/business-dashboard/profile-info', icon: User },
    { name: t('Contact Numbers'), href: '/business-dashboard/contact-numbers', icon: Phone },
    { name: t('Settings'), href: '/business-dashboard/settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex flex-col md:flex-row business-panel ${theme === 'light' ? 'bg-slate-50 text-slate-900 theme-light' : 'bg-[#050b18] text-white theme-dark'}`}>
      {/* Mobile Header */}
      <div className={`md:hidden border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50 ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#050b18] border-white/5'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-slate-900">{t("Business Dashboard")}</span>
        </div>
        <Link to="/" className="text-sm font-bold text-indigo-600">{t("Back to Site")}</Link>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r flex flex-col transition-transform duration-300 md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#091124] border-white/5'}
      `}>
        <div className={`p-6 border-b flex items-center justify-between ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
          <div>
            <h1 className="font-extrabold text-lg">{t("Business Panel")}</h1>
            <p className="text-xs opacity-60">{t("Seller Tools")}</p>
          </div>
          <button className="md:hidden p-1 opacity-60" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/business-dashboard' && location.pathname.startsWith(item.href));
            
            let linkClass = isActive 
                ? (theme === 'light' ? 'bg-indigo-50 text-indigo-700' : 'bg-[#18233C] text-indigo-400')
                : (theme === 'light' ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200');
                
            let iconClass = isActive 
                ? (theme === 'light' ? 'text-indigo-600' : 'text-indigo-400')
                : 'opacity-60';

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${linkClass}`}
              >
                <item.icon className={`h-4 w-4 ${iconClass}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t flex flex-col gap-4 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 text-sm font-medium w-full text-left transition-colors ${theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? t('Light Mode') : t('Dark Mode')}
          </button>
          <Link to="/" className={`flex items-center gap-2 text-sm font-medium transition-colors ${theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}>
            <ArrowLeft className="h-4 w-4" /> {t("Back to Website")}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 h-screen overflow-y-auto">
        <div className="w-full max-w-7xl pb-12">
          <Suspense fallback={<RouteLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
