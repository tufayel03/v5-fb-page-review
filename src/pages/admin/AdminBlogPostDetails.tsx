import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Link } from "react-router";
import { 
  ArrowLeft, Save, Trash2, Eye, Copy, Clock, BookOpen, 
  Settings, Sparkles, Globe, Calendar, Image as ImageIcon,
  Bold, Italic, Underline, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Code, Table, Minus, Link as LinkIcon, 
  Upload, Search, Trash, Check, HelpCircle, History, RefreshCw,
  FileText, Plus, Download
} from "lucide-react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminBlogPostDetails() {
  const { t, n } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);
  const ogFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "split">("edit");
  const [autosaveStatus, setAutosaveStatus] = useState<string>(t("All changes saved"));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [revisions, setRevisions] = useState<Array<{ time: string; content: string; title: string }>>([]);
  const [scheduledDate, setScheduledDate] = useState<string>("");

  // Media Library State
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaPurpose, setMediaPurpose] = useState<"inline" | "featured" | "og">("inline");

  // Custom alert/confirm modal states to bypass standard blocked pop-ups
  const [showDetailDeleteConfirm, setShowDetailDeleteConfirm] = useState(false);
  const [showDetailDuplicateConfirm, setShowDetailDuplicateConfirm] = useState(false);
  const [pendingRevisionRestore, setPendingRevisionRestore] = useState<{ content: string; title: string } | null>(null);
  const [pendingMediaDeleteId, setPendingMediaDeleteId] = useState<string | null>(null);

  // Inline Image Configurator State
  const [inlineImageConfig, setInlineImageConfig] = useState({
    src: "",
    alt: "",
    title: "",
    align: "center", // left, center, right
    size: "full", // normal, full, half
    caption: ""
  });

  // Featured Image Additional Settings (saved inside JSON or states)
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [focalPoint, setFocalPoint] = useState({ x: 50, y: 50 });
  const [cropRatio, setCropRatio] = useState<"free" | "16-9" | "4-3" | "1-1">("free");

  // Form Fields
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category_id: "",
    tags: "",
    featured_image: "",
    seo_title: "",
    seo_description: "",
    focus_keyword: "",
    og_title: "",
    og_description: "",
    og_image: "",
    status: "Draft",
    is_pinned: false,
    attachment_url: "",
    attachment_name: "",
  });

  // Keep track of initial content to compare changes
  const originalDataRef = useRef<any>(null);

  // Fetch Category List & Post details
  useEffect(() => {
    // Fetch categories
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error loading categories", err));

    // Fetch post details
    fetch(`/api/admin/blogs/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setPost(data);
        const parsedFocal = data.extras_focal ? JSON.parse(data.extras_focal) : { x: 50, y: 50 };
        setFocalPoint(parsedFocal);
        setFeaturedImageAlt(data.featured_image_alt || "");
        
        const initialForm = {
          title: data.title || "",
          slug: data.slug || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          category_id: data.category_id || "",
          tags: data.tags || "",
          featured_image: data.featured_image || "",
          seo_title: data.seo_title || "",
          seo_description: data.seo_description || "",
          focus_keyword: data.focus_keyword || "",
          og_title: data.og_title || "",
          og_description: data.og_description || "",
          og_image: data.og_image || "",
          status: data.status || "Draft",
          is_pinned: !!data.is_pinned,
          attachment_url: data.attachment_url || "",
          attachment_name: data.attachment_name || "",
        };
        setFormData(initialForm);
        originalDataRef.current = initialForm;
        
        if (data.published_at && data.status === "Scheduled") {
          setScheduledDate(data.published_at.substring(0, 16));
        } else {
          setScheduledDate("");
        }

        const nowStr = new Date().toLocaleTimeString();
        setLastSavedTime(nowStr);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Fetch media library items
    fetchMediaLibrary();
  }, [id]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = t("You have unsaved changes. Are you sure you want to leave?");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle value modifications
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate Slug on Title change ONLY IF new post / empty slug / draft is kept
      if (field === "title" && (formData.status === "Draft" || !formData.slug)) {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }

      // Check differences for unsaved changes indicator
      if (originalDataRef.current) {
        let different = false;
        for (const k in originalDataRef.current) {
          if (originalDataRef.current[k] !== updated[k]) {
            different = true;
            break;
          }
        }
        setHasUnsavedChanges(different);
      }

      return updated;
    });
  };

  // Auto-generate SEO details helper
  const handleAutoRecommendSEO = () => {
    updateField("seo_title", `${formData.title} | ${t('Blog post')}`);
    updateField("seo_description", formData.excerpt || formData.content.split("\n")[0]?.substring(0, 150) || "");
    updateField("og_title", formData.title);
    updateField("og_description", formData.excerpt || formData.content.split("\n")[0]?.substring(0, 150) || "");
    updateField("og_image", formData.featured_image);
  };

  // Autosave Draft system
  useEffect(() => {
    if (formData.status !== "Draft" || !formData.title || !hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      setAutosaveStatus(t("Autosaving..."));
      fetch(`/api/admin/blogs/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          published_at: null,
          extras_focal: JSON.stringify(focalPoint),
          featured_image_alt: featuredImageAlt
        }),
      }).then((res) => {
        if (res.ok) {
          originalDataRef.current = formData;
          setHasUnsavedChanges(false);
          const savedTime = new Date().toLocaleTimeString();
          setLastSavedTime(savedTime);
          setAutosaveStatus(t("Saved draft at {{time}}", { time: savedTime }));
          
          // Add to custom local revision history
          setRevisions((prev) => [
            { time: savedTime, content: formData.content, title: formData.title },
            ...prev.slice(0, 9)
          ]);
        } else {
          setAutosaveStatus(t("Autosave failed"));
        }
      });
    }, 15000); // 15 seconds debounce

    return () => clearTimeout(timer);
  }, [formData, hasUnsavedChanges, id, focalPoint, featuredImageAlt]);

  // Fetch media library
  const fetchMediaLibrary = () => {
    setMediaLoading(true);
    fetch("/api/admin/media-library", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setMediaLibrary(Array.isArray(data) ? data : []);
        setMediaLoading(false);
      })
      .catch(() => setMediaLoading(false));
  };

  // Handle local File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, purpose: "inline" | "featured" | "og") => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUploadFile(file, purpose);
  };

  // Upload runner
  const processAndUploadFile = async (file: File, purpose: "inline" | "featured" | "og") => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      try {
        const response = await fetch("/api/admin/media-library/upload-base64", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            base64: base64Str,
            filename: file.name
          })
        });
        if (response.ok) {
          const uploaded = await response.json();
          // Update URL
          if (purpose === "featured") {
            updateField("featured_image", uploaded.url);
          } else if (purpose === "og") {
            updateField("og_image", uploaded.url);
          } else {
            // Inline insert Image
            setInlineImageConfig((prev) => ({ ...prev, src: uploaded.url }));
            setMediaLibraryOpen(true);
            setMediaPurpose("inline");
          }
          fetchMediaLibrary();
        } else {
          alert(t("Upload failed. Make sure it's a valid image file."));
        }
      } catch (err) {
        alert(t("Upload error."));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      const response = await fetch("/api/admin/media-library/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: fd
      });
      if (response.ok) {
        const uploaded = await response.json();
        updateField("attachment_url", uploaded.url);
        if (!formData.attachment_name) {
          updateField("attachment_name", file.name);
        }
        alert(t("File uploaded successfully!"));
      } else {
        alert(t("Upload failed."));
      }
    } catch (err) {
      alert(t("Upload error."));
    }
  };

  // Media Library Selector Click
  const handleSelectMediaItem = (item: any) => {
    if (mediaPurpose === "featured") {
      updateField("featured_image", item.url);
      setMediaLibraryOpen(false);
    } else if (mediaPurpose === "og") {
      updateField("og_image", item.url);
      setMediaLibraryOpen(false);
    } else {
      setInlineImageConfig((prev) => ({ ...prev, src: item.url }));
    }
  };

  // Remove uploaded media
  const handleDeleteMediaItem = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setPendingMediaDeleteId(itemId);
  };

  const handleConfirmMediaDelete = async () => {
    if (!pendingMediaDeleteId) return;
    try {
      const res = await fetch(`/api/admin/media-library/${pendingMediaDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        fetchMediaLibrary();
        // Clear if matched
        const deletedUrl = mediaLibrary.find((i) => i.id === pendingMediaDeleteId)?.url;
        if (deletedUrl) {
          if (formData.featured_image === deletedUrl) updateField("featured_image", "");
          if (formData.og_image === deletedUrl) updateField("og_image", "");
        }
      }
    } catch (err) {
      alert(t("Delete call failed."));
    } finally {
      setPendingMediaDeleteId(null);
    }
  };

  // Textarea toolbar actions
  const handleToolbarAction = (action: string) => {
    const textarea = document.getElementById("blog-content-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    let inserted = "";

    switch (action) {
      case "bold":
        inserted = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        inserted = `*${selectedText || "italic text"}*`;
        break;
      case "underline":
        inserted = `<u>${selectedText || "underlined text"}</u>`;
        break;
      case "h1":
        inserted = `\n# ${selectedText || "Heading 1"}\n`;
        break;
      case "h2":
        inserted = `\n## ${selectedText || "Heading 2"}\n`;
        break;
      case "h3":
        inserted = `\n### ${selectedText || "Heading 3"}\n`;
        break;
      case "bullet":
        inserted = `\n- ${selectedText || "List item"}\n`;
        break;
      case "numeric":
        inserted = `\n1. ${selectedText || "List item"}\n`;
        break;
      case "blockquote":
        inserted = `\n> ${selectedText || "Blockquote content"}\n`;
        break;
      case "code":
        inserted = `\n\`\`\`javascript\n${selectedText || "const val = 'code';\nconsole.log(val);"}\n\`\`\`\n`;
        break;
      case "table":
        inserted = `\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell A   | Cell B   |\n`;
        break;
      case "divider":
        inserted = `\n---\n`;
        break;
      case "link":
        const linkUrl = prompt(t("Enter HTTP/HTTPS Link URL:"), "https://");
        if (linkUrl === null) return;
        inserted = `[${selectedText || "Link Text"}](${linkUrl})`;
        break;
      default:
        return;
    }

    const updatedText = formData.content.substring(0, start) + inserted + formData.content.substring(end);
    updateField("content", updatedText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + inserted.length;
    }, 50);
  };

  // Insert Inline Image HTML widget constructed inside editorial content
  const handleInsertInlineConfigImage = () => {
    if (!inlineImageConfig.src) {
      alert(t("Please upload or choose an image source first."));
      return;
    }

    // Build the clean alignments design
    const widthClass = inlineImageConfig.size === "full" ? "w-full" : inlineImageConfig.size === "half" ? "w-1/2 mx-auto" : "max-w-md mx-auto";
    const alignClass = inlineImageConfig.align === "left" ? "float-left mr-6 mb-4" : inlineImageConfig.align === "right" ? "float-right ml-6 mb-4" : "block text-center mx-auto my-6";

    const htmlWidget = `\n<div class="blog-media-block ${alignClass} ${widthClass} py-2" style="clear: both;">
  <img src="${inlineImageConfig.src}" alt="${inlineImageConfig.alt || "Inline post graphic"}" title="${inlineImageConfig.title || ""}" class="rounded-xl border border-white/5 max-h-[500px] object-contain shadow-md" style="display: block; margin: 0 auto; max-width: 100%; transition: scale 0.2s;" />
  ${inlineImageConfig.caption ? `<p class="text-xs text-slate-400 font-medium tracking-wide mt-2 text-center select-none" style="display: block; width: 100%; font-style: italic;">${inlineImageConfig.caption}</p>` : ""}
</div>\n`;

    // Reset inline config setup
    setInlineImageConfig({
      src: "",
      alt: "",
      title: "",
      align: "center",
      size: "full",
      caption: ""
    });

    handleInsertTextAtCursor(htmlWidget);
    setMediaLibraryOpen(false);
  };

  // Cursor insertion
  const handleInsertTextAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById("blog-content-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      updateField("content", formData.content + textToInsert);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const updated = formData.content.substring(0, start) + textToInsert + formData.content.substring(end);
    updateField("content", updated);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 50);
  };

  // Duplicate current post as Draft
  const handleDuplicatePost = () => {
    setShowDetailDuplicateConfirm(true);
  };

  const handleConfirmDuplicate = async () => {
    setShowDetailDuplicateConfirm(false);
    try {
      const dupTitle = `${formData.title} (${t('Duplicate')})`;
      const dupSlug = `${formData.slug}-copy-${Math.floor(100 + Math.random() * 900)}`;
      
      const res = await fetch("/api/admin/blogs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          title: dupTitle,
          slug: dupSlug,
          status: "Draft",
          is_pinned: false,
          published_at: null,
          extras_focal: JSON.stringify(focalPoint),
          featured_image_alt: featuredImageAlt
        }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(t("Post duplicated successfully!"));
        navigate(`/tufayel/blog-posts/${data.id}`);
      } else {
        alert(t("Failed to duplicate. Please ensure a unique slug is generated."));
      }
    } catch (e) {
      alert(t("Error duplicating post."));
    }
  };

  // Save changes
  const handleSave = async (manualStatus?: string) => {
    setSaving(true);
    let finalStatus = manualStatus || formData.status;
    let finalPublishedAt = null;

    if (finalStatus === "Published") {
      finalPublishedAt = new Date().toISOString();
    } else if (finalStatus === "Scheduled") {
      if (!scheduledDate) {
        alert(t("Please set a Future Date and Time for scheduled blogs."));
        setSaving(false);
        return;
      }
      finalPublishedAt = new Date(scheduledDate).toISOString();
    }

    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          status: finalStatus,
          published_at: finalPublishedAt,
          extras_focal: JSON.stringify(focalPoint),
          featured_image_alt: featuredImageAlt
        }),
      });
      
      if (res.ok) {
        originalDataRef.current = { ...formData, status: finalStatus };
        updateField("status", finalStatus);
        setHasUnsavedChanges(false);
        alert(t('Successfully saved as "{{status}}"!', { status: t(finalStatus) }));
      } else {
        const errData = await res.json();
        alert(errData.error || t("Failed to update blog post. Make sure the slug is unique."));
      }
    } catch (e) {
      console.error(e);
      alert(t("Error saving blog details."));
    }
    setSaving(false);
  };

  // Restore Revision draft
  const handleRestoreRevision = (revContent: string, revTitle: string) => {
    setPendingRevisionRestore({ content: revContent, title: revTitle });
  };

  const handleConfirmRestoreRevision = () => {
    if (!pendingRevisionRestore) return;
    updateField("content", pendingRevisionRestore.content);
    updateField("title", pendingRevisionRestore.title);
    setPendingRevisionRestore(null);
  };

  const handleDelete = () => {
    setShowDetailDeleteConfirm(true);
  };

  const handleConfirmDetailsDelete = async () => {
    setShowDetailDeleteConfirm(false);
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        navigate("/tufayel/blog-posts");
      } else {
        alert(t("Failed to delete post."));
      }
    } catch (e) {
      alert(t("Error deleting post."));
    }
  };

  // Drag and drop events for the content editor area
  const [isDraggingOverEditor, setIsDraggingOverEditor] = useState(false);
  const handleEditorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverEditor(true);
  };
  const handleEditorDragLeave = () => {
    setIsDraggingOverEditor(false);
  };
  const handleEditorDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverEditor(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        await processAndUploadFile(file, "inline");
      } else {
        alert(t("Only images are supported for drag-and-drop uploads."));
      }
    }
  };

  // Click on Featured image thumbnail to position focal pointer coordinate
  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setFocalPoint({ x, y });
    setHasUnsavedChanges(true);
  };

  // Analytics calculator
  const wordCount = formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 220); // 220 words per minute average
  const headingList = generateTOC(formData.content);

  function generateTOC(text: string) {
    const lines = text.split("\n");
    const headings: Array<{ level: number; text: string }> = [];
    lines.forEach((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].replace(/[#*`_[\]]/g, "").trim()
        });
      }
    });
    return headings;
  }

  // Media Library listing filtered by search string query
  const filteredMedia = mediaLibrary.filter((item) =>
    (item.filename || "").toLowerCase().includes(mediaSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02050c] flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-400 font-bold tracking-wide text-sm">{t("Loading Custom Post Engine...")}</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#02050c] flex items-center justify-center p-8 text-white">
        <div className="text-center space-y-4 max-w-sm">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 inline-block">
            <HelpCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-white">{t("Post Not Found")}</h2>
          <p className="text-slate-400 text-sm">{t("The article you are trying to query does not exist in the database or error occurred.")}</p>
          <Link to="/tufayel/blog-posts" className="inline-block mt-4 text-emerald-400 font-bold text-sm bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-5 rounded-lg transition-all">
            {t("Return to Blog Table")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02050c] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-100 pb-16">
      {/* Editorial Header bar */}
      <div className="border-b border-white/5 bg-[#050b12] sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/tufayel/blog-posts"
              className="flex items-center justify-center p-2 rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              title={t("Return to posts table")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black tracking-widest uppercase px-1.5 py-0.5 rounded">
                  {t("WP Post Studio")}
                </span>
                {hasUnsavedChanges ? (
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    {t("Unsaved changes")}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    {t("Saved")}
                  </span>
                )}
              </div>
              <h1 className="text-base font-black tracking-tight text-white mt-0.5 line-clamp-1 max-w-[320px] sm:max-w-[480px]">
                {formData.title || t("Untitled Post Draft")}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Split render switch tab buttons */}
            <div className="bg-[#02050c] border border-white/5 p-1 rounded-lg flex items-center mr-2">
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 rounded-md text-xs font-black tracking-wide transition-all ${
                  activeTab === "edit"
                    ? "bg-emerald-600 font-black text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("Editor")}
              </button>
              <button
                onClick={() => setActiveTab("split")}
                className={`px-3 py-1.5 rounded-md text-xs font-black tracking-wide transition-all ${
                  activeTab === "split"
                    ? "bg-emerald-600 font-black text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("Split")}
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-md text-xs font-black tracking-wide transition-all ${
                  activeTab === "preview"
                    ? "bg-emerald-600 font-black text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("Preview Live Layout")}
              </button>
            </div>

            {/* Actions trigger header buttons */}
            <button
              onClick={handleDuplicatePost}
              className="flex items-center gap-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 hover:text-white px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer"
              title={t("Duplicate post to a draft")}
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{t("Duplicate")}</span>
            </button>
            
            <a
              href={`/blog/${formData.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-white/5 bg-[#0d1627] hover:bg-[#121f36] text-emerald-400 px-3.5 py-2 rounded-lg text-xs font-black transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{t("Preview")}</span>
            </a>

            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-40 shadow-lg shadow-emerald-950/20"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? t("Saving...") : t("Update Post")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content Area Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Column area: Left (9 columns) */}
          <div className={`${activeTab === "preview" ? "lg:col-span-12" : "lg:col-span-8"} space-y-6`}>
            
            {/* Tab: Editor Form Content Block */}
            {(activeTab === "edit" || activeTab === "split") && (
              <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-2xl p-6 space-y-6">
                
                {/* General Title Block */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black tracking-widest text-[#a3b3cc] uppercase block">
                    {t("Post Title")}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder={t("Enter an intriguing, highly clickable headline...")}
                    className="w-full border border-white/5 bg-[#02050c]/50 text-white rounded-lg p-3 px-4 text-xl font-black font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-slate-600 transition-all text-shadow"
                    id="blog-post-title-input"
                  />
                </div>

                {/* Slug Format Visualizer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-black tracking-widest text-[#a3b3cc] uppercase">
                        {t("URL Slug")}
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">{t("Auto-sanitizes on edit")}</span>
                    </div>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => {
                        const clean = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9\-]/g, "")
                          .replace(/--+/g, "-");
                        updateField("slug", clean);
                      }}
                      className="w-full border border-white/5 bg-[#02050c]/50 text-slate-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="e.g. how-to-avoid-payment-frauds"
                    />
                    <div className="text-[10px] text-emerald-400/70 font-mono tracking-tight flex items-center gap-1">
                      <Globe className="h-3 w-3 inline" /> 
                      <span className="truncate">{t("URL preview:")} /blog/{formData.slug || "post-url-handle"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black tracking-widest text-[#a3b3cc] uppercase block">
                      {t("Category / Topic SELECTOR")}
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => updateField("category_id", e.target.value)}
                      className="w-full border border-white/5 bg-[#02050c]/50 text-slate-300 rounded-lg p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="" className="bg-[#02050c]">{t("Select Category...")}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-[#02050c] text-white">
                          {cat.name} ({cat.type || t("Topic")})
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 block">{t("Or manually supply one in text format.")}</span>
                  </div>
                </div>

                {/* Excerpt Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black tracking-widest text-[#a3b3cc] uppercase">
                      {t("Excerpt / Summary")}
                    </label>
                    <span className="text-[10px] text-slate-500">{t("Shows on list indices (Optional)")}</span>
                  </div>
                  <textarea
                    rows={2}
                    value={formData.excerpt}
                    onChange={(e) => updateField("excerpt", e.target.value)}
                    placeholder={t("Provide a compelling 1-2 sentence hook summarizing the blog article...")}
                    className="w-full border border-white/5 bg-[#02050c]/50 text-slate-300 text-xs rounded-lg p-3 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-slate-600 transition-all font-sans leading-relaxed"
                  />
                </div>

                {/* Expanded content editorial block wrapper WITH Drag & Drop banner overlay support */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-black tracking-widest text-[#a3b3cc] uppercase">
                        {t("Article Editorial Body")}
                      </label>
                      <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded border border-white/5 bg-white/[0.01] tracking-wide font-mono">
                        {t("Markdown + HTML support")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-bold bg-white/[0.01] px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-slate-400" />
                        {n(wordCount)} {t("words")}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold bg-white/[0.01] px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {n(readingTime)} {t("min read")}
                      </span>
                    </div>
                  </div>

                  {/* WYSIWYG Content Editor Toolbar */}
                  <div className="bg-[#02050c] border border-white/5 p-2 rounded-t-xl flex flex-wrap gap-1 items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {/* Font togglers */}
                      <button type="button" onClick={() => handleToolbarAction("bold")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Bold text")}><Bold className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("italic")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Italic text")}><Italic className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("underline")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Underline Text")}><Underline className="h-3.5 w-3.5" /></button>
                      
                      <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                      {/* Headings */}
                      <button type="button" onClick={() => handleToolbarAction("h1")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 font-black text-xs" title={t("Heading 1")}><Heading1 className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("h2")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 font-black text-xs" title={t("Heading 2")}><Heading2 className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("h3")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5 font-black text-xs" title={t("Heading 3")}><Heading3 className="h-3.5 w-3.5" /></button>
                      
                      <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                      {/* Blocks list content formatting */}
                      <button type="button" onClick={() => handleToolbarAction("bullet")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Bullet list")}><List className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("numeric")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Numbered list")}><ListOrdered className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("blockquote")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Blockquote")}><Quote className="h-3.5 w-3.5" /></button>
                      
                      <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

                      {/* Media inserts helpers */}
                      <button type="button" onClick={() => handleToolbarAction("table")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Insert Table")}><Table className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("code")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Code Block")}><Code className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("divider")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Horizontal Line")}><Minus className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => handleToolbarAction("link")} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5" title={t("Insert Link")}><LinkIcon className="h-3.5 w-3.5" /></button>
                    </div>

                    {/* Integrated custom Inline Image media tools inside content */}
                    <div className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setMediaPurpose("inline");
                          setMediaLibraryOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded transition-all cursor-pointer"
                        title={t("Upload/Select inline image")}
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>{t("Insert Content Image")}</span>
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "inline")}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/5"
                        title={t("Quick upload local file here")}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Editorial area with drag and drop overlays on drag state */}
                  <div 
                    className="relative"
                    onDragOver={handleEditorDragOver}
                    onDragLeave={handleEditorDragLeave}
                    onDrop={handleEditorDrop}
                  >
                    <textarea
                      id="blog-content-textarea"
                      rows={24}
                      value={formData.content}
                      onChange={(e) => updateField("content", e.target.value)}
                      placeholder={t("# Welcome to your blog post edit workspace... Write beautiful stories or guides.")}
                      className="w-full border-x border-b border-white/5 bg-[#02050c]/30 text-slate-100 rounded-b-xl p-4.5 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                    />

                    {isDraggingOverEditor && (
                      <div className="absolute inset-0 bg-emerald-950/80 border-2 border-dashed border-emerald-400/50 rounded-b-xl flex flex-col items-center justify-center space-y-3 animate-fade-in backdrop-blur-sm">
                        <Upload className="h-10 w-10 text-emerald-400 animate-bounce" />
                        <h3 className="text-base font-black text-white">{t("Drop to Upload Your Graphic")}</h3>
                        <p className="text-xs text-slate-350">{t("Images dropped here automatically load to the directory and insert into content.")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-white/5 pt-4">
                  <span className="flex items-center gap-1 max-w-[280px]">
                    <Clock className="h-3.5 w-3.5 text-slate-450" />
                    <span>{t("Autosave:")} {t(autosaveStatus)}</span>
                  </span>
                  <span>{t("Last database saved:")} <strong className="text-slate-400">{lastSavedTime}</strong></span>
                </div>

              </div>
            )}

            {/* Split Screen Active View Section block */}
            {activeTab === "split" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-6 select-none opacity-80 pointer-events-none">
                <span className="text-xs text-slate-400 block -mb-2 col-span-2 font-bold tracking-wider">{t("SPLIT SCREEN ACTIVE: RENDERING PREVIEW BELOW:")}</span>
              </div>
            )}

            {/* Tab: Real Live Content Rendering Layout simulated (Visual Frontend card) */}
            {(activeTab === "preview" || activeTab === "split") && (
              <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-8 text-slate-200 leading-relaxed font-sans mt-2">
                
                {/* Heading details */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      {formData.category_id 
                        ? categories.find(c => c.id === formData.category_id)?.name || t("Live Theme")
                        : t("Uncategorized")}
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-slate-400 font-medium">{n(readingTime)} {t("min read")}</span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-slate-400 font-medium">{t("Author Code: Admin")}</span>
                    {formData.is_pinned && (
                      <>
                        <span className="text-slate-500 text-xs">•</span>
                        <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 uppercase font-black tracking-wide px-1.5 py-0.5 rounded">
                          {t("Pinned")}
                        </span>
                      </>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    {formData.title || t("Headline preview is empty")}
                  </h1>

                  {formData.excerpt && (
                    <p className="text-base text-slate-300 font-medium italic border-l-2 border-emerald-500 pl-4 py-1 leading-relaxed">
                      {formData.excerpt}
                    </p>
                  )}
                </div>

                {/* Simulated Article Banner */}
                {formData.featured_image ? (
                  <div className="relative rounded-xl overflow-hidden group shadow-xl border border-white/5 max-h-[420px] aspect-video">
                    <img
                      src={formData.featured_image}
                      alt={featuredImageAlt || t("Banner preview")}
                      style={{
                        objectPosition: `${focalPoint.x}% ${focalPoint.y}%`
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 transform group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-4">
                      {featuredImageAlt && (
                        <span className="text-[10px] text-white/80 bg-zinc-950/70 p-1.5 px-3 rounded backdrop-blur-md">
                          {t('Alt tag applied: "{{alt}}"', { alt: featuredImageAlt })}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {t("Focal coordinates:")} {n(focalPoint.x)}% {n(focalPoint.y)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-white/5 bg-[#02050c]/40 rounded-xl py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                    <ImageIcon className="h-8 w-8 text-slate-650" />
                    <span className="text-xs font-black tracking-wider">{t("ARTICLE IS MISSING A FEATURED IMAGE")}</span>
                  </div>
                )}

                {/* Simulated Grid: Table of Contents & Body content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Table of Contents left panel (1 column) */}
                  {headingList.length > 0 && (
                    <div className="md:col-span-1 space-y-4 border-r border-white/5 pr-4 hidden md:block">
                      <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{t("Outline")}</span>
                      </h4>
                      <ul className="space-y-2.5 text-xs font-semibold">
                        {headingList.map((head, i) => (
                          <li
                            key={i}
                            className={`hover:text-emerald-300 leading-tight ${
                              head.level === 1
                                ? "text-slate-300 font-bold"
                                : head.level === 2
                                  ? "text-slate-400 font-medium pl-2"
                                  : "text-slate-550 font-normal pl-4"
                            }`}
                          >
                            <span className="text-[9px] text-[#55f2a1]/40 mr-1">#</span>
                            {head.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Markdown post text wrapper (3 columns) */}
                  <div className={`${headingList.length > 0 ? "md:col-span-3" : "md:col-span-4"} prose prose-invert max-w-none prose-sm sm:prose-base leading-relaxed`}>
                     <div className="text-slate-200 select-all font-sans space-y-4">
                       <Markdown rehypePlugins={[rehypeRaw]}>{formData.content || t("*There's no text in the dashboard content editor body yet. Please write some words.*")}</Markdown>
                       
                       {formData.attachment_url && (
                         <div className="mt-8 p-5 bg-[#0a1424] rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                           <div className="flex items-center gap-3.5">
                             <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                               <FileText className="h-6 w-6" />
                             </div>
                             <div className="text-left">
                               <h4 className="text-sm font-bold text-white tracking-tight">
                                 {formData.attachment_name || t("Attachment File")}
                               </h4>
                               <p className="text-xs text-slate-450 mt-0.5">
                                 {t("Click the button to download this resource")}
                               </p>
                             </div>
                           </div>
                           <a
                             href={formData.attachment_url}
                             download={formData.attachment_name || "attachment.txt"}
                             className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-950/20 w-full sm:w-auto justify-center"
                           >
                             <Download className="h-4 w-4" />
                             <span>{t("Download")}</span>
                           </a>
                         </div>
                       )}
                     </div>
                  </div>
                </div>

                {formData.tags && (
                  <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5">
                    {formData.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag, idx) => (
                      <span key={idx} className="text-xs bg-[#091124] hover:bg-white/5 text-slate-305 px-2.5 py-1 rounded-full border border-white/5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Sidebar Module Options 3: Local Revision History records list */}
            {revisions.length > 0 && (
              <div className="p-4 bg-[#050b12] rounded-xl border border-white/5 shadow-2xl">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3.5">
                  <History className="h-4 w-4" />
                  <span>{t("Revision History Drafts ({{count}})", { count: n(revisions.length) })}</span>
                </h3>
                <div className="divide-y divide-white/5">
                  {revisions.map((rev, index) => (
                    <div key={index} className="py-2.5 flex justify-between items-center text-xs first:pt-0 last:pb-0">
                      <div>
                        <span className="font-bold text-white block">{t("Saved Draft {{time}}", { time: rev.time })}</span>
                        <span className="text-[10px] text-slate-555 font-mono">{t("Size matches: {{size}} characters", { size: n(rev.content.length) })}</span>
                      </div>
                      <button
                        onClick={() => handleRestoreRevision(rev.content, rev.title)}
                        className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded font-bold transition-all"
                      >
                        {t("Restore Draft")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Area: Right (4 columns) */}
          <div className={`${activeTab === "preview" ? "hidden" : "lg:col-span-4"} space-y-6`}>
            
            {/* module 1: Publish Settings */}
            <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-xl p-5 space-y-4">
              <h3 className="text-xs font-black text-[#a3b3cc] uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2.5">
                <Settings className="h-4 w-4 text-slate-400" />
                <span>{t("Publish Settings")}</span>
              </h3>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                  {t("Publishing Status")}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="w-full border border-white/5 bg-[#02050c] text-white rounded-lg p-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="Draft" className="bg-[#02050c]">{t("Draft (Auto-saving)")}</option>
                  <option value="Published" className="bg-[#02050c]">{t("Published (Go Live)")}</option>
                  <option value="Scheduled" className="bg-[#02050c]">{t("Scheduled (Timed Publish)")}</option>
                  <option value="Unpublished" className="bg-[#02050c]">{t("Unpublished")}</option>
                  <option value="Archived" className="bg-[#02050c]">{t("Archived")}</option>
                </select>
              </div>

              {/* Conditional Scheduled inputs */}
              {formData.status === "Scheduled" && (
                <div className="space-y-2 p-3 bg-[#02050c]/60 rounded-lg border border-white/5 animate-fade-in">
                  <label className="text-[9px] font-black text-amber-400 uppercase tracking-widest block flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{t("Set Publish Date & Time")}</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full bg-zinc-950/60 text-white rounded p-1.5 text-xs border border-white/5 font-mono"
                  />
                  {scheduledDate && (
                    <span className="text-[9px] font-medium text-slate-500 block">
                      {t("Will publish at:")} <strong className="text-slate-450">{new Date(scheduledDate).toLocaleString()}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Pin toggler checkbox */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={formData.is_pinned}
                  onChange={(e) => updateField("is_pinned", e.target.checked)}
                  className="h-4 w-4 rounded border-white/5 text-emerald-600 focus:ring-emerald-500/25 bg-[#02050c]/50 cursor-pointer"
                />
                <label htmlFor="is_pinned" className="text-xs font-bold text-slate-350 cursor-pointer select-none">
                  {t("Pin to top of blog list")}
                </label>
              </div>

              {/* Tags Comma separated */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase block">
                  {t("Tags (Comma Separated)")}
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => updateField("tags", e.target.value)}
                  className="w-full border border-white/5 bg-[#02050c] text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-sans"
                  placeholder={t("safety, scam alert, facebook page")}
                />
              </div>

              {/* Publish/Draft Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                <button
                  onClick={() => handleSave("Draft")}
                  disabled={saving}
                  className="w-full bg-slate-800 hover:bg-slate-750 text-[#cbd5e1] font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  {t("Save Draft")}
                </button>
                <button
                  onClick={() => handleSave(formData.status === "Draft" ? "Published" : formData.status)}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20"
                >
                  <Globe className="h-3 w-3" />
                  {formData.status === "Draft" ? t("Publish Post") : t("Save Changes")}
                </button>
              </div>

              <button
                onClick={handleDelete}
                className="w-full text-rose-450 hover:text-rose-400 font-bold py-2 hover:bg-rose-500/10 border border-rose-500/5 hover:border-rose-500/10 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t("Delete Post")}</span>
              </button>
            </div>

            {/* module 2: Featured Image Thumbnail Manager */}
            <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-black text-[#a3b3cc] uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                  <span>{t("Featured Image")}</span>
                </h3>
                <span className="text-[10px] text-slate-500">{t("Blog thumbnail")}</span>
              </div>

              {/* Thumbnail Display with Focal selector Coordinates overlay */}
              {formData.featured_image ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-amber-500 tracking-wider uppercase block">
                      {t("Click image below to set Focal Point:")}
                    </span>
                    <div 
                      className="relative rounded-lg overflow-hidden border border-white/5 aspect-video bg-[#02050c] cursor-crosshair group group-sizing select-none"
                      onClick={handleFocalPointClick}
                    >
                      <img
                        src={formData.featured_image}
                        alt={t("Crop thumbnail grid editor")}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                      {/* Target Locator bubble */}
                      <div 
                        className="absolute h-5 w-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-emerald-400 bg-emerald-500/40 shadow-inner flex items-center justify-center animate-pulse"
                        style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
                      >
                        <div className="h-1 w-1 rounded-full bg-white"></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>{t("Coordinates:")} X: {n(focalPoint.x)}% Y: {n(focalPoint.y)}%</span>
                      <button
                        onClick={() => { setFocalPoint({ x: 50, y: 50 }); setHasUnsavedChanges(true); }}
                        className="text-emerald-450 hover:underline"
                      >
                        {t("Reset Center")}
                      </button>
                    </div>
                  </div>

                  {/* Alt Text Thumbnail input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                      {t("Thumbnail Alt Text *")}
                    </label>
                    <input
                      type="text"
                      value={featuredImageAlt}
                      onChange={(e) => {
                        setFeaturedImageAlt(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. Shield protection lock"
                      className="w-full border border-white/5 bg-[#02050c] text-white p-2 text-xs rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateField("featured_image", "");
                        setFeaturedImageAlt("");
                      }}
                      className="flex-1 bg-rose-550/10 hover:bg-rose-550/20 text-rose-450 border border-rose-550/10 py-1.5 rounded text-[10px] font-bold text-center transition-all"
                    >
                      {t("Remove Thumbnail")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPurpose("featured");
                        setMediaLibraryOpen(true);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 py-1.5 rounded text-[10px] font-bold text-center transition-all"
                    >
                      {t("Choose Upload")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-white/5 bg-[#02050c]/60 p-6 rounded-lg text-center space-y-3">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-full inline-block text-slate-500">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300">{t("Set Thumbnail Image")}</p>
                    <p className="text-[10px] text-slate-550">{t("JPG, PNG, WEBP files are accepted.")}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPurpose("featured");
                        setMediaLibraryOpen(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 rounded-lg transition-all cursor-pointer"
                    >
                      {t("Choose From Reusable Assets")}
                    </button>

                    <input
                      type="file"
                      ref={featuredFileInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "featured")}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => featuredFileInputRef.current?.click()}
                      className="bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 border border-white/5 text-xs font-bold py-2 rounded-lg transition-all"
                    >
                      {t("Upload New File")}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick URL Input for featured image */}
              <div className="space-y-1 border-t border-white/5 pt-3">
                <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase block">
                  {t("Featured URL Link Input")}
                </label>
                <input
                  type="text"
                  value={formData.featured_image}
                  onChange={(e) => updateField("featured_image", e.target.value)}
                  className="w-full border border-white/5 bg-[#02050c] text-white p-2 text-xs rounded-lg font-mono focus:outline-none"
                  placeholder="https://example.com/mock.webp"
                />
              </div>

            </div>

            {/* module 2.5: Blog Attachment File */}
            <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-black text-[#a3b3cc] uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>{t("File Attachment")}</span>
                </h3>
                <span className="text-[10px] text-slate-550">{t("Allow downloads")}</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                    {t("Attachment Name")}
                  </label>
                  <input
                    type="text"
                    value={formData.attachment_name || ""}
                    onChange={(e) => updateField("attachment_name", e.target.value)}
                    placeholder="e.g. Fraud List.txt"
                    className="w-full border border-white/5 bg-[#02050c] text-white p-2 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                    {t("Attachment File")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.attachment_url || ""}
                      onChange={(e) => updateField("attachment_url", e.target.value)}
                      placeholder={t("Paste URL or upload a file...")}
                      className="w-full border border-white/5 bg-[#02050c] text-white p-2 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <input
                      type="file"
                      ref={attachmentFileInputRef}
                      onChange={handleAttachmentFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => attachmentFileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 px-3 text-xs font-black rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      title={t("Upload text file")}
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-550">{t("Users will see a beautiful download button under the blog post.")}</p>
                </div>
              </div>
            </div>

            {/* module 3: Advanced SEO Section */}
            <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <h3 className="text-xs font-black text-[#a3b3cc] uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-400" />
                  <span>{t("SEO Optimizer")}</span>
                </h3>
                <button
                  type="button"
                  onClick={handleAutoRecommendSEO}
                  className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                  title={t("Copy titles and excerpts to SEO metadata fields instantly")}
                >
                  <RefreshCw className="h-2.5 w-2.5 animate-spin-hover" />
                  <span>{t("Auto Fill")}</span>
                </button>
              </div>

              {/* Focus Keyword */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                    {t("Focus Keyword")}
                  </label>
                  {formData.focus_keyword && (
                    <span className="text-[9px] bg-slate-500/10 border border-[#475569]/30 text-slate-400 px-1.5 rounded font-mono">
                      {t("Targeted")}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.focus_keyword}
                  onChange={(e) => updateField("focus_keyword", e.target.value)}
                  placeholder={t("e.g. facebook reviews scam")}
                  className="w-full border border-white/5 bg-[#02050c] text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* SEO Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                    {t("SEO Meta Title")}
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${
                    formData.seo_title.length >= 50 && formData.seo_title.length <= 60 
                      ? "text-emerald-400" 
                      : "text-slate-500"
                  }`}>
                    {n(formData.seo_title.length)} {t("chars (Goal: 50-60)")}
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => updateField("seo_title", e.target.value)}
                  className="w-full border border-white/5 bg-[#02050c] text-white rounded-lg p-2.5 text-xs focus:outline-none"
                  placeholder={t("Title tag displayed in Google...")}
                />
              </div>

              {/* SEO Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black tracking-widest text-[#a3b3cc] uppercase">
                    {t("SEO Meta Description")}
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${
                    formData.seo_description.length >= 120 && formData.seo_description.length <= 160
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }`}>
                    {n(formData.seo_description.length)} {t("chars (Goal: 120-160)")}
                  </span>
                </div>
                <textarea
                  rows={2.5}
                  value={formData.seo_description}
                  onChange={(e) => updateField("seo_description", e.target.value)}
                  className="w-full border border-white/5 bg-[#02050c] text-slate-300 rounded-lg p-2.5 text-xs leading-relaxed focus:outline-none"
                  placeholder={t("Summarize article and include keywords...")}
                />
              </div>

              {/* OG Social section */}
              <div className="space-y-3 border-t border-white/5 pt-3">
                <span className="text-[10px] font-black text-rose-450 tracking-wider uppercase block">
                  {t("Open Graph (Social Sharing)")}
                </span>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">{t("Share Title")}</label>
                  <input
                    type="text"
                    value={formData.og_title}
                    onChange={(e) => updateField("og_title", e.target.value)}
                    className="w-full border border-white/5 bg-[#02050c] text-white p-1.5 text-xs rounded focus:outline-none"
                    placeholder={t("Same as SEO Title")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">{t("Share Description")}</label>
                  <textarea
                    rows={1.5}
                    value={formData.og_description}
                    onChange={(e) => updateField("og_description", e.target.value)}
                    className="w-full border border-white/5 bg-[#02050c] text-slate-300 p-1.5 text-xs rounded focus:outline-none"
                    placeholder={t("Same as SEO Description")}
                  />
                </div>

                {/* Open Graph share image */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">{t("Share Banner Image")}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.og_image}
                      onChange={(e) => updateField("og_image", e.target.value)}
                      className="flex-1 border border-white/5 bg-[#02050c] text-white p-1.5 text-xs rounded font-mono focus:outline-none"
                      placeholder="/uploads/og.webp"
                    />
                    
                    <input
                      type="file"
                      ref={ogFileInputRef}
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "og")}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => ogFileInputRef.current?.click()}
                      className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs"
                      title={t("Upload custom graphic for OG sharing")}
                    >
                      {t("Upload")}
                    </button>
                  </div>
                  {formData.og_image && (
                    <img 
                      src={formData.og_image} 
                      alt={t("Open graph sharing layout")} 
                      className="mt-1.5 rounded border border-white/5 h-12 w-full object-cover"
                    />
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Advanced Media Library Overlay Drawer Dialog Module */}
      {mediaLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#050b12] rounded-xl border border-white/5 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col h-[580px] animate-fade-in relative">
            
            {/* Header drawer */}
            <div className="p-4 bg-zinc-950/40 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                  <ImageIcon className="h-4.5 w-4.5 text-emerald-400" />
                  <span>{t("WordPress-Style Post Media Room")}</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{t("Choose previously loaded files, delete unused media, or configure sizing properties.")}</p>
              </div>
              <button
                onClick={() => setMediaLibraryOpen(false)}
                className="text-slate-400 hover:text-white font-black text-xl px-2 hover:bg-white/5 rounded-lg transition-all"
              >
                &times;
              </button>
            </div>

            {/* Split Grid: library files & styling configurations */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              
              {/* Media selection area (Col-span 8) */}
              <div className="md:col-span-8 p-4 flex flex-col space-y-4 overflow-hidden border-r border-white/5">
                
                {/* Search & drag and drop files loader */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-550" />
                    <input
                      type="text"
                      placeholder={t("Search image records by file name...")}
                      value={mediaSearch}
                      onChange={(e) => setMediaSearch(e.target.value)}
                      className="bg-[#02050c] text-white border border-white/5 rounded-lg pl-8 p-1.5 text-xs w-full focus:outline-none"
                    />
                  </div>

                  <input
                    type="file"
                    id="library-direct-uploader"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processAndUploadFile(file, "inline");
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById("library-direct-uploader")?.click()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Upload className="h-3 w-3" />
                    <span>{t("Upload New Media File")}</span>
                  </button>
                </div>

                {/* Reusable media elements loader grid */}
                <div className="flex-1 overflow-y-auto pr-1">
                  {mediaLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent"></div>
                    </div>
                  ) : filteredMedia.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 space-y-2">
                      <ImageIcon className="h-10 w-10 text-slate-700" />
                      <p className="text-xs font-black">{t("No images uploaded to server directory yet")}</p>
                      <p className="text-[10px] text-slate-600">{t("Select file above to add elements to the reusable grid.")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredMedia.map((item) => {
                        const isChosenInline = inlineImageConfig.src === item.url;
                        const isChosenFeatured = formData.featured_image === item.url;
                        const isChosenOg = formData.og_image === item.url;
                        const isSelectedInAny = isChosenInline || (mediaPurpose === "featured" && isChosenFeatured) || (mediaPurpose === "og" && isChosenOg);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectMediaItem(item)}
                            className={`p-1.5 rounded-lg border bg-zinc-950/20 aspect-square flex flex-col relative group cursor-pointer overflow-hidden transition-all capitalize hover:scale-[1.02] ${
                              isSelectedInAny 
                                ? "border-emerald-500 bg-emerald-950/10 shadow-lg shadow-emerald-950/20" 
                                : "border-white/5 hover:border-white/10"
                            }`}
                          >
                            <img
                              src={item.url}
                              alt={item.filename}
                              className="w-full flex-1 object-cover rounded-md"
                            />
                            
                            <span className="text-[9px] font-mono leading-tight font-black font-semibold truncate text-slate-400 mt-1.5 w-full select-none">
                              {item.filename || t("No title name")}
                            </span>

                            {/* Badge indicator on items choice */}
                            {isSelectedInAny && (
                              <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                                <Check className="h-3 w-3 font-extrabold" />
                              </div>
                            )}

                            {/* Detach button icon */}
                            <button
                              onClick={(e) => handleDeleteMediaItem(e, item.id)}
                              className="absolute bottom-6 right-2 p-1 rounded bg-zinc-950/90 text-rose-450 hover:text-rose-400 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                              title={t("Delete permanently")}
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Configurations widget right settings (Col-span 4 for Inline setup) */}
              <div className="md:col-span-4 p-4 bg-zinc-950/20 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider border-b border-white/5 pb-2">
                    {mediaPurpose === "inline" ? t("Inline Image Configurator") : t("Selected Graphic Review")}
                  </h4>

                  {inlineImageConfig.src ? (
                    <div className="space-y-4 animate-fade-in text-xs font-semibold">
                      
                      <div className="space-y-1 bg-[#02050c] p-2 rounded border border-white/5">
                        <span className="text-[10px] text-slate-500 block">{t("Active URL:")}</span>
                        <span className="font-mono text-[9px] text-[#55f2a1] break-all">{inlineImageConfig.src}</span>
                      </div>

                      {mediaPurpose === "inline" && (
                        <>
                          {/* Image Sizing settings */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest text-slate-400 uppercase font-black block">{t("Layout Sizing")}</label>
                            <div className="grid grid-cols-3 gap-1">
                              {["normal", "half", "full"].map((size) => (
                                <button
                                  type="button"
                                  key={size}
                                  onClick={() => setInlineImageConfig((prev) => ({ ...prev, size }))}
                                  className={`p-1.5 text-[9px] rounded font-black border transition-all uppercase ${
                                    inlineImageConfig.size === size
                                      ? "bg-emerald-600 border-emerald-500 text-white"
                                      : "bg-transparent border-white/5 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {t(size)} {t("Width")}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Align options */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] tracking-widest text-slate-400 uppercase font-black block">{t("Align alignment")}</label>
                            <div className="grid grid-cols-3 gap-1">
                              {["left", "center", "right"].map((align) => (
                                <button
                                  type="button"
                                  key={align}
                                  onClick={() => setInlineImageConfig((prev) => ({ ...prev, align }))}
                                  className={`p-1.5 text-[9px] rounded font-black border transition-all uppercase ${
                                    inlineImageConfig.align === align
                                      ? "bg-emerald-600 border-emerald-500 text-white"
                                      : "bg-transparent border-white/5 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {t(align)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Caption */}
                          <div className="space-y-1 border-t border-[#121e33] pt-2">
                            <label className="text-[10px] tracking-widest text-[#cbd5e1] uppercase font-black block">{t("Image Caption Text")}</label>
                            <input
                              type="text"
                              value={inlineImageConfig.caption}
                              onChange={(e) => setInlineImageConfig((prev) => ({ ...prev, caption: e.target.value }))}
                              placeholder={t("e.g. Scammers usually request advanced payment...")}
                              className="w-full bg-[#02050c] text-white p-2 text-xs rounded border border-white/5 focus:outline-none"
                            />
                            <span className="text-[9px] text-slate-500">{t("Caption will show styled italic centered underneath image.")}</span>
                          </div>

                          {/* Alt text */}
                          <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-[#cbd5e1] uppercase font-black block">{t("Alt Description Tag (SEO)")}</label>
                            <input
                              type="text"
                              value={inlineImageConfig.alt}
                              onChange={(e) => setInlineImageConfig((prev) => ({ ...prev, alt: e.target.value }))}
                              placeholder={t("e.g. detailed review of page transaction evidence")}
                              className="w-full bg-[#02050c] text-white p-2 text-xs rounded border border-white/5 focus:outline-none"
                            />
                          </div>

                          {/* Hover Title */}
                          <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-slate-400 uppercase font-black block">{t("Tooltip hover Title *")}</label>
                            <input
                              type="text"
                              value={inlineImageConfig.title}
                              onChange={(e) => setInlineImageConfig((prev) => ({ ...prev, title: e.target.value }))}
                              placeholder={t("Image hover text title")}
                              className="w-full bg-[#02050c] text-white p-2 text-xs rounded border border-white/5 focus:outline-none"
                            />
                          </div>
                        </>
                      )}

                      {/* Manual insert custom link url overlay */}
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-[10px] text-zinc-500">{t("Selected. Ready to insert.")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-500 font-bold text-xs space-y-1">
                      <p>{t("Select any image from left grid")}</p>
                      <p className="text-[10px] text-slate-600 font-normal">{t("to configure insertion properties.")}</p>
                    </div>
                  )}
                </div>

                {/* Final placement trigger action button */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  {mediaPurpose === "inline" ? (
                    <button
                      type="button"
                      onClick={handleInsertInlineConfigImage}
                      disabled={!inlineImageConfig.src}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-lg text-xs transition-colors disabled:opacity-30 cursor-pointer shadow-lg"
                    >
                      {t("Insert Code Block at Cursor")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMediaLibraryOpen(false)}
                      className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer text-center"
                    >
                      {t("Apply To Featured Selection")}
                    </button>
                  )}
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* 1. Blog Post Delete Confirmation Overlay */}
      {showDetailDeleteConfirm && (
        <div className="fixed inset-0 bg-[#02050c]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-base text-white tracking-tight">{t("Delete Blog Post")}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {t("Are you sure you want to permanently delete this blog post? All written text, configs, and status records will be discarded. This action is irreversible.")}
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDetailDeleteConfirm(false)}
                className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDetailsDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-lg shadow-rose-950/20"
              >
                {t("Confirm Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Blog Post Duplicate Confirmation Overlay */}
      {showDetailDuplicateConfirm && (
        <div className="fixed inset-0 bg-[#02050c]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <Plus className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-base text-white tracking-tight">{t("Duplicate Post")}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {t("Would you like to duplicate this blog post as a fresh Draft copy with pre-filled content?")}
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDetailDuplicateConfirm(false)}
                className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                {t("Confirm Duplicate")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Revision Restore Confirmation Overlay */}
      {pendingRevisionRestore && (
        <div className="fixed inset-0 bg-[#02050c]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                <Plus className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-base text-white tracking-tight">{t("Restore Revision")}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {t("Are you sure you want to restore the text content of this post to the older saved revision draft? Any unsaved edits will be replaced.")}
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingRevisionRestore(null)}
                className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreRevision}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-lg shadow-amber-950/20"
              >
                {t("Confirm Restore")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Media Block Image Delete Confirmation Overlay */}
      {pendingMediaDeleteId && (
        <div className="fixed inset-0 bg-[#02050c]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#091124] border border-white/5 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-base text-white tracking-tight">{t("Delete Image")}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {t("Are you sure you want to delete this image? This will remove files from the server permanently and clear references.")}
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingMediaDeleteId(null)}
                className="px-4 py-2 bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] text-slate-300 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmMediaDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-lg"
              >
                {t("Confirm Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
