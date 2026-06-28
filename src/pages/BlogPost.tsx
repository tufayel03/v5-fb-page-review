import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ChevronLeft, Calendar, User, FileText, Download } from "lucide-react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
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

export default function BlogPost() {
  const { t, language } = useLanguage();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blogs/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            navigate("/blog", { replace: true });
          }
          throw new Error(t("Failed to load"));
        }
        const data = await res.json();
        setPost(data);
        if (data?.title) {
          document.title = `${data.title} | ${t("FB Page Review Blog")}`;
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug, navigate, t]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 animate-pulse">
        <div className="h-8 bg-slate-200 w-24 rounded mb-8"></div>
        <div className="h-64 bg-slate-200 rounded-2xl w-full mb-8"></div>
        <div className="h-12 bg-slate-200 w-3/4 rounded mb-4"></div>
        <div className="h-6 bg-slate-200 w-1/4 rounded mb-10"></div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-200 w-full rounded"></div>
          <div className="h-4 bg-slate-200 w-full rounded"></div>
          <div className="h-4 bg-slate-200 w-5/6 rounded"></div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dateLocale = language === 'bn' ? 'bn-BD' : 'en-US';
    return date.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-16">
      <AdScriptInjector htmlCode={publicSettings.blog_ad_popunder} />
      <AdScriptInjector htmlCode={publicSettings.blog_ad_socialbar} />
      <AdScriptInjector htmlCode={publicSettings.blog_ad_smartlink} />

      <Link to="/blog" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 mb-8 transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("Back to Blog")}
      </Link>

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          {post.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 border-b border-slate-100 pb-8">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {formatDate(post.published_at || post.created_at)}
          </div>
          {post.category_id && (
            <>
              <span className="text-slate-300">•</span>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium text-xs">
                {post.category_id}
              </span>
            </>
          )}
        </div>
        
        <AdBanner htmlCode={publicSettings.blog_ad_below_title} />
      </div>

      {post.featured_image && (
        <div className="mb-12 rounded-3xl overflow-hidden shadow-lg border border-slate-100">
          <img src={post.featured_image} alt={post.title} className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 hover:prose-a:text-emerald-700 prose-img:rounded-xl">
        <Markdown rehypePlugins={[rehypeRaw]}>{post.content}</Markdown>
      </div>

      {post.attachment_url && (
        <div className="my-10 p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4 text-left w-full sm:w-auto">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug break-all">
                {post.attachment_name || t("Attachment Resource")}
              </h4>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                {t("This article includes a downloadable text file resource.")}
              </p>
            </div>
          </div>
          <a
            href={post.attachment_url}
            download={post.attachment_name || "attachment.txt"}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-emerald-500/10 w-full sm:w-auto justify-center cursor-pointer shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>{t("Download File")}</span>
          </a>
        </div>
      )}

      <AdBanner htmlCode={publicSettings.blog_ad_native} />
    </article>
  );
}
