import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Image as ImageIcon, 
  Search, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  FileImage, 
  ExternalLink,
  Plus,
  AlertTriangle
} from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  created_at: string;
}

export default function AdminMediaLibrary() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // States to keep track of recently copied item and style format
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFormat, setCopyFormat] = useState<"url" | "markdown" | "html" | "shortcode">("url");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media-library", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch media");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter media based on filename
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) =>
      item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mediaList, searchQuery]);

  // Handle Drag & Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/media-library/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      if (res.ok) {
        const newItem = await res.json();
        setMediaList((prev) => [newItem, ...prev]);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to upload image. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error occurred during code file uploads.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        uploadFile(file);
      } else {
        alert("Please upload image files only.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/admin/media-library/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setMediaList((prev) => prev.filter((item) => item.id !== id));
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to delete file.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting media file.");
    }
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Helper to get styled/coded tag from image details
  const getFormattedCode = (item: MediaItem, type: typeof copyFormat) => {
    const rawUrl = item.url;
    switch (type) {
      case "markdown":
        return `![${item.filename}](${rawUrl})`;
      case "html":
        return `<img src="${rawUrl}" alt="${item.filename}" />`;
      case "shortcode":
        return `[media-${item.id}]`;
      case "url":
      default:
        return rawUrl;
    }
  };

  const copyToClipboard = (item: MediaItem) => {
    const textToCopy = getFormattedCode(item, copyFormat);
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 1800);
      })
      .catch((err) => console.error("Error copy payload to clipboards", err));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-emerald-500" /> Media Library
          </h1>
          <p className="text-sm text-slate-400 font-semibold mt-1">
            Upload, manage images, and fetch shortcodes or markdown tags to use across the site.
          </p>
        </div>
      </div>

      {/* Top Section: Full-Width Upload Workspace Panel */}
      <div className="bg-[#091124] border border-white/5 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Left side: Information and Title */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">
                Upload Assets
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-xl">
                Drag and drop your images anywhere inside the zone, or click to browse. Images are automatically resized and converted to high-performance WebP formats for swift loading.
              </p>
            </div>
          </div>
          
          {/* Right side: Sleek drag/drop target */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerSelectFile}
            className={`w-full lg:max-w-md border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex items-center justify-center gap-3 min-h-24 select-none ${
              dragActive
                ? "border-emerald-500 bg-emerald-500/5 animate-pulse"
                : "border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.01]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent"></div>
                <span className="text-xs font-black uppercase text-emerald-400 tracking-widest animate-pulse">
                  Uploading Asset...
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-200">
                    Drag & Drop image here
                  </p>
                  <p className="text-[10px] text-slate-400">
                    or click to browse local folders
                  </p>
                </div>
                <span className="text-[10px] uppercase font-black tracking-widest bg-white/5 hover:bg-white/10 text-slate-300 px-3.5 py-2 rounded-lg border border-white/5 transition-all select-none">
                  Choose WebP / PNG / JPG
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Media Library Asset Grid */}
      <div className="bg-[#091124] border border-white/5 rounded-xl p-5 min-h-96 flex flex-col">
        
        {/* Header filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6 shrink-0">
          
          {/* Copy Code Format Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              Copy Format:
            </span>
            <div className="flex rounded-lg bg-[#050b18] border border-white/5 p-1 text-xs shrink-0 font-extrabold select-none">
              {(["url", "markdown", "html", "shortcode"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setCopyFormat(fmt)}
                  className={`px-2.5 py-1 rounded-md transition-colors capitalize cursor-pointer ${
                    copyFormat === fmt
                      ? "bg-emerald-600 text-[#050b18]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Search filter input */}
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050b18] border border-white/5 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* High-density grid display */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400 animate-pulse">
              Querying Media Library...
            </span>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-500 italic">
            {searchQuery ? (
              <p>No uploaded assets found matching "{searchQuery}"</p>
            ) : (
              <div>
                <ImageIcon className="h-10 w-10 text-slate-700 mx-auto mb-2.5" />
                <p className="font-semibold text-slate-400 not-italic">Media Library is Empty</p>
                <p className="text-xs text-slate-500 mt-1 not-italic">Drag & Drop pictures or click browse to populate files.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {filteredMedia.map((item) => {
              const isCopied = copiedId === item.id;
              const isDeletable = deleteConfirmId === item.id;
              const displayCode = getFormattedCode(item, copyFormat);

              return (
                <div
                  key={item.id}
                  className="bg-[#050b18]/65 border border-white/5 rounded-xl overflow-hidden flex flex-col group hover:border-emerald-500/20 transition-all shadow hover:shadow-lg relative"
                >
                  {/* Aspect Square Image Container */}
                  <div 
                    className="relative aspect-square bg-[#03060f] flex items-center justify-center overflow-hidden border-b border-white/5 cursor-pointer"
                    onClick={() => copyToClipboard(item)}
                  >
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    
                    {/* Hover Overlay with controls */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col justify-between p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 select-none">
                      {/* Top bar quick controls */}
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all shadow"
                          title="Open direct image link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        
                        <div>
                          {isDeletable ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/20 transition-all shadow"
                              title="Confirm delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id); }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 border border-white/5 transition-all shadow"
                              title="Delete asset"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Center action click indicators */}
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
                          isCopied
                            ? "bg-emerald-500 border-emerald-400 text-[#050b18]"
                            : "bg-white/5 border-white/10 text-slate-200 group-hover:scale-105"
                        }`}>
                          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 text-center">
                          {isCopied ? "Copied!" : `Copy ${copyFormat}`}
                        </span>
                      </div>

                      {/* Bottom alignment indicator */}
                      <div className="text-[8px] text-center text-slate-500 font-mono truncate">
                        Format: {copyFormat.toUpperCase()}
                      </div>
                    </div>

                    {/* Delete cancellation dropdown bar overlay */}
                    {isDeletable && (
                      <div 
                        className="absolute inset-x-0 bottom-0 bg-rose-950/90 backdrop-blur-xs border-t border-rose-500/20 p-1.5 flex items-center justify-center gap-2 select-none animate-slide-up z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[9px] font-extrabold text-rose-300 uppercase tracking-wide">Delete?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                          className="text-[9px] font-bold text-slate-300 hover:text-white px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Caption line */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between gap-1 text-[11px] select-none">
                    <p
                      className="font-bold text-slate-300 truncate"
                      title={item.filename}
                    >
                      {item.filename}
                    </p>
                    <p className="text-[9px] text-slate-500 font-mono">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
