import React from 'react';
import { Search, PenBox, ShieldCheck, Flag, BarChart } from 'lucide-react';

export default function HowReviewsWork() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 tracking-tight text-center">How Reviews Work</h1>
          <p className="text-lg text-slate-600 text-center max-w-2xl mx-auto mb-16">
            We've built a transparent, step-by-step system to help users research, report, and review Facebook pages safely.
          </p>

          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            
            {/* Step 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-500 group-hover:bg-emerald-600 group-hover:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300">
                <PenBox className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">1. Users Submit Reviews</h3>
                </div>
                <div className="text-slate-600">
                  Users sign up and submit reviews or fraud reports. They provide the FB page link, payment numbers, and upload evidence like screenshots.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">2. System Generates Trust Score</h3>
                </div>
                <div className="text-slate-600">
                  Our system calculates a Trust Score based on the ratio of positive reviews to fraud reports, and an Evidence Score based on uploaded proof.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300">
                <Search className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">3. Buyers Search Before Buying</h3>
                </div>
                <div className="text-slate-600">
                  Before sending money, buyers can search for the seller's page link or bKash number on our platform to see the Trust Score and read past reviews.
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-500 group-hover:bg-amber-500 group-hover:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300">
                <Flag className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">4. Businesses Claim & Reply</h3>
                </div>
                <div className="text-slate-600">
                  Page owners can claim their profile on FB Page Review. Once verified, they can reply to user reviews and submit disputes for incorrect info.
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-100 text-slate-500 group-hover:bg-rose-600 group-hover:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300">
                <BarChart className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-800 text-lg">5. Admin Moderation</h3>
                </div>
                <div className="text-slate-600">
                  Our admin team reviews disputes, removes spam or abusive content, and ensures the platform remains a reliable tool for everyone.
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
