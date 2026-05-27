import React from 'react';

export default function DisputePolicy() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Dispute Policy</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <p className="lead text-xl text-slate-800 font-medium mb-6">
              We understand that mistakes happen and sometimes reviews are left incorrectly, or maliciously. Our Dispute Policy outlines how business owners can challenge these reviews.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">Step 1: Claim Your Page</h2>
            <p className="mb-4">
              Before you can submit a dispute, you must first claim your Facebook page on our platform and verify ownership. This ensures only authorized representatives can request content removal.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">Step 2: Submit a Dispute</h2>
            <p className="mb-4">
              Once verified, you can access your Business Dashboard. From there, locate the specific review or fraud report and click "Submit Dispute". You must provide a valid reason and any supporting evidence.
            </p>

            <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3">What Business/Page Owners Can Dispute</h3>
            <p className="mb-4">
              Authorized, verified business owners may dispute any reviews or reports for the following concrete reasons:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Fake reviews:</strong> Fabricated transactions or claims where the reviewer was never a real customer.</li>
              <li><strong>Wrong Facebook page:</strong> The review or report was clearly meant for a different page with a similar name.</li>
              <li><strong>Wrong bKash/contact number:</strong> The payment or contact numbers listed do not belong to your business.</li>
              <li><strong>False or misleading reports:</strong> Accusations that are completely untrue, misrepresented, or lacking context.</li>
              <li><strong>Duplicate reviews:</strong> Multiple redundant negative postings by the same user for the same single interaction.</li>
              <li><strong>Abusive content:</strong> Violations involving hate speech, vulgarity, threats, or harassment.</li>
              <li><strong>Misleading screenshots or post links:</strong> Forged, edited, or highly misleading chat histories or evidence.</li>
              <li><strong>Private information exposure:</strong> Unmasked home addresses, passwords, phone numbers, or credit card numbers.</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">What Our Admins May Do</h2>
            <p className="mb-4">
              Upon receiving and reviewing a dispute petition with supporting evidence, our administration team has sole discretion to take one of the following actions:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Keep the review unchanged:</strong> If the user's report is verified with strong proof, the post status stands.</li>
              <li><strong>Edit limited incorrect information:</strong> Modify specific inaccuracies (like mistaken dates, typos, or names) while keeping the overall review.</li>
              <li><strong>Remove sensitive data:</strong> Redact or blur exposed private customer or merchant data while preserving the text.</li>
              <li><strong>Remove the review/report:</strong> Completely delete the entry from our public index if a critical policy infraction is verified.</li>
              <li><strong>Mark the dispute as rejected or resolved:</strong> Update internal logs and status states accordingly.</li>
            </ul>

            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 my-8">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Important Notice on Disputes</h3>
              <p className="text-sm text-amber-800 font-semibold">
                Please be aware that submitting a dispute DOES NOT guarantee the removal of a review or report. Negative feedback based on authentic, verifiable user experiences will be kept public to ensure transparency and trust on the platform.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">Step 3: Admin Review</h2>
            <p className="mb-4">
              Our moderation team manually reviews all disputes. We will investigate both the user's claim and the business owner's evidence.
            </p>
            <p className="mb-4">
              During the review process, the post remains visible, but it may be marked as "Under Dispute." 
            </p>
            <p className="mb-4 font-bold">
              The admin makes the final decision to either keep, edit, or remove the reported content.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">For Standard Users</h2>
            <p className="mb-4">
              If you are not the page owner but notice abusive, spammy, or highly inappropriate content on the site, use the standard "Report Abuse" button found on every post to alert our moderation team.
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
