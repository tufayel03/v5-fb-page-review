import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isBusiness = location.pathname.startsWith('/business');
  const loginLink = isBusiness ? '/business/login' : '/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setMessage(data.message);
      setTimeout(() => navigate(loginLink), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-black mb-2 text-rose-600">Invalid Link</h1>
        <p className="text-slate-500 mb-6 font-medium">This password reset link is invalid or has expired.</p>
        <Link to={isBusiness ? "/business/forgot-password" : "/forgot-password"} className="text-emerald-600 font-bold hover:underline">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <div className="bg-white p-8 border border-slate-200 rounded-3xl shadow-sm text-center">
        <h1 className="text-2xl font-black mb-2 text-slate-800">Set New Password</h1>
        
        {error && <div className="bg-rose-50 text-rose-600 text-sm font-bold p-3 rounded-lg mb-4">{error}</div>}
        {message && <div className="bg-emerald-50 text-emerald-600 text-sm font-bold p-3 rounded-lg mb-4">{message}</div>}
        
        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-700">New Password</label>
              <input 
                required
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900 bg-slate-50" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-slate-700">Confirm New Password</label>
              <input 
                required
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-900 bg-slate-50" 
              />
            </div>
            <button disabled={loading} type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors">
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
