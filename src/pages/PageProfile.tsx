import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Calendar,
  MessageSquare,
  Star,
  Filter,
  ChevronLeft,
  ChevronRight,
  Reply,
  Phone,
  Globe,
  MapPin,
  Flag,
  Share2,
  ThumbsUp,
  Search,
  BarChart3,
  Smartphone,
  Trash2,
  Pencil,
  DollarSign,
  Facebook,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";

const renderClickableText = (text: string) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      return (
        <a 
          key={idx} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#0fbc6f] hover:underline break-all font-bold"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

function TrustpilotStars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const roundedRating = Math.round(rating);
  const boxClasses = {
    sm: "h-5 w-5 rounded-[3px]",
    md: "h-7 w-7 rounded-[4px]",
    lg: "h-10 w-10 rounded-[6px]",
    xl: "h-12 w-12 rounded-[8px]",
  };
  const starClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4.5 w-4.5",
    lg: "h-6 w-6",
    xl: "h-7 w-7",
  };

  return (
    <div className="flex items-center gap-[3px] select-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`${boxClasses[size]} flex items-center justify-center transition-colors ${i <= roundedRating ? "bg-[#00b67a]" : "bg-[#e5e5eb]"}`}
        >
          <Star className={`${starClasses[size]} text-white fill-white`} />
        </div>
      ))}
    </div>
  );
}


function AdBanner({ htmlCode }: { htmlCode: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
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
  }, [htmlCode]);

  if (!htmlCode) {
    return <div className="hidden" />;
  }

  return (
    <div className="w-full flex justify-center py-4 my-2 select-none">
      <div ref={containerRef} className="ad-container overflow-hidden min-h-[60px]" />
    </div>
  );
}

