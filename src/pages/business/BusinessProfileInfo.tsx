import React, { useState, useEffect } from 'react';
import { Store, Save, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function BusinessProfileInfo() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  
  // Form State
  const [formData, setFormData] = useState({
    business_description: '',
    payment_methods: '',
    official_contact_number: '',
    official_email: '',
    business_address: '',
    website_url: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch('/api/business/pages', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => { 
        setPages(Array.isArray(data) ? data : []); 
        if (data.length > 0) {
          setSelectedPageId(data[0].id);
        }
        setLoading(false); 
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedPageId) {
      const page = pages.find(p => p.id === selectedPageId);
      if (page) {
        setFormData({
          business_description: page.business_description || '',
          payment_methods: page.payment_methods || '',
          official_contact_number: page.official_contact_number || '',
          official_email: page.official_email || '',
          business_address: page.business_address || '',
          website_url: page.website_url || ''
        });
        setSuccessMsg('');
      }
    }
  }, [selectedPageId, pages]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPageId) return;
    
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/business/pages/${selectedPageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setSuccessMsg(t('Profile information updated successfully. Changes will appear on your public page.'));
        // Update local pages state
        setPages(prev => prev.map(p => p.id === selectedPageId ? { ...p, ...formData } : p));
      } else {
        const err = await res.json();
        alert(err.error || t('Failed to save'));
      }
    } catch (e) {
      alert(t('An error occurred while saving.'));
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">{t("Loading...")}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("Profile Information")}</h1>
        <p className="text-slate-500">{t("Update your business details shown to customers.")}</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">{t("Select Page")}</label>
        <select 
          value={selectedPageId} 
          onChange={e => setSelectedPageId(e.target.value)}
          className="w-full max-w-md bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          {pages.map(p => (
            <option key={p.id} value={p.id}>{p.current_name}</option>
          ))}
        </select>
      </div>

      {pages.length > 0 && selectedPageId && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
            <Store className="h-8 w-8 text-indigo-600" />
            <div>
              <h2 className="font-bold text-lg text-slate-900">{t("Business Information")}</h2>
              <p className="text-sm text-slate-500">{t("Update your public profile data")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">{t("Short Business Description")}</label>
              <textarea name="business_description" value={formData.business_description} onChange={handleChange} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:bg-white focus:outline-none focus:border-indigo-500" placeholder={t("e.g. We are a trusted seller of electronics gadgets...")} />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t("Payment Methods")}</label>
              <input type="text" name="payment_methods" value={formData.payment_methods} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-indigo-500" placeholder={t("e.g. bKash, Nagad, Card")} />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t("Official Contact Number")}</label>
              <input type="text" name="official_contact_number" value={formData.official_contact_number} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-indigo-500" placeholder={t("e.g. 01700000000")} />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t("Official Email")}</label>
              <input type="email" name="official_email" value={formData.official_email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-indigo-500" placeholder={t("e.g. info@business.com")} />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">{t("Website Link")}</label>
              <input type="url" name="website_url" value={formData.website_url} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-indigo-500" placeholder="https://..." />
            </div>
          </div>

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="h-5 w-5" /> {successMsg}
            </div>
          )}

          <div className="border-t border-slate-100 pt-6 flex justify-end">
            <button disabled={saving} type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              <Save className="h-4 w-4" /> {saving ? t('Saving...') : t('Save Changes')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
