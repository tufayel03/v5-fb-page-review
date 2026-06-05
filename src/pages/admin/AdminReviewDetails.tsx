import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ShieldCheck, ShieldAlert, Star, Calendar, Trash2, Link as LinkIcon, User, Save, RefreshCw } from "lucide-react";

export default function AdminReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const [status, setStatus] = useState("");
  const [reviewType, setReviewType] = useState("");
  const [shareImagePublicly, setShareImagePublicly] = useState(false);

  useEffect(() => {
    fetchReview();
  }, [id]);

  const fetchReview = () => {
    fetch(`/api/admin/reviews/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
        } else {
          setReview(data);
          setStatus(data.status);
          setReviewType(data.review_type);
          setShareImagePublicly(data.share_image_publicly === 1);
        }
        setLoading(false);
      });
  };

  const handleSave = () => {
    setSaving(true);
    fetch(`/api/admin/reviews/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ 
        status, 
        review_type: reviewType, 
        share_image_publicly: shareImagePublicly ? 1 : 0,
        proof_image: review.proof_image 
      })
    })
      .then(res => res.json())
      .then(data => {
        setSaving(false);
        if (data.error) alert(data.error);
        else alert("Review updated successfully");
      });
  };

  const [deletingImage, setDeletingImage] = useState<number | null>(null);

  const handleDeleteImage = async (indexToDelete: number) => {
    if (!window.confirm("Delete this proof image? This will permanently remove the file.")) return;
    setDeletingImage(indexToDelete);
    try {
      const res = await fetch(`/api/admin/reviews/${id}/proof-image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ imageIndex: indexToDelete })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setReview({ ...review, proof_image: data.proof_image });
      }
    } catch (e) {
      alert('Failed to delete image');
    }
    setDeletingImage(null);
  };

  const handleDeleteAllImages = async () => {
    if (!window.confirm("Delete ALL proof images for this review? This cannot be undone.")) return;
    setDeletingImage(-1);
    try {
      const res = await fetch(`/api/admin/reviews/${id}/proof-image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ imageIndex: -1 })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setReview({ ...review, proof_image: null });
      }
    } catch (e) {
      alert('Failed to delete images');
    }
    setDeletingImage(null);
  };

  const handleDelete = () => {
    fetch(`/api/admin/reviews/${id}`, {
       method: "DELETE",
       headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(async (res) => {
        if (!res.ok) {
           const text = await res.text();
           throw new Error(`Status ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
           alert(data.error);
        } else {
          alert("Deleted");
          navigate("/tufayel/reviews");
        }
      })
      .catch(err => {
         console.error(err);
         alert("Failed to delete review: " + err.message);
      });
  };

  if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Loading...</div>;
  if (!review) return <div className="p-10 text-center text-rose-500 font-bold">Review not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Review Details</h1>
          <p className="text-slate-400 text-sm font-semibold mt-1">Manage review information and status</p>
        </div>
        <div className="flex items-center gap-3">
          {deleteConfirm ? (
            <button onClick={handleDelete} className="bg-rose-950/30 border border-rose-900/30 text-rose-400 px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-rose-900/40 transition-colors shadow-lg">
              <Trash2 className="h-4 w-4" /> Confirm Delete
            </button>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="bg-white/5 border border-white/5 text-rose-400 px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-white/10 transition-all">
              <Trash2 className="h-4 w-4" /> Delete Review
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/15">
             {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-[#091124] rounded-xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-bold border-b border-white/5 pb-2 mb-4 text-white">Review Content</h2>
              <div className="mb-4 text-emerald-400 flex items-center space-x-1">
                 {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < review.star_rating ? "fill-current" : "text-slate-600"}`} />
                 ))}
                 <span className="font-bold ml-2 text-slate-300">{review.star_rating}.0</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">{review.title}</h3>
              <p className="text-slate-300 leading-relaxed mb-6 whitespace-pre-line text-sm font-medium">{review.description}</p>
              
              <div className="bg-[#050b18]/40 border border-white/5 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm mb-4">
                 <div>
                    <div className="text-slate-400 font-bold mb-1 col-span-2">Date of Experience</div>
                    <div className="flex items-center gap-1 font-bold text-slate-200 mt-1"><Calendar className="h-4 w-4 text-slate-405" /> {review.date_of_experience}</div>
                 </div>
                 {review.order_amount && (
                 <div>
                    <div className="text-slate-400 font-bold mb-1 text-xs uppercase tracking-wider">Order Amount</div>
                    <div className="font-bold text-emerald-400 mt-1">৳ {review.order_amount}</div>
                 </div>
                 )}
              </div>
              
              {review.proof_image && (
                 <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                       <div className="text-slate-400 font-bold text-sm uppercase tracking-wider">Proof Image(s)</div>
                       <button
                         type="button"
                         onClick={handleDeleteAllImages}
                         disabled={deletingImage !== null}
                         className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                       >
                         <Trash2 className="h-3.5 w-3.5" /> Delete All Images
                       </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {(() => {
                           let images: string[] = [];
                           try {
                             if (review.proof_image.startsWith('[')) {
                               images = JSON.parse(review.proof_image);
                             } else if (review.proof_image) {
                               images = [review.proof_image];
                             }
                           } catch (e) {
                             images = [review.proof_image];
                           }
                           
                           if (images.length === 0) return <span className="text-slate-500 font-semibold text-sm">No proof images.</span>;
                           
                           return images.map((img: string, idx: number) => (
                             <div key={idx} className="relative group max-w-[200px]">
                               <img src={img} alt={`Proof ${idx + 1}`} className="w-full h-auto rounded-lg border border-white/5 object-cover" />
                               {deletingImage === idx ? (
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                 </div>
                               ) : (
                                 <button 
                                   type="button"
                                   onClick={() => handleDeleteImage(idx)} 
                                   disabled={deletingImage !== null}
                                   className="absolute top-2 right-2 bg-rose-600/90 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 shadow-md disabled:cursor-not-allowed"
                                   title="Delete this image (removes file from server)"
                                 >
                                   <Trash2 className="h-3.5 w-3.5" />
                                 </button>
                               )}
                               <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                 #{idx + 1}
                               </div>
                             </div>
                           ));
                        })()}
                    </div>
                 </div>
              )}
           </div>
           
           {(review.bkash_number || review.facebook_post_link) && (
           <div className="bg-[#091124] rounded-xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-bold border-b border-white/5 pb-2 mb-4 text-white">Evidences & Links</h2>
              <div className="space-y-4 text-sm">
                 {review.bkash_number && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-rose-500/10 p-4 rounded-lg bg-rose-500/5">
                       <div><span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">bKash Number</span><span className="font-black text-slate-250">{review.bkash_number}</span></div>
                       <div><span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Account Type</span><span className="font-medium text-slate-350">{review.bkash_account_type || 'Unknown'}</span></div>
                       <div><span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Display Name</span><span className="font-medium text-slate-350">{review.bkash_display_name || 'N/A'}</span></div>
                    </div>
                 )}
                 {review.facebook_post_link && (
                    <a href={review.facebook_post_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-emerald-450 hover:text-emerald-300 font-bold transition-all">
                      <LinkIcon className="h-4 w-4" /> View Associated Facebook Post
                    </a>
                 )}
              </div>
           </div>
           )}
        </div>

        <div className="space-y-6">
           <div className="bg-[#091124] rounded-xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-bold border-b border-white/5 pb-2 mb-4 text-white">Moderation</h2>
              <div className="space-y-4 text-sm">
                 <div>
                    <label className="block text-slate-500 font-bold mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-white/5 rounded-lg p-2.5 bg-[#050b18]/45 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 mt-1 font-semibold">
                       <option value="Pending" className="bg-[#091124]">Pending</option>
                       <option value="Published" className="bg-[#091124]">Published</option>
                       <option value="Verified" className="bg-[#091124]">Verified</option>
                       <option value="Rejected" className="bg-[#091124]">Rejected</option>
                       <option value="Under Review" className="bg-[#091124]">Under Review</option>
                    </select>
                 </div>
                 <div>
                     <label className="block text-slate-500 font-bold mb-1">Review Type</label>
                     <select value={reviewType} onChange={(e) => setReviewType(e.target.value)} className="w-full border border-white/5 rounded-lg p-2.5 bg-[#050b18]/45 text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 mt-1 font-semibold">
                        <option value="Good">Good</option>
                        <option value="Bad">Bad</option>
                        <option value="Fraud Report">Fraud Report</option>
                     </select>
                 </div>
                 <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                    <span className="text-slate-400 font-bold text-sm">Share Image Publicly</span>
                    <button
                       type="button"
                       onClick={() => setShareImagePublicly(!shareImagePublicly)}
                       className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          shareImagePublicly ? "bg-emerald-600" : "bg-slate-700"
                       }`}
                    >
                       <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                             shareImagePublicly ? "translate-x-6" : "translate-x-1"
                          }`}
                       />
                    </button>
                 </div>
              </div>
           </div>
           
           <div className="bg-[#091124] rounded-xl border border-white/5 p-6 shadow-xl">
              <h2 className="font-bold border-b border-white/5 pb-2 mb-4 text-white">Metadata</h2>
              <div className="space-y-3 text-sm">
                 <div>
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 block">Review ID</span>
                    <span className="text-xs font-mono bg-[#050b18]/45 border border-white/5 px-2 py-1 mt-1 rounded text-slate-300 block">{review.id}</span>
                 </div>
                 <div>
                     <span className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 block">Author</span>
                     <div className="flex items-center gap-2 mt-1">
                        <div className="bg-white/5 border border-white/5 p-1 rounded-full"><User className="h-3 w-3 text-slate-400" /></div>
                        <span className="font-bold text-slate-200">{review.author_name || review.author_username || 'Unknown User'}</span>
                     </div>
                 </div>
                 <div>
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 block">Target Page</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-emerald-400 truncate block max-w-[200px]">{review.current_name || 'Unknown Page'}</span>
                        <a href={`/page/${review.page_id}`} target="_blank" rel="noreferrer" className="bg-white/5 border border-white/5 p-1.5 rounded hover:bg-white/10 transition-all text-slate-400"><LinkIcon className="h-3 w-3" /></a>
                    </div>
                 </div>
                 <div>
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2 block">Created At</span>
                    <span className="text-slate-300 bg-[#050b18]/45 border border-white/5 font-mono text-xs p-2.5 rounded block mt-1">{new Date(review.created_at).toLocaleString()}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