export default function PageProfile() {
  const { t, n, language } = useLanguage();
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publicSettings, setPublicSettings] = useState<any>({});

  useEffect(() => {
    fetch("/api/public-settings")
      .then((res) => res.json())
      .then((json) => setPublicSettings(json))
      .catch((err) => console.error("Error loading public settings:", err));
  }, []);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [filterRating, setFilterRating] = useState("All");
  const [sortOrder, setSortOrder] = useState("Recent");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Slideshow Gallery states
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Advanced Filters Drawer States
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Search keyword states
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Applied core filters
  const [appliedRatings, setAppliedRatings] = useState<number[]>([]);
  const [appliedVerified, setAppliedVerified] = useState(false);
  const [appliedReplies, setAppliedReplies] = useState(false);
  const [appliedDateRange, setAppliedDateRange] = useState("all");

  // Temporary drawer filters
  const [tempRatings, setTempRatings] = useState<number[]>([]);
  const [tempVerified, setTempVerified] = useState(false);
  const [tempReplies, setTempReplies] = useState(false);
  const [tempDateRange, setTempDateRange] = useState("all");

  // Dynamic preview count of matching reviews
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchKeyword);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;
    
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        setGalleryIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
      } else {
        setGalleryIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
      }
    }
    setTouchStartX(null);
  };

  // Sync drawer open values from applied values
  const openFiltersDrawer = () => {
    setTempRatings([...appliedRatings]);
    setTempVerified(appliedVerified || showVerifiedOnly);
    setTempReplies(appliedReplies);
    setTempDateRange(appliedDateRange);
    setPreviewCount(reviewsData.total);
    setShowFiltersDrawer(true);
  };

  // Drawer action bindings
  const applyFilters = () => {
    setAppliedRatings([...tempRatings]);
    setAppliedVerified(tempVerified);
    setShowVerifiedOnly(tempVerified);
    setAppliedReplies(tempReplies);
    setAppliedDateRange(tempDateRange);
    setCurrentPage(1);
    setShowFiltersDrawer(false);
  };

  const resetFiltersInDrawer = () => {
    setTempRatings([]);
    setTempVerified(false);
    setTempReplies(false);
    setTempDateRange("all");
  };

  const handleStarToggle = (star: number) => {
    setAppliedRatings((prev) => {
      if (prev.includes(star)) {
        return prev.filter((s) => s !== star);
      } else {
        return [...prev, star];
      }
    });
    setCurrentPage(1);
  };

  // Side-panel Preview Counter effect
  useEffect(() => {
    if (!showFiltersDrawer) return;

    setPreviewLoading(true);
    const controller = new AbortController();
    
    const ratingQuery = tempRatings.length > 0 ? `&ratings=${tempRatings.join(',')}` : '';
    const searchVal = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
    const verifiedVal = tempVerified ? `&verifiedOnly=true` : '';
    const repliesVal = tempReplies ? `&repliesOnly=true` : '';
    const dateVal = tempDateRange !== 'all' ? `&dateRange=${tempDateRange}` : '';

    fetch(
      `/api/pages/${id}/reviews?page=1&limit=1${ratingQuery}${searchVal}${verifiedVal}${repliesVal}${dateVal}`,
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Load preview count failed");
        return res.json();
      })
      .then((json) => {
        setPreviewCount(json.total || 0);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      })
      .finally(() => setPreviewLoading(false));

    return () => controller.abort();
  }, [id, showFiltersDrawer, tempRatings, tempVerified, tempReplies, tempDateRange, debouncedSearch]);

  // Track useful clicks
  const [usefulVotes, setUsefulVotes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('review_useful_votes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);

  const handleShare = async (review: any) => {
    const reviewUrl = `${window.location.origin}${window.location.pathname}#review-${review.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Review by ${review.is_anonymous ? "Anonymous" : (review.current_name || "User")}`,
          text: `${review.title} - ${review.description}`,
          url: reviewUrl,
        });
        setCopiedReviewId(review.id);
        setTimeout(() => setCopiedReviewId(null), 2500);
      } else {
        await navigator.clipboard.writeText(reviewUrl);
        setCopiedReviewId(review.id);
        setTimeout(() => setCopiedReviewId(null), 2500);
      }
    } catch (e) {
      console.log("Clipboard format issue or blocked:", e);
      // Fallback
      try {
        await navigator.clipboard.writeText(reviewUrl);
        setCopiedReviewId(review.id);
        setTimeout(() => setCopiedReviewId(null), 2500);
      } catch (err) {
        alert(`Copy this URL to share:\n\n${reviewUrl}`);
      }
    }
  };

  const handleUseful = async (reviewId: string) => {
    const wasUseful = !!usefulVotes[reviewId];
    const newVotes = { ...usefulVotes, [reviewId]: !wasUseful };
    setUsefulVotes(newVotes);
    try {
      localStorage.setItem('review_useful_votes', JSON.stringify(newVotes));
    } catch (e) {
      console.error(e);
    }
    
    // Optimistically update the local useful_count state
    setReviewsData(prev => ({
      ...prev,
      reviews: prev.reviews.map((r: any) => {
        if (r.id === reviewId) {
          const currentCount = Number(r.useful_count || 0);
          return {
            ...r,
            useful_count: wasUseful ? Math.max(0, currentCount - 1) : currentCount + 1
          };
        }
        return r;
      })
    }));

    try {
      const res = await fetch(`/api/reviews/${reviewId}/useful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ increment: !wasUseful })
      });
      if (res.ok) {
        const json = await res.json();
        // Sync with absolute server value
        setReviewsData(prev => ({
          ...prev,
          reviews: prev.reviews.map((r: any) => 
            r.id === reviewId ? { ...r, useful_count: json.useful_count } : r
          )
        }));
      }
    } catch (err) {
      console.error("Failed to update useful count on server:", err);
    }
  };
  const REVIEWS_PER_PAGE = 10;

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<"reviews" | "about" | "summary">(
    "reviews",
  );

  // Owner Reply State
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Dispute / Flag State
  const [disputingReviewId, setDisputingReviewId] = useState<string | null>(
    null,
  );
  const [disputeReason, setDisputeReason] = useState("Spam or fake");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [reviewsData, setReviewsData] = useState<{ reviews: any[]; total: number; totalPages: number }>({ reviews: [], total: 0, totalPages: 1 });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setReviewsLoading(true);
    const controller = new AbortController();

    const ratingQuery = appliedRatings.length > 0 
      ? `&ratings=${appliedRatings.join(',')}` 
      : (filterRating !== 'All' ? `&rating=${filterRating}` : '');
    const searchVal = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
    const verifiedVal = (appliedVerified || showVerifiedOnly) ? `&verifiedOnly=true` : '';
    const repliesVal = appliedReplies ? `&repliesOnly=true` : '';
    const dateVal = appliedDateRange !== 'all' ? `&dateRange=${appliedDateRange}` : '';

    fetch(`/api/pages/${id}/reviews?page=${currentPage}&limit=${REVIEWS_PER_PAGE}${ratingQuery}${searchVal}${verifiedVal}${repliesVal}${dateVal}&sort=${sortOrder}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Load failed");
        return res.json();
      })
      .then((json) => {
        if (json && Array.isArray(json.reviews)) {
          setReviewsData({
            reviews: json.reviews,
            total: json.total || 0,
            totalPages: json.totalPages || 1
          });
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      })
      .finally(() => setReviewsLoading(false));

    return () => controller.abort();
  }, [id, currentPage, filterRating, sortOrder, showVerifiedOnly, appliedRatings, appliedVerified, appliedReplies, appliedDateRange, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Extract data safely
  const page = data?.page;
  const reviews = reviewsData.reviews;

  useEffect(() => {
    if (page?.current_name) {
      const siteName = publicSettings.site_name || "FB Page Review";
      const ratingInfo = Number(page?.average_rating) > 0 ? `(${Number(page.average_rating).toFixed(1)} ★)` : "";
      document.title = `${page.current_name} ${ratingInfo} Reviews & Complaints | ${siteName}`;
    }
  }, [page, publicSettings]);

  const fraudCount = page?.fraud_report_count || 0;

  // Calculate average rating
  const avgRatingNum = Number(page?.average_rating) || 0;
  const avgRating = avgRatingNum.toFixed(1);

  let ratingText = "Excellent";
  if (avgRatingNum < 4) ratingText = "Great";
  if (avgRatingNum < 3) ratingText = "Average";
  if (avgRatingNum < 2) ratingText = "Poor";
  if (avgRatingNum === 0) ratingText = "No reviews";

  const totalPages = reviewsData.totalPages;
  const paginatedReviews = reviews;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRating, showVerifiedOnly, sortOrder]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 py-20">
        <div className="w-10 h-10 border-4 border-[#0fbc6f]/30 border-t-[#0fbc6f] rounded-full animate-spin mb-4" />
        <span className="font-extrabold text-[15px] tracking-wide text-slate-700">Loading business profile...</span>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 py-20">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-4" />
        <span className="font-extrabold text-lg text-slate-800">Business Page Not Found</span>
        <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">We couldn't retrieve information for the requested profile.</p>
        <Link to="/" className="mt-6 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm">Return Home</Link>
      </div>
    );
  }

  const showPublicly = publicSettings?.show_publicly !== "false";
  const shouldMask = publicSettings?.mask_numbers === "true";

  const formatAndMaskNumber = (val: string) => {
    if (!val) return "";
    const clean = val.trim();
    // Use masking if showPublicly is false or shouldMask is true.
    const mustMask = !showPublicly || shouldMask;
    if (!mustMask) {
      return clean;
    }
    const digitsOnly = clean.replace(/\D/g, "");
    if (digitsOnly.length >= 6) {
      if (clean.startsWith("+880")) {
        if (clean.length >= 13) {
          return clean.substring(0, 10) + "xxxx" + clean.slice(-2);
        }
        return clean.substring(0, 8) + "xxxx" + clean.slice(-2);
      } else if (clean.startsWith("880")) {
        if (clean.length >= 12) {
          return clean.substring(0, 9) + "xxxx" + clean.slice(-2);
        }
        return clean.substring(0, 7) + "xxxx" + clean.slice(-2);
      } else if (clean.startsWith("01")) {
        return clean.substring(0, 6) + "xxxx" + clean.slice(-2);
      } else {
        if (clean.length > 6) {
          return clean.substring(0, Math.max(3, clean.length - 6)) + "xxxx" + clean.slice(-2);
        }
        return clean;
      }
    }
    return clean;
  };

  const maskAnyPhoneInString = (text: string) => {
    if (!text) return "";
    const mustMask = !showPublicly || shouldMask;
    if (!mustMask) {
      return text;
    }
    return text.replace(/(\+?88)?01[3-9]\d{8}/g, (match) => {
      const clean = match.trim();
      if (clean.startsWith("+880")) {
        return clean.substring(0, 10) + "xxxx" + clean.slice(-2);
      } else if (clean.startsWith("880")) {
        return clean.substring(0, 9) + "xxxx" + clean.slice(-2);
      } else if (clean.startsWith("01")) {
        return clean.substring(0, 6) + "xxxx" + clean.slice(-2);
      } else {
        return clean.substring(0, Math.max(3, clean.length - 4)) + "xxxx" + clean.slice(-2);
      }
    });
  };

  let parsedExtraContacts: string[] = [];
  try {
    if (page.extra_contacts) {
      if (page.extra_contacts.startsWith("[") && page.extra_contacts.endsWith("]")) {
        parsedExtraContacts = JSON.parse(page.extra_contacts);
      } else {
        parsedExtraContacts = page.extra_contacts.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
  } catch (e) {
    if (page.extra_contacts) {
      parsedExtraContacts = page.extra_contacts.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }
  let parsedPaymentMethods: string[] = [];
  try {
    if (page.payment_methods) {
      if (page.payment_methods.startsWith("[") && page.payment_methods.endsWith("]")) {
        parsedPaymentMethods = JSON.parse(page.payment_methods);
      } else {
        parsedPaymentMethods = page.payment_methods.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
  } catch (e) {
    if (page.payment_methods) {
      parsedPaymentMethods = page.payment_methods.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }
  let parsedOtherUrls: string[] = [];
  try {
    if (page.other_urls) parsedOtherUrls = JSON.parse(page.other_urls);
  } catch (e) {}
  // Build a set of all known page-registered numbers (normalized digits only) to exclude from flagged list
  const knownPageNumbers = new Set<string>([
    page.contact_number,
    ...parsedExtraContacts,
    ...parsedPaymentMethods,
  ].filter(Boolean).map((n: string) => n.replace(/\D/g, '')));

  const paymentNumbers = Array.from(
    new Set(
      reviews
        .map((r: any) => r.bkash_number)
        .filter((n: any) => {
          if (!n) return false;
          // Exclude if the digits of this number already exist in the page's own registered numbers
          const digits = n.replace(/\D/g, '');
          for (const known of knownPageNumbers) {
            if (!known) continue;
            if (digits.endsWith(known.replace(/^0+880/, '').replace(/^0+/, '')) ||
                known.replace(/\D/g, '').endsWith(digits.replace(/^0+880/, '').replace(/^0+/, ''))) {
              return false;
            }
          }
          return true;
        })
    ),
  );

  const isOwner = user && page.owner_id === user.id;

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ page_id: page.id, reply_text: replyText }),
      });
      if (res.ok) {
        const result = await res.json();
        setData((prev: any) => ({
          ...prev,
          reviews: prev.reviews.map((r: any) =>
            r.id === reviewId
              ? {
                  ...r,
                  owner_reply: result.reply_text,
                  owner_reply_created_at: result.created_at,
                }
              : r,
          ),
        }));
        setReplyingTo(null);
        setReplyText("");
      } else {
        alert("Failed to submit reply");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReply(false);
    }
  };

  const submitDispute = async (reviewId: string) => {
    if (!disputeDescription.trim()) {
      alert("Please provide a description.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/user/disputes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          page_id: page.id,
          review_id: reviewId,
          reason: disputeReason,
          description: disputeDescription,
        }),
      });
      if (res.ok) {
        alert("Your dispute has been submitted successfully.");
        setDisputingReviewId(null);
        setDisputeDescription("");
        setDisputeReason("Spam or fake");
      } else {
        const body = await res.json();
        alert(body.error || "Failed to submit dispute");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          reviews: prev.reviews.filter((r: any) => r.id !== reviewId),
        }));
        setDeleteConfirmId(null);
      } else {
        alert("Failed to delete review");
      }
    } catch (e) {
      alert("Error deleting review.");
    }
  };

  // Avatar helper with nice random gradients based on name characters
  const getAvatarGradient = (name: string) => {
    const colors = [
      "from-emerald-400 to-teal-500 text-white",
      "from-blue-400 to-indigo-500 text-white",
      "from-purple-400 to-pink-500 text-white",
      "from-rose-400 to-orange-500 text-white",
      "from-amber-400 to-yellow-500 text-white",
    ];
    const charCodeSum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    const maxPageVisible = 5;
    
    if (totalPages <= maxPageVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return (
      <div className="pt-8 flex flex-col items-center border-t border-slate-100 mt-8">
        <div className="text-xs font-semibold text-slate-500 mb-4 tracking-wider uppercase">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-1.5 select-none text-[13px] flex-wrap justify-center">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-10 px-3.5 border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors bg-white cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`el-${idx}`} className="w-10 h-10 flex items-center justify-center text-slate-400 font-extrabold select-none">
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-black transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#0fbc6f] text-white shadow-xs"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 bg-white"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-10 px-3.5 border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors bg-white cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans text-slate-950">
      
      {/* 🌟 Premium Minimal Header Section */}
      <div className="bg-white border-b border-slate-100 py-12">
        <div className="max-w-[1240px] mx-auto px-4 md:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-fade-in">
            
            {/* Left Column: Brand Details & Status Identification */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Distinct Brand Avatar Block */}
              <div className="h-24 w-24 rounded-full ring-4 ring-slate-100 bg-slate-50 p-1 shrink-0 select-none flex items-center justify-center overflow-hidden">
                <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center font-black text-3xl text-slate-800 overflow-hidden">
                  {page.profile_picture ? (
                    <img
                      src={page.profile_picture}
                      alt={page.current_name}
                      className="h-full w-full object-cover scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    page.current_name.trim().charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              {/* Brand Meta Column */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {(!page.status_badge || !page.status_badge.includes("Reported as Fraud")) && (
                    page.claim_status === "Claimed" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {t("Claimed Business")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                        {t("Unclaimed Profile")}
                      </span>
                    )
                  )}

                  {page.status_badge && page.status_badge.includes("Reported as Fraud") && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-bold uppercase tracking-wider">
                      <ShieldAlert className="h-3.5 w-3.5 text-white" /> {t("Fraud")}
                    </span>
                  )}

                  {page.status_badge && page.status_badge.startsWith("Old/Dead Page") && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-500 text-white rounded-md text-[11px] font-bold uppercase tracking-wider">
                      💀 {t("Old/Dead Page")}
                    </span>
                  )}

                  {page.status_badge === "Verified Marketplace Seller" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold uppercase tracking-wider">
                      ⭐ {t("Verified Seller")}
                    </span>
                  )}

                  {page.status_badge === "Under Review" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#205cd4] text-white rounded-md text-[11px] font-bold uppercase tracking-wider">
                      🔍 {t("Under Review")}
                    </span>
                  )}

                  {page.status_badge === "Suspicious" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#d97706] text-white rounded-md text-[11px] font-bold uppercase tracking-wider">
                      ⚠️ {t("Suspicious")}
                    </span>
                  )}

                  {page.status_badge === "Gold Seller" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white rounded-md text-[11px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 border border-amber-300/30">
                      🏆 {t("Gold Seller")}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4.5xl font-black text-slate-900 tracking-tight leading-tight">
                  {page.current_name}
                </h1>

                {/* Score & Stars aggregate */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded text-sm font-bold text-slate-800">
                    <span>{n(reviewsData.total)}</span>
                    <span className="text-slate-500 font-semibold text-xs ml-1">{t("reviews")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrustpilotStars rating={avgRatingNum} size="md" />
                    <span className="text-slate-950 font-black text-base ml-1">
                      {avgRatingNum > 0 ? n(avgRating) : "-"}
                    </span>
                  </div>
                </div>

                {/* Direct info links */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-semibold text-slate-500">
                  {fraudCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100 font-bold">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> {n(fraudCount)} {t(fraudCount > 1 ? "Fraud Reports" : "Fraud Report")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(!user ||
              (user.role !== "owner" &&
                user.role !== "page_owner" &&
                user.role !== "Business Owner")) && (
              <div className="flex flex-row items-stretch lg:items-center gap-2 sm:gap-3 w-full lg:w-auto mt-4 lg:mt-0 select-none">
                <Link
                  to={`/write-review?pageId=${page.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 bg-[#0fbc6f] text-white hover:bg-[#0da662] rounded-lg font-bold transition-all shadow-xs text-[13px] sm:text-sm cursor-pointer whitespace-nowrap"
                >
                  <Star className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-current text-white shrink-0" />
                  {user && reviews.some((r: any) => r.user_id === user.id)
                    ? t("Edit Review")
                    : t("Write Review")}
                </Link>

                <Link
                  to={`/write-review?pageId=${page.id}&type=fraud`}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-all text-[13px] sm:text-sm cursor-pointer whitespace-nowrap"
                >
                  <AlertTriangle className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-rose-500 shrink-0" />
                  {t("Report Fraud")}
                </Link>

                {(page.facebook_url || page.current_username) && (
                  <a
                    href={
                      page.facebook_url ||
                      `https://facebook.com/${page.current_username}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:text-slate-950 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm whitespace-nowrap"
                  >
                    <span>{t("Visit Facebook Page")}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Warning Flag Box rendered Flat */}
          {(page.status_badge && page.status_badge.includes("Reported as Fraud") || fraudCount > 0) && (
            <div className="mt-8 animate-fade-in">
              {page.status_badge && page.status_badge.includes("Reported as Fraud") ? (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-5 flex items-start gap-4">
                  <div className="p-2 rounded bg-rose-100 text-rose-600 shrink-0 mt-0.5">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                      {t("Warning: Reported as Fraud")}
                    </h4>
                    <p className="text-xs text-rose-700 leading-relaxed mt-1 font-semibold">
                      {t("This page has been reported as fraud. Do not send any money, advanced payments, or personal details to this seller.")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-5 flex items-start gap-4">
                  <div className="p-2 rounded bg-amber-100 text-amber-705 shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                      {t("Warning: Active Disputes")}
                    </h4>
                    <p className="text-xs text-amber-850 leading-relaxed mt-1 font-semibold">
                      {t("Users have reported fraud complaints against this page. Please scroll down to check all evidence and reviews before making any purchases.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 📱 Mobile Tabs Segmented Controller (Flat, Sticky on mobile only) */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setMobileTab("summary")}
            className={`py-2 text-xs font-bold rounded text-center transition-all ${
              mobileTab === "summary"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Summary")}
          </button>
          <button
            onClick={() => setMobileTab("about")}
            className={`py-2 text-xs font-bold rounded text-center transition-all ${
              mobileTab === "about"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("About Pages")}
          </button>
          <button
            onClick={() => setMobileTab("reviews")}
            className={`py-2 text-xs font-bold rounded text-center transition-all ${
              mobileTab === "reviews"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("Reviews")} ({n(reviewsData.total)})
          </button>
        </div>
      </div>

      {/* 🖥️ Main 12-Column Layout Area - Flat structure without arbitrary card floating shapes */}
      <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* 160x600 Skyscraper Vertical Adsterra Banner (Desktop Only - Left Margin Placement) */}
          {publicSettings.profile_sidebar_adsterra_code && (
            <div className="hidden lg:block lg:col-span-2 space-y-4">
              <div className="sticky top-24">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  {t("Sponsored")}
                </div>
                <div className="flex justify-center border border-slate-100 bg-slate-50/50 p-2 rounded-xl">
                  <AdBanner htmlCode={publicSettings.profile_sidebar_adsterra_code} />
                </div>
              </div>
            </div>
          )}

          {/* LEFT CONTENT PANEL (Flat structure) */}
          <div className={`col-span-1 md:col-span-8 ${publicSettings.profile_sidebar_adsterra_code ? 'lg:col-span-7' : 'lg:col-span-8'} space-y-10`}>
            
            {/* 1. Mobile-only rating summary breakdown */}
            <div className={`md:hidden ${mobileTab === "summary" ? "block" : "hidden"} pb-6 border-b border-slate-200`}>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <div className="text-[44px] font-black text-slate-900 leading-none">
                    {avgRatingNum > 0 ? n(avgRating) : "-"}
                  </div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("out of 5.0")}</div>
                </div>

                <div className="flex items-center gap-3">
                  <TrustpilotStars rating={avgRatingNum} size="md" />
                  <span className="text-slate-800 font-extrabold text-sm">{t(ratingText)}</span>
                </div>

                <div className="space-y-2 pt-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter(
                      (r) => Math.round(r.star_rating) === star
                    ).length;
                    const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div
                        key={star}
                        onClick={() => {
                          handleStarToggle(star);
                          setMobileTab("reviews");
                        }}
                        className={`flex items-center gap-3 text-xs font-bold leading-none p-1.5 cursor-pointer rounded-lg hover:bg-slate-50 ${appliedRatings.includes(star) ? "bg-slate-50" : ""}`}
                      >
                        <div className="w-10 text-slate-600">{n(star)}-{t("star")}</div>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              star >= 4
                                ? "bg-[#00b67a]"
                                : star === 3
                                  ? "bg-amber-400"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="w-8 text-right font-black text-slate-800">{n(percent)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Page Details (About) Row - Premium Flat Styling */}
            <div className={`space-y-6 ${mobileTab !== "about" ? "hidden md:block" : "block"} pb-10 border-b border-slate-200`}>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-800" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  {t("Facebook Page Details")}
                </h2>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {page.page_details ? renderClickableText(page.page_details) : (
                  <span className="italic text-slate-400 font-medium">
                    {t("No specific page description provided by the business yet. This shop has not customized their public registration info.")}
                  </span>
                )}
              </p>

              <div className="pt-2">
                <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-4">
                  {t("Verified Contact Directory")}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {/* Contact Number Deck */}
                  {(page.contact_number || parsedExtraContacts.length > 0) && (
                    <div className="flex items-start gap-3 bg-white border border-slate-200 p-4 rounded-lg">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                      <div className="flex flex-col gap-1.5 col-span-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t("Mobile Contact")}</span>
                        <div className="flex flex-col">
                          {page.contact_number &&
                            page.contact_number
                              .split(",")
                              .map((num: string, idx: number) => {
                                const maskedVal = formatAndMaskNumber(num);
                                const isClickable = showPublicly && !shouldMask;
                                return isClickable ? (
                                  <a
                                    key={`main-${idx}`}
                                    href={`tel:${num.trim()}`}
                                    className="font-bold text-slate-800 hover:text-[#0fbc6f] transition-colors"
                                  >
                                    {maskedVal}
                                  </a>
                                ) : (
                                  <span
                                    key={`main-${idx}`}
                                    className="font-bold text-slate-400 select-none"
                                  >
                                    {maskedVal}
                                  </span>
                                );
                              })}
                          {parsedExtraContacts.map((num: string, idx: number) => {
                            const maskedVal = formatAndMaskNumber(num);
                            const isClickable = showPublicly && !shouldMask;
                            return isClickable ? (
                              <a
                                key={`extra-${idx}`}
                                href={`tel:${num.trim()}`}
                                className="font-bold text-slate-800 hover:text-[#0fbc6f] transition-colors"
                              >
                                {maskedVal}
                              </a>
                            ) : (
                              <span
                                key={`extra-${idx}`}
                                className="font-bold text-slate-400 select-none"
                              >
                                {maskedVal}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Facebook External Link Deck */}
                  {page.facebook_url && (
                    <div className="flex items-start gap-3 bg-white border border-slate-200 p-4 rounded-lg">
                      <Facebook className="h-4 w-4 text-[#1877f2] shrink-0 mt-1" />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t("External Link")}</span>
                        <a
                          href={page.facebook_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#0fbc6f] hover:underline break-all"
                        >
                          {t("Facebook Page")}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Merchant Payment methods */}
                  {parsedPaymentMethods.length > 0 && (
                    <div className="flex items-start gap-3 bg-white border border-slate-200 p-4 rounded-lg sm:col-span-2">
                      <DollarSign className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t("Supported Payment Modes")}</span>
                        <div className="flex flex-wrap gap-2 items-center">
                          {parsedPaymentMethods.map((m: string, idx: number) => (
                            <span
                              key={idx}
                              className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded select-none"
                            >
                              {maskAnyPhoneInString(m)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flagged Payment Wallet Accounts */}
                  {paymentNumbers.length > 0 && (
                    <div className="p-4 bg-amber-50/40 border border-amber-200/50 rounded-lg sm:col-span-2">
                      <h4 className="font-bold text-xs text-amber-900 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        {t("payment accounts flagged in reviews")}
                      </h4>
                      <p className="text-xs text-slate-500 mb-3 font-medium">
                        {t("Other consumers noted these money transfers or wallet accounts in active scam reports:")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {paymentNumbers.map((num: any, idx: number) => (
                          <span
                            key={idx}
                            className="bg-white border border-amber-200 px-2 rounded font-mono font-semibold text-amber-950 text-xs py-0.5 select-none"
                          >
                            {formatAndMaskNumber(num)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 3. REVIEWS SELECTION & LIST - Natural design flowing seamlessly */}
            <div className={`space-y-6 ${mobileTab !== "reviews" ? "hidden md:block" : "block"}`}>
              <div>
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {t("Merchant Reviews")}
                    </h2>
                    <p className="text-xs font-semibold text-slate-400 mt-1">
                      {n(reviewsData.total)} {t("reviews verified, filtered results are listed below")}
                    </p>
                  </div>

                   {(!user ||
                    (user.role !== "owner" &&
                      user.role !== "page_owner" &&
                      user.role !== "Business Owner")) && (
                    <Link
                      to={`/write-review?pageId=${page.id}`}
                      className="text-xs font-black text-[#0fbc6f] hover:underline uppercase tracking-wider bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg select-none transition-all"
                    >
                      {t("Write a review")}
                    </Link>
                  )}
                </div>

                {/* Filter and Search Bar Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-6 border-b border-slate-100 mb-6 font-sans">
                  {/* Search box built in unified page theme */}
                  <div className="relative flex-1">
                    <Search className="h-4.5 w-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder={t("Search reviews by keyword...")}
                      className="h-10.5 w-full pl-10 pr-9 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all font-medium"
                    />
                    {searchKeyword && (
                      <button
                        onClick={() => setSearchKeyword("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold select-none text-base"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Control elements */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                    <button
                      onClick={openFiltersDrawer}
                      className={`h-10.5 px-4 border rounded-lg flex items-center gap-2 hover:bg-slate-50 text-[13px] font-extrabold transition-all outline-none cursor-pointer ${
                        showFiltersDrawer ||
                        appliedRatings.length > 0 ||
                        appliedVerified ||
                        appliedReplies ||
                        appliedDateRange !== "all"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-750"
                      }`}
                    >
                      <Filter className="h-4 w-4" /> {t("Filter")}
                      {(appliedRatings.length > 0 ||
                        appliedVerified ||
                        appliedReplies ||
                        appliedDateRange !== "all") && (
                        <span className="flex items-center justify-center bg-emerald-600 text-white rounded-full w-2 h-2 ml-0.5" />
                      )}
                    </button>

                    <div className="relative shrink-0">
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="h-10.5 pl-4 pr-9 border border-slate-200 rounded-lg text-[13px] font-black text-slate-700 bg-white appearance-none cursor-pointer outline-none hover:bg-slate-50"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2500/svg' fill='none' viewBox='0 0 24 24' stroke-width='2.5' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          backgroundSize: "13px",
                        }}
                      >
                        <option value="Recent">{t("Most Recent")}</option>
                        <option value="Oldest">{t("Oldest")}</option>
                      </select>
                    </div>

                    {(appliedRatings.length > 0 ||
                      appliedVerified ||
                      appliedReplies ||
                      appliedDateRange !== "all" ||
                      searchKeyword ||
                      filterRating !== "All") && (
                      <button
                        onClick={() => {
                          setAppliedRatings([]);
                          setAppliedVerified(false);
                          setShowVerifiedOnly(false);
                          setAppliedReplies(false);
                          setAppliedDateRange("all");
                          setSearchKeyword("");
                          setFilterRating("All");
                          setCurrentPage(1);
                        }}
                        className="h-10.5 px-3 bg-slate-105 hover:bg-slate-200 text-slate-700 rounded-lg text-[13px] font-bold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {t("Reset")} ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Reviews feed stream */}
                <div className="divide-y divide-slate-100 font-sans">
                  {reviewsLoading ? (
                    <div className="space-y-6 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse space-y-4">
                          <div className="flex gap-4 items-center flex-row">
                            <div className="h-11 w-11 rounded-full bg-slate-200" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-slate-200 rounded w-1/4" />
                              <div className="h-3 bg-slate-200 rounded w-1/6" />
                            </div>
                          </div>
                          <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                          <div className="h-3 bg-slate-200 rounded w-full" />
                        </div>
                      ))}
                    </div>
                  ) : paginatedReviews.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                      <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                      <span className="font-extrabold text-[15px] text-slate-700">{t("No matching reviews found")}</span>
                      <p className="text-slate-400 text-xs mt-0.5">{t("Try adjusting your filters, searching another keyword, or resetting results.")}</p>
                    </div>
                  ) : (
                    paginatedReviews.map((review: any) => (
                      <div key={review.id} className="py-6 first:pt-0 last:pb-0 font-sans">
                        {/* Stream Header Info */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3.5">
                            {/* Colorful Initials Avatar */}
                            <div className={`h-11 w-11 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                              review.current_name || (review.user_id === "anonymous" ? "A" : "U")
                            )} font-black flex items-center justify-center text-sm shadow-2xs shrink-0 select-none uppercase`}>
                              {(
                                review.current_name ||
                                (review.user_id === "anonymous" ? "A" : "U")
                              ).substring(0, 2)}
                            </div>

                            <div className="flex flex-col">
                              <div className="font-black text-[14px] text-slate-900 leading-tight">
                                {review.current_name ||
                                  (review.user_id === "anonymous"
                                    ? t("Anonymous User")
                                    : t("Registered Buyer"))}
                              </div>
                              <div className="text-[11px] font-bold text-slate-405 uppercase tracking-wider mt-[2.5px]">
                                {review.user_id !== "anonymous"
                                  ? t("1 review")
                                  : t("Verified Guest")}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-slate-400">
                            {format(
                              new Date(review.updated_at || review.created_at),
                              "MMM d, yyyy"
                            )}
                          </div>
                        </div>

                        {/* Ratings row */}
                        <div className="flex items-center gap-3 mb-3">
                          {review.star_rating && (
                            <TrustpilotStars
                              rating={review.star_rating}
                              size="sm"
                            />
                          )}
                          
                          {review.status === "Verified" && (
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-[#e6f7ef] px-2 py-0.5 rounded-md border border-emerald-100/50">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {t("Verified Buyer")}
                            </div>
                          )}

                          {review.facebook_post_link && (
                            <a
                              href={review.facebook_post_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#1877f2] hover:text-[#145dbf] p-0.5 hover:scale-110 transition-transform shrink-0"
                              title={t("View Facebook Evidence Post")}
                            >
                              <Facebook className="h-4.5 w-4.5 fill-current" />
                            </a>
                          )}

                          {review.share_image_publicly === 1 && review.proof_image && (
                            <button
                              type="button"
                              onClick={() => {
                                let imgs: string[] = [];
                                try {
                                  if (review.proof_image.startsWith('[')) {
                                    imgs = JSON.parse(review.proof_image);
                                  } else {
                                    imgs = [review.proof_image];
                                  }
                                } catch (e) {
                                  imgs = [review.proof_image];
                                }
                                if (imgs.length > 0) {
                                  setGalleryImages(imgs);
                                  setGalleryIndex(0);
                                  setIsGalleryOpen(true);
                                }
                              }}
                              className="text-purple-600 hover:text-purple-700 p-0.5 hover:scale-110 transition-all shrink-0 cursor-pointer"
                              title={t("View Proof Image Gallery")}
                            >
                              <ImageIcon className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>

                        {/* Body content */}
                        <h3 className="font-extrabold text-[15px] text-slate-900 mb-1 leading-snug break-words">
                          {review.title}
                        </h3>
                        <p className="text-[14px] text-slate-650 font-normal leading-relaxed mb-3.5 break-words whitespace-pre-line">
                          {(() => {
                            const isLong = review.description && review.description.length > 300;
                            const isExpanded = expandedReviews[review.id];
                            const displayText = isLong && !isExpanded
                              ? review.description.slice(0, 300) + "..."
                              : review.description;
                            return (
                              <>
                                {renderClickableText(displayText)}
                                {isLong && (
                                  <button
                                    onClick={() => setExpandedReviews(prev => ({ ...prev, [review.id]: !isExpanded }))}
                                    className="text-[#1877f2] hover:text-[#145dbf] font-extrabold text-xs ml-1 inline-block align-baseline transition-colors select-none cursor-pointer"
                                  >
                                    {isExpanded ? t("See Less") : t("See More")}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </p>

                        {/* Action elements */}
                        <div className="flex flex-wrap items-center gap-5 pt-1 text-xs font-black uppercase tracking-wider text-slate-400">
                          <button
                            onClick={() => handleUseful(review.id)}
                            className={`flex items-center gap-1.5 transition-colors group cursor-pointer ${
                              usefulVotes[review.id]
                                ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                                : "hover:text-indigo-600 dark:hover:text-indigo-400"
                            }`}
                          >
                            <ThumbsUp
                              className={`h-[15px] w-[15px] group-hover:scale-110 transition-transform ${
                                usefulVotes[review.id] ? "fill-current" : ""
                              }`}
                              strokeWidth={2.5}
                            />
                            {t("Useful")}{" "}
                            <span className="font-bold text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-300 shrink-0">
                              {n(review.useful_count ?? 0)}
                            </span>
                          </button>
                          
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleShare(review);
                              }}
                              className={`flex items-center gap-1.5 transition-colors group cursor-pointer ${
                                copiedReviewId === review.id
                                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                                  : "hover:text-slate-800 dark:hover:text-white"
                              }`}
                            >
                              <Share2 className="h-[15px] w-[15px] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                              {copiedReviewId === review.id ? t("Copied!") : t("Share")}
                            </button>
                            {copiedReviewId === review.id && (
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-md z-10 animate-fade-in whitespace-nowrap">
                                {t("Link Copied!")}
                              </span>
                            )}
                          </div>

                          {user &&
                            (user.id === review.user_id ||
                              ["admin", "Admin", "Super Admin", "Moderator"].includes(user.role)) && (
                            <div className="flex items-center gap-3.5">
                              <Link
                                to={`/write-review?pageId=${review.page_id}&reviewId=${review.id}`}
                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                              >
                                <Pencil className="h-[14px] w-[14px]" /> {t("Edit")}
                              </Link>

                              {deleteConfirmId === review.id ? (
                                <button
                                  onClick={() => handleDeleteReview(review.id)}
                                  className="text-[10px] text-white bg-rose-600 px-3 py-1 rounded-md hover:bg-rose-700 transition-colors tracking-wide animate-pulse"
                                >
                                  {t("CONFIRM DELETE")}
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(review.id)}
                                  className="flex items-center gap-1.5 text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-[15px] w-[15px]" /> {t("Delete")}
                                </button>
                              )}
                            </div>
                          )}

                          {isOwner && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setDisputingReviewId(review.id);
                              }}
                              className="flex items-center gap-1.5 hover:text-red-600 transition-colors ml-auto text-slate-400 cursor-pointer"
                            >
                              <Flag className="h-[15px] w-[15px]" strokeWidth={2.5} />
                              {t("Report Review")}
                            </button>
                          )}
                        </div>

                        {/* Dispute/Flag Input Panel Form */}
                        {isOwner && disputingReviewId === review.id && (
                          <div className="mt-5 p-5 bg-slate-50 border border-slate-200 rounded-xl border-l-4 border-l-rose-500">
                            <h4 className="font-extrabold text-[14px] text-rose-700 mb-1 flex items-center gap-1.5">
                              <ShieldAlert className="h-4 w-4" /> {t("Dispute Rating")}
                            </h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium">
                              {t("File an official merchant dispute. Admins will review the dispute reasons and page verification credentials.")}
                            </p>
                            
                            <div className="space-y-3">
                              <select
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                className="w-full text-xs font-bold p-2.5 border border-slate-200 bg-white rounded-lg outline-none focus:border-rose-300"
                              >
                                <option value="Spam or fake">{t("Spam or Fake")}</option>
                                <option value="Hate speech">{t("Hate Speech")}</option>
                                <option value="Harassment">{t("Harassment")}</option>
                                <option value="Profanity">{t("Profanity")}</option>
                                <option value="Not a real customer">{t("Not a real customer")}</option>
                              </select>

                              <textarea
                                placeholder={t("State your detailed argument or provide transaction evidence link...")}
                                value={disputeDescription}
                                onChange={(e) => setDisputeDescription(e.target.value)}
                                className="w-full text-sm font-medium p-3.5 border border-slate-200 rounded-lg focus:border-rose-400 outline-none resize-none min-h-[80px]"
                                rows={3}
                              />

                              <div className="flex justify-end gap-2.5 pt-1">
                                <button
                                  onClick={() => setDisputingReviewId(null)}
                                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-4 py-2"
                                >
                                  {t("Cancel")}
                                </button>
                                <button
                                  onClick={() => submitDispute(review.id)}
                                  disabled={submittingDispute}
                                  className="text-xs font-black uppercase text-white bg-rose-500 hover:bg-rose-600 px-5 py-2.5 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                                >
                                  {submittingDispute ? t("Submitting...") : t("Submit Dispute")}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Owner Response/Reply visual Container */}
                        {review.owner_reply && (
                          <div className="mt-5 border-l-4 border-[#0fbc6f] bg-emerald-50/15 p-4 rounded-r-xl">
                            <div className="flex justify-between items-center mb-1.5">
                              <div className="font-bold text-[13px] text-slate-900 flex items-center gap-1">
                                <Reply className="h-3.5 w-3.5 text-[#0fbc6f] rotate-180" />
                                {t("Response from")} {page.current_name}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-400">
                                {format(new Date(review.owner_reply_created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <p className="text-[13px] text-slate-700 leading-relaxed font-medium">
                              {review.owner_reply}
                            </p>
                          </div>
                        )}

                        {/* Owner reply actions button */}
                        {isOwner && !review.owner_reply && replyingTo !== review.id && (
                          <div className="mt-4 flex">
                            <button
                              onClick={() => {
                                setReplyingTo(review.id);
                                setReplyText("");
                              }}
                              className="text-xs font-black uppercase text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 border border-emerald-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Reply className="h-3.5 w-3.5" /> {t("Reply as Owner")}
                            </button>
                          </div>
                        )}

                        {/* Owner Reply Input Form */}
                        {isOwner && replyingTo === review.id && (
                          <div className="mt-4 bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3 font-sans">
                            <span className="text-xs font-black uppercase text-slate-500 tracking-wide">{t("Publish Shop response")}</span>
                            <textarea
                              placeholder={t("Write a polite and professional response...")}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              className="w-full text-sm font-medium p-3.5 border border-slate-200 rounded-lg focus:border-slate-400 outline-none bg-white resize-none"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2.5 font-sans">
                              <button
                                onClick={() => setReplyingTo(null)}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-4 py-2"
                              >
                                {t("Cancel")}
                              </button>
                              <button
                                onClick={() => submitReply(review.id)}
                                disabled={submittingReply || !replyText.trim()}
                                className="text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 px-5 py-2.5 rounded-lg transition-colors shadow-2xs cursor-pointer"
                              >
                                {submittingReply ? t("Posting...") : t("Post Reply")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* REDESIGNED NUMERIC PAGINATION CONTROLS (Creative layout matching user requests) */}
                {renderPagination()}

              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN (4 Columns on desktop) - Separated naturally by thin crisp lines */}
          <div className={`md:col-span-4 ${publicSettings.profile_sidebar_adsterra_code ? 'lg:col-span-3' : 'lg:col-span-4'} pl-0 md:pl-8 border-t md:border-t-0 md:border-l border-slate-200 space-y-8 hidden md:block`}>
            <div className="sticky top-24 space-y-8">
              
              {/* Rating Summary Breakdown Panel */}
              <div className="space-y-4 font-sans">
                <h3 className="font-extrabold text-[12px] text-slate-400 uppercase tracking-widest">
                  {t("Merchant Summary")}
                </h3>

                <div className="flex items-baseline gap-2">
                  <div className="text-[48px] font-black text-slate-900 leading-none">
                    {avgRatingNum > 0 ? n(avgRating) : "-"}
                  </div>
                  <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">/ 5.0</div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-slate-900 font-extrabold text-sm uppercase tracking-wide">
                    {t(ratingText)}
                  </div>
                  <TrustpilotStars rating={avgRatingNum} size="md" />
                  <div className="text-xs text-slate-550 font-semibold pt-1">
                    {t("Based on")} {n(reviewsData.total)} {t("ratings")}
                  </div>
                </div>

                <hr className="border-slate-100 my-4" />

                {/* Rating Percentage lines */}
                <div className="space-y-2.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter(
                      (r) => Math.round(r.star_rating) === star
                    ).length;
                    const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                    return (
                      <div
                        key={star}
                        onClick={() => handleStarToggle(star)}
                        className={`flex items-center gap-3.5 text-xs font-semibold leading-none p-1.5 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors ${
                          appliedRatings.includes(star) ? "bg-emerald-50/50 font-bold" : ""
                        }`}
                      >
                        <div className="w-10 text-slate-600 hover:underline">{n(star)}-{t("star")}</div>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              star >= 4
                                ? "bg-[#0fbc6f]"
                                : star === 3
                                  ? "bg-amber-400"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="w-8 text-right font-black text-slate-805">{n(percent)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* 🔮 Side-panel Filters Slide-out Drawer */}
      <AnimatePresence>
        {showFiltersDrawer && (
          <>
            {/* Backdrop transparent Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFiltersDrawer(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[440px] bg-white shadow-2xl z-50 flex flex-col h-full border-l border-slate-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0 select-none">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  {t("Refine Reviews")}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFiltersDrawer(false)}
                  className="p-1.5 hover:bg-slate-55 rounded-full transition-colors text-slate-400 hover:text-slate-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Drawer Container (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 divide-y divide-slate-100">
                {/* 1. Rating buttons block */}
                <div className="pt-0">
                  <h4 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-wider mb-3">
                    {t("Filter by Rating")}
                  </h4>
                  <div className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const isActive = tempRatings.includes(star);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setTempRatings((prev) =>
                              prev.includes(star)
                                ? prev.filter((s) => s !== star)
                                : [...prev, star]
                            );
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-white shadow-3xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                          }`}
                        >
                          <span className="text-amber-500 font-bold">★</span>
                          <span>{n(star)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Checkboxes filter options */}
                <div className="pt-6">
                  <h4 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-wider mb-4">
                    {t("Assurance Metrics")}
                  </h4>
                  <div className="space-y-4">
                    {/* Verified checkbox badge */}
                    <label className="flex items-start gap-3.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={tempVerified}
                        onChange={(e) => setTempVerified(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-black text-[14px] text-slate-800 group-hover:text-slate-950">
                          {t("Verified Buyer Review")}
                        </span>
                        <p className="text-[12px] text-slate-500 mt-0.5 leading-normal">
                          {t("Only lists reviews with verified purchase confirmation.")}
                        </p>
                      </div>
                    </label>

                    {/* Replies Checkbox panel */}
                    <label className="flex items-start gap-3.5 cursor-pointer group pt-2">
                      <input
                        type="checkbox"
                        checked={tempReplies}
                        onChange={(e) => setTempReplies(e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-black text-[14px] text-slate-800 group-hover:text-slate-950">
                          {t("Contains Shop Replies")}
                        </span>
                        <p className="text-[12px] text-slate-500 mt-0.5 leading-normal">
                          {t("Only displays reviews with answers from the seller profile.")}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 3. Range dates posted */}
                <div className="pt-6">
                  <h4 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-wider mb-4">
                    {t("Date of Submission")}
                  </h4>
                  <div className="space-y-3">
                    {[
                      { value: "all", label: "All history", isDefault: true },
                      { value: "30days", label: "Last 30 days" },
                      { value: "3months", label: "Last 3 months" },
                      { value: "6months", label: "Last 6 months" },
                      { value: "12months", label: "Last 12 months" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center justify-between border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 cursor-pointer transition-colors bg-white hover:bg-slate-50/65"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="drawerDateRange"
                            value={opt.value}
                            checked={tempDateRange === opt.value}
                            onChange={() => setTempDateRange(opt.value)}
                            className="h-4.5 w-4.5 text-[#00b67a] focus:ring-[#00b67a] border-slate-300 cursor-pointer"
                          />
                          <span className="text-[13px] font-black text-slate-800">
                            {opt.label}
                          </span>
                        </div>
                        {opt.isDefault && (
                          <span className="text-[9px] font-black text-slate-450 bg-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
                            {t("default")}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Sticky Footer buttons */}
              <div className="p-6 border-t border-slate-100 shrink-0 bg-white flex items-center justify-between gap-4 select-none">
                <button
                  type="button"
                  onClick={resetFiltersInDrawer}
                  className="text-xs font-black uppercase text-slate-500 hover:text-slate-800 py-3 px-4 transition-colors select-none cursor-pointer"
                >
                  {t("Reset All")}
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  disabled={previewLoading}
                  className="flex-1 text-xs font-black uppercase text-white bg-slate-900 rounded-xl py-3.5 px-6 transition-all hover:bg-slate-800 text-center shadow-md select-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  {previewLoading ? (
                    <span>{t("Updating list...")}</span>
                  ) : (
                    <span>{t("Display")} ({n(previewCount.toLocaleString())}) {t("Results")}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 🖼️ Proof Image Slideshow Modal */}
      <AnimatePresence>
        {isGalleryOpen && galleryImages.length > 0 && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setIsGalleryOpen(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all z-[60] cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Chevron (Slideshow controls) */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-[55] cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Current Image */}
            <div 
              className="max-w-full max-h-[80vh] flex flex-col items-center justify-center select-none" 
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={galleryIndex}
                src={galleryImages[galleryIndex]}
                alt={`Proof detail ${galleryIndex + 1}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-2xl"
              />
              
              {/* Image counter indicator */}
              <div className="mt-4 text-white/70 font-semibold text-sm bg-white/10 px-3 py-1 rounded-full">
                {n(galleryIndex + 1)} / {n(galleryImages.length)}
              </div>
            </div>

            {/* Right Chevron (Slideshow controls) */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-[55] cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Tap or Swipe instruction for mobile */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-semibold select-none pointer-events-none text-center">
              {galleryImages.length > 1 ? t("Tap arrows or swipe to navigate") : t("Click anywhere outside to close")}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
