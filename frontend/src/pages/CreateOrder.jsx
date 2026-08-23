import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatInr } from '../components/ui';
import '../styles/ledger.css';

function newIdempotencyKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [idemKey] = useState(() => newIdempotencyKey());
  const [showCust, setShowCust] = useState(false);
  const [showProd, setShowProd] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', city: '' });
  const [newProd, setNewProd] = useState({ name: '', price: '' });

  async function loadLookups(selectCustomerId, selectProductId) {
    const [c, p] = await Promise.all([api.getCustomers(), api.getProducts()]);
    setCustomers(c);
    setProducts(p);
    if (selectCustomerId) setCustomerId(String(selectCustomerId));
    else if (c[0]) setCustomerId((prev) => prev || String(c[0].id));
    if (selectProductId) {
      setLines((prev) => {
        const next = [...prev];
        const empty = next.findIndex((l) => !l.productId);
        if (empty >= 0) next[empty] = { ...next[empty], productId: String(selectProductId) };
        else next.push({ productId: String(selectProductId), quantity: 1 });
        return next;
      });
    }
  }

  useEffect(() => {
    loadLookups().catch((e) => setErr(e.message));
  }, []);

  const previewTotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const p = products.find((x) => String(x.id) === String(line.productId));
      if (!p) return sum;
      return sum + Number(p.price) * Number(line.quantity || 0);
    }, 0);
  }, [lines, products]);

  function updateLine(i, patch) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function saveCustomer(e) {
    e.preventDefault();
    if (!newCust.name.trim()) return;
    setErr(null);
    try {
      const created = await api.createCustomer(newCust);
      setNewCust({ name: '', phone: '', city: '' });
      setShowCust(false);
      await loadLookups(created.id);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!newProd.name.trim() || !newProd.price) return;
    setErr(null);
    try {
      const created = await api.createProduct({
        name: newProd.name,
        price: Number(newProd.price),
      });
      setNewProd({ name: '', price: '' });
      setShowProd(false);
      await loadLookups(undefined, created.id);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) }));
    if (!customerId || items.length === 0) {
      setErr('Pick a customer and at least one product.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const created = await api.createOrder(
        { customerId: Number(customerId), items },
        idemKey
      );
      navigate(`/orders/${created.id}`);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  const quickInputCls =
    'bg-[#14120D] border border-[#3A331F] rounded-lg px-3 py-2 text-sm text-[#EDE6D6] placeholder-[#5c5646] focus:outline-none focus:border-[#C9A15D] transition-colors';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="border-b border-[#3A331F] pb-5">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm font-medium text-[#9C9382] hover:text-[#C9A15D] transition-colors mb-2"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#EDE6D6]">
          Create Order
        </h1>
        <p className="text-sm text-[#9C9382] mt-1.5">
          Add line items and calculate estimated totals before confirming.
        </p>
      </header>

      {err && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{err}</span>
        </div>
      )}

      {/* Main Form Panel */}
      <form onSubmit={onSubmit} className="bg-[#1E1B14] border border-[#3A331F] rounded-2xl p-5 sm:p-8 shadow-2xl space-y-8 ticket-edge-top">
        {/* Customer Selection */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wider font-semibold text-[#9C9382] mb-2">
                Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-[#14120D] border border-[#3A331F] rounded-xl px-3.5 py-2.5 text-sm text-[#EDE6D6] focus:outline-none focus:border-[#C9A15D] focus:ring-1 focus:ring-[#C9A15D] transition-colors"
              >
                {customers.length === 0 && <option value="">No customers yet</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `— ${c.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setShowCust((v) => !v)}
              className="inline-flex items-center justify-center rounded-xl border border-[#3A331F] bg-[#26211a] px-4 py-2.5 text-sm font-medium text-[#EDE6D6] hover:border-[#C9A15D]/40 hover:text-[#C9A15D] transition-colors"
            >
              {showCust ? 'Cancel' : '+ New Customer'}
            </button>
          </div>

          {showCust && (
            <div className="bg-[#171410] border border-dashed border-[#3A331F] rounded-xl p-4 space-y-3 fade-up">
              <h3 className="text-sm font-semibold text-[#EDE6D6]">Quick Add Customer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input placeholder="Name *" value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} className={quickInputCls} />
                <input placeholder="Phone" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} className={quickInputCls} />
                <input placeholder="City" value={newCust.city} onChange={(e) => setNewCust({ ...newCust, city: e.target.value })} className={quickInputCls} />
              </div>
              <button
                type="button"
                onClick={saveCustomer}
                className="bg-[#C9A15D] hover:bg-[#F3DFA8] text-[#14120D] font-semibold rounded-lg px-4 py-2 text-xs transition-colors"
              >
                Save & Select Customer
              </button>
            </div>
          )}
        </div>

        {/* Line Items Section */}
        <div className="space-y-4 pt-4 border-t border-dashed border-[#3A331F]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[#EDE6D6]">Line Items</h2>
            <button
              type="button"
              onClick={() => setShowProd((v) => !v)}
              className="inline-flex items-center justify-center rounded-xl border border-[#3A331F] bg-[#26211a] px-3.5 py-1.5 text-xs font-medium text-[#EDE6D6] hover:border-[#C9A15D]/40 hover:text-[#C9A15D] transition-colors"
            >
              {showProd ? 'Cancel' : '+ New Product'}
            </button>
          </div>

          {showProd && (
            <div className="bg-[#171410] border border-dashed border-[#3A331F] rounded-xl p-4 space-y-3 fade-up">
              <h3 className="text-sm font-semibold text-[#EDE6D6]">Quick Add Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Product Name *" value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} className={quickInputCls} />
                <input type="number" min="0" step="0.01" placeholder="Price (INR) *" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} className={quickInputCls} />
              </div>
              <button
                type="button"
                onClick={saveProduct}
                className="bg-[#7FA0C4] hover:bg-[#a3c0dd] text-[#14120D] font-semibold rounded-lg px-4 py-2 text-xs transition-colors"
              >
                Save & Add Product
              </button>
            </div>
          )}

          <div className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#171410] p-3 rounded-xl border border-[#3A331F]">
                <div className="flex-1">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(i, { productId: e.target.value })}
                    className="w-full bg-[#14120D] border border-[#3A331F] rounded-lg px-3 py-2 text-sm text-[#EDE6D6] focus:outline-none focus:border-[#C9A15D] transition-colors"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ({formatInr(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-32">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    className="w-full bg-[#14120D] border border-[#3A331F] rounded-lg px-3 py-2 text-sm text-[#EDE6D6] font-mono-ledger focus:outline-none focus:border-[#C9A15D] transition-colors"
                  />
                </div>

                <button
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-2 text-[#9C9382] hover:text-[#C15C4F] disabled:opacity-30 disabled:hover:text-[#9C9382] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLines((p) => [...p, { productId: '', quantity: 1 }])}
            className="inline-flex items-center text-sm font-semibold text-[#C9A15D] hover:text-[#F3DFA8] transition-colors pt-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Line Item
          </button>
        </div>

        {/* Total Summary Bar */}
        <div className="flex justify-between items-center bg-[#171410] border border-[#3A331F] rounded-xl p-4">
          <span className="text-sm font-medium text-[#9C9382] uppercase tracking-wider">Estimated Total</span>
          <span className="font-display text-2xl font-semibold text-[#C9A15D] tracking-tight">
            {formatInr(previewTotal)}
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="shimmer-cta w-full text-[#14120D] font-semibold py-3.5 rounded-xl text-base shadow-lg shadow-[#C9A15D]/20 hover:scale-[1.005] active:scale-[0.99] disabled:opacity-50 disabled:animate-none transition-transform"
        >
          {submitting ? 'Creating Order...' : 'Create Order'}
        </button>
      </form>
    </div>
  );
}