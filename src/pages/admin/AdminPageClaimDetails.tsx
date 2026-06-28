import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminPageClaimDetails() {
  const { t, n } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    fetch(`/api/admin/claims/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setClaim(data);
        setAdminNote(data.admin_note || "");
        setLoading(false);
      });
  }, [id]);

  const handleStatusChange = async (
    action: "approve" | "reject" | "revoke" | "delete",
    statusString?: string,
  ) => {
    if (action === "delete") {
      if (!window.confirm(t("Are you sure you want to delete this claim?"))) return;
    }
    setSaving(action);
    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin/claims/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) {
          navigate("/admin/claims");
        } else {
          const err = await res.json();
          alert(t(err.error || "Failed to delete claim"));
          setSaving("");
        }
        return;
      }
      
      const endpoint =
        action === "approve"
          ? `/api/admin/claims/${id}/approve`
          : action === "revoke"
          ? `/api/admin/claims/${id}/revoke`
          : `/api/admin/claims/${id}/reject`;
      const body =
        action === "reject"
          ? { status: statusString || "Rejected", admin_note: adminNote }
          : { admin_note: adminNote };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        navigate("/tufayel/page-claims");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving("");
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400 font-bold animate-pulse">
        {t("Loading...")}
      </div>
    );
  if (!claim)
    return (
      <div className="p-8 text-center text-slate-400 font-bold">
        {t("Claim not found.")}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/tufayel/page-claims"
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Back to Claims")}
      </Link>

      <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-slate-500/10 h-12 w-12 rounded-lg flex items-center justify-center border border-white/5">
              <ShieldCheck className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {t("Claim Request for")} {claim.page_name}
              </h1>
              <a
                href={claim.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline font-bold mt-1 inline-block"
              >
                {claim.facebook_url}
              </a>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider
              ${
                claim.status === "Approved"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : claim.status === "Rejected"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : claim.status === "Revoked"
                      ? "bg-slate-500/10 text-slate-400 border border-[#475569]/30 flex items-center gap-1"
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }
           `}
          >
            {t(claim.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="p-6 md:col-span-2 space-y-6">
            <div>
              <h3 className="font-bold text-white mb-3">
                {t("Claimer Information")}
              </h3>
              <div className="bg-[#050b18]/40 rounded-lg p-4 border border-white/5 grid grid-cols-2 gap-4 text-sm font-semibold">
                <div>
                  <span className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-0.5">{t("Username")}</span>
                  <span className="font-black text-slate-200">
                    @{claim.claimer_username}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-0.5">{t("Contact Email")}</span>
                  <span className="font-bold text-white">
                    {claim.contact_email}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-0.5">{t("Contact Phone")}</span>
                  <span className="font-bold text-white">
                    {n(claim.contact_phone)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-0.5">{t("Submitted")}</span>
                  <span className="font-bold text-slate-300">
                    {new Date(claim.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white mb-3 border-b border-white/5 pb-2">
                {t("Admin Verification Checklist")}
              </h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-300 font-semibold leading-relaxed">
                <li>
                  {t("Check the")} <strong>{t("FB Page Review")}</strong> {t("official Facebook Page Inbox.")}
                </li>
                <li>
                  {t("Did the page")}{" "}
                  <a
                    href={claim.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
                  >
                    {claim.page_name}
                  </a>{" "}
                  {t("send a message?")}
                </li>
                <li>
                  {t("Does the message contain the exact username:")}{" "}
                  <strong className="text-emerald-400">
                    @{claim.claimer_username}
                  </strong>{" "}
                  ?
                </li>
                <li>{t("Ensure the Facebook page URL matches exactly.")}</li>
                <li>{t("Ensure there are no open disputes over ownership.")}</li>
              </ol>
            </div>

            <div>
              <label className="block font-bold text-white mb-2">
                {t("Admin Notes")}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                className="w-full bg-[#091124] border-white/5 text-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 p-3 border outline-none font-medium placeholder-slate-600"
                placeholder={t("Add notes before approving or rejecting...")}
              />
            </div>
          </div>

          <div className="p-6 bg-[#050b18]/60 flex flex-col gap-3">
            <h3 className="font-bold text-white mb-2">{t("Actions")}</h3>

            {claim.status !== "Approved" ? (
              <>
                {claim.status === "Rejected" && (
                  <div className="text-sm font-semibold text-rose-450 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
                    {t("This claim is currently Rejected. You can still approve it or ask for more info below.")}
                  </div>
                )}
                {claim.status === "Need More Info" && (
                  <div className="text-sm font-semibold text-amber-500 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                    {t("This claim is marked as \"Need More Info\". You can approve or reject it below.")}
                  </div>
                )}
                {claim.status === "Revoked" && (
                  <div className="text-sm font-semibold text-zinc-400 p-4 bg-white/5 border border-white/5 rounded-lg text-center">
                    {t("This claim was Revoked. You can restore ownership by approving it below.")}
                  </div>
                )}
                <button
                  onClick={() => handleStatusChange("approve")}
                  disabled={!!saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  <CheckCircle className="h-5 w-5" />{" "}
                  {saving === "approve" ? t("Approving...") : t("Approve Claim")}
                </button>
                <button
                  onClick={() => handleStatusChange("reject", "Need More Info")}
                  disabled={!!saving}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <Info className="h-5 w-5" /> {t("Need More Info")}
                </button>
                <button
                  onClick={() => handleStatusChange("reject")}
                  disabled={!!saving}
                  className="w-full bg-white/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 border border-white/5 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" /> {t("Reject Claim")}
                </button>
                
                {claim.status === "Rejected" && (
                  <button
                    onClick={() => handleStatusChange("delete")}
                    disabled={!!saving}
                    className="w-full bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                  >
                    <Trash2 className="h-5 w-5" /> {saving === "delete" ? t("Deleting...") : t("Delete Claim Record")}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-emerald-400 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-2">
                  {t("This claim is approved. The user has access to this page.")}
                </div>
                <button
                  onClick={() => handleStatusChange("revoke")}
                  disabled={!!saving}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-600/15 cursor-pointer"
                >
                  <XCircle className="h-5 w-5" /> {saving === "revoke" ? t("Revoking...") : t("Revoke Ownership")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
