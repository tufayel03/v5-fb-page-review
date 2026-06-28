import React from 'react';
import { Link } from 'react-router';
import { PenTool, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function ReviewGuidelines() {
  const { t } = useLanguage();
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <PenTool className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{t("Review Guidelines")}</h1>
          </div>
          
          <p className="text-lg text-slate-600 mb-10 pb-8 border-b border-slate-100">
            {t("To keep our community helpful and trustworthy, we require all users to follow these guidelines when writing reviews or submitting fraud reports.")}
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-800 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" /> {t("What to do")}
              </h2>
              <ul className="space-y-3 text-emerald-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("Submit honest reviews:")}</strong> {t("Post only genuine reviews and reports based on actual, real-life experience.")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("Provide details:")}</strong> {t("Provide accurate Facebook page links, bKash/contact numbers, and transaction dates.")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("Use proper proof:")}</strong> {t("Upload proof or screenshots only if you have the explicit right to share them.")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("Protect privacy:")}</strong> {t("Hide or blur sensitive personal information from screenshots before uploading.")}</span>
                </li>
              </ul>
            </div>

            <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100">
              <h2 className="text-xl font-bold flex items-center gap-2 text-rose-800 mb-4">
                <XCircle className="w-6 h-6 text-rose-600" /> {t("What NOT to do")}
              </h2>
              <ul className="space-y-3 text-rose-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("Avoid fake reviews:")}</strong> {t("No fake reviews, competitor attacks, or revenge reports.")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("Avoid toxic posting:")}</strong> {t("Avoid abusive, hateful, threatening, or defamatory language.")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("No private data exposure:")}</strong> {t("Do not post passwords, full credit cards, addresses, or private numbers of individuals.")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0 mt-0.5">•</span>
                  <span><strong>{t("No spam/ads:")}</strong> {t("Do not use reviews for advertisement or solicitation.")}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 mb-10">
            <h3 className="text-lg font-bold text-amber-900 mb-2">{t("Warning on Abuse")}</h3>
            <p className="text-amber-800 text-sm">
              {t("Fake or malicious reviews and reports may be removed permanently without notice, and the offending user account may be suspended or banned from using our platform.")}
            </p>
          </div>

          <div className="prose prose-slate max-w-none text-slate-700 mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">{t("Business Replies & Disputes")}</h2>
            <p>
              {t("Remember that business owners have the right to reply to reviews and dispute incorrect reports. If a review is proven to be false or malicious, it will be removed per our Content Removal Policy, and the offending user's account may be restricted.")}
            </p>
          </div>

          <div className="flex justify-center mt-12 pt-8 border-t border-slate-100">
            <Link to="/write-review" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-colors shadow-sm">
              {t("Write a Review Now")}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
