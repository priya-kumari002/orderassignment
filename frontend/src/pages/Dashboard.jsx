import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatInr } from '../components/ui';
import '../styles/ledger.css';

const STATUS_META = {
  pending: { label: 'Pending', color: '#C9A15D' },
  confirmed: { label: 'Confirmed', color: '#6FA07D' },
  shipped: { label: 'Shipped', color: '#7FA0C4' },
  delivered: { label: 'Delivered', color: '#6FA07D' },
  cancelled: { label: 'Cancelled', color: '#C15C4F' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSummary()
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-[#9C9382] ink-pulse font-mono-ledger">
        Tallying the ledger…
      </div>
    );
  }

  const byStatus = data?.countByStatus || {};
  const statusEntries = Object.entries(STATUS_META).map(([key, meta]) => ({
    key,
    ...meta,
    count: byStatus[key] || 0,
  }));
  const delivered = byStatus.delivered || 0;
  const pending = byStatus.pending || 0;

  const kpis = [
    { label: 'Total Revenue', value: formatInr(data?.totalRevenue || 0), accent: '#C9A15D', note: 'Lifetime sales volume' },
    { label: 'Total Orders', value: data?.totalOrders ?? 0, accent: '#7FA0C4', note: 'Processed across system' },
    { label: 'Delivered', value: delivered, accent: '#6FA07D', note: 'Fulfilled successfully' },
    { label: 'Pending', value: pending, accent: '#C9A15D', note: 'Awaiting confirmation' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#3A331F] pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#EDE6D6]">
            Dashboard Overview
          </h1>
          <p className="text-sm text-[#9C9382] mt-1.5">
            Real-time metrics, revenue stats, and status breakdown.
          </p>
        </div>
        <Link
          to="/orders/new"
          className="shimmer-cta inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-[#14120D] shadow-lg shadow-[#C9A15D]/20 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          + Create New Order
        </Link>
      </header>

      {err && (
        <div className="p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm">
          {err}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="fade-up group bg-[#1E1B14] border border-[#3A331F] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-transform duration-300 hover:-translate-y-1"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-35"
              style={{ background: k.accent }}
            />
            <div className="text-xs font-semibold uppercase tracking-wider text-[#9C9382]">{k.label}</div>
            <div className="font-display text-3xl font-semibold text-[#EDE6D6] mt-2">{k.value}</div>
            <div className="text-xs mt-2 font-medium font-mono-ledger" style={{ color: k.accent }}>
              {k.note}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Status Breakdown */}
        <div className="lg:col-span-2 bg-[#1E1B14] border border-[#3A331F] rounded-2xl shadow-2xl ticket-edge-top overflow-hidden">
          <div className="p-6 pt-7 border-b border-dashed border-[#3A331F]">
            <h2 className="font-display text-lg font-semibold text-[#EDE6D6]">Status Breakdown</h2>
          </div>
          <ul className="p-5 space-y-3">
            {statusEntries.map((s, i) => {
              const pct = data?.totalOrders ? Math.round((s.count / data.totalOrders) * 100) : 0;
              return (
                <li key={s.key} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-[#EDE6D6]">{s.label}</span>
                    <span className="font-mono-ledger text-[#9C9382]">{s.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#14120D] border border-[#3A331F] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Top Customers — receipt-style ledger */}
        <div className="lg:col-span-3 bg-[#1E1B14] border border-[#3A331F] rounded-2xl overflow-hidden shadow-2xl ticket-edge-top">
          <div className="p-6 pt-7 border-b border-dashed border-[#3A331F] flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#EDE6D6]">Top Customers</h2>
            <Link to="/catalog" className="text-xs font-semibold text-[#C9A15D] hover:text-[#F3DFA8] transition-colors">
              View Catalog →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#171410] border-b border-[#3A331F] text-[10.5px] uppercase tracking-wider text-[#9C9382] font-semibold">
                <tr>
                  <th className="py-3 px-5">#</th>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-5">City</th>
                  <th className="py-3 px-5 text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A331F]/60">
                {(data?.topCustomers || []).map((c, i) => (
                  <tr key={c.id} className="hover:bg-[#26211a] transition-colors fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <td className="py-3.5 px-5 font-mono-ledger text-[#C9A15D] font-semibold">{i + 1}</td>
                    <td className="py-3.5 px-5 font-semibold text-[#EDE6D6]">{c.name}</td>
                    <td className="py-3.5 px-5 text-[#9C9382]">{c.city || '—'}</td>
                    <td className="py-3.5 px-5 text-right font-semibold font-mono-ledger text-[#EDE6D6]">
                      {formatInr(c.totalSpend)}
                    </td>
                  </tr>
                ))}
                {(!data?.topCustomers || data.topCustomers.length === 0) && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-[#9C9382]">
                      No customer activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}