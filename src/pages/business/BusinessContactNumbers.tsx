import React from 'react';
import { Phone, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';

export default function BusinessContactNumbers() {
  const { t } = useLanguage();
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("Contact Numbers")}</h1>
        <p className="text-slate-500">{t("View and manage bKash/Phone numbers linked to your pages.")}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <Phone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">{t("Manage Linked Numbers")}</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          {t("To set your official number, go to Profile Info. To report unrecognized user-reported numbers, please find the specific review in the Reviews section and submit a dispute.")}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
           <Link to="/business-dashboard/profile-info" className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">
             {t("Set Official Number")}
           </Link>
           <Link to="/business-dashboard/reviews" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
             <AlertTriangle className="h-4 w-4" /> {t("Dispute a Review")}
           </Link>
        </div>
      </div>
    </div>
  );
}
