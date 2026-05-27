import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router";

export default function AdminAbuseReportDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("Open");
  const [adminDecision, setAdminDecision] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/abuse-reports/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setReport(data);
        setStatus(data.status || "Open");
        setAdminDecision(data.admin_decision || "");
        setAdminNote(data.admin_note || "");
        setLoading(false);
      });
  }, [id]);

  const handleUpdate = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/abuse-reports/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          admin_decision: adminDecision,
          admin_note: adminNote,
        }),
      });
      if (res.ok) {
        setStatus(newStatus);
        alert("Report updated.");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400 font-bold animate-pulse">
        Loading...
      </div>
    );
  if (!report)
    return (
      <div className="p-8 text-center text-slate-400 font-bold">
        Report not found.
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/tufayel/reports-abuse"
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Abuse Reports
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl overflow-hidden">
            <div className="bg-rose-500/5 p-6 border-b border-rose-500/10 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-rose-400 tracking-tight">
                  {report.report_type}
                </h1>
                <p className="text-sm font-mono text-rose-500 mt-1 font-bold">
                  ID: {report.id}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider
                  ${
                    status === "Resolved"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : status === "Rejected"
                        ? "bg-white/5 text-slate-400 border border-white/5"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }
               `}
              >
                {status}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </h4>
                <p className="text-slate-200 text-sm font-medium leading-relaxed bg-[#050b18]/40 p-4 rounded-lg border border-white/5">
                  {report.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Target Type
                  </h4>
                  <p className="font-mono text-xs bg-[#050b18]/40 p-2.5 rounded border border-white/5 text-slate-300 font-bold">
                    {report.target_type}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Target ID
                  </h4>
                  <p className="font-mono text-xs bg-[#050b18]/40 p-2.5 rounded border border-white/5 text-slate-300 font-bold break-all">
                    {report.target_id}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-2">
                <button className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3.5 py-2 rounded-lg text-sm font-bold hover:bg-blue-600/20 transition-all">
                  View Target Content
                </button>
                <button className="bg-slate-500/10 text-slate-300 border border-slate-500/25 px-3.5 py-2 rounded-lg text-sm font-bold hover:bg-slate-500/15 transition-all">
                  Warn User
                </button>
                <button className="bg-rose-600/10 text-rose-400 border border-rose-500/20 px-3.5 py-2 rounded-lg text-sm font-bold hover:bg-rose-600/20 transition-all">
                  Delete Target Content
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl p-6">
            <h3 className="font-black text-white text-lg tracking-tight mb-4">Admin Action</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Internal Note
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-[#050b18]/40 border border-white/5 focus:ring-emerald-500/20 text-slate-200 rounded-lg p-2 text-sm outline-none font-medium placeholder-slate-600"
                  placeholder="Private note..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Official Decision
                </label>
                <textarea
                  rows={2}
                  value={adminDecision}
                  onChange={(e) => setAdminDecision(e.target.value)}
                  className="w-full bg-[#050b18]/40 border border-white/5 focus:ring-emerald-500/20 text-slate-200 rounded-lg p-2 text-sm outline-none font-medium placeholder-slate-600"
                  placeholder="e.g. User banned due to spam."
                />
              </div>

              <div className="pt-4 grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleUpdate("Resolved")}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle className="h-4 w-4" /> Resolve & Accept
                </button>
                <button
                  onClick={() => handleUpdate("Rejected")}
                  disabled={saving}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <XCircle className="h-4 w-4" /> Reject Report
                </button>
                <button
                  onClick={() => handleUpdate("Under Review")}
                  disabled={saving}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/10"
                >
                  <Clock className="h-4 w-4" /> Mark Under Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
