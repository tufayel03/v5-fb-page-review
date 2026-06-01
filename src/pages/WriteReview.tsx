import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import {
  ShieldCheck,
  Calendar,
  DollarSign,
  ExternalLink,
  Smartphone,
  Star,
  Search,
  Plus,
  Store,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  SquarePen,
  Facebook,
  CreditCard,
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function WriteReview() {
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get("pageId") || "";
  const reviewId = searchParams.get("reviewId") || "";
  const initialType =
    searchParams.get("type") === "fraud" ? "Fraud Report" : "Good";

  const navigate = useNavigate();
  const { user, login } = useAuth();
  const isAdmin = user && [
    "admin",
    "Admin",
    "Super Admin",
    "Moderator",
  ].includes(user.role);

  useEffect(() => {
    setIsSearchingPage(!pageId);
  }, [pageId]);

  useEffect(() => {
    if (
      user &&
      [
        "owner",
        "page_owner",
        "Business Owner",
      ].includes(user.role)
    ) {
      navigate("/business-dashboard");
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [requireLoginReview, setRequireLoginReview] = useState(true);
  const [minReviewLength, setMinReviewLength] = useState<number>(20);
  const [maxReviewLength, setMaxReviewLength] = useState<number>(2000);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const res = await fetch("/api/public-settings");
        if (res.ok) {
           const data = await res.json();
           if (data.allow_image_proof === 'false') {
               setAllowImageProof(false);
           }
           if (data.min_review_length) {
               setMinReviewLength(parseInt(data.min_review_length) || 20);
           }
           if (data.max_review_length) {
               setMaxReviewLength(parseInt(data.max_review_length) || 2000);
           }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSettingsLoading(false);
      }
    };
    checkSettings();
  }, []);

  // Search state
  const [isSearchingPage, setIsSearchingPage] = useState(!pageId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dynamic fields
  const [extraContacts, setExtraContacts] = useState<string[]>([]);
  const [newExtraContact, setNewExtraContact] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [otherUrls, setOtherUrls] = useState<string[]>([]);
  const [newOtherUrl, setNewOtherUrl] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<string>("");
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [allowImageProof, setAllowImageProof] = useState<boolean>(true);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      page_id: pageId,
      page_name: "",
      page_url: "",
      page_details: "",
      category: "",
      sub_category: "",
      review_type: initialType,
      star_rating: "5",
      title: "",
      description: "",
      date_of_experience: "",
      bkash_number: "",
      contact_number: "",
      order_amount: "",
      facebook_post_link: "",
      account_name: "",
      account_email: "",
      account_password: "",
      is_login_mode: false,
      is_on_behalf: false,
      on_behalf_name: "",
    },
  });

  const reviewType = watch("review_type");
  const pageUrl = watch("page_url");
  const isOnBehalf = watch("is_on_behalf");

  const steps = React.useMemo(() => {
    const s = [];
    if (!pageId) {
      s.push({ id: "page", label: "Page Details", n: 1 });
    }
    s.push({ id: "review", label: "Experience Review", n: !pageId ? 2 : 1 });
    if (reviewType === "Fraud Report") {
      s.push({ id: "evidence", label: "Evidence Details", n: !pageId ? 3 : 2 });
    }
    if (!user) {
      s.push({ id: "account", label: "Account", n: s.length + 1 });
    }
    return s;
  }, [pageId, reviewType, user]);

  const totalSteps = steps.length;
  // Determine if our currentStep index is valid, else clamp it.
  React.useEffect(() => {
    if (currentStep > totalSteps) setCurrentStep(totalSteps);
  }, [totalSteps, currentStep]);

  const handleNextStep = async () => {
    const currentStepObj = steps[currentStep - 1];

    if (currentStepObj.id === "page" && !pageId) {
      // First, just validate url to check if page exists by URL alone
      const isUrlValid = await trigger(["page_url"] as any);

      if (isUrlValid) {
        setIsSubmitting(true);
        try {
          const pageUrlValue = getValues("page_url");
          if (pageUrlValue) {
            const res = await fetch(
              `/api/pages/by-url?url=${encodeURIComponent(pageUrlValue)}`,
            );
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.page) {
                navigate(
                  `/write-review?pageId=${data.page.id}&type=${reviewType === "Fraud Report" ? "fraud" : "safe"}`,
                  { replace: true },
                );
                window.scrollTo({ top: 0, behavior: "smooth" });
                setIsSubmitting(false);
                return;
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
        setIsSubmitting(false);
      }

      // If we are here, the page doesn't exist. Now validate all required fields for creation.
      let fieldsToValidate = [
        "page_name",
        "page_url",
      ];

      const isFullValid = await trigger(fieldsToValidate as any);
      if (!isFullValid) {
        setTimeout(() => {
          const currentErrors = (control as any)?._formState?.errors || errors;
          const messages: string[] = [];
          fieldsToValidate.forEach((key) => {
            const fieldError = currentErrors[key];
            if (fieldError) {
              let labelName = key;
              if (key === "page_name") labelName = "Facebook Page Name";
              else if (key === "page_url") labelName = "Facebook Page URL";
              const msg = fieldError?.message || "Is invalid or required";
              messages.push(`• ${labelName}: ${msg}`);
            }
          });
          if (messages.length > 0) {
            const errorMsg = `⚠️ Cannot Proceed!\n\nPlease fill out or correct the following fields:\n\n${messages.join("\n")}`;
            alert(errorMsg);
          }
        }, 10);
        return;
      }
    } else {
      let fieldsToValidate: any[] = [];
      if (currentStepObj.id === "review") {
        fieldsToValidate = [
          "title",
          "date_of_experience",
          "description",
          "star_rating",
          "review_type",
        ];
      } else if (currentStepObj.id === "evidence") {
        fieldsToValidate = [
          "bkash_number",
          "order_amount",
          "facebook_post_link"
        ];
      }

      if (fieldsToValidate.length > 0) {
        const isValid = await trigger(fieldsToValidate as any);
        if (!isValid) {
          setTimeout(() => {
            const currentErrors = (control as any)?._formState?.errors || errors;
            const messages: string[] = [];
            fieldsToValidate.forEach((key) => {
              const fieldError = currentErrors[key];
              if (fieldError) {
                let labelName = key;
                if (key === "title") labelName = "Review Title";
                else if (key === "description") labelName = "Review Description";
                else if (key === "date_of_experience") labelName = "Date of Experience";
                else if (key === "star_rating") labelName = "Rating";
                else if (key === "review_type") labelName = "Review Type";
                else if (key === "bkash_number") labelName = "bKash / Contact Number";
                else if (key === "order_amount") labelName = "Order Amount";
                else if (key === "facebook_post_link") labelName = "Facebook Post Link";
                
                const msg = fieldError?.message || "Is invalid or required";
                messages.push(`• ${labelName}: ${msg}`);
              }
            });
            if (messages.length > 0) {
              const errorMsg = `⚠️ Cannot Proceed!\n\nPlease fill out or correct the following fields:\n\n${messages.join("\n")}`;
              alert(errorMsg);
            }
          }, 10);
          return;
        }
      }
    }

    setCurrentStep((s) => {
      if (s < totalSteps) return s + 1;
      return s;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setCurrentStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => {
    if (
      reviewType === "Fraud Report" &&
      parseInt(watch("star_rating") || "0", 10) > 2
    ) {
      setValue("star_rating", "1");
    }
  }, [reviewType, watch, setValue]);

  useEffect(() => {
    if (reviewType === "Fraud Report") {
      const currentStar = parseInt(watch("star_rating") || "0", 10);
      if (currentStar > 2) {
        setValue("star_rating", "1");
      }
    }
  }, [reviewType, watch, setValue]);

  useEffect(() => {
    if (searchQuery.trim() && isSearchingPage) {
      setIsSearching(true);
      const controller = new AbortController();
      const timer = setTimeout(() => {
        fetch(`/api/pages/search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal,
        })
          .then((res) => res.json())
          .then((data) => {
            setSearchResults(data);
            setIsSearching(false);
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              setIsSearching(false);
            }
          });
      }, 300);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, isSearchingPage]);



  useEffect(() => {
    if (pageId) return; // if editing or adding review to known page, don't auto-fetch url
    if (!pageUrl || !pageUrl.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/pages/by-url?url=${encodeURIComponent(pageUrl.trim())}`,
        );
        const data = await res.json();
        if (data.success && data.page) {
          // The page is already listed, so auto-forward to Step 2 (Experience Review)
          const currentType =
            getValues("review_type") === "Fraud Report" ? "fraud" : "safe";
          navigate(`/write-review?pageId=${data.page.id}&type=${currentType}`, {
            replace: true,
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (e) {
        console.error("Failed to auto-fetch page by url", e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [pageUrl, pageId, navigate, getValues]);

  useEffect(() => {
    if (reviewId) {
      const token = localStorage.getItem("token");
      fetch(`/api/reviews/${reviewId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setIsEditing(true);
            reset({
              ...getValues(),
              page_id: data.page_id,
              review_type: data.review_type,
              star_rating: data.star_rating?.toString(),
              title: data.title,
              description: data.description,
              date_of_experience: data.date_of_experience || "",
              bkash_number: data.bkash_number || "",
              order_amount: data.order_amount || "",
              facebook_post_link: data.facebook_post_link || "",
              is_on_behalf: data.is_on_behalf === 1,
              on_behalf_name: data.on_behalf_name || "",
            });
            setIsSearchingPage(false);
          }
        })
        .catch(() => {});
    } else if (pageId && user) {
      const token = localStorage.getItem("token");
      if (token) {
        fetch(`/api/reviews/check/${pageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data) {
              setIsEditing(true);
              reset({
                ...getValues(),
                review_type: data.review_type,
                star_rating: data.star_rating?.toString(),
                title: data.title,
                description: data.description,
                date_of_experience: data.date_of_experience || "",
                bkash_number: data.bkash_number || "",
                order_amount: data.order_amount || "",
                facebook_post_link: data.facebook_post_link || "",
                is_on_behalf: data.is_on_behalf === 1,
                on_behalf_name: data.on_behalf_name || "",
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [pageId, reviewId, user, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfileImage = () => {
    setProfileImageFile("");
    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = "";
    }
  };

  const addExtraContact = () => {
    if (newExtraContact) {
      setExtraContacts([...extraContacts, newExtraContact]);
      setNewExtraContact("");
    }
  };
  const addPaymentMethod = () => {
    if (newPaymentMethod) {
      setPaymentMethods([...paymentMethods, newPaymentMethod]);
      setNewPaymentMethod("");
    }
  };
  const addOtherUrl = () => {
    if (newOtherUrl) {
      setOtherUrls([...otherUrls, newOtherUrl]);
      setNewOtherUrl("");
    }
  };

   const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let finalToken = localStorage.getItem("token");

      // Inline Auth processing
      if (!user && (data.account_email || data.account_username)) {
        const isLogin = data.is_login_mode;
        const authUrl = isLogin ? "/api/auth/login" : "/api/auth/register";
        const authPayload = isLogin
          ? {
              emailOrUsername: data.account_email,
              password: data.account_password,
            }
          : {
              full_name: data.account_name,
              email: data.account_email,
              password: data.account_password,
            };

        const authRes = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authPayload),
        });

        const authData = await authRes.json();
        if (!authRes.ok) {
          setSubmitError(`Authentication failed: ${authData.error || authData.message || "Invalid credentials"}`);
          setIsSubmitting(false);
          window.scrollTo({ top: 100, behavior: "smooth" });
          return;
        }

        login(authData.token, authData.user);
        finalToken = authData.token;
      }

      const payload = {
        ...data,
        extra_contacts: JSON.stringify(extraContacts),
        payment_methods: JSON.stringify(paymentMethods),
        other_urls: JSON.stringify(otherUrls),
        profile_picture: profileImageFile,
        proof_images: proofImages,
        editReviewId: reviewId || undefined,
      };

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(finalToken ? { Authorization: `Bearer ${finalToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        navigate(`/page/${result.page_id}`);
      } else {
        setSubmitError(result.message || result.error || "Failed to submit review");
        window.scrollTo({ top: 100, behavior: "smooth" });
      }
    } catch (e: any) {
      console.error(e);
      setSubmitError(e.message || "An unexpected error occurred. Please try again.");
      window.scrollTo({ top: 100, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen py-20 px-4 bg-slate-50 flex justify-center mt-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (isSearchingPage) {
    return (
      <div className="bg-white min-h-[calc(100vh-80px)]">
        <div className="bg-white py-16 px-4 md:py-24 text-center border-b border-slate-100 relative overflow-hidden">
          {/* Decorative green ambient blurs matching home page */}
          <div className="absolute top-[-60px] left-[-60px] w-[220px] h-[220px] bg-[#0fbc6f]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-[10%] right-[-80px] w-[280px] h-[280px] bg-[#0fbc6f]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl mx-auto relative z-10">
            {/* Badge matching home */}
            <div className="flex justify-center mb-5 select-none">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#e6f7ef] text-[#0fbc6f] text-xs font-black tracking-wider uppercase rounded-full border border-[#0fbc6f]/10 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                SHARE YOUR EXPERIENCE
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-[1.1]">
              Review a <span className="text-[#0fbc6f]">Facebook Page</span>
            </h1>
            <p className="text-[15px] md:text-[17px] text-slate-500 font-semibold mb-10 max-w-2xl mx-auto leading-relaxed">
              Search by name, URL, phone number, or bKash account to share your
              experience and help others avoid fraud.
            </p>

            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-[#0fbc6f]" />
              </div>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search page name, URL, or contact number..."
                className="w-full h-14 md:h-16 pl-14 pr-6 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#0fbc6f]/50 focus:ring-4 focus:ring-[#0fbc6f]/10 rounded-full text-base md:text-lg shadow-sm outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900"
              />

              {searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 text-left">
                  {searchResults.length > 0 ? (
                    <div className="max-h-[360px] overflow-y-auto pt-2">
                      {searchResults.map((page: any) => {
                        const rating = page.average_rating || 0;
                        return (
                          <Link
                            key={page.id}
                            to={`/write-review?pageId=${page.id}&type=${reviewType === "Fraud Report" ? "fraud" : "safe"}`}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-[#f0faf5] transition-colors border-b border-slate-100 last:border-0 group"
                            onClick={() => setIsSearchingPage(false)}
                          >
                            <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                              {page.profile_picture ? (
                                <img
                                  src={page.profile_picture}
                                  alt={page.current_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-bold text-slate-400">
                                  {page.current_name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <h4 className="font-bold text-slate-900 text-[17px] truncate group-hover:text-[#0fbc6f] transition-colors max-w-full">
                                  {page.current_name}
                                </h4>
                                {page.business_verification_status &&
                                  page.business_verification_status !==
                                    "Normal" && (
                                    <div
                                      className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 bg-slate-900 text-white rounded-[4px] text-[10px] font-bold shadow-sm"
                                      title="This page has been marked by admin as a reputable/official business based on available information."
                                    >
                                      {page.business_verification_status ===
                                        "Official Business" && "✅ Official"}
                                      {page.business_verification_status ===
                                        "Reputable Business" && "🏆 Reputable"}
                                      {page.business_verification_status ===
                                        "Long-Term Trusted Seller" &&
                                        "🛡️ Long-Term Trusted"}
                                      {page.business_verification_status ===
                                        "Verified Marketplace Seller" &&
                                        "⭐ Verified Seller"}
                                    </div>
                                  )}
                              </div>
                              <p className="text-sm text-slate-500 truncate">
                                {page.facebook_url || "Facebook Page"}{" "}
                                • {page.review_count || 0} reviews
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center bg-[#e6f7ef] px-2 py-1 rounded">
                              <Star
                                className={`h-3 w-3 mr-1 ${rating > 0 ? "text-[#0fbc6f] fill-[#0fbc6f]" : "text-slate-400 fill-slate-400"}`}
                              />
                              <span className="text-sm font-bold text-[#0da662]">
                                {rating > 0 ? rating.toFixed(1) : "0.0"}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-[#e6f7ef] rounded-full flex items-center justify-center mb-4 text-[#0fbc6f]">
                        <Store className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">
                        Can't find the page?
                      </h3>
                      <p className="text-slate-500 text-sm mb-6 max-w-sm">
                        It might not be listed yet. Add it and be the first to
                        write a review.
                      </p>
                      <button
                        onClick={() => {
                          const isUrlMatch =
                            searchQuery.match(/https?:\/\//i) ||
                            searchQuery.match(/facebook\.com/i);
                          if (isUrlMatch) {
                            setValue("page_url", searchQuery);
                          } else {
                            setValue("page_name", searchQuery);
                          }
                          setIsSearchingPage(false);
                        }}
                        className="px-6 py-3 bg-[#0fbc6f] hover:bg-[#0da662] text-white font-bold rounded-lg text-sm transition-colors shadow-sm"
                      >
                        Add new page
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Examples suggestion items */}
            <div className="text-[12px] md:text-sm text-slate-400 font-bold mt-6 mb-6 px-4 leading-normal select-none">
              Examples:{" "}
              <span
                className="text-[#0fbc6f] hover:text-[#0da662] cursor-pointer hover:underline underline-offset-2 duration-150"
                onClick={() => {
                  setSearchQuery("Fashion Hub BD");
                }}
              >
                Fashion Hub BD
              </span>
              ,{" "}
              <span
                className="text-[#0fbc6f] hover:text-[#0da662] cursor-pointer hover:underline underline-offset-2 duration-150"
                onClick={() => {
                  setSearchQuery("017XXXXXXXX");
                }}
              >
                017XXXXXXXX
              </span>
              ,{" "}
              <span
                className="text-[#0fbc6f] hover:text-[#0da662] cursor-pointer hover:underline underline-offset-2 duration-150"
                onClick={() => {
                  setSearchQuery("https://facebook.com/example-shop");
                }}
              >
                https://facebook.com/page-username
              </span>
            </div>

            {/* Action Buttons: Report a Fraud / Write a Review */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 select-none">
              <button
                type="button"
                onClick={() => {
                  setValue("review_type", "Fraud Report");
                  setIsSearchingPage(false);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-rose-50 border border-rose-200 text-rose-700 hover:text-rose-800 rounded-2xl font-bold hover:bg-rose-100 active:scale-98 transition-all shadow-3xs"
              >
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                Report a Fraud
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue("review_type", "Safe");
                  setIsSearchingPage(false);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:text-emerald-800 rounded-2xl font-bold hover:bg-emerald-100 active:scale-98 transition-all shadow-3xs"
              >
                <SquarePen className="h-5 w-5 text-[#0fbc6f] shrink-0" />
                Write a Review
              </button>
            </div>
          </div>
        </div>

        {/* What can you review? & How to Submit a Review Sections */}
        <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-16">
          {/* What can you review */}
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">
              What can you review?
            </h2>
            <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full mb-10"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Facebook Page */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-row items-center md:items-start md:flex-col gap-4 text-left shadow-sm hover:shadow-md hover:border-[#0fbc6f]/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-[#e6f7ef] text-[#0fbc6f] border border-[#0fbc6f]/20 flex items-center justify-center shrink-0">
                  <Facebook className="h-6 w-6 fill-current" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                    Facebook Page
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                    Review any Facebook Page and share your honest experience.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 md:hidden ml-auto" />
              </div>

              {/* Seller Profile */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-row items-center md:items-start md:flex-col gap-4 text-left shadow-sm hover:shadow-md hover:border-[#0fbc6f]/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-[#e6f7ef] text-[#0fbc6f] border border-[#0fbc6f]/20 flex items-center justify-center shrink-0">
                  <Store className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                    Seller Profile
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                    Review seller profiles from marketplaces and communities.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 md:hidden ml-auto" />
              </div>

              {/* Payment Number */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-row items-center md:items-start md:flex-col gap-4 text-left shadow-sm hover:shadow-md hover:border-[#0fbc6f]/30 transition-all">
                <div className="w-12 h-12 rounded-full bg-[#e6f7ef] text-[#0fbc6f] border border-[#0fbc6f]/20 flex items-center justify-center shrink-0">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                    Payment Number
                  </h3>
                  <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                    Review bKash or other payment numbers to help others stay
                    safe.
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 md:hidden ml-auto" />
              </div>
            </div>
          </div>

          {/* How to Submit a Review */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-[#f0faf5]/60 border border-[#0fbc6f]/10 rounded-3xl p-6 md:p-8 text-left">
            <div className="md:col-span-1 space-y-3">
              <span className="inline-block px-3 py-1 bg-[#e6f7ef] text-[#0fbc6f] text-[11px] font-black uppercase tracking-wider rounded-lg">
                Quick Guide
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                How to Submit a Review
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your review helps build a safer community. It only takes a
                minute.
              </p>
            </div>

            <div className="md:col-span-2 relative">
              <div className="flex flex-col md:flex-row gap-6 md:gap-4 justify-between items-start relative">
                {/* Connecting lines on desktop (drawn absolutely behind step icons) */}
                <div className="hidden md:block absolute left-[12%] right-[12%] top-6 h-0.5 border-t border-dashed border-slate-200/80 z-0"></div>

                {/* Step 1 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 md:justify-center">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                        1
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Search
                      </h4>
                    </div>
                    <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                      Search for the page, profile, or payment number.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                    <SquarePen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 md:justify-center">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                        2
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Write Review
                      </h4>
                    </div>
                    <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                      Share your experience and rate honestly.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 md:justify-center">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                        3
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Add Details
                      </h4>
                    </div>
                    <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                      Add screenshots or details to support review.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 md:justify-center">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                        4
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Submit
                      </h4>
                    </div>
                    <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                      Submit your review and help others stay informed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]/40 relative overflow-hidden py-6 sm:py-12 selection:bg-[#00a859]/10 selection:text-emerald-950">
      {/* Curved organic background blob shapes to match the screenshots layout */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#e6fcf0]/45 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#e6fcf0]/35 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      
      {/* Decorative grid of dots */}
      <div className="hidden sm:block absolute top-[6%] right-10 opacity-20 pointer-events-none -z-10">
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00a859]" />
          ))}
        </div>
      </div>
      <div className="hidden sm:block absolute bottom-10 left-10 opacity-20 pointer-events-none -z-10">
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00a859]" />
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-0 sm:px-6">
        {/* Header Block with Green Icon Circle */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 mb-8 sm:mb-10 select-none px-4 sm:px-0">
          <div className="w-16 h-16 rounded-full bg-[#e6fcf0] text-[#00a859] flex items-center justify-center border border-[#c5f2d8] shrink-0 shadow-[0_4px_12px_rgba(0,168,89,0.06)] relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <polygon points="12 8 13.5 10.5 16 11 14 13 14.5 15.5 12 14.5 9.5 15.5 10 13 8 11 10.5 10.5" fill="currentColor"/>
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0d2a45] tracking-tight">
              Write a Review or Report
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base leading-normal">
              Share your experience to help others make safe decisions.
            </p>
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="mb-10 select-none max-w-xl mx-auto px-4 sm:px-0">
          <div className="flex items-center justify-between relative px-2 sm:px-4">
            {/* Background line */}
            <div className="absolute left-[8%] right-[8%] top-[18px] h-0.5 bg-neutral-200/80 -z-10"></div>
            {/* Active filled green segment */}
            <div
              className="absolute left-[8%] top-[18px] h-0.5 bg-[#00a859] -z-10 transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (totalSteps - 1)) * 84}%`,
              }}
            ></div>

            {steps.map((item, index) => {
              const isActive = currentStep === index + 1;
              const isCompleted = currentStep > index + 1;
              return (
                <div key={item.id} className="flex flex-col items-center flex-1 relative">
                  <div
                    className={`w-9 h-9 rounded-full border-2 bg-white flex items-center justify-center font-bold text-xs transition-all duration-300 relative z-10 ${
                      isActive
                        ? "border-[#00a859] text-[#00a859] ring-4 ring-[#00a859]/10 shadow-xs"
                        : isCompleted
                          ? "border-[#00a859] bg-[#e6fcf0] text-[#00a859]"
                          : "border-neutral-200 text-neutral-400"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs mt-2.5 font-bold tracking-tight text-center transition-colors duration-300 ${
                      isActive
                        ? "text-[#0a8043]"
                        : isCompleted
                          ? "text-emerald-700 font-semibold"
                          : "text-neutral-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Container White Card block */}
        <div className="bg-white border-y border-slate-100 md:border md:border-slate-100 md:shadow-[0_12px_40px_rgba(13,42,69,0.035)] px-4 py-5 sm:p-10 mb-8 relative rounded-none md:rounded-[26px]">
          {/* Active section header with file badge */}
          <div className="pb-6 border-b border-slate-100 mb-8 flex items-start sm:items-center gap-4 select-none">
            <div className="w-12 h-12 rounded-2xl bg-[#e6fcf0] text-[#00a859] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0d2a45] tracking-tight">
                {steps[currentStep - 1]?.label}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                {currentStep === 1 
                  ? "Provide information about the Facebook page you want to review."
                  : currentStep === 2
                    ? "Share details about your experience with this Facebook page."
                    : currentStep === 3 && steps[currentStep - 1]?.id === "evidence"
                      ? "Attach payment receipts, screenshots or any other evidence of fraud."
                      : "Review your account or log in to submit your honest feedback."
                }
              </p>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6 sm:space-y-8">
            {submitError && (
              <div id="submit-errors-banner" className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex gap-3 items-start animate-fade-in text-sm select-none">
                <svg className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1 font-semibold leading-relaxed">
                  <p className="font-bold text-rose-950 uppercase tracking-wider text-xs mb-1">Could Not Submit Review</p>
                  <span>{submitError}</span>
                </div>
                <button 
                  onClick={() => setSubmitError(null)}
                  className="text-rose-450 hover:text-rose-700 font-extrabold focus:outline-none text-base cursor-pointer shrink-0"
                >
                  &times;
                </button>
              </div>
            )}
        {/* Step 1: Page Details (only if no pageId) */}
        {steps[currentStep - 1]?.id === "page" && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!pageId && (
                <>
                  {/* Facebook Page Name Input */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Facebook Page Name <span className="text-[#00a859] font-extrabold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.2" />
                        </svg>
                      </div>
                      <input
                        {...register("page_name", {
                          required: "Page name is required",
                        })}
                        className="w-full h-14 pl-15 pr-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/8 rounded-2xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                        placeholder="e.g. Unique Fashion Store"
                      />
                    </div>
                    {errors.page_name && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.page_name.message as string}
                      </span>
                    )}
                  </div>

                  {/* Facebook URL Input */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Facebook URL <span className="text-[#00a859] font-extrabold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-[#e6fcf0] text-[#00a859]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <input
                        {...register("page_url", {
                          required: "Facebook URL is required",
                          validate: (value) => {
                            const valLower = value.toLowerCase().trim();
                            const isValidDomain =
                              valLower.includes("facebook.com") ||
                              valLower.includes("fb.com") ||
                              valLower.includes("fb.watch");
                            if (!isValidDomain) {
                              return "Please enter a valid Facebook URL (must contain facebook.com, fb.com or fb.watch)";
                            }
                            if (valLower.startsWith("http://") || valLower.startsWith("https://")) {
                              try {
                                new URL(value);
                              } catch (e) {
                                return "Please enter a valid format (e.g., https://facebook.com/path)";
                              }
                            }
                            return true;
                          },
                        })}
                        className="w-full h-14 pl-15 pr-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/8 rounded-2xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                        placeholder="https://facebook.com/storename"
                      />
                    </div>
                    {errors.page_url && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.page_url.message as string}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sub-grid with Contacts and Payments matching screenshot card frame exactly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Numbers Card */}
              <div className="md:bg-[#fcfdfc] md:p-6 md:rounded-[22px] md:border md:border-[#e6f4ea] md:min-h-[170px] flex flex-col justify-between bg-transparent p-0 border-none rounded-none min-h-0">
                <div>
                  <label className="block text-[#0d2a45] font-extrabold text-base mb-3">
                    Contact Numbers
                  </label>
                  <div className="flex gap-2.5 mb-3">
                    <div className="relative flex-1">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-[#e6fcf0] text-[#00a859]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" id="phone_icon_elem" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.72l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.72.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={newExtraContact}
                        onChange={(e) => setNewExtraContact(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addExtraContact();
                          }
                        }}
                        className="w-full h-12 pl-13 pr-4 bg-white border border-slate-200 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                        placeholder="Add phone number"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addExtraContact}
                      className="bg-[#00a859] hover:bg-[#00904a] text-white px-5 rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add</span>
                    </button>
                  </div>

                  {extraContacts.length > 0 && (
                    <ul className="space-y-1.5 mb-3 max-h-28 overflow-y-auto pr-1">
                      {extraContacts.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-neutral-100 text-xs font-semibold shadow-2xs animate-fade-in"
                        >
                          <span className="text-slate-700">{c}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraContacts(
                                extraContacts.filter((_, idx) => idx !== i),
                              )
                            }
                            className="text-rose-500 hover:text-rose-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold select-none leading-none">
                  Add one or more contact numbers.
                </p>
              </div>

              {/* Payment Methods Card */}
              <div className="md:bg-[#fcfdfc] md:p-6 md:rounded-[22px] md:border md:border-[#e6f4ea] md:min-h-[170px] flex flex-col justify-between bg-transparent p-0 border-none rounded-none min-h-0">
                <div>
                  <label className="block text-[#0d2a45] font-extrabold text-base mb-3">
                    Payment Methods
                  </label>
                  <div className="flex gap-2.5 mb-3">
                    <div className="relative flex-1">
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-[#e6fcf0] text-[#00a859]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" id="card_icon_elem" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addPaymentMethod();
                          }
                        }}
                        className="w-full h-12 pl-13 pr-4 bg-white border border-slate-200 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium transition-all"
                        placeholder="bKash / Nagad"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addPaymentMethod}
                      className="bg-[#00a859] hover:bg-[#00904a] text-white px-5 rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>Add</span>
                    </button>
                  </div>

                  {paymentMethods.length > 0 && (
                    <ul className="space-y-1.5 mb-3 max-h-28 overflow-y-auto pr-1">
                      {paymentMethods.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-neutral-100 text-xs font-semibold shadow-2xs animate-fade-in"
                        >
                          <span className="text-slate-700">{c}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setPaymentMethods(
                                paymentMethods.filter((_, idx) => idx !== i),
                              )
                            }
                            className="text-rose-500 hover:text-rose-700 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold select-none leading-none">
                  Add one or more payment methods.
                </p>
              </div>
            </div>

            {/* Profile Picture & Detail Block - Strict Admin Only Guard */}
            {isAdmin && (
              <div className="border-t border-slate-100 pt-6 space-y-6">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#0d2a45]">
                  Admin Settings (Only Visible to Admin)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile Photo upload */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Profile Photo
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="file"
                        ref={profileImageInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-[#00a859]/10 outline-none"
                      />
                      {profileImageFile && (
                        <div className="flex items-center gap-3 p-1.5 bg-[#fcfdfc] border border-emerald-100 rounded-xl w-fit shrink-0">
                          <img
                            src={profileImageFile}
                            alt="Preview"
                            className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveProfileImage}
                            className="text-[10px] uppercase tracking-wider font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-colors border border-rose-100 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Page Details */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Facebook Page Description (Page details)
                    </label>
                    <textarea
                      {...register("page_details")}
                      rows={2}
                      className="w-full bg-white px-4 py-3 rounded-2xl border border-slate-200 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/10 outline-none font-medium text-sm text-slate-800 transition-all placeholder:text-slate-400 resize-none"
                      placeholder="Brief details about the Facebook Page or shop..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {steps[currentStep - 1]?.id === "review" && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in text-[#0d2a45]">
            {isAdmin && (
              <div className="space-y-4">
                <div className="bg-[#e6fcf0]/40 border border-[#00a859]/20 p-4.5 rounded-2xl flex items-center justify-between shadow-3xs">
                  <div className="pr-4">
                    <h4 className="font-extrabold text-[#0d2a45] text-sm flex items-center gap-1.5">
                      👥 Write Review On Behalf
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-relaxed">
                      As an Admin, you can submit this review on behalf of someone else. The name will show as "On behalf" and no review limit is enforced.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      {...register("is_on_behalf")}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a859]"></div>
                  </label>
                </div>
                
                {isOnBehalf && (
                  <div className="bg-[#e6fcf0]/20 border border-[#00a859]/10 p-4.5 rounded-2xl animate-fade-in space-y-3">
                    <label className="block text-sm font-bold text-[#0d2a45]">
                      Custom Reviewer Name (Optional)
                    </label>
                    <input
                      type="text"
                      {...register("on_behalf_name")}
                      className="w-full bg-white px-4 py-3 rounded-2xl border border-slate-200 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/10 outline-none font-medium text-sm text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder="Enter custom reviewer name (e.g. John Doe). If empty, defaults to 'On behalf'..."
                    />
                    <p className="text-[10px] text-slate-400 font-semibold">
                      * If provided, the review will display this custom reviewer name on the public directory instead of "On behalf".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Experience Type Selection Pills */}
            <div>
              <label className="block text-sm font-extrabold text-[#0d2a45] mb-3">
                What kind of experience was this? <span className="text-[#00a859] font-extrabold">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 select-none">
                {["Good", "Bad", "Fraud Report"].map((type) => {
                  const isSelected = reviewType === type;
                  return (
                    <label
                      key={type}
                      className={`
                        cursor-pointer border-2 rounded-2xl p-4 flex items-center justify-between transition-all duration-200
                        ${
                          isSelected
                            ? type === "Fraud Report"
                              ? "border-rose-500 bg-rose-50/50 text-rose-850 ring-4 ring-rose-500/10"
                              : type === "Bad"
                                ? "border-amber-500 bg-amber-50/50 text-amber-850 ring-4 ring-amber-500/10"
                                : "border-[#00a859] bg-[#e6fcf0]/60 text-emerald-900 ring-4 ring-[#00a859]/10"
                            : "border-slate-100 hover:bg-slate-50 text-slate-500"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        value={type}
                        {...register("review_type")}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? "border-currentColor" : "border-slate-300"}`}>
                          <span className={`w-2.5 h-2.5 rounded-full transition-all ${isSelected ? "bg-currentColor scale-100" : "scale-0"}`} />
                        </span>
                        <span className="font-extrabold text-[#0d2a45] text-sm">
                          {type}
                        </span>
                      </div>
                      <span className="text-xl shrink-0">
                        {type === "Good" ? "😇" : type === "Bad" ? "😟" : "🚨"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Stars selection rating */}
            <div>
              <label className="block text-sm font-extrabold text-[#0d2a45] mb-2.5">
                Rate your experience <span className="text-[#00a859] font-extrabold">*</span>
              </label>
              <div className="flex gap-2.5 p-3.5 bg-slate-50/60 rounded-2xl w-fit border border-slate-100/90 select-none">
                {[1, 2, 3, 4, 5].map((star) => {
                  const ratingVal = parseInt(watch("star_rating") || "0", 10);
                  const isHighlighted = ratingVal >= star;
                  const isDisabled = reviewType === "Fraud Report" && star > 2;
                  return (
                    <button
                      type="button"
                      key={star}
                      disabled={isDisabled}
                      onClick={() => {
                        const event = {
                          target: { value: star.toString(), name: "star_rating" },
                        };
                        register("star_rating").onChange(event);
                      }}
                      className={`focus:outline-none transition-all ${isDisabled ? "opacity-20 cursor-not-allowed" : "hover:scale-115 active:scale-95 cursor-pointer"}`}
                      title={isDisabled ? "Fraud reports must be 1 or 2 stars" : `Rate ${star} stars`}
                    >
                      <Star
                        className={`h-9 w-9 ${
                          isHighlighted 
                            ? "text-amber-400 fill-amber-400 drop-shadow-xs" 
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  );
                })}
                <input type="hidden" {...register("star_rating")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title of the review */}
              <div>
                <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                  Title of your review <span className="text-[#00a859] font-extrabold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" id="edit_pencil_icon" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <input
                    {...register("title", { required: "Title is required" })}
                    className="w-full h-14 pl-15 pr-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/8 rounded-2xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                    placeholder="e.g. Received bad quality service"
                  />
                </div>
                {errors.title && (
                  <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                    {errors.title.message as string}
                  </span>
                )}
              </div>

              {/* Date of Experience */}
              <div>
                <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                  Date of Experience <span className="text-[#00a859] font-extrabold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-[#e6fcf0] text-[#00a859] pointer-events-none">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    {...register("date_of_experience", {
                      required: "Date of experience is required",
                    })}
                    className="w-full h-14 pl-15 pr-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/8 rounded-2xl outline-none font-semibold text-slate-800 transition-all"
                  />
                </div>
                {errors.date_of_experience && (
                  <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                    {errors.date_of_experience.message as string}
                  </span>
                )}
              </div>
            </div>

            {/* Description Area */}
            <div>
              <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                Describe what happened <span className="text-[#00a859] font-extrabold">*</span>
              </label>
              <textarea
                {...register("description", {
                  required: "Description is required",
                  minLength: {
                    value: minReviewLength,
                    message: `Description must be at least ${minReviewLength} characters long.`,
                  },
                  maxLength: {
                    value: maxReviewLength,
                    message: `Description must be at most ${maxReviewLength} characters long.`,
                  },
                })}
                rows={5}
                className="w-full bg-white px-4 py-4 rounded-2xl border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/8 outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                placeholder="Give exact details about your orders, the service received, communication methods, delivery dates, or payment details..."
              />
              {errors.description && (
                <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                  {errors.description.message as string}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Evidence & Payment */}
        {steps[currentStep - 1]?.id === "evidence" && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in text-[#0d2a45]">
            <p className="text-sm font-semibold text-slate-500 -mt-2 select-none">
              Providing transaction references helps build stronger communities and proves fraud reports more effectively.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Number (bKash/Nagad) */}
              <div>
                <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                  bKash / Nagad Number (Page's Account)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-[#e6fcf0] text-[#00a859]">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <input
                    type="tel"
                    {...register("bkash_number", {
                      pattern: {
                        value: /^01\d{9}$/,
                        message: "11 digits starting with 01",
                      },
                    })}
                    className={`w-full h-14 pl-15 pr-4 bg-white border rounded-2xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400 ${errors.bkash_number ? "border-rose-400 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-205 focus:ring-4 focus:ring-[#00a859]/8 focus:border-[#00a859]"}`}
                    placeholder="e.g. 01XXXXXXXXX"
                  />
                </div>
                {errors.bkash_number && (
                  <span className="text-rose-500 text-xs mt-1.5 block font-semibold px-1">
                    {errors.bkash_number.message as string}
                  </span>
                )}
              </div>

              {/* Facebook Post Link */}
              <div>
                <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                  Facebook Post Link (Discussion / Proof)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
                    <ExternalLink className="h-5 w-5" />
                  </div>
                  <input
                    type="url"
                    {...register("facebook_post_link", {
                      validate: (v) => !v || v.includes("facebook.com") || v.includes("fb.com") || v.includes("fb.watch") || "Must be a valid Facebook URL"
                    })}
                    className={`w-full h-14 pl-15 pr-4 bg-white border rounded-2xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400 ${errors.facebook_post_link ? "border-rose-400 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500" : "border-slate-205 focus:ring-4 focus:ring-[#00a859]/8 focus:border-[#00a859]"}`}
                    placeholder="https://facebook.com/groups/..."
                  />
                </div>
                {errors.facebook_post_link && (
                  <span className="text-rose-500 text-xs mt-1.5 block font-semibold px-1">
                    {errors.facebook_post_link.message as string}
                  </span>
                )}
              </div>
            </div>

            {/* Upload Proof Image */}
            {allowImageProof && (
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                  Upload Evidence Images (Up to 5 images, max 5MB each)
                </label>
                <div className="flex flex-col gap-3">
                  {proofImages.length < 5 && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      
                      files.forEach(file => {
                         if (file.size > 5 * 1024 * 1024) {
                             alert(`File ${file.name} exceeds 5MB limit`);
                             return;
                         }
                         if (proofImages.length >= 5) return;
                         
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           setProofImages(prev => {
                               if (prev.length >= 5) return prev;
                               return [...prev, reader.result as string];
                           });
                         };
                         reader.readAsDataURL(file);
                      });
                      e.target.value = ''; // Reset input
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#00a859]/10 outline-none"
                  />
                  )}
                  {proofImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {proofImages.map((img, idx) => (
                        <div key={idx} className="p-1 border border-slate-100 rounded-lg bg-[#f1f5f9] relative shrink-0">
                          <img
                            src={img}
                            alt={`Proof ${idx + 1}`}
                            className="h-14 w-14 object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => setProofImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-sm hover:bg-rose-600"
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}
          </div>
        )}

        {/* Account Step */}
        {steps[currentStep - 1]?.id === "account" && (
          <div className="space-y-6 animate-fade-in text-[#0d2a45]">
            <p className="text-sm font-semibold text-slate-500 -mt-2">
              {requireLoginReview
                ? "An authenticated peer profile is required to prevent fraudulent reviews and spam reports."
                : "Track, edit, or check your reviews anytime. Create a free account or leave empty to submit anonymously."}
            </p>

            <div className="bg-[#fcfdfc] p-6 rounded-[22px] border border-dashed border-[#00a859]/20 space-y-5">
              {!watch("is_login_mode") ? (
                <>
                  {/* Your Full Name */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Your Full Name {requireLoginReview && <span className="text-rose-500 font-extrabold">*</span>}
                    </label>
                    <input
                      type="text"
                      {...register("account_name", {
                        required:
                          !user && requireLoginReview
                            ? "Full name is required for registration"
                            : false,
                      })}
                      className="w-full h-13 px-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder="e.g. John Doe"
                    />
                    {errors.account_name && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.account_name.message as string}
                      </span>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Email Address {requireLoginReview && <span className="text-rose-500 font-extrabold">*</span>}
                    </label>
                    <input
                      type="email"
                      {...register("account_email", {
                        required:
                          !user && requireLoginReview
                            ? "Email address is required"
                            : false,
                      })}
                      className="w-full h-13 px-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder="john@example.com"
                    />
                    {errors.account_email && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.account_email.message as string}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Choose Password {requireLoginReview && <span className="text-rose-500 font-extrabold">*</span>}
                    </label>
                    <input
                      type="password"
                      {...register("account_password", {
                        required:
                          !user && requireLoginReview
                            ? "Password is required"
                            : false,
                      })}
                      className="w-full h-13 px-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder="Min. 6 alphanumeric characters"
                    />
                    {errors.account_password && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.account_password.message as string}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 text-sm text-slate-500 font-semibold select-none">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-[#00a859] font-extrabold hover:underline cursor-pointer"
                      onClick={() => setValue("is_login_mode", true)}
                    >
                      Log in instead
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Login Email */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Email or Username <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    <input
                      type="text"
                      {...register("account_email", {
                        required: !user ? "Email is required to log in" : false,
                      })}
                      className="w-full h-13 px-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder="john@example.com"
                    />
                    {errors.account_email && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.account_email.message as string}
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-bold text-[#0d2a45] mb-2">
                      Enter Password <span className="text-rose-500 font-extrabold">*</span>
                    </label>
                    <input
                      type="password"
                      {...register("account_password", {
                        required: !user ? "Password is required" : false,
                      })}
                      className="w-full h-13 px-4 bg-white border border-slate-205 focus:border-[#00a859] focus:ring-4 focus:ring-[#00a859]/5 rounded-xl outline-none font-medium text-slate-800 transition-all placeholder:text-slate-400"
                      placeholder="Enter account password"
                    />
                    {errors.account_password && (
                      <span className="text-red-500 text-xs mt-1.5 block font-semibold px-1">
                        {errors.account_password.message as string}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 text-sm text-slate-500 font-semibold select-none">
                    Don't have a peer account?{" "}
                    <button
                      type="button"
                      className="text-[#00a859] font-extrabold hover:underline cursor-pointer"
                      onClick={() => setValue("is_login_mode", false)}
                    >
                      Register now
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="pt-8 flex items-center justify-between border-t border-slate-100 select-none">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-6 h-13 border border-slate-200 text-slate-700 font-extrabold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 text-sm shadow-2xs cursor-pointer active:scale-97"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
          ) : (
            <div /> // spacing layout wrapper
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-8 h-13 bg-[#00a859] hover:bg-[#00904a] text-white font-extrabold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group text-sm select-none active:scale-97 cursor-pointer"
            >
              <span>Continue</span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit, (err) => {
                console.log("Validation errors:", err);
                const errorKeys = Object.keys(err);
                if (errorKeys.length > 0) {
                  const messages: string[] = [];
                  errorKeys.forEach((key) => {
                    const fieldError = err[key];
                    let labelName = key;
                    if (key === "page_name") labelName = "Facebook Page Name";
                    else if (key === "page_url") labelName = "Facebook Page URL";
                    else if (key === "title") labelName = "Review Title";
                    else if (key === "description") labelName = "Review Description";
                    else if (key === "date_of_experience") labelName = "Date of Experience";
                    else if (key === "star_rating") labelName = "Rating";
                    else if (key === "bkash_number") labelName = "bKash / Contact Number";
                    else if (key === "order_amount") labelName = "Order Amount";
                    else if (key === "facebook_post_link") labelName = "Facebook Post Link";
                    else if (key === "account_name") labelName = "Full Name";
                    else if (key === "account_email") labelName = "Email Address";
                    else if (key === "account_password") labelName = "Password";

                    const msg = fieldError?.message || "Is invalid or required";
                    messages.push(`• ${labelName}: ${msg}`);
                  });

                  const errorMsg = `⚠️ Cannot Submit Review!\n\nPlease fill out or correct the following fields:\n\n${messages.join("\n")}`;
                  setSubmitError(errorMsg);
                  alert(errorMsg);
                  window.scrollTo({ top: 100, behavior: "smooth" });
                }
              })}
              disabled={isSubmitting}
              className="px-8 h-13 bg-[#00a859] hover:bg-[#00904a] text-white font-extrabold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group text-sm select-none active:scale-97 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting
                  ? "Submitting..."
                  : isEditing
                    ? "Update Review"
                    : "Submit Review"}
              </span>
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {currentStep === totalSteps && (
          <p className="text-center text-xs font-semibold text-slate-400 mt-4 select-none">
            By submitting this review, you certify that this is an honest and accurate description of your transactions.
          </p>
        )}
      </form>
    </div>
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-16 border-t border-slate-100 mt-16">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0a192f] mb-1">
            What can you review?
          </h2>{" "}
          <div className="w-12 h-1 bg-emerald-500 mx-auto rounded-full mb-10"></div>{" "}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {" "}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-row items-center md:items-start md:flex-col gap-4 text-left shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all">
              {" "}
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                {" "}
                <Facebook className="h-6 w-6 fill-current" />{" "}
              </div>{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                  Facebook Page
                </h3>{" "}
                <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                  Review any Facebook Page and share your honest experience.
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-row items-center md:items-start md:flex-col gap-4 text-left shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all">
              {" "}
              <div className="w-12 h-12 rounded-full bg-[#0fbc6f] text-white flex items-center justify-center shrink-0">
                {" "}
                <Store className="h-6 w-6" />{" "}
              </div>{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                  Seller Profile
                </h3>{" "}
                <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                  Review seller profiles from marketplaces and communities.
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-row items-center md:items-start md:flex-col gap-4 text-left shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all">
              {" "}
              <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                {" "}
                <CreditCard className="h-6 w-6" />{" "}
              </div>{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                  Payment Number
                </h3>{" "}
                <p className="text-slate-500 text-xs md:text-sm mt-1 leading-relaxed">
                  Review bKash or other payment numbers to help others stay
                  safe.
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-slate-50 border border-slate-100 rounded-3xl p-6 md:p-8 text-left shadow-3xs">
          {" "}
          <div className="md:col-span-1 space-y-3">
            {" "}
            <span className="inline-block px-3 py-1 bg-emerald-50 text-[#0fbc6f] text-[11px] font-bold uppercase tracking-wider rounded-lg">
              Quick Guide
            </span>{" "}
            <h2 className="text-xl md:text-2xl font-extrabold text-[#0a192f] tracking-tight leading-tight">
              How to Submit a Review
            </h2>{" "}
            <p className="text-slate-500 text-sm leading-relaxed">
              Your review helps build a safer community. It only takes a minute.
            </p>{" "}
          </div>{" "}
          <div className="md:col-span-2 relative">
            {" "}
            <div className="flex flex-col md:flex-row gap-6 md:gap-4 justify-between items-start relative">
              {" "}
              <div className="hidden md:block absolute left-[12%] right-[12%] top-6 h-0.5 border-t border-dashed border-slate-200/80 z-0"></div>{" "}
              <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                {" "}
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                  {" "}
                  <Search className="h-5 w-5" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex items-center gap-2 md:justify-center">
                    {" "}
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                      1
                    </span>{" "}
                    <h4 className="font-bold text-slate-900 text-sm">
                      Search
                    </h4>{" "}
                  </div>{" "}
                  <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                    Search for the page, profile, or payment number.
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                {" "}
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                  {" "}
                  <SquarePen className="h-5 w-5" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex items-center gap-2 md:justify-center">
                    {" "}
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                      2
                    </span>{" "}
                    <h4 className="font-bold text-slate-900 text-sm">
                      Write Review
                    </h4>{" "}
                  </div>{" "}
                  <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                    Share your experience and rate honestly.
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                {" "}
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                  {" "}
                  <Plus className="h-5 w-5" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex items-center gap-2 md:justify-center">
                    {" "}
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                      3
                    </span>{" "}
                    <h4 className="font-bold text-slate-900 text-sm">
                      Add Details
                    </h4>{" "}
                  </div>{" "}
                  <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                    Add screenshots or details to support review.
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex md:flex-col items-center gap-4 md:gap-3 text-left md:text-center flex-1 relative z-10 group">
                {" "}
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0 shadow-3xs transition-all">
                  {" "}
                  <ShieldCheck className="h-5 w-5" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="flex items-center gap-2 md:justify-center">
                    {" "}
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                      4
                    </span>{" "}
                    <h4 className="font-bold text-slate-900 text-sm">
                      Submit
                    </h4>{" "}
                  </div>{" "}
                  <p className="text-slate-500 text-[12px] mt-1 pr-2 leading-relaxed md:text-center">
                    Submit your review and help others stay informed.
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    </div>
  </div>
  );
}
