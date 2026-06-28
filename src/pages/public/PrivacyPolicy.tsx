import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function PrivacyPolicy() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'bn' ? 'bn-BD' : 'en-US';
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">{t("Privacy Policy")}</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">{t("Last Updated:")} {new Date().toLocaleDateString(dateLocale)}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("1. Introduction")}</h2>
            <p className="mb-4">
              {t("Welcome to FB Page Review. We respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, submit reviews, or report fraud.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("2. Information We Collect")}</h2>
            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{t("Account Information")}</h3>
            <p className="mb-4">
              {t("When you register for an account (as a user or business owner), we collect basic information such as your name, email address, and encrypted password.")}
            </p>
            
            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{t("Review & Report Information")}</h3>
            <p className="mb-4">
              {t("When you submit a review or a fraud report, we collect the text of the review, the Facebook page you are reviewing, relevant bKash/contact numbers, and any screenshots or evidence you voluntarily upload.")}
            </p>
            
            <div className="bg-slate-100 p-5 rounded-lg my-4 border-l-4 border-slate-400">
              <h4 className="font-bold text-slate-800 mb-2">{t("Public Content Notice")}</h4>
              <p className="text-sm">
                {t("Reviews, reports, business replies, Facebook page names, Facebook page URLs, ratings, uploaded evidence, and related report information may be publicly visible. Users should not upload passwords, full financial information, national ID numbers, private addresses, full card numbers, or other highly sensitive personal information.")}
              </p>
            </div>
            
            <div className="bg-slate-100 p-5 rounded-lg my-4 border-l-4 border-slate-400">
              <h4 className="font-bold text-slate-800 mb-2">{t("Evidence Upload Warning")}</h4>
              <p className="text-sm">
                {t("Before uploading screenshots or proof, users should hide or blur sensitive private information that is not necessary for the review or report.")}
              </p>
            </div>

            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{t("Contact & Claim Information")}</h3>
            <p className="mb-4">
              {t("If you claim a business page or contact us for support, we may collect additional verification data or correspondence records to process your request.")}
            </p>

            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{t("Data Retention")}</h3>
            <p className="mb-4">
              {t("We retain account, review, report, claim, dispute, moderation, and security records for as long as necessary to operate the platform, resolve disputes, prevent abuse, comply with legal obligations, and maintain platform integrity.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("3. Cookies & Analytics")}</h2>
            <p className="mb-4">
              {t("We use cookies and similar tracking technologies to improve our website's performance and analyze user behavior. Cookies are small data files stored on your device.")}
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 my-6">
              <h3 className="text-lg font-bold text-amber-900 mb-2">{t("Google Advertising Cookies")}</h3>
              <ul className="list-disc pl-5 mb-4 text-amber-800 space-y-2">
                <li>{t("Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.")}</li>
                <li>{t("Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.")}</li>
                <li>{t("You may opt out of personalized advertising by visiting")} <a href="https://g.co/adsettings" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-600">Google Ads Settings</a>.</li>
                <li>{t("Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting www.aboutads.info.")}</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("4. How We Use Information")}</h2>
            <p className="mb-4">
              {t("We use the collected information to:")}
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>{t("Publish user-submitted reviews and fraud reports publicly to help others.")}</li>
              <li>{t("Flag suspicious pages and generate safety warnings.")}</li>
              <li>{t("Process business page claims and verify ownership.")}</li>
              <li>{t("Communicate with you regarding support requests or account issues.")}</li>
              <li>{t("Improve website functionality and user experience.")}</li>
              <li>{t("Serve non-personalized or personalized advertisements (where permitted).")}</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("5. How We Protect Information")}</h2>
            <p className="mb-4">
              {t("We implement appropriate security measures, including HTTPS encryption and secure database architecture, to protect your personal information from unauthorized access, alteration, or disclosure. However, no internet transmission is entirely secure, and we cannot guarantee absolute security. Publicly submitted reviews and reports are visible to anyone on the internet.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("6. Data Correction & Removal Requests")}</h2>
            <p className="mb-4">
              {t("If you wish to update or delete your account, or request the removal of specific content per our Content Removal Policy, please contact our support team. Business owners can use the Dispute mechanism to address incorrect reviews.")}
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">{t("7. Contact Us")}</h2>
            <p className="mb-4">
              {t("If you have any questions or concerns about this Privacy Policy, please reach out to us via our Contact page.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
