import React from 'react';
import { Link } from 'react-router';
import { Shield, Search, Flag } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
          <div className="flex justify-center mb-8">
            <div className="bg-emerald-600 p-4 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-4xl leading-none">F</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 text-center mb-8 tracking-tight">About FB Page Review</h1>
          
          <div className="prose prose-slate prose-lg max-w-none text-slate-600">
            <p className="lead text-xl text-slate-700 font-medium mb-8">
              FB Page Review is a public review and fraud-reporting platform for Facebook pages. Our goal is to help online buyers check seller pages, payment numbers, reviews, and report history before sending money.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">What is FB Page Review?</h2>
            <p className="mb-6">
              With the rise of online shopping on platforms like Facebook, distinguishing between trustworthy sellers and fraudulent pages has become a challenge. FB Page Review serves as an independent platform where users can document their experiences, whether positive or negative, with specific Facebook pages and merchants.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">Why we built this platform</h2>
            <p className="mb-6">
              Shopping scams, undelivered products, and misleading advertisements are rampant. We built FB Page Review to create a transparent, community-driven database. By sharing honest feedback and supporting claims with evidence, buyers can protect each other from falling victim to common online scams.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">How it helps buyers</h2>
            <p className="mb-6">
              Buyers can search our database before making a purchase. Simply copy a Facebook page link, a page name, or a bKash/payment number into our search tool. If others have reported fraud or shared positive reviews, you'll see the history instantly. This empowers you to make an informed decision before sending any money.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">How it helps honest businesses</h2>
            <p className="mb-6">
              Trust is the currency of the internet. For genuine page owners and businesses, FB Page Review offers a place to accumulate verified, positive feedback. Business owners can claim their pages on our platform, reply to reviews, address customer concerns, and build a publicly visible reputation of reliability.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">How reviews and reports work</h2>
            <p className="mb-6">
              Users submit reviews detailing their transaction experience. If fraud occurred, users can submit specific fraud reports and upload evidence such as chat screenshots or transaction receipts. Our system compiles this data to generate verification statuses, making it easy to identify reliable sellers at a glance.
            </p>

            <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4">Our safety mission</h2>
            <p className="mb-8">
              We believe in a safer digital marketplace. Our mission is to reduce online fraud through transparency and community vigilance. By holding pages accountable and highlighting trustworthy merchants, we strive to build a more secure e-commerce environment for everyone.
            </p>
          </div>

          <div className="mt-12 pt-12 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/write-review" className="flex flex-col items-center p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-center group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800">Write a Review</span>
            </Link>

            <Link to="/write-review?type=fraud" className="flex flex-col items-center p-6 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors text-center group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 text-rose-600 shadow-sm group-hover:scale-110 transition-transform">
                <Flag className="w-6 h-6" />
              </div>
              <span className="font-bold text-rose-800">Report a Page</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
