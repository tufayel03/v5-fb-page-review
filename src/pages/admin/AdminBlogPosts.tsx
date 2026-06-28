import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, Plus, ArrowUpDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminBlogPosts() {
  const { t, n } = useLanguage();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: 'created_at', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [newBlog, setNewBlog] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    let sortBy = 'created_at';
    let sortOrder = 'desc';
    if (sortConfig) {
      sortBy = sortConfig.key;
      sortOrder = sortConfig.direction === 'asc' ? 'asc' : 'desc';
    }

    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
      search: debouncedSearch,
      status: statusFilter,
      sortBy,
      sortOrder,
    });

    fetch(`/api/admin/blogs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then((json) => {
        const data = json.data || (Array.isArray(json) ? json : []);
        setBlogs(data);
        setTotalCount(json.totalCount !== undefined ? json.totalCount : data.length);
        setTotalPages(json.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, sortConfig, refreshTrigger]);

  const fetchBlogs = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...newBlog, status: "Draft" }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowAddModal(false);
        navigate(`/tufayel/blog-posts/${data.id}`);
      } else {
        alert(t("Failed to construct blog post. Check if slug exists."));
      }
    } catch (err) {
      alert(t("Error creating blog post"));
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/admin/blogs/${deleteConfirmId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchBlogs();
      } else {
        alert(data.error || t("Failed to delete post"));
      }
    } catch (e: any) {
      alert(t("Error: ") + e.message);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  
  const handleSort = (key: string) => {
    let direction: 'asc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      // Toggle
    }
    setSortConfig({ key, direction: 'asc' });
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBlogs = blogs;

  const uniqueStatuses = ["Published", "Draft"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {t("Blog Posts")}
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            {t("Manage articles, safety guides, and updates.")}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t("Search posts...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#091124] border border-white/5 text-slate-100 rounded-lg pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" /> {t("New Post")}
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">{t("Create Draft Post")}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {t("Title *")}
                </label>
                <input
                  required
                  type="text"
                  value={newBlog.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewBlog({
                      ...newBlog,
                      title: val,
                      slug: val
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)+/g, ""),
                    });
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  placeholder={t("e.g. How to verify a page")}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  {t("Slug *")}
                </label>
                <input
                  required
                  type="text"
                  value={newBlog.slug}
                  onChange={(e) =>
                    setNewBlog({ ...newBlog, slug: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg text-sm"
                >
                  {t("Cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm"
                >
                  {t("Create Draft")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-[#02050c]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-base text-white tracking-tight">{t("Delete Blog Post")}</h3>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed font-sans">
              {t("Are you sure you want to permanently delete this blog post? This action is irreversible and cannot be recovered.")}
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-lg shadow-rose-950/20"
              >
                {t("Confirm Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#050b18]/60 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 border-b border-white/5 w-16">{t("SL")}</th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("title")}>
                  <div className="flex items-center gap-1">{t("Title")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">{t("Status")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5" onClick={() => handleSort("published_at")}>
                  <div className="flex items-center gap-1">{t("Date")} <ArrowUpDown className="h-3 w-3"/></div>
                </th>
                <th className="px-6 py-4 border-b border-white/5 text-right font-black">
                  {t("Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 w-32 bg-[#050b18]/50 mx-auto rounded"></div>
                  </td>
                </tr>
              ) : blogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-500 italic"
                  >
                    {t("No posts found.")}
                  </td>
                </tr>
              ) : (
                paginatedBlogs.map((post, index) => {
                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-400 font-medium font-mono">
                        {n(startIndex + index + 1)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">
                          {post.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {post.slug}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                            ${
                              post.status === "Published"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : post.status === "Draft"
                                  ? "bg-slate-500/10 text-slate-400 border border-[#475569]/30"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }
                          `}
                        >
                          {t(post.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-medium text-xs">
                        {new Date(post.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/tufayel/blog-posts/${post.id}`}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline py-1"
                          >
                            {t("Edit")}
                          </Link>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="text-xs font-bold text-rose-400 hover:text-rose-300 py-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between bg-[#050b18]/40 gap-4">
           <div className="text-sm text-slate-400 font-semibold font-medium">
              {t("Showing {{start}} to {{end}} of {{total}} entries", {
                start: n(totalCount === 0 ? 0 : startIndex + 1),
                end: n(Math.min(startIndex + itemsPerPage, totalCount)),
                total: n(totalCount)
              })}
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-medium">{t("Show:")}</span>
                <select 
                   value={itemsPerPage} 
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-[#091124] border border-white/5 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-200"
                >
                   <option value={10} className="bg-[#091124]">{n(10)}</option>
                   <option value={20} className="bg-[#091124]">{n(20)}</option>
                   <option value={50} className="bg-[#091124]">{n(50)}</option>
                   <option value={100} className="bg-[#091124]">{n(100)}</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                 <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-xs font-bold px-2 text-slate-300">{n(currentPage)} / {n(Math.max(1, totalPages))}</span>
                 <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 rounded border border-white/5 bg-[#091124] text-slate-400 hover:bg-white/5 disabled:opacity-30"
                 >
                    <ChevronRight className="h-4 w-4" />
                 </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
