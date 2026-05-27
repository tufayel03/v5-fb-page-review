import React from 'react';

export default function Terms() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Terms & Conditions</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing and using FB Page Review ("Platform", "we", "us"), you agree to abide by these Terms and Conditions. If you do not agree, please refrain from using the platform.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">2. User Accounts</h2>
            <p className="mb-4">
              Users must provide accurate information when creating an account. You are responsible for maintaining the security of your account and password. We reserve the right to suspend accounts that violate our terms.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">3. User Responsibility for Submitted Content</h2>
            <p className="mb-4">
              Users are solely responsible for the accuracy, legality, and reliability of the reviews, reports, screenshots, links, and other content they submit. By submitting content, users confirm that the information is truthful to the best of their knowledge and based on a real experience. FB Page Review may remove, edit, restrict, or reject content that appears false, abusive, defamatory, misleading, privacy-invasive, unsupported, or harmful.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">4. False or Malicious Reports</h2>
            <p className="mb-4">
              Users must not submit fake, malicious, misleading, or intentionally false reviews or reports. Accounts that abuse the review or fraud-reporting system may be restricted, suspended, or permanently banned.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">5. Evidence and Proof Submission</h2>
            <p className="mb-4">
              We encourage users to attach evidence (like screenshots or post links). Before uploading screenshots or proof, users should hide or blur sensitive private information that is not necessary for the review or report. By uploading images, you grant us the right to display them publicly alongside your report.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">6. Business Right of Reply</h2>
            <p className="mb-4">
              Business/page owners may claim their page, reply to reviews, and submit disputes or correction requests. Claiming a page does not guarantee removal of negative reviews, but it allows the owner to provide their side of the story.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">7. Content Moderation</h2>
            <p className="mb-4">
              FB Page Review reserves the right to review, approve, reject, edit, hide, or remove content that violates our policies, appears legally risky, contains private information, or may harm platform integrity.
            </p>

            <div className="bg-slate-100 p-6 rounded-lg my-8 border-l-4 border-slate-400">
              <h2 className="text-xl font-bold text-slate-800 mb-3">8. Limitation of Liability & No Guarantee Statement</h2>
              <p className="mb-3">
                <span className="font-bold">No Legal Determination:</span> Labels such as “Reported,” “Suspicious,” “High Risk,” “Fraud Report,” or similar notices are based on user-submitted information, available evidence, platform signals, or admin review. These labels do not represent a final legal finding that any person, Facebook page, business, or organization has committed fraud or any unlawful act.
              </p>
              <p className="mb-3 font-semibold">
                FB Page Review does not guarantee that any Facebook page, seller, product, or business is safe or unsafe. Users must make their own independent decisions before buying, sending money, or dealing with third parties.
              </p>
              <p className="mb-0">
                We act only as a public repository for user experiences. We are not liable for any financial loss, fraud, or damages you experience when transacting with third parties found or researched via our platform.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">9. Changes to Terms</h2>
            <p className="mb-4">
              We may update these terms periodically. Continued use of the platform after changes indicates your acceptance of the revised Terms.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">9. Contact Information</h2>
            <p className="mb-4">
              If you have any questions regarding these Terms, please contact us via the Contact page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
