import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ChevronLeft, Calendar, User } from "lucide-react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { useLanguage } from "../context/LanguageContext";

export default function BlogPost() {
  const { t, language } = useLanguage();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      </div>

      {post.featured_image && (
        <div className="mb-12 rounded-3xl overflow-hidden shadow-lg border border-slate-100">
          <img src={post.featured_image} alt={post.title} className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 hover:prose-a:text-emerald-700 prose-img:rounded-xl">
        <Markdown rehypePlugins={[rehypeRaw]}>{post.content}</Markdown>
      </div>
    </article>
  );
}
