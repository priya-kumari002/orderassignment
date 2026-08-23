import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatInr, useDebounced } from '../components/ui';
import StampBadge from '../components/StampBadge';
import { useAuth } from '../auth';
import '../styles/ledger.css';

const STATUSES = ['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const debouncedQ = useDebounced(q, 400);

  useEffect(() => setPage(1), [debouncedQ, status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getOrders({ page, limit: 10, status, q: debouncedQ })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, debouncedQ]);

  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#3A331F] pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#EDE6D6]">
            {user?.role === 'admin' ? 'All Orders' : 'My Orders'}
          </h1>
          <p className="text-sm text-[#9C9382] mt-1.5">Search, filter, and track order records.</p>
        </div>
        {user?.role === 'admin' && (
          <Link
            to="/orders/new"
            className="shimmer-cta inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-[#14120D] shadow-lg shadow-[#C9A15D]/20 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            + Create New Order
          </Link>
        )}
      </header>

      {err && (
        <div className="p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm">
          {err}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          placeholder="Search customer or order ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-[#1E1B14] border border-[#3A331F] text-sm text-[#EDE6D6] placeholder-[#5c5646] focus:outline-none focus:border-[#C9A15D] focus:ring-1 focus:ring-[#C9A15D] transition-colors"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full sm:w-48 py-3 px-4 rounded-xl bg-[#1E1B14] border border-[#3A331F] text-sm text-[#EDE6D6] capitalize focus:outline-none focus:border-[#C9A15D] focus:ring-1 focus:ring-[#C9A15D] transition-colors"
        >
          {STATUSES.map((s) => (
            <option key={s || 'all'} value={s} className="bg-[#1E1B14] text-[#EDE6D6]">
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}
            </option>
          ))}
        </select>
      </div>

      {/* Table Card */}
      {data && (
        <div className="space-y-4">
          <div className={`bg-[#1E1B14] border border-[#3A331F] rounded-2xl overflow-hidden shadow-2xl ticket-edge-top transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#171410] border-b border-[#3A331F] text-[10.5px] uppercase tracking-wider text-[#9C9382] font-semibold">
                  <tr>
                    <th className="py-4 px-5 pt-6">Order ID</th>
                    <th className="py-4 px-5 pt-6">Customer</th>
                    <th className="py-4 px-5 pt-6">City</th>
                    <th className="py-4 px-5 pt-6">Status</th>
                    <th className="py-4 px-5 pt-6 text-right">Total Amount</th>
                    <th className="py-4 px-5 pt-6">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3A331F]/60">
                  {data.data.map((o, i) => (
                    <tr key={o.id} className="hover:bg-[#26211a] transition-colors fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      <td className="py-4 px-5 font-mono-ledger">
                        <Link to={`/orders/${o.id}`} className="text-[#C9A15D] hover:text-[#F3DFA8] font-semibold transition-colors">
                          #{o.id}
                        </Link>
                      </td>
                      <td className="py-4 px-5 font-semibold text-[#EDE6D6]">{o.customer_name}</td>
                      <td className="py-4 px-5 text-[#9C9382]">{o.customer_city || '—'}</td>
                      <td className="py-4 px-5">
                        <StampBadge status={o.status} size="sm" />
                      </td>
                      <td className="py-4 px-5 text-right font-semibold font-mono-ledger text-[#EDE6D6]">
                        {formatInr(o.total)}
                      </td>
                      <td className="py-4 px-5 text-xs text-[#9C9382] whitespace-nowrap font-mono-ledger">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-[#9C9382] font-medium">
                        No order records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-[#9C9382] px-2">
            <span className="font-mono-ledger">
              Page <strong className="text-[#EDE6D6]">{page}</strong> of{' '}
              <strong className="text-[#EDE6D6]">{totalPages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl border border-[#3A331F] bg-[#1E1B14] text-[#EDE6D6] hover:bg-[#26211a] hover:border-[#C9A15D]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl border border-[#3A331F] bg-[#1E1B14] text-[#EDE6D6] hover:bg-[#26211a] hover:border-[#C9A15D]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}