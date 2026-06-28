import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Edit,
  Trash2,
} from "lucide-react";
import { Link } from "react-router";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminDisputeDetails() {
  const { t, n } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    status: "Open",
    admin_decision: "",
    admin_note: "",
  });

  useEffect(() => {
    fetch(`/api/admin/disputes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setDispute(data);
        setFormData({
          status: data.status || "Open",
          admin_decision: data.admin_decision || "",
          admin_note: data.admin_note || "",
        });
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (statusOverride?: string) => {
    setSaving(true);
    const finalForm = { ...formData };
    if (statusOverride) {
      finalForm.status = statusOverride;
    }

    try {
      const res = await fetch(`/api/admin/disputes/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalForm),
      });
      if (res.ok) {
        navigate("/tufayel/disputes");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDeleteReview = async () => {
    if (!window.confirm(t("Are you sure you want to delete this review?"))) return;
    try {
      const res = await fetch(`/api/admin/reviews/${dispute.review_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        alert(t("Review deleted successfully."));
        // we might also want to set the dispute status to 'Resolved'
        handleSave('Resolved');
      } else {
        alert(t("Failed to delete review."));
      }
    } catch (e) {
      console.error(e);
      alert(t("Error deleting review."));
    }
  };

  const handleDeleteDispute = async () => {
    if (!window.confirm(t("Are you sure you want to delete this dispute? This action cannot be undone."))) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/disputes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        navigate("/tufayel/disputes");
      } else {
        alert(t("Failed to delete dispute."));
      }
    } catch (e) {
      console.error(e);
      alert(t("Error deleting dispute."));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400 font-bold animate-pulse">
        {t("Loading...")}
      </div>
    );
  if (!dispute)
    return (
      <div className="p-8 text-center text-slate-400 font-bold">
        {t("Dispute not found.")}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/tufayel/disputes"
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Back to Disputes")}
      </Link>

      <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t("Dispute:")} {t(dispute.reason)}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {t("Submitted by:")}{" "}
              <strong className="text-slate-200 font-bold">{dispute.submitted_by}</strong>{" "}
              {t("on")} {new Date(dispute.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider
                ${
                  ["Approved", "Resolved"].includes(dispute.status)
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : dispute.status === "Rejected"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }
             `}
            >
              {t(dispute.status)}
            </span>
            <button
              onClick={handleDeleteDispute}
              disabled={saving}
              className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-500/20 flex items-center gap-2 transition-colors disabled:opacity-50 h-[26px]"
            >
              <Trash2 className="h-3 w-3" /> {t("Delete")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="p-6 md:col-span-2 space-y-8">
            <div>
              <h3 className="font-bold text-white mb-2">
                {t("Dispute Description")}
              </h3>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-amber-400 text-sm whitespace-pre-wrap leading-relaxed font-semibold">
                {dispute.description}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">
                {t("Proof/Attachment")}
              </h3>
              {dispute.proof_image ? (
                 <div className="flex flex-wrap gap-4">
                     {dispute.proof_image.startsWith('[') ? (
                          JSON.parse(dispute.proof_image).map((img: string, idx: number) => (
                            <img key={idx} src={img} alt={`Proof ${idx + 1}`} className="max-w-[200px] h-auto rounded-lg border border-white/5 object-cover" />
                          ))
                      ) : (
                          <img src={dispute.proof_image} alt="Proof" className="max-w-[200px] h-auto rounded-lg border border-white/5 object-cover" />
                      )}
                 </div>
              ) : (
                <p className="text-sm text-slate-400 italic font-semibold">
                  {t("No proof image provided.")}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-bold text-white mb-3 border-b border-white/5 pb-2">
                {t("Related Information")}
              </h3>
              <div className="grid gap-4 text-sm mt-3">
                <div className="bg-[#050b18]/40 p-3 rounded-lg border border-white/5">
                  <span className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">
                    {t("Page")}
                  </span>
                  <Link
                    to={`/page/${dispute.page_id}`}
                    target="_blank"
                    className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    {dispute.page_name}
                  </Link>
                </div>
                <div className="bg-[#050b18]/40 p-3 rounded-lg border border-white/5">
                  <span className="block text-slate-400 text-xs uppercase tracking-wider font-bold mb-1 flex items-center justify-between">
                    <span>{t("Review")}</span>
                    {dispute.review_title ? (
                      <span className="bg-slate-500/10 text-slate-400 px-1.5 py-0.5 rounded text-[10px] border border-white/5">
                        {t(dispute.review_type)}
                      </span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded text-[10px] border border-rose-500/25">
                        {t("Deleted")}
                      </span>
                    )}
                  </span>
                  
                  {dispute.review_title ? (
                    <>
                      <p className="font-bold text-white mt-2">
                        {dispute.review_title}
                      </p>
                      <p className="text-slate-300 mt-1 line-clamp-3 leading-relaxed font-medium">
                        {dispute.review_description}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <button className="text-xs flex items-center gap-1 font-bold text-emerald-400 hover:text-emerald-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded border border-white/5 transition-all">
                          <Edit className="h-3 w-3" /> {t("Edit Review")}
                        </button>
                        <button onClick={handleDeleteReview} className="text-xs flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded border border-white/5 transition-all">
                          <Trash2 className="h-3 w-3" /> {t("Delete Review")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-500 italic text-sm mt-2">{t("This review has been deleted from the system.")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#050b18]/60 flex flex-col gap-5">
            <h3 className="font-bold text-white">{t("Admin Actions")}</h3>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                {t("Status")}
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full bg-[#091124] border-white/5 text-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 p-2.5 border outline-none"
              >
                <option value="Open" className="bg-[#091124]">{t("Open")}</option>
                <option value="Under Review" className="bg-[#091124]">{t("Under Review")}</option>
                <option value="Approved" className="bg-[#091124]">{t("Approved")}</option>
                <option value="Rejected" className="bg-[#091124]">{t("Rejected")}</option>
                <option value="Resolved" className="bg-[#091124]">{t("Resolved")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                {t("Admin Decision (shown to user)")}
              </label>
              <textarea
                value={formData.admin_decision}
                onChange={(e) =>
                  setFormData({ ...formData, admin_decision: e.target.value })
                }
                rows={3}
                className="w-full bg-[#091124] border-white/5 text-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 p-2.5 border outline-none font-medium placeholder-slate-600"
                placeholder={t("Explain why it was approved or rejected...")}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                {t("Internal Note (hidden)")}
              </label>
              <textarea
                value={formData.admin_note}
                onChange={(e) =>
                  setFormData({ ...formData, admin_note: e.target.value })
                }
                rows={2}
                className="w-full bg-[#091124] border-white/5 text-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 p-2.5 border outline-none font-medium placeholder-slate-600"
                placeholder={t("Notes for other admins...")}
              />
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Save className="h-5 w-5" />{" "}
                {saving ? t("Saving...") : t("Save Dispute")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
