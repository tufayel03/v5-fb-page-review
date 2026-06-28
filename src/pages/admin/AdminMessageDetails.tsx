import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Mail, Clock, User, Trash2, Reply } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: number;
  created_at: string;
}

export default function AdminMessageDetails() {
  const { t, n } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState<ContactMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch(`/api/admin/contact-messages/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMessage(data);
          
          if (!data.is_read) {
            fetch(`/api/admin/contact-messages/${id}/read`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
          }
        } else {
          navigate('/tufayel/messages');
        }
      } catch (e) {
        console.error(e);
        navigate('/tufayel/messages');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchMessage();
    }
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm(t('Are you sure you want to delete this message?'))) return;
    
    try {
      await fetch(`/api/admin/contact-messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      navigate('/tufayel/messages');
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!message) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          to="/tufayel/messages" 
          className="p-2 bg-[#091124] border border-white/5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-emerald-500" /> {t("Message Details")}
          </h1>
        </div>
      </div>

      <div className="bg-[#091124] border border-white/5 rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 md:p-8 border-b border-white/5 bg-[#050b18]/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white leading-tight">
              {message.subject || t('No Subject')}
            </h2>
            <div className="flex gap-2">
               <a 
                 href={`mailto:${message.email}`}
                 className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 font-bold text-sm rounded-lg border border-emerald-500/30 transition-colors"
               >
                 <Reply className="w-4 h-4" /> {t("Reply")}
               </a>
               <button 
                 onClick={handleDelete}
                 className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 font-bold text-sm rounded-lg border border-rose-500/20 transition-colors"
               >
                 <Trash2 className="w-4 h-4" /> {t("Delete")}
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#050b18]/60 p-4 rounded-lg border border-white/5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium mb-1">{t("From")}</p>
                <p className="font-bold text-white">{message.name}</p>
                <a href={`mailto:${message.email}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                  {message.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 md:justify-end">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium mb-1">{t("Received")}</p>
                <p className="font-bold text-white block">
                  {format(new Date(message.created_at), 'MMMM d, yyyy')}
                </p>
                <span className="text-sm text-slate-400">
                  {format(new Date(message.created_at), 'h:mm a')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 min-h-[300px]">
          <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
            {message.message}
          </div>
        </div>
      </div>
    </div>
  );
}
