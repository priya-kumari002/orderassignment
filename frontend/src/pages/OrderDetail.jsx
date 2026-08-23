import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { formatInr } from '../components/ui';
import StampBadge from '../components/StampBadge';
import { useAuth } from '../auth';
import '../styles/ledger.css';

const NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setErr(null);
    api
      .getOrder(id)
      .then(setOrder)
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function changeStatus(status) {
    setSaving(true);
    setErr(null);
    try {
      await api.updateStatus(id, status);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (err && !order) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm my-6">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{err}</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-sm text-[#9C9382] ink-pulse font-mono-ledger">
        Retrieving the slip…
      </div>
    );
  }

  const nextActions = NEXT[order.status] || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-[#3A331F] pb-5">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm font-medium text-[#9C9382] hover:text-[#C9A15D] transition-colors mb-3"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#EDE6D6] font-mono-ledger">
                Order #{order.id}
              </h1>
              <StampBadge status={order.status} />
            </div>
            <p className="text-sm text-[#9C9382] mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#EDE6D6]">{order.customer_name}</span>
              {order.customer_city && (
                <>
                  <span className="text-[#3A331F]">•</span>
                  <span>{order.customer_city}</span>
                </>
              )}
              {order.customer_phone && (
                <>
                  <span className="text-[#3A331F]">•</span>
                  <span className="font-mono-ledger">{order.customer_phone}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      {err && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{err}</span>
        </div>
      )}

      {/* Admin Status Controls */}
      {isAdmin && (
        <section className="bg-[#1E1B14] border border-[#3A331F] rounded-2xl p-5 shadow-xl">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[#9C9382] mb-3">
            Update Status
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {nextActions.map((s) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => changeStatus(s)}
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  s === 'cancelled'
                    ? 'bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] hover:bg-[#C15C4F]/20'
                    : 'shimmer-cta text-[#14120D] shadow-lg shadow-[#C9A15D]/20 hover:scale-[1.02]'
                }`}
              >
                {saving ? 'Stamping…' : `Mark ${s}`}
              </button>
            ))}
            {nextActions.length === 0 && (
              <span className="text-sm text-[#9C9382] italic">
                This status is terminal and cannot be changed.
              </span>
            )}
          </div>
        </section>
      )}

      {/* Line Items Panel — receipt slip */}
      <section className="bg-[#1E1B14] border border-[#3A331F] rounded-2xl shadow-xl ticket-edge-top ticket-edge-bottom overflow-hidden">
        <div className="p-5 sm:p-6 pt-7 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#EDE6D6]">Line Items</h2>

          <div className="overflow-x-auto rounded-xl border border-[#3A331F]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#171410] border-b border-[#3A331F] text-[10.5px] uppercase tracking-wider text-[#9C9382] font-semibold">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-[#3A331F]">
                {order.items.map((it) => (
                  <tr key={it.id} className="hover:bg-[#26211a] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#EDE6D6]">{it.product_name}</td>
                    <td className="py-3.5 px-4 text-center text-[#9C9382] font-mono-ledger">{it.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-[#9C9382] font-mono-ledger">{formatInr(it.unit_price)}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#EDE6D6] font-mono-ledger">
                      {formatInr(it.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order Total Footer Bar */}
          <div className="flex justify-between items-center bg-[#171410] border border-[#3A331F] rounded-xl p-4 mt-4">
            <span className="text-sm font-semibold text-[#9C9382] uppercase tracking-wider">
              Order Total
            </span>
            <span className="font-display text-2xl font-semibold text-[#C9A15D] tracking-tight">
              {formatInr(order.total)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}