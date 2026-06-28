import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function DisputePolicy() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'bn' ? 'bn-BD' : 'en-US';
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">{t("Dispute Policy")}</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">{t("Last Updated:")} {new Date().toLocaleDateString(dateLocale)}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <p className="lead text-xl text-slate-800 font-medium mb-6">
              {t("We understand that mistakes happen and sometimes reviews are left incorrectly, or maliciously. Our Dispute Policy outlines how business owners can challenge these reviews.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("Step 1: Claim Your Page")}</h2>
            <p className="mb-4">
              {t("Before you can submit a dispute, you must first claim your Facebook page on our platform and verify ownership. This ensures only authorized representatives can request content removal.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("Step 2: Submit a Dispute")}</h2>
            <p className="mb-4">
              {t("Once verified, you can access your Business Dashboard. From there, locate the specific review or fraud report and click \"Submit Dispute\". You must provide a valid reason and any supporting evidence.")}
            </p>

            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{t("What Business/Page Owners Can Dispute")}</h3>
            <p className="mb-4">
              {t("Authorized, verified business owners may dispute any reviews or reports for the following concrete reasons:")}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>{t("Fake reviews:")}</strong> {t("Fabricated transactions or claims where the reviewer was never a real customer.")}</li>
              <li><strong>{t("Wrong Facebook page:")}</strong> {t("The review or report was clearly meant for a different page with a similar name.")}</li>
              <li><strong>{t("Wrong bKash/contact number:")}</strong> {t("The payment or contact numbers listed do not belong to your business.")}</li>
              <li><strong>{t("False or misleading reports:")}</strong> {t("Accusations that are completely untrue, misrepresented, or lacking context.")}</li>
              <li><strong>{t("Duplicate reviews:")}</strong> {t("Multiple redundant negative postings by the same user for the same single interaction.")}</li>
              <li><strong>{t("Abusive content:")}</strong> {t("Violations involving hate speech, vulgarity, threats, or harassment.")}</li>
              <li><strong>{t("Misleading screenshots or post links:")}</strong> {t("Forged, edited, or highly misleading chat histories or evidence.")}</li>
              <li><strong>{t("Private information exposure:")}</strong> {t("Unmasked home addresses, passwords, phone numbers, or credit card numbers.")}</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("What Our Admins May Do")}</h2>
            <p className="mb-4">
              {t("Upon receiving and reviewing a dispute petition with supporting evidence, our administration team has sole discretion to take one of the following actions:")}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>{t("Keep the review unchanged:")}</strong> {t("If the user's report is verified with strong proof, the post status stands.")}</li>
              <li><strong>{t("Edit limited incorrect information:")}</strong> {t("Modify specific inaccuracies (like mistaken dates, typos, or names) while keeping the overall review.")}</li>
              <li><strong>{t("Remove sensitive data:")}</strong> {t("Redact or blur exposed private customer or merchant data while preserving the text.")}</li>
              <li><strong>{t("Remove the review/report:")}</strong> {t("Completely delete the entry from our public index if a critical policy infraction is verified.")}</li>
              <li><strong>{t("Mark the dispute as rejected or resolved:")}</strong> {t("Update internal logs and status states accordingly.")}</li>
            </ul>

            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 my-8">
              <h3 className="text-lg font-bold text-amber-900 mb-2">{t("Important Notice on Disputes")}</h3>
              <p className="text-sm text-amber-800 font-semibold">
                {t("Please be aware that submitting a dispute DOES NOT guarantee the removal of a review or report. Negative feedback based on authentic, verifiable user experiences will be kept public to ensure transparency and trust on the platform.")}
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("Step 3: Admin Review")}</h2>
            <p className="mb-4">
              {t("Our moderation team manually reviews all disputes. We will investigate both the user's claim and the business owner's evidence.")}
            </p>
            <p className="mb-4">
              {t("During the review process, the post remains visible, but it may be marked as \"Under Dispute.\"")}
            </p>
            <p className="mb-4 font-bold">
              {t("The admin makes the final decision to either keep, edit, or remove the reported content.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("For Standard Users")}</h2>
            <p className="mb-4">
              {t("If you are not the page owner but notice abusive, spammy, or highly inappropriate content on the site, use the standard \"Report Abuse\" button found on every post to alert our moderation team.")}
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
