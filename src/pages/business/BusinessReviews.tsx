import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, AlertCircle, AlertTriangle, X, Info, Search, Download, Database, ThumbsUp, ThumbsDown, ShieldAlert, Clock, Scale, Calendar, User, Phone, Paperclip, Facebook, ExternalLink, MoreHorizontal, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useTheme } from '../../context/ThemeContext';

export default function BusinessReviews() {
  const { theme } = useTheme();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  
  // Filters
  const [ratingFilter, setRatingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [replyFilter, setReplyFilter] = useState('');
  const [disputeFilter, setDisputeFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('Newest First');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [disputeReason, setDisputeReason] = useState('Fake review');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [proofIndex, setProofIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const fetchReviews = () => {
    fetch('/api/business/reviews', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => { 
        const arrayData = Array.isArray(data) ? data : [];
        setReviews(arrayData);
        setLoading(false); 
        
        const reviewId = searchParams.get('reviewId');
        if (reviewId) {
          const review = arrayData.find(r => r.id === reviewId);
          if (review) {
            setSelectedReview(review);
            setReplyText(review.owner_reply ? review.owner_reply.reply_text : '');
            setReplyModalOpen(true);
          }
        }
      })
      .catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => {
    fetchReviews();
  }, [searchParams]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/business/replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ review_id: selectedReview.id, reply_text: replyText })
      });
      if (res.ok) {
        alert('Your reply has been posted.');
        setReplyModalOpen(false);
        fetchReviews();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit reply');
      }
    } catch (err) {
      alert('An error occurred');
    }
    setSubmitting(false);
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !disputeDescription.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/business/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          page_id: selectedReview.page_id,
          review_id: selectedReview.id,
          reason: disputeReason,
          description: disputeDescription
        })
      });
      if (res.ok) {
        alert('Your dispute has been submitted.');
        setDisputeModalOpen(false);
        fetchReviews();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit dispute');
      }
    } catch (err) {
      alert('An error occurred');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium tracking-wide">Loading reviews...</div>;

  // Stats calculation
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? (reviews.reduce((acc, r) => acc + r.star_rating, 0) / totalReviews).toFixed(1) : '0.0';
  const goodReviews = reviews.filter(r => r.review_type === 'Safe' || r.review_type === 'Good').length;
  const badReviews = reviews.filter(r => r.review_type === 'Suspicious' || r.review_type === 'Bad').length;
  const fraudReports = reviews.filter(r => r.review_type === 'Fraud Report').length;
  const pendingReplies = reviews.filter(r => !r.owner_reply).length;
  const openDisputes = reviews.filter(r => r.dispute && r.dispute.status === 'Open').length;

  let filteredReviews = reviews.filter(r => {
    if (ratingFilter && r.star_rating.toString() !== ratingFilter) return false;
    if (typeFilter) {
      const type = r.review_type;
      if (typeFilter === 'Good') {
        if (type !== 'Safe' && type !== 'Good') return false;
      } else if (typeFilter === 'Bad') {
        if (type !== 'Suspicious' && type !== 'Bad') return false;
      } else if (typeFilter === 'Fraud Report') {
        if (type !== 'Fraud Report') return false;
      } else {
        if (type !== typeFilter) return false;
      }
    }
    
    if (replyFilter === 'Replied' && !r.owner_reply) return false;
    if (replyFilter === 'Not Replied' && r.owner_reply) return false;

    if (disputeFilter === 'Disputed' && !r.dispute) return false;
    if (disputeFilter === 'Not Disputed' && r.dispute) return false;
    if (disputeFilter === 'Open Dispute' && (!r.dispute || r.dispute.status !== 'Open')) return false;
    if (disputeFilter === 'Resolved Dispute' && (!r.dispute || r.dispute.status !== 'Resolved')) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchUser = r.user_name?.toLowerCase().includes(q);
      const matchPhone = r.bkash_number?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUser && !matchPhone) return false;
    }
    return true;
  });

  filteredReviews.sort((a, b) => {
    switch (sortOrder) {
      case 'Newest First': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'Oldest First': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'Highest Rating': return b.star_rating - a.star_rating;
      case 'Lowest Rating': return a.star_rating - b.star_rating;
      case 'Fraud Reports First': return (b.review_type === 'Fraud Report' ? 1 : 0) - (a.review_type === 'Fraud Report' ? 1 : 0);
      case 'Suspicious Reports First': return ((b.review_type === 'Suspicious' || b.review_type === 'Bad') ? 1 : 0) - ((a.review_type === 'Suspicious' || a.review_type === 'Bad') ? 1 : 0);
      case 'Not Replied First': return (a.owner_reply ? 1 : 0) - (b.owner_reply ? 1 : 0);
      case 'Recently Updated': return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      default: return 0;
    }
  });

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const paginatedReviews = filteredReviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openReplyModal = (review: any) => {
    setSelectedReview(review);
    setReplyText(review.owner_reply ? review.owner_reply.reply_text : '');
    setReplyModalOpen(true);
  };

  const openDisputeModal = (review: any) => {
    setSelectedReview(review);
    setDisputeReason('Fake review');
    setDisputeDescription('');
    setDisputeModalOpen(true);
  };

  const openProofModal = (proofImageVal: string) => {
    let imgs: string[] = [];
    try {
      if (proofImageVal.startsWith('[')) {
        imgs = JSON.parse(proofImageVal);
      } else {
        imgs = [proofImageVal];
      }
    } catch (e) {
      imgs = [proofImageVal];
    }
    setProofImages(imgs);
    setProofIndex(0);
    setSelectedProof(imgs[0] || null);
    setProofModalOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;
    
    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        setProofIndex((prev) => (prev === proofImages.length - 1 ? 0 : prev + 1));
      } else {
        setProofIndex((prev) => (prev === 0 ? proofImages.length - 1 : prev - 1));
      }
    }
    setTouchStartX(null);
  };

  const cContainer = theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0B1120] border-white/5';
  const cText = theme === 'light' ? 'text-slate-900' : 'text-white';
  const cTextMuted = theme === 'light' ? 'text-slate-500' : 'text-slate-400';
  const cInput = theme === 'light' ? 'bg-white border-slate-300 focus:border-indigo-500' : 'bg-[#0F172A] border-white/10 focus:border-indigo-500 text-white';

  return (
    <div className={`space-y-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${cText}`}>Reviews</h1>
          <p className={cTextMuted}>View reviews for your claimed pages, reply publicly, or submit disputes.</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${theme === 'light' ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-[#0F172A] border-white/10 hover:bg-white/5 text-slate-300'}`}>
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {/* Stats Cards - Redesigned to match dark glow aesthetic */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: totalReviews, icon: Database, color: '#3b82f6', border: 'border-t-blue-500/50' },
          { label: 'Avg Rating', value: averageRating, icon: Star, color: '#eab308', border: 'border-t-yellow-500/50' },
          { label: 'Good', value: goodReviews, icon: ThumbsUp, color: '#10b981', border: 'border-t-emerald-500/50' },
          { label: 'Bad', value: badReviews, icon: ThumbsDown, color: '#f97316', border: 'border-t-orange-500/50' },
          { label: 'Fraud', value: fraudReports, icon: ShieldAlert, color: '#ef4444', border: 'border-t-rose-500/50' },
          { label: 'Pending Replies', value: pendingReplies, icon: Clock, color: '#8b5cf6', border: 'border-t-purple-500/50' },
          { label: 'Open Disputes', value: openDisputes, icon: Scale, color: '#a855f7', border: 'border-t-fuchsia-500/50' },
        ].map(stat => (
          <div key={stat.label} className={`p-4 rounded-xl border border-b-0 border-x-0 bg-opacity-70 ${theme === 'light' ? `bg-white shadow-sm \${stat.border}` : `bg-[#131A2B] border-white/5 \${stat.border}`}`} style={{ borderTopWidth: '2px' }}>
             <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-white/5">
                 <stat.icon style={{ color: stat.color }} className="h-5 w-5" />
               </div>
               <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                  <p className={`text-xl font-bold mt-1 ${theme === 'light' ? 'text-slate-900' : stat.color}`}>{stat.value}</p>
               </div>
             </div>
          </div>
        ))}
      </div>

      <div className={`p-5 rounded-2xl border shadow-sm ${cContainer}`}>
        <div className="flex flex-col xl:flex-row gap-4 mb-4">
           <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input 
                 type="text" 
                 placeholder="Search reviews (title, description, username, bkash)..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className={`w-full rounded-xl pl-10 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${cInput}`}
              />
              <div className="absolute right-3 top-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-400 border border-white/10">⌘ K</div>
           </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm appearance-none outline-none ${cInput}`}>
            <option value="">All Types</option>
            <option value="Good">Good</option>
            <option value="Bad">Bad</option>
            <option value="Fraud Report">Fraud Report</option>
          </select>
          <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm appearance-none outline-none ${cInput}`}>
            <option value="">All Ratings</option>
            {[5,4,3,2,1].map(n => <option key={n} value={n.toString()}>{n} Stars</option>)}
          </select>
          <select value={replyFilter} onChange={e => setReplyFilter(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm appearance-none outline-none ${cInput}`}>
            <option value="">All Reply Status</option>
            <option value="Replied">Replied</option>
            <option value="Not Replied">Not Replied</option>
          </select>
          <select value={disputeFilter} onChange={e => setDisputeFilter(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm appearance-none outline-none ${cInput}`}>
            <option value="">All Dispute Status</option>
            <option value="Disputed">Disputed</option>
            <option value="Not Disputed">Not Disputed</option>
            <option value="Open Dispute">Open Dispute</option>
            <option value="Resolved Dispute">Resolved Dispute</option>
          </select>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={`rounded-xl px-4 py-2.5 text-sm appearance-none outline-none ${cInput}`}>
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
            <option value="Highest Rating">Highest Rating</option>
            <option value="Lowest Rating">Lowest Rating</option>
            <option value="Fraud Reports First">Fraud Reports First</option>
            <option value="Suspicious Reports First">Suspicious Reports First</option>
            <option value="Not Replied First">Not Replied First</option>
            <option value="Recently Updated">Recently Updated</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedReviews.length === 0 ? (
           <div className={`p-8 text-center rounded-2xl border ${theme === 'light' ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#0B1120] border-white/5 text-slate-400'}`}>
             No reviews match your filters.
           </div>
        ) : (
          paginatedReviews.map((review, idx) => {
            const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;
            const isFraud = review.review_type === 'Fraud Report';
            const isGood = review.review_type === 'Safe' || review.review_type === 'Good';
            
            return (
            <div key={review.id} className={`rounded-2xl border shadow-sm p-6 relative flex flex-col gap-5 ${cContainer}`}>
              <div className="absolute top-6 right-6 flex items-center gap-4 text-slate-400 font-medium text-sm">
                <span>#{serialNumber}</span>
                <button className="hover:text-white transition-colors"><MoreHorizontal className="h-5 w-5" /></button>
              </div>

              {/* Header: Stars & Badge */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <div className={`flex items-center ${isGood ? 'text-emerald-500' : isFraud ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < review.star_rating ? 'fill-current' : 'text-slate-600'}`} />
                      ))}
                   </div>
                   <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                      isGood ? (theme==='dark'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-emerald-100 text-emerald-700 border-emerald-200') :
                      isFraud ? (theme==='dark'?'bg-rose-500/10 text-rose-400 border-rose-500/20':'bg-rose-100 text-rose-700 border-rose-200') :
                      (theme==='dark'?'bg-amber-500/10 text-amber-400 border-amber-500/20':'bg-amber-100 text-amber-700 border-amber-200')
                   }`}>
                      {isFraud ? 'Fraud Report' : review.review_type}
                   </span>
                   {review.dispute && (
                     <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        review.dispute.status === 'Open' ? (theme==='dark'?'bg-purple-500/10 text-purple-400 border-purple-500/20':'bg-purple-100 text-purple-700 border-purple-200') :
                        (theme==='dark'?'bg-slate-500/10 text-slate-400 border-slate-500/20':'bg-slate-100 text-slate-700 border-slate-200')
                     }`}>
                        <AlertCircle className="h-3 w-3" /> {review.dispute.status} Dispute
                     </span>
                   )}
                </div>
                <h3 className={`font-bold text-lg ${cText}`}>{review.title}</h3>
              </div>

              {/* Meta Info Row */}
              <div className={`flex flex-wrap items-center text-sm gap-x-6 gap-y-3 ${cTextMuted}`}>
                <div className="flex items-center gap-2"><User className="h-4 w-4" /> <span className="font-semibold text-current opacity-70">Reviewer:</span> {review.user_name || 'Anonymous'}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span className="font-semibold text-current opacity-70">Posted:</span> {new Date(review.created_at).toLocaleDateString()}</div>
                {review.date_of_experience && <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span className="font-semibold text-current opacity-70">Experience Date:</span> {review.date_of_experience}</div>}
                {review.bkash_number && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <span className="font-semibold text-current opacity-70">Contact/bKash:</span> {review.bkash_number}</div>}
              </div>

              {/* Proof Connections Row */}
              {(review.proof_image || review.facebook_post_link) && (
                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold mt-1">
                  {review.proof_image && (
                    <button onClick={() => openProofModal(review.proof_image)} className="flex items-center gap-1.5 text-purple-500 hover:text-purple-400 transition-colors">
                      <Paperclip className="h-4 w-4" /> Proof Attached
                    </button>
                  )}
                  {review.facebook_post_link && (
                    <a href={review.facebook_post_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 transition-colors">
                      <Facebook className="h-4 w-4" /> Facebook Evidence
                    </a>
                  )}
                </div>
              )}

              {/* Description Body */}
              <div className={`text-sm whitespace-pre-wrap rounded-xl p-4 border mt-2 ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#121A2F] border-white/5 text-slate-300'}`}>
                {review.description}
              </div>

              {/* Owner Reply */}
              {review.owner_reply && (
                <div className={`p-4 rounded-xl border mt-2 ${theme === 'light' ? 'bg-indigo-50 border-indigo-100 text-slate-800' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-100'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${theme === 'light' ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-500 text-white'}`}>Business Owner Reply</span>
                    <span className="text-xs opacity-60">{new Date(review.owner_reply.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{review.owner_reply.reply_text}</p>
                </div>
              )}

              {/* Actions */}
              <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/5'}`}>
                 <div className="flex items-center gap-3">
                   <button 
                     onClick={() => openReplyModal(review)}
                     className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                   >
                     <MessageSquare className="h-4 w-4" /> {review.owner_reply ? 'Edit Reply' : 'Reply'}
                   </button>
                   <button 
                     onClick={() => openDisputeModal(review)}
                     className={`text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 border ${theme === 'light' ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-transparent border-white/10 text-slate-300 hover:bg-white/5'}`}
                   >
                     <AlertTriangle className="h-4 w-4" /> Dispute
                   </button>
                 </div>
                 <Link to={`/page/${review.page_id}`} target="_blank" className="text-sm font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-2 pr-2">
                   View Public Review <ExternalLink className="h-4 w-4" />
                 </Link>
              </div>
            </div>
            );
          })
        )}
      </div>

      {totalPages > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8 pb-4">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className={`px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors ${cInput}`}>Previous</button>
          <span className={`text-sm font-bold ${cText}`}>{currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(c => c + 1)} className={`px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors ${cInput}`}>Next</button>
        </div>
      )}

      {/* Proof Modal */}
      {proofModalOpen && proofImages.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" 
          onClick={() => setProofModalOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
           <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setProofModalOpen(false)} 
                className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-[210]"
                title="Close"
              >
                 <X className="h-6 w-6" />
              </button>

              {/* Left Chevron */}
              {proofImages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProofIndex((prev) => (prev === 0 ? proofImages.length - 1 : prev - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-[205]"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Image */}
              <img 
                src={proofImages[proofIndex]} 
                alt={`Proof Evidence ${proofIndex + 1}`} 
                className="h-auto max-h-[75vh] object-contain rounded-lg shadow-2xl" 
              />

              {/* Counter */}
              <div className="mt-4 text-white/70 font-semibold text-sm bg-white/10 px-3 py-1 rounded-full font-sans">
                {proofIndex + 1} / {proofImages.length}
              </div>

              {/* Right Chevron */}
              {proofImages.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProofIndex((prev) => (prev === proofImages.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-[205]"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
           </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModalOpen && selectedReview && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0B1120] border-white/10'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#121A2F] border-white/5'}`}>
              <h2 className={`font-bold text-lg ${cText}`}>Public Reply</h2>
              <button onClick={() => setReplyModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className={`p-4 rounded-xl text-sm mb-5 border ${theme === 'light' ? 'bg-indigo-50 border-indigo-100 text-slate-800' : 'bg-indigo-500/5 border-indigo-500/10 text-slate-300'}`}>
                <p className={`font-bold mb-1 ${cText}`}>{selectedReview.title}</p>
                <p className="line-clamp-3 opacity-90">{selectedReview.description}</p>
              </div>
              <form id="reply-form" onSubmit={handleReplySubmit}>
                <label className={`block text-sm font-bold mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Your Response</label>
                <textarea 
                  rows={5}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write your official response here. This will be visible publicly on the review page."
                  className={`w-full rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${cInput}`}
                  required
                />
              </form>
            </div>
            <div className={`p-5 border-t flex justify-end gap-3 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#121A2F] border-white/5'}`}>
              <button disabled={submitting} type="button" onClick={() => setReplyModalOpen(false)} className={`px-5 py-2.5 rounded-lg font-bold transition-colors ${theme === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/5'}`}>Cancel</button>
              <button disabled={submitting} type="submit" form="reply-form" className="px-5 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Post Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && selectedReview && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0B1120] border-white/10'}`}>
            <div className={`p-5 border-b flex justify-between items-center ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#121A2F] border-white/5'}`}>
              <h2 className={`font-bold text-lg flex items-center gap-2 ${cText}`}><AlertTriangle className="h-5 w-5 text-orange-500" /> File a Dispute</h2>
              <button onClick={() => setDisputeModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className={`p-4 rounded-xl text-sm mb-5 border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <p className={`font-bold mb-1 ${cText}`}>{selectedReview.title}</p>
                <p className={`line-clamp-2 ${cTextMuted}`}>{selectedReview.description}</p>
              </div>
              {selectedReview.dispute ? (
                <div className={`p-4 rounded-xl border text-sm mb-4 ${theme === 'light' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-orange-500/10 text-orange-300 border-orange-500/20'}`}>
                  <p className="font-bold flex items-center gap-1"><AlertTriangle className="h-4 w-4"/> Dispute Already Filed</p>
                  <p className="mt-2 font-medium">Status: {selectedReview.dispute.status}</p>
                  <p className="mt-1 font-medium">Reason: {selectedReview.dispute.reason}</p>
                  <p className="mt-2 opacity-80">You have already submitted a dispute for this review.</p>
                </div>
              ) : (
                <form id="dispute-form" onSubmit={handleDisputeSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${cText}`}>Dispute Reason</label>
                    <select 
                      value={disputeReason} 
                      onChange={e => setDisputeReason(e.target.value)}
                      className={`w-full rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${cInput}`}
                    >
                      <option value="Fake review">Fake review</option>
                      <option value="Wrong Facebook page">Wrong Facebook page</option>
                      <option value="Wrong bKash/contact number">Wrong bKash/contact number</option>
                      <option value="False accusation">False accusation</option>
                      <option value="Duplicate review">Duplicate review</option>
                      <option value="Abusive content">Abusive content</option>
                      <option value="Misleading screenshot/post link">Misleading screenshot/post link</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${cText}`}>Detailed Explanation</label>
                    <textarea 
                      rows={4}
                      value={disputeDescription}
                      onChange={e => setDisputeDescription(e.target.value)}
                      placeholder="Explain precisely why this review is incorrect and should be removed..."
                      className={`w-full rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${cInput}`}
                      required
                    />
                  </div>
                </form>
              )}
            </div>
            <div className={`p-5 border-t flex justify-end gap-3 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#121A2F] border-white/5'}`}>
              <button disabled={submitting} type="button" onClick={() => setDisputeModalOpen(false)} className={`px-5 py-2.5 rounded-lg font-bold transition-colors ${theme === 'light' ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/5'}`}>{selectedReview.dispute ? 'Close' : 'Cancel'}</button>
              {!selectedReview.dispute && (
                <button disabled={submitting} type="submit" form="dispute-form" className="px-5 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
