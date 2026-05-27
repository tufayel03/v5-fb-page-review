import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to FB Page Review. We respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website, submit reviews, or report fraud.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">Account Information</h3>
            <p className="mb-4">
              When you register for an account (as a user or business owner), we collect basic information such as your name, email address, and encrypted password.
            </p>
            
            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">Review & Report Information</h3>
            <p className="mb-4">
              When you submit a review or a fraud report, we collect the text of the review, the Facebook page you are reviewing, relevant bKash/contact numbers, and any screenshots or evidence you voluntarily upload.
            </p>
            
            <div className="bg-slate-100 p-5 rounded-lg my-4 border-l-4 border-slate-400">
              <h4 className="font-bold text-slate-800 mb-2">Public Content Notice</h4>
              <p className="text-sm">
                Reviews, reports, business replies, Facebook page names, Facebook page URLs, ratings, uploaded evidence, and related report information may be publicly visible. Users should not upload passwords, full financial information, national ID numbers, private addresses, full card numbers, or other highly sensitive personal information.
              </p>
            </div>
            
            <div className="bg-slate-100 p-5 rounded-lg my-4 border-l-4 border-slate-400">
              <h4 className="font-bold text-slate-800 mb-2">Evidence Upload Warning</h4>
              <p className="text-sm">
                Before uploading screenshots or proof, users should hide or blur sensitive private information that is not necessary for the review or report.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">Contact & Claim Information</h3>
            <p className="mb-4">
              If you claim a business page or contact us for support, we may collect additional verification data or correspondence records to process your request.
            </p>

            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">Data Retention</h3>
            <p className="mb-4">
              We retain account, review, report, claim, dispute, moderation, and security records for as long as necessary to operate the platform, resolve disputes, prevent abuse, comply with legal obligations, and maintain platform integrity.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">3. Cookies & Analytics</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to improve our website's performance and analyze user behavior. Cookies are small data files stored on your device.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 my-6">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Google Advertising Cookies</h3>
              <ul className="list-disc pl-5 mb-4 text-amber-800 space-y-2">
                <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.</li>
                <li>Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.</li>
                <li>You may opt out of personalized advertising by visiting <a href="https://g.co/adsettings" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-600">Google Ads Settings</a>.</li>
                <li>Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting www.aboutads.info.</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">4. How We Use Information</h2>
            <p className="mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Publish user-submitted reviews and fraud reports publicly to help others.</li>
              <li>Calculate page trust scores and flag suspicious pages.</li>
              <li>Process business page claims and verify ownership.</li>
              <li>Communicate with you regarding support requests or account issues.</li>
              <li>Improve website functionality and user experience.</li>
              <li>Serve non-personalized or personalized advertisements (where permitted).</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">5. How We Protect Information</h2>
            <p className="mb-4">
              We implement appropriate security measures, including HTTPS encryption and secure database architecture, to protect your personal information from unauthorized access, alteration, or disclosure. However, no internet transmission is entirely secure, and we cannot guarantee absolute security. Publicly submitted reviews and reports are visible to anyone on the internet.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">6. Data Correction & Removal Requests</h2>
            <p className="mb-4">
              If you wish to update or delete your account, or request the removal of specific content per our Content Removal Policy, please contact our support team. Business owners can use the Dispute mechanism to address incorrect reviews.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">7. Contact Us</h2>
            <p className="mb-4">
              If you have any questions or concerns about this Privacy Policy, please reach out to us via our Contact page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
