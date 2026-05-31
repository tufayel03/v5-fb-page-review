import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ShieldCheck,
  ChevronLeft,
  Save,
  RefreshCw,
  Trash2,
  Camera,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function AdminPageDetails() {
  const { id } = useParams();
  const { theme } = useTheme();

  const navigate = useNavigate();
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cacheBust] = useState(Date.now());

  // Edit forms
  const [currentName, setCurrentName] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [statusBadge, setStatusBadge] = useState("Under Review");
  const [trustScore, setTrustScore] = useState(0);

  // Additional new fields
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pageDetails, setPageDetails] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [featuredTrustedSeller, setFeaturedTrustedSeller] =
    useState<boolean>(false);
  const [businessVerificationStatus, setBusinessVerificationStatus] =
    useState("Normal");
  const [businessVerificationNote, setBusinessVerificationNote] = useState("");
  const [requireManualFraudApproval, setRequireManualFraudApproval] =
    useState<boolean>(false);

  // Fraud Directory fields
  const [isFraudListed, setIsFraudListed] = useState<boolean>(false);
  const [fraudSeverity, setFraudSeverity] = useState("Low Risk");
  const [fraudListReason, setFraudListReason] = useState("");
  const [fraudInternalNote, setFraudInternalNote] = useState("");

  // Dynamic Arrays
  const [extraContacts, setExtraContacts] = useState<string[]>([]);
  const [newExtraContact, setNewExtraContact] = useState("");

  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");

  const [otherUrls, setOtherUrls] = useState<string[]>([]);
  const [newOtherUrl, setNewOtherUrl] = useState("");

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

  // For "Add Page" we can use id === 'new'
  const isNew = id === "new";



  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    fetchPage();
  }, [id]);

  const fetchPage = () => {
    fetch(`/api/admin/pages/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          setPageData(data);
          setCurrentName(data.current_name || "");
          setFacebookUrl(data.facebook_url || "");
          setCategory(data.category || "");
          setSubCategory(data.sub_category || "");
          setContactNumber(data.contact_number || "");
          setStatusBadge(data.status_badge || "");
          setTrustScore(data.trust_score || 0);
          setWebsiteUrl(data.website_url || "");
          setPageDetails(data.page_details || "");
          setProfilePicture(data.profile_picture || "");
          setAdminNote(data.admin_note || "");
          setFeaturedTrustedSeller(data.featured_trusted_seller === 1);
          setBusinessVerificationStatus(
            data.business_verification_status || "Normal",
          );
          setBusinessVerificationNote(data.business_verification_note || "");
          setRequireManualFraudApproval(
            data.require_manual_fraud_approval === 1,
          );
          setIsFraudListed(data.is_fraud_listed === 1);
          setFraudSeverity(data.fraud_severity || "Low Risk");
          setFraudListReason(data.fraud_list_reason || "");
          setFraudInternalNote(data.fraud_internal_note || "");
          try {
            if (data.extra_contacts) {
              if (data.extra_contacts.startsWith("[") && data.extra_contacts.endsWith("]")) {
                setExtraContacts(JSON.parse(data.extra_contacts));
              } else {
                setExtraContacts(data.extra_contacts.split(",").map((s: string) => s.trim()).filter(Boolean));
              }
            }
          } catch (e) {
            if (data.extra_contacts) {
              setExtraContacts(data.extra_contacts.split(",").map((s: string) => s.trim()).filter(Boolean));
            }
          }
          try {
            if (data.payment_methods) {
              if (data.payment_methods.startsWith("[") && data.payment_methods.endsWith("]")) {
                setPaymentMethods(JSON.parse(data.payment_methods));
              } else {
                setPaymentMethods(data.payment_methods.split(",").map((s: string) => s.trim()).filter(Boolean));
              }
            }
          } catch (e) {
            if (data.payment_methods) {
              setPaymentMethods(data.payment_methods.split(",").map((s: string) => s.trim()).filter(Boolean));
            }
          }
          try {
            if (data.other_urls) setOtherUrls(JSON.parse(data.other_urls));
          } catch (e) {}
        }
        setLoading(false);
      });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaving(true);
    const method = isNew ? "POST" : "PUT";
    const url = isNew ? `/api/admin/pages` : `/api/admin/pages/${id}`;

    let finalExtraContacts = [...extraContacts];
    if (newExtraContact.trim() && !finalExtraContacts.includes(newExtraContact.trim())) {
      finalExtraContacts.push(newExtraContact.trim());
    }

    let finalPaymentMethods = [...paymentMethods];
    if (newPaymentMethod.trim() && !finalPaymentMethods.includes(newPaymentMethod.trim())) {
      finalPaymentMethods.push(newPaymentMethod.trim());
    }

    let finalOtherUrls = [...otherUrls];
    if (newOtherUrl.trim() && !finalOtherUrls.includes(newOtherUrl.trim())) {
      finalOtherUrls.push(newOtherUrl.trim());
    }

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        current_name: currentName,
        facebook_url: facebookUrl,
        category: category,
        sub_category: subCategory,
        contact_number: contactNumber,
        status_badge: statusBadge || "Under Review",
        trust_score: trustScore,
        website_url: websiteUrl,
        page_details: pageDetails,
        profile_picture: profilePicture,
        admin_note: adminNote,
        featured_trusted_seller: featuredTrustedSeller ? 1 : 0,
        business_verification_status: businessVerificationStatus,
        business_verification_note: businessVerificationNote,
        require_manual_fraud_approval: requireManualFraudApproval ? 1 : 0,
        is_fraud_listed: isFraudListed ? 1 : 0,
        fraud_list_reason: fraudListReason,
        fraud_severity: fraudSeverity,
        fraud_internal_note: fraudInternalNote,
        extra_contacts: JSON.stringify(finalExtraContacts),
        payment_methods: JSON.stringify(finalPaymentMethods),
        other_urls: JSON.stringify(finalOtherUrls),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSaving(false);
        if (data.error) alert(data.error);
        else {
          alert(
            isNew ? "Page added successfully" : "Page updated successfully",
          );
          if (isNew) navigate(`/tufayel/pages`);
        }
      });
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const tabs = [
    { id: "primary", label: "Primary Information" },
    { id: "contact", label: "Contact & Extra Links" },
    { id: "status", label: "Status & Business Verification" },
  ] as const;

  const [activeTab, setActiveTab] = useState<typeof tabs[number]["id"]>("primary");

  const handleDelete = () => {
    fetch(`/api/admin/pages/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) alert(data.error);
        else {
          alert("Deleted");
          navigate("/tufayel/pages");
        }
      });
  };

  const cContainer = 'bg-[#091124] border border-white/5';
  const cText = 'text-white';
  const cTextMuted = 'text-slate-400';
  const cBorder = 'border-white/5';
  const cInput = 'bg-[#0B1527] border border-white/10 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-500';
  const cInputSec = 'bg-[#0B1527] border border-white/5';

  if (loading)
    return (
      <div className={`p-10 text-center font-bold ${cTextMuted}`}>
        Loading...
      </div>
    );
  if (!isNew && !pageData)
    return (
      <div className="p-10 text-center text-red-500 font-bold">
        Page not found
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/tufayel/pages"
          className={`p-2 border rounded-lg transition-colors border-white/10 hover:bg-white/5`}
        >
          <ChevronLeft className={`h-5 w-5 ${cTextMuted}`} />
        </Link>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold ${cText}`}>
            {isNew ? "Add New Page" : "Edit Page info"}
          </h1>
          <p className={`text-sm ${cTextMuted}`}>
            Manage facebook page details and metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-transparent border border-rose-200 text-rose-500 px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            {isNew ? "Create Page" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-t-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#091124] text-white border-t border-l border-r border-white/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`${cContainer} rounded-xl rounded-tl-none border p-6 shadow-sm space-y-6 -mt-2`}>
        {activeTab === 'primary' && (
          <div className="space-y-6">
            <h2 className={`font-bold border-b ${cBorder} pb-2 ${cText}`}>
              Primary Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block font-bold mb-1 text-sm ${cTextMuted}`}>
              Page Name
            </label>
            <input
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className={`w-full border rounded-lg px-4 py-2 outline-none ${cInput}`}
            />
          </div>
          <div>
            <label className={`block font-bold mb-1 text-sm ${cTextMuted}`}>
              Facebook URL
            </label>
            <input
              type="text"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              className={`w-full border rounded-lg px-4 py-2 outline-none ${cInput}`}
            />
          </div>


          <div className="md:col-span-2">
            <label className={`block font-bold mb-1 text-sm ${cTextMuted}`}>
              Description / Page Details
            </label>
            <textarea
              value={pageDetails}
              onChange={(e) => setPageDetails(e.target.value)}
              rows={3}
              className={`w-full border rounded-lg px-4 py-2 outline-none ${cInput}`}
              placeholder="Detailed info about the page..."
            ></textarea>
          </div>
          <div className="md:col-span-2">
            <label className={`block font-bold mb-1 text-sm ${cTextMuted}`}>
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-full border overflow-hidden flex items-center justify-center flex-shrink-0 ${cInputSec}`}>
                {profilePicture ? (
                  <img
                    src={profilePicture.startsWith("data:") ? profilePicture : `${profilePicture}?t=${cacheBust}`}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-6 w-6 opacity-30 text-emerald-500" />
                )}
              </div>
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={`w-full border rounded-lg px-4 py-2 outline-none text-sm ${cInput}`}
                />
                {profilePicture && (
                  <button
                    type="button"
                    onClick={() => setProfilePicture("")}
                    className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-2 rounded-lg text-sm font-bold hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title="Remove profile picture"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className={`font-bold border-b ${cBorder} pb-2 ${cText}`}>
              Contact & Extra Links
            </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-4 rounded-xl border ${cInputSec}`}>
            <label className={`block font-bold mb-2 text-sm ${cTextMuted}`}>
              Contact Numbers (Main + Extras)
            </label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none ${cInput}`}
              placeholder="Main Contact..."
            />

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newExtraContact}
                onChange={(e) => setNewExtraContact(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none ${cInput}`}
                placeholder="Additional number"
              />
              <button
                onClick={addExtraContact}
                className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-colors"
              >
                Add
              </button>
            </div>
            {extraContacts.length > 0 && (
              <ul className="space-y-1 mt-2">
                {extraContacts.map((c, i) => (
                  <li
                    key={i}
                    className={`flex justify-between items-center px-3 py-1.5 border rounded-md text-sm ${cContainer}`}
                  >
                    <span className={cText}>{c}</span>
                    <button
                      onClick={() =>
                        setExtraContacts(
                          extraContacts.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`p-4 rounded-xl border ${cInputSec}`}>
            <label className={`block font-bold mb-2 text-sm ${cTextMuted}`}>
              Payment Methods
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none ${cInput}`}
                placeholder="e.g. bKash, Card..."
              />
              <button
                onClick={addPaymentMethod}
                className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-colors"
              >
                Add
              </button>
            </div>
            {paymentMethods.length > 0 && (
              <ul className="space-y-1 mt-2">
                {paymentMethods.map((c, i) => (
                  <li
                    key={i}
                    className={`flex justify-between items-center px-3 py-1.5 border rounded-md text-sm ${cContainer}`}
                  >
                    <span className={cText}>{c}</span>
                    <button
                      onClick={() =>
                        setPaymentMethods(
                          paymentMethods.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`p-4 rounded-xl border md:col-span-2 ${cInputSec}`}>
            <label className={`block font-bold mb-2 text-sm ${cTextMuted}`}>
              Other Pages / Group URLs
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newOtherUrl}
                onChange={(e) => setNewOtherUrl(e.target.value)}
                className={`flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none ${cInput}`}
                placeholder="https://..."
              />
              <button
                onClick={addOtherUrl}
                className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-500/20 transition-colors"
              >
                Add
              </button>
            </div>
            {otherUrls.length > 0 && (
              <ul className="space-y-1 mt-2">
                {otherUrls.map((c, i) => (
                  <li
                    key={i}
                    className={`flex justify-between items-center px-3 py-1.5 border rounded-md text-sm ${cContainer}`}
                  >
                    <span className={`truncate flex-1 max-w-[90%] ${cText}`}>{c}</span>
                    <button
                      onClick={() =>
                        setOtherUrls(otherUrls.filter((_, idx) => idx !== i))
                      }
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-8 divide-y divide-white/5 pb-2">
            {/* Section 1: General Status & Discoverability */}
            <div className="space-y-4">
              <h3 className={`text-base font-bold flex items-center gap-2 ${cText}`}>
                <span className="w-1.5 h-4 bg-emerald-500 rounded-sm inline-block"></span>
                Status & Discoverability
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <label className={`block font-bold mb-1.5 text-xs uppercase tracking-wider ${cTextMuted}`}>
                      Status Badge (Standard)
                    </label>
                    <select
                      value={statusBadge}
                      onChange={(e) => setStatusBadge(e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2.5 outline-none ${cInput}`}
                    >
                      <option value="Under Review">Under Review</option>
                      <option value="Verified Marketplace Seller">Verified Seller</option>
                      <option value="Suspicious">Suspicious</option>
                      <option value="Reported as Fraud">Fraud</option>
                      <option value="Gold Seller">⭐ Gold Seller</option>
                    </select>
                  </div>

                  <div className="space-y-4 pt-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={featuredTrustedSeller}
                        onChange={(e) => setFeaturedTrustedSeller(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-emerald-500 rounded border-white/10 bg-[#0B1120] focus:ring-emerald-500/20"
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold group-hover:text-emerald-400 transition-colors ${cText}`}>
                          Featured Trusted Seller
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Highlights this page as featured and highly trusted across the site.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={requireManualFraudApproval}
                        onChange={(e) => setRequireManualFraudApproval(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-indigo-500 rounded border-white/10 bg-[#0B1120] focus:ring-indigo-500/20"
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold group-hover:text-indigo-400 transition-colors ${cText}`}>
                          Require Manual Fraud Approval
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Requires admin review to publish incoming user complaints, preventing automated posting.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-xs uppercase tracking-wider ${cTextMuted}`}>
                    Admin Private Note (Internal)
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={4}
                    className={`w-full border rounded-lg px-4 py-2 outline-none ${cInput}`}
                    placeholder="Internal notes about this seller (not visible to users)..."
                  ></textarea>
                </div>
              </div>
            </div>



            {/* Section 3: Fraud Directory Listing */}
            <div className="space-y-4 pt-6">
              <h3 className={`text-base font-bold flex items-center gap-2 ${cText}`}>
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                Fraud Directory Listing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div className="p-4 rounded-lg border border-rose-500/10 bg-rose-500/5">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isFraudListed}
                        onChange={(e) => setIsFraudListed(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-rose-500 rounded border-rose-500/20 bg-rose-500/10 focus:ring-rose-500/20"
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold group-hover:text-rose-400 transition-colors ${cText}`}>
                          List Page in Detected Fraud Directory
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5 max-w-xs">
                          Publishes this profile publicly inside the fraud directory to warn all users.
                        </span>
                      </div>
                    </label>
                  </div>

                  {isFraudListed && (
                    <div>
                      <label className={`block font-bold mb-1.5 text-xs uppercase tracking-wider ${cTextMuted}`}>
                        Fraud Severity Level
                      </label>
                      <select
                        value={fraudSeverity}
                        onChange={(e) => setFraudSeverity(e.target.value)}
                        className={`w-full border rounded-lg px-4 py-2.5 outline-none ${cInput}`}
                      >
                        <option value="Low Risk">Low Risk</option>
                        <option value="Medium Risk">Medium Risk</option>
                        <option value="High Risk">High Risk</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  )}
                </div>

                {isFraudListed ? (
                  <div className="space-y-4">
                    <div>
                      <label className={`block font-bold mb-1.5 text-xs uppercase tracking-wider ${cTextMuted}`}>
                        Public Reason
                      </label>
                      <textarea
                        value={fraudListReason}
                        onChange={(e) => setFraudListReason(e.target.value)}
                        rows={2}
                        className={`w-full border rounded-lg px-4 py-2 outline-none ${cInput}`}
                        placeholder="Explain publicly (e.g., persistent mock reviews, non-delivery after payment)..."
                      ></textarea>
                    </div>

                    <div>
                      <label className={`block font-bold mb-1.5 text-xs uppercase tracking-wider ${cTextMuted}`}>
                        Internal Fraud Investigation Note
                      </label>
                      <textarea
                        value={fraudInternalNote}
                        onChange={(e) => setFraudInternalNote(e.target.value)}
                        rows={2}
                        className={`w-full border rounded-lg px-4 py-2 outline-none ${cInput}`}
                        placeholder="Private investigation notes and links to evidence..."
                      ></textarea>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 border border-dashed border-white/5 rounded-lg h-full text-center min-h-[140px]">
                    <p className={`text-xs ${cTextMuted} max-w-xs`}>
                      Check "List Page in Detected Fraud Directory" to configure public reasons and severity indicators.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cContainer} rounded-xl shadow-xl w-full max-w-md p-6`}>
            <h3 className={`text-xl font-bold mb-2 ${cText}`}>
              Delete Page?
            </h3>
            <p className={`mb-6 ${cTextMuted}`}>
              Are you sure you want to permanently delete this page? This action
              cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors bg-white/10 hover:bg-white/20 text-white`}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg font-bold transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
