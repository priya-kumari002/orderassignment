import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../auth';
import '../styles/ledger.css';

export default function Login() {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const data = await api.login({ email, password });
      setSession(data);
      nav(data.user.role === 'admin' ? '/' : '/shop');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#14120D] text-[#EDE6D6] font-body flex items-center justify-center p-4 antialiased selection:bg-[#C9A15D] selection:text-[#14120D] relative overflow-hidden">
      {/* ambient ledger-line backdrop */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #EDE6D6 0px, #EDE6D6 1px, transparent 1px, transparent 34px)',
        }}
      />

      <div className="w-full max-w-md bg-[#1E1B14]/95 backdrop-blur-2xl border border-[#3A331F] rounded-2xl p-8 shadow-2xl space-y-6 fade-up relative">
        {/* Wax-seal brand mark */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#C9A15D] to-[#8f6f37] flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(201,161,93,0.6)] rotate-[-6deg] stamp-in">
            <span className="font-display font-semibold text-[#14120D] text-xl">OM</span>
            <span className="absolute inset-0 rounded-full border-2 border-[#F3DFA8]/40" />
            <span className="absolute -inset-1.5 rounded-full border border-[#C9A15D]/25" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#EDE6D6] tracking-wide pt-1">
            Welcome Back
          </h1>
          <p className="text-xs text-[#9C9382] font-mono-ledger">
            Sign in to manage orders, catalog, and store items.
          </p>
        </div>

        {err && (
          <div className="p-3.5 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-xs font-medium text-center">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9C9382] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="w-full rounded-xl bg-[#14120D] border border-[#3A331F] px-4 py-3 text-sm text-[#EDE6D6] placeholder-[#5c5646] focus:outline-none focus:border-[#C9A15D] focus:ring-1 focus:ring-[#C9A15D] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9C9382] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#14120D] border border-[#3A331F] px-4 py-3 text-sm text-[#EDE6D6] placeholder-[#5c5646] focus:outline-none focus:border-[#C9A15D] focus:ring-1 focus:ring-[#C9A15D] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="shimmer-cta w-full !mt-6 inline-flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-semibold text-[#14120D] shadow-lg shadow-[#C9A15D]/20 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:animate-none transition-transform"
          >
            {busy ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <div className="pt-4 border-t border-dashed border-[#3A331F] text-center">
          <p className="text-xs text-[#9C9382]">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-[#C9A15D] hover:text-[#F3DFA8] transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}