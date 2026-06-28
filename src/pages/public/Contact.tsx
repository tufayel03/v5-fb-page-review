import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({ name: '', email: '', subject: t('General Inquiry'), message: '' });
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', text: '' });
    
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setStatus({ type: 'success', text: t('Thank you for your message. We will get back to you soon.') });
        setFormData({ name: '', email: '', subject: t('General Inquiry'), message: '' });
      } else {
        setStatus({ type: 'error', text: t('Something went wrong. Please try again.') });
      }
    } catch (e) {
      setStatus({ type: 'error', text: t('Something went wrong. Please try again later.') });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">{t("Contact Us")}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("Have a question, need to report an issue, or want to claim a business page? We're here to help.")}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">{t("Send us a message")}</h2>
          
          {status.text && (
            <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {status.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t("Full Name")}</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  placeholder={t("John Doe")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t("Email Address")}</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t("Subject")}</label>
              <select 
                required 
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              >
                <option value={t('General Inquiry')}>{t('General Inquiry')}</option>
                <option value={t('Report Website Issue')}>{t('Report Website Issue')}</option>
                <option value={t('Business Page Claim Request')}>{t('Business Page Claim Request')}</option>
                <option value={t('Review/Report Dispute')}>{t('Review/Report Dispute')}</option>
                <option value={t('Partnership')}>{t('Partnership')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t("Message")}</label>
              <textarea 
                required 
                rows={5}
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none"
                placeholder={t("How can we help you?")}
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? t('Sending...') : t('Send Message')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
