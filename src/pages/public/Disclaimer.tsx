import React from 'react';

export default function Disclaimer() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Disclaimer</h1>
          <p className="text-slate-500 mb-8 pb-8 border-b border-slate-100">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none text-slate-700">
            <p className="lead text-xl text-slate-800 font-medium mb-6">
              FB Page Review is an independent, community-driven platform. The information provided on this website is for general informational purposes only.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">User-Submitted Content</h2>
            <p className="mb-4">
              All reviews, ratings, fraud reports, and evidence are submitted by individual users of the platform based on their personal experiences. FB Page Review does not independently verify every claim, nor do we make final legal claims regarding the legitimacy or illegitimacy of any business, person, or Facebook page.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">Fraud and Suspicious Labels</h2>
            <p className="mb-4">
              When a page is flagged as "Suspicious" or "Reported", these labels are automatically or manually applied based on the volume of user fraud reports, community signals, or available evidence. These labels mean <span className="font-bold underline">"This page has multiple fraud reports"</span> or <span className="font-bold underline">"This page has been reported by users."</span> 
            </p>
            <p className="mb-4">
              It does not mean that the page is definitively guilty of a crime in a court of law. We advise all buyers to <span className="font-bold">review the evidence before buying</span> or sending money.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">Owner Rights and Dispute Resolution</h2>
            <p className="mb-4">
              We provide tools for business and page owners to claim their pages, publicly reply to reviews, and submit formal disputes if they believe they are being falsely accused. If you believe wrong information has been posted, you can report it for correction or moderation review.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">Not Affiliated with Meta/Facebook</h2>
            <p className="mb-4">
              FB Page Review is an independent review platform. We are not affiliated, associated, authorized, endorsed by, or in any way officially connected with Facebook, Meta Platforms, Inc., or any of their subsidiaries or affiliates.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">No Professional Advice</h2>
            <p className="mb-4">
              The content provided on this website does not constitute legal, financial, or professional advice. Users should consult professionals or local law enforcement if they believe they are victims of fraud or a cybercrime.
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">No Financial Liability</h2>
            <p className="mb-4">
              Under no circumstances shall FB Page Review or its administrators be held liable for any direct, indirect, incidental, or consequential damages resulting from transactions you make based on the information found on this platform. Users must exercise their own judgment and caution during online transactions.
            </p>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-sm text-slate-500 italic">
                By using FB Page Review, you acknowledge and agree to this disclaimer. Be safe out there, and always verify before you buy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
