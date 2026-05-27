import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setMessage(data.message || 'If an account with that email exists, we sent a password reset link.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isBusiness = location.pathname.startsWith('/business');
  const loginLink = isBusiness ? '/business/login' : '/login';

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white p-8 border border-slate-200 rounded-3xl shadow-sm text-center">
        <h1 className="text-2xl font-black mb-2 text-slate-800">Forgot Password</h1>
        <p className="text-sm text-slate-500 font-medium mb-6">Enter your email address and we'll send you a link to reset your password.</p>
        
        {error && <div className="bg-rose-50 text-rose-600 text-sm font-bold p-3 rounded-lg mb-4">{error}</div>}
        {message && <div className="bg-emerald-50 text-emerald-600 text-sm font-bold p-3 rounded-lg mb-4">{message}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-bold mb-1 text-slate-700">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900 bg-slate-50" 
            />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-500 font-medium">
          Remembered your password? <Link to={loginLink} className="text-emerald-600 font-bold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
}
