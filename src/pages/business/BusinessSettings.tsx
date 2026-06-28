import React from 'react';
import { Save } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function BusinessSettings() {
  const { t } = useLanguage();
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert(t('Settings saved successfully.'));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("Settings")}</h1>
        <p className="text-slate-500">{t("Manage your business account preferences.")}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="mb-6 pb-6 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-900 mb-4">{t("Notification Preferences")}</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
               <div>
                  <div className="font-bold text-slate-800 text-sm">{t("New Review Alerts")}</div>
                  <div className="text-xs text-slate-500">{t("Get notified when a customer leaves a new review.")}</div>
               </div>
               <input type="checkbox" defaultChecked className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
               <div>
                  <div className="font-bold text-slate-800 text-sm">{t("Dispute Updates")}</div>
                  <div className="text-xs text-slate-500">{t("Get notified when admins update your dispute status.")}</div>
               </div>
               <input type="checkbox" defaultChecked className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
               <div>
                  <div className="font-bold text-slate-800 text-sm">{t("Fraud Reports")}</div>
                  <div className="text-xs text-slate-500">{t("Get notified if someone reports your page for fraud.")}</div>
               </div>
               <input type="checkbox" defaultChecked className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" />
            </label>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4">{t("Contact Preferences")}</h2>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t("Contact Email (Internal)")}</label>
            <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-indigo-500" placeholder={t("Enter your preferred contact email...")} />
            <p className="text-xs text-slate-500 mt-2">{t("Admins will use this email to contact you regarding your claimed pages.")}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Save className="h-4 w-4" /> {t("Save Settings")}
          </button>
        </div>
      </form>
    </div>
  );
}
