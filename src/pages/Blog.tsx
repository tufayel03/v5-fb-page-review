import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Search, ChevronLeft, ChevronRight, Calendar, ArrowRight, Pin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

function AdBanner({ htmlCode }: { htmlCode: string }) {
  const { user } = useAuth();
  const isAdmin = user && ["admin", "Admin", "Super Admin", "Moderator"].includes(user.role);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdmin || !containerRef.current) return;
    containerRef.current.innerHTML = "";
    if (!htmlCode) return;

    try {
      const range = document.createRange();
      range.selectNode(containerRef.current);
      const fragment = range.createContextualFragment(htmlCode);
      containerRef.current.appendChild(fragment);
    } catch (e) {
      console.error("Ad script render error:", e);
    }
  }, [htmlCode, isAdmin]);

  if (isAdmin || !htmlCode) {
    return null;
  }

  return (
    <div className="w-full flex justify-center py-4 my-2 select-none">
      <div ref={containerRef} className="ad-container overflow-hidden min-h-[60px] max-w-full flex justify-center" />
    </div>
  );
}

function AdScriptInjector({ htmlCode }: { htmlCode: string }) {
  const { user } = useAuth();
  const isAdmin = user && ["admin", "Admin", "Super Admin", "Moderator"].includes(user.role);

  useEffect(() => {
    if (isAdmin || !htmlCode) return;
    const div = document.createElement("div");
    div.style.display = "none";
    try {
      const range = document.createRange();
      range.selectNode(document.body);
      const fragment = range.createContextualFragment(htmlCode);
      div.appendChild(fragment);
      document.body.appendChild(div);
    } catch (e) {
      console.error("Error injecting ad script:", e);
    }
    return () => {
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
    };
  }, [htmlCode, isAdmin]);

  return null;
}

export default function Blog() {
  const { t, n, language } = useLanguage();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [publicSettings, setPublicSettings] = useState<any>({});

  useEffect(() => {
    fetch("/api/public-settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setPublicSettings(data);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    const fetchBlogs = async () => {
      try {
        const res = await fetch(
          `/api/blogs?page=${page}&limit=12&search=${encodeURIComponent(debouncedSearch)}&sort=${sort}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (data.blogs) {
          setBlogs(data.blogs);
          setTotalPages(data.totalPages);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();

    return () => controller.abort();
  }, [page, sort, debouncedSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dateLocale = language === 'bn' ? 'bn-BD' : 'en-US';
    return date.toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <AdScriptInjector htmlCode={publicSettings.blog_ad_popunder} />
      <AdScriptInjector htmlCode={publicSettings.blog_ad_socialbar} />
      <AdScriptInjector htmlCode={publicSettings.blog_ad_smartlink} />

      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{t("Safety Blog")}</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {t("Insights, guides, and tips to help you stay safe while navigating Facebook marketplaces and online transactions.")}
        </p>
        <AdBanner htmlCode={publicSettings.blog_ad_below_title} />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder={t("Search articles...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">{t("Sort by:")}</label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="w-full md:w-auto bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="recent">{t("Most Recent")}</option>
            <option value="oldest">{t("Oldest")}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 h-96 flex flex-col">
              <div className="h-48 bg-slate-200 rounded-t-2xl"></div>
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="h-4 bg-slate-200 w-1/3 rounded"></div>
                <div className="h-6 bg-slate-200 w-full rounded"></div>
                <div className="h-20 bg-slate-200 w-full rounded mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("No articles found")}</h2>
          <p className="text-slate-500">{t("We couldn't find any articles matching your criteria.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col h-full">
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                {post.featured_image ? (
                  <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
                    <span className="text-4xl">📄</span>
                  </div>
                )}
                {!!post.is_pinned && (
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Pin className="w-3 h-3" /> {t("Pinned")}
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center text-xs text-slate-500 mb-3">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  {formatDate(post.published_at || post.created_at)}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                  {post.title}
                </h3>
                <p className="text-slate-600 mb-5 line-clamp-3 text-sm flex-1">
                  {post.excerpt}
                </p>
                <div className="mt-auto flex items-center text-emerald-600 font-bold text-sm">
                  {t("Read Article")} <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center mt-16 gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${page === i + 1 ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {n(i + 1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <AdBanner htmlCode={publicSettings.blog_ad_native} />
    </div>
  );
}

