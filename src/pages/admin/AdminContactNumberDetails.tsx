import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { AlertTriangle, ArrowLeft, Save, ExternalLink } from "lucide-react";
import { Link } from "react-router";

export default function AdminContactNumberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [number, setNumber] = useState<any>(null);
  const [linkedPages, setLinkedPages] = useState<any[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    status: "Normal",
    admin_note: "",
    type: "Contact Number",
    display_name: "",
  });

  useEffect(() => {
    fetch(`/api/admin/contact-numbers/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then(async (data) => {
        setNumber(data);
        setFormData({
          status: data.status || "Normal",
          admin_note: data.admin_note || "",
          type: data.type || "Contact Number",
          display_name: data.display_name || "",
        });

        // Fetch linked page details
        if (data.linked_page_ids) {
          const ids = data.linked_page_ids.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (ids.length > 0) {
            try {
              const pagesRes = await fetch(
                `/api/admin/pages/by-ids?ids=${ids.join(",")}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
              );
              if (pagesRes.ok) {
                const pageList = await pagesRes.json();
                // Preserve order of linked IDs
                const map: Record<string, any> = {};
                (Array.isArray(pageList) ? pageList : []).forEach((p: any) => { map[p.id] = p; });
                setLinkedPages(ids.map((pid: string) => map[pid]).filter(Boolean));
              }
            } catch (_) {}
          }
        }
        setPagesLoaded(true);
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/contact-numbers/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        navigate("/tufayel/contact-numbers");
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500 font-bold animate-pulse">
        Loading...
      </div>
    );
  if (!number)
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Number not found.
      </div>
    );

  const linkedCount = pagesLoaded ? linkedPages.length : (number.linked_page_count || 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/tufayel/contact-numbers"
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Numbers
      </Link>

      <div className="bg-[#091124] rounded-xl border border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {number.number}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Display Name: <span className="font-semibold text-slate-250">{number.display_name || "N/A"}</span>
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider
              ${
                number.status === "Reported"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/15"
                  : number.status === "Suspicious"
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/15"
                    : number.status === "Verified Merchant"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                      : "bg-slate-500/15 text-slate-350 border border-white/5"
              }
            `}
          >
            {number.status}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
            <div>
              <p className="text-slate-400">Mentions in Reviews</p>
              <p className="font-bold text-white text-lg mt-1">
                {number.total_mentions || 0}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Fraud Reports</p>
              <p className="font-bold text-rose-400 text-lg flex items-center gap-1 mt-1">
                {number.fraud_report_count > 0 && (
                  <AlertTriangle className="h-4 w-4" />
                )}{" "}
                {number.fraud_report_count || 0}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Linked Pages</p>
              <p className={`font-bold text-lg mt-1 ${
                linkedCount >= 3 ? "text-rose-400" :
                linkedCount === 2 ? "text-amber-400" : "text-white"
              }`}>
                {linkedCount} {linkedCount === 1 ? "page" : "pages"}
              </p>
            </div>
          </div>

          {/* Linked Pages Section — show when linked to 1 or more pages */}
          {linkedCount > 0 && (
            <>
              <hr className="border-white/5" />
              <div className="space-y-3">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-emerald-400" />
                  Linked Facebook Pages
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-black ${
                    linkedCount >= 3 ? "bg-rose-500/15 text-rose-400" :
                    linkedCount === 2 ? "bg-amber-500/15 text-amber-400" :
                    "bg-slate-500/15 text-slate-400"
                  }`}>
                    {linkedCount}
                  </span>
                </h3>

                {!pagesLoaded ? (
                  <p className="text-sm text-slate-500 italic py-1 animate-pulse">
                    Loading linked pages...
                  </p>
                ) : linkedPages.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-1">
                    Linked page data unavailable (pages may have been deleted).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedPages.map((page: any, i: number) => {
                      const fbUrl = page.facebook_url || '';
                      const displayUrl = fbUrl.startsWith('http') ? fbUrl : `https://facebook.com/${fbUrl}`;
                      return (
                        <div
                          key={page.id}
                          className="flex items-center justify-between bg-[#050b18]/60 border border-white/5 rounded-lg px-4 py-3 hover:border-emerald-500/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-mono text-slate-600 shrink-0">{i + 1}.</span>
                            {page.profile_picture && (
                              <img
                                src={page.profile_picture}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-white text-sm truncate">{page.current_name || "Unknown Page"}</p>
                              <a
                                href={displayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline truncate block"
                              >
                                {fbUrl || "No URL"}
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              page.status_badge === "Reported as Fraud"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : page.status_badge === "Suspicious"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}>
                              {page.status_badge || "Unknown"}
                            </span>
                            <Link
                              to={`/tufayel/pages/${page.id}`}
                              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-white/5" />

          {/* Edit Form */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-250">Manage Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 mt-1 font-semibold placeholder:text-slate-600"
                  placeholder="e.g. John Doe / Gadget Zone BD"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border border-white/5 bg-[#050b18]/45 text-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 mt-1 font-semibold"
                >
                  <option value="Normal" className="bg-[#091124]">Normal</option>
                  <option value="Suspicious" className="bg-[#091124]">Suspicious</option>
                  <option value="Reported" className="bg-[#091124]">Reported</option>
                  <option value="Verified Merchant" className="bg-[#091124]">Verified Merchant</option>
                  <option value="Under Review" className="bg-[#091124]">Under Review</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Number Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full border border-white/5 bg-[#050b18]/45 text-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 mt-1 font-semibold"
                >
                  <option value="Contact Number" className="bg-[#091124]">Contact Number</option>
                  <option value="Payment Number" className="bg-[#091124]">Payment Number</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">
                Admin Note
              </label>
              <textarea
                value={formData.admin_note}
                onChange={(e) =>
                  setFormData({ ...formData, admin_note: e.target.value })
                }
                rows={3}
                className="w-full border border-white/5 bg-[#050b18]/45 text-white rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 mt-1 font-semibold placeholder:text-slate-600"
                placeholder="Internal notes about this number..."
              />
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-white/5">
            <button
              onClick={async () => {
                if (
                  window.confirm("Are you sure you want to delete this number?")
                ) {
                  try {
                    const res = await fetch(
                      `/api/admin/contact-numbers/${id}`,
                      {
                        method: "DELETE",
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                      },
                    );
                    if (res.ok) navigate("/tufayel/contact-numbers");
                  } catch (e) {}
                }
              }}
              className="text-rose-400 border border-rose-500/10 hover:bg-rose-500/5 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Delete Number
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-lg shadow-emerald-950/15"
            >
              <Save className="h-4 w-4" />{" "}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
