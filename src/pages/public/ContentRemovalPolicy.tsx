import React from 'react';

export default function ContentRemovalPolicy() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Content Removal Policy</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <p className="lead text-xl text-slate-800 font-medium mb-6">
              Our goal at FB Page Review is to maintain an accurate and helpful repository. We generally do not remove user reviews just because they are negative, but we will remove content that violates our community standards.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">When We Remove, Edit, or Restrict Content</h2>
            <p className="mb-4">
              Content (reviews, reports, or comments) may be removed, edited, hidden, or restricted by our administration team if it meets any of the following criteria:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong>Fake, Malicious, or Misleading:</strong> Fabricated experiences, misleading reviews, automated bots, competitor attacks, or revenge reports.</li>
              <li><strong>Sensitive Private Information:</strong> Publishing credit card details, passwords, national identity numbers, private physical addresses, or other sensitive personal info.</li>
              <li><strong>Abusive or Threatening Language:</strong> Insults, hate speech, vulgarity, harassment, or threatening tones.</li>
              <li><strong>Wrong Facebook Page:</strong> The review or report was clearly submitted under the wrong business profile.</li>
              <li><strong>Unsupported Serious Allegations:</strong> Severe accusations made without any supporting text, details, or requested proof.</li>
              <li><strong>Violates Review Guidelines:</strong> Any submission failing to conform to our posted Review Guidelines.</li>
              <li><strong>Violates Applicable Law:</strong> Any material violating local or international legislation.</li>
              <li><strong>Creates Legal or Safety Risk:</strong> Content that creates immediate privacy, legal, or physical safety concerns for any user or the platform.</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">Removal & Correction Process</h2>
            <p className="mb-4">
              Users and business owners may submit correction/removal requests. Upon submission:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>The administration team will thoroughly review the request and the underlying evidence.</li>
              <li>The administrator may choose to <strong>approve, reject, edit, or keep</strong> the content untouched based on the facts.</li>
            </ul>

            <div className="bg-slate-100 p-6 rounded-lg my-8 border-l-4 border-emerald-500">
              <h3 className="font-bold text-slate-800 mb-2">Estimated Review Timeline</h3>
              <p className="text-sm text-slate-700">
                Valid removal or correction requests are typically reviewed and finalized within <strong>7–15 business days</strong>, depending on the complexity of the case and the level of evidence supplied by both parties.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">Final Decision</h2>
            <p className="mb-4">
              The moderation team makes the final decision on content removal. If your content is removed and you believe it was done in error, you may reach out via the Contact page, though we do not guarantee reinstatement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
