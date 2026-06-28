import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function ContentRemovalPolicy() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'bn' ? 'bn-BD' : 'en-US';
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">{t("Content Removal Policy")}</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">{t("Last Updated:")} {new Date().toLocaleDateString(dateLocale)}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <p className="lead text-xl text-slate-800 font-medium mb-6">
              {t("Our goal at FB Page Review is to maintain an accurate and helpful repository. We generally do not remove user reviews just because they are negative, but we will remove content that violates our community standards.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("When We Remove, Edit, or Restrict Content")}</h2>
            <p className="mb-4">
              {t("Content (reviews, reports, or comments) may be removed, edited, hidden, or restricted by our administration team if it meets any of the following criteria:")}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>{t("Fake, Malicious, or Misleading:")}</strong> {t("Fabricated experiences, misleading reviews, automated bots, competitor attacks, or revenge reports.")}</li>
              <li><strong>{t("Sensitive Private Information:")}</strong> {t("Publishing credit card details, passwords, national identity numbers, private physical addresses, or other sensitive personal info.")}</li>
              <li><strong>{t("Abusive or Threatening Language:")}</strong> {t("Insults, hate speech, vulgarity, harassment, or threatening tones.")}</li>
              <li><strong>{t("Wrong Facebook Page:")}</strong> {t("The review or report was clearly submitted under the wrong business profile.")}</li>
              <li><strong>{t("Unsupported Serious Allegations:")}</strong> {t("Severe accusations made without any supporting text, details, or requested proof.")}</li>
              <li><strong>{t("Violates Review Guidelines:")}</strong> {t("Any submission failing to conform to our posted Review Guidelines.")}</li>
              <li><strong>{t("Violates Applicable Law:")}</strong> {t("Any material violating local or international legislation.")}</li>
              <li><strong>{t("Creates Legal or Safety Risk:")}</strong> {t("Content that creates immediate privacy, legal, or physical safety concerns for any user or the platform.")}</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("Removal & Correction Process")}</h2>
            <p className="mb-4">
              {t("Users and business owners may submit correction/removal requests. Upon submission:")}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>{t("The administration team will thoroughly review the request and the underlying evidence.")}</li>
              <li>{t("The administrator may choose to approve, reject, edit, or keep the content untouched based on the facts.")}</li>
            </ul>

            <div className="bg-slate-100 p-6 rounded-lg my-8 border-l-4 border-emerald-500">
              <h3 className="font-bold text-slate-800 mb-2">{t("Estimated Review Timeline")}</h3>
              <p className="text-sm text-slate-700">
                {t("Valid removal or correction requests are typically reviewed and finalized within 7–15 business days, depending on the complexity of the case and the level of evidence supplied by both parties.")}
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("Final Decision")}</h2>
            <p className="mb-4">
              {t("The moderation team makes the final decision on content removal. If your content is removed and you believe it was done in error, you may reach out via the Contact page, though we do not guarantee reinstatement.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
