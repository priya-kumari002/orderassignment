import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatInr } from '../components/ui';
import { useAuth } from '../auth';
import '../styles/ledger.css';

const ACCENTS = ['#C9A15D', '#7FA0C4', '#6FA07D', '#C15C4F'];

export default function Shop() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => setErr(e.message));
  }, []);

  const items = useMemo(
    () =>
      products
        .filter((p) => cart[p.id] > 0)
        .map((p) => ({
          productId: p.id,
          quantity: cart[p.id],
          name: p.name,
          price: p.price,
        })),
    [products, cart]
  );
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  function add(id) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  function sub(id) {
    setCart((c) => {
      const n = (c[id] || 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  async function checkout() {
    if (!items.length) return;
    setBusy(true);
    setErr(null);
    try {
      const created = await api.createOrder({
        customerId: user.customerId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      nav(`/orders/${created.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <header className="border-b border-[#3A331F] pb-6 flex justify-between items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#EDE6D6]">
            Product Store
          </h1>
          <p className="text-sm text-[#9C9382] mt-1.5">
            Browse items and easily adjust cart quantities.
          </p>
        </div>
      </header>

      {err && (
        <div className="p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm">
          {err}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {products.map((p, i) => {
          const qty = cart[p.id] || 0;
          const accent = ACCENTS[i % ACCENTS.length];
          return (
            <article
              key={p.id}
              className="fade-up group flex flex-col justify-between bg-[#1E1B14] border rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                animationDelay: `${Math.min(i, 10) * 60}ms`,
                borderColor: qty > 0 ? `${accent}80` : '#3A331F',
                boxShadow: qty > 0 ? `0 10px 30px -12px ${accent}40` : undefined,
              }}
            >
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-10 transition-opacity duration-300 group-hover:opacity-25"
                style={{ background: accent }}
              />
              <div>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full border text-[9.5px] font-semibold uppercase tracking-widest mb-4 font-mono-ledger"
                  style={{ color: accent, borderColor: `${accent}50`, background: `${accent}12` }}
                >
                  In Stock
                </span>
                <h3 className="font-display text-lg font-semibold text-[#EDE6D6] transition-colors" style={{ color: qty > 0 ? accent : undefined }}>
                  {p.name}
                </h3>
                <div className="font-display text-2xl font-semibold text-[#EDE6D6] mt-2">
                  {formatInr(p.price)}
                </div>
              </div>

              {/* Counter Controls */}
              <div className="mt-6 flex items-center justify-between bg-[#14120D] p-2 rounded-xl border border-[#3A331F]">
                <button
                  type="button"
                  onClick={() => sub(p.id)}
                  disabled={qty === 0}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#26211a] text-[#EDE6D6] hover:bg-[#332c1e] active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition font-bold"
                >
                  -
                </button>
                <span className="font-semibold text-[#EDE6D6] text-base font-mono-ledger">{qty}</span>
                <button
                  type="button"
                  onClick={() => add(p.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[#14120D] hover:opacity-90 active:scale-95 transition font-bold shadow-md"
                  style={{ background: accent }}
                >
                  +
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Floating Checkout Drawer */}
      <div className="fixed bottom-6 left-0 right-0 max-w-2xl mx-auto px-4 z-30">
        <div className="bg-[#1E1B14]/95 backdrop-blur-xl border border-[#3A331F] rounded-2xl p-4 sm:px-6 shadow-2xl flex items-center justify-between gap-4 ticket-edge-top">
          <div className="pt-1.5">
            <div className="text-sm font-semibold text-[#EDE6D6]">
              {items.length} {items.length === 1 ? 'Item' : 'Items'} Selected
            </div>
            <div className="text-xs text-[#9C9382] mt-0.5">
              Total:{' '}
              <span className="text-[#C9A15D] font-semibold text-base ml-1 font-mono-ledger">
                {formatInr(total)}
              </span>
            </div>
          </div>

          <button
            onClick={checkout}
            disabled={busy || !items.length}
            className="shimmer-cta inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-semibold text-[#14120D] shadow-lg shadow-[#C9A15D]/30 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:animate-none disabled:cursor-not-allowed transition-transform"
          >
            {busy ? 'Placing Order…' : 'Place Order →'}
          </button>
        </div>
      </div>
    </div>
  );
}