import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatInr } from '../components/ui';
import '../styles/ledger.css';

export default function Catalog() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [err, setErr] = useState(null);
  const [cust, setCust] = useState({ name: '', phone: '', city: '' });
  const [prod, setProd] = useState({ name: '', price: '' });
  const [savingCust, setSavingCust] = useState(false);
  const [savingProd, setSavingProd] = useState(false);

  async function load() {
    try {
      const [c, p] = await Promise.all([api.getCustomers(), api.getProducts()]);
      setCustomers(c);
      setProducts(p);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addCustomer(e) {
    e.preventDefault();
    if (!cust.name.trim()) return;
    setSavingCust(true);
    try {
      await api.createCustomer(cust);
      setCust({ name: '', phone: '', city: '' });
      await load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSavingCust(false);
    }
  }

  async function addProduct(e) {
    e.preventDefault();
    if (!prod.name.trim() || !prod.price) return;
    setSavingProd(true);
    try {
      await api.createProduct({ name: prod.name, price: Number(prod.price) });
      setProd({ name: '', price: '' });
      await load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSavingProd(false);
    }
  }

  const inputCls =
    'w-full bg-[#14120D] border border-[#3A331F] rounded-xl px-3.5 py-2.5 text-sm text-[#EDE6D6] placeholder-[#5c5646] focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#3A331F] pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#EDE6D6]">
            Customers & Products
          </h1>
          <p className="text-sm text-[#9C9382] mt-1.5">
            Manage master data here to streamline order creation.
          </p>
        </div>
        <Link
          to="/orders/new"
          className="shimmer-cta inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#14120D] shadow-lg shadow-[#C9A15D]/20 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </Link>
      </header>

      {err && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C15C4F]/10 border border-[#C15C4F]/30 text-[#e08578] text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{err}</span>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Panel */}
        <section className="bg-[#1E1B14] border border-[#3A331F] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col ticket-edge-top">
          <h2 className="font-display text-lg font-semibold text-[#EDE6D6] mb-4 mt-1.5 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#7FA0C4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Add Customer
          </h2>

          <form onSubmit={addCustomer} className="space-y-3 mb-6">
            <input
              type="text"
              placeholder="Full name *"
              required
              value={cust.name}
              onChange={(e) => setCust({ ...cust, name: e.target.value })}
              className={inputCls.replace('blue-500', 'blue-400')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Phone number"
                value={cust.phone}
                onChange={(e) => setCust({ ...cust, phone: e.target.value })}
                className={inputCls.replace('blue-500', 'blue-400')}
              />
              <input
                type="text"
                placeholder="City"
                value={cust.city}
                onChange={(e) => setCust({ ...cust, city: e.target.value })}
                className={inputCls.replace('blue-500', 'blue-400')}
              />
            </div>
            <button
              type="submit"
              disabled={savingCust || !cust.name.trim()}
              className="w-full bg-[#7FA0C4] hover:bg-[#a3c0dd] disabled:opacity-40 disabled:cursor-not-allowed text-[#14120D] font-semibold py-2.5 rounded-xl text-sm transition-colors active:scale-[0.99]"
            >
              {savingCust ? 'Saving Customer...' : 'Save Customer'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-[#3A331F]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#171410] border-b border-[#3A331F] text-[10.5px] uppercase tracking-wider text-[#9C9382] font-semibold">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A331F]/60">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-[#9C9382]">
                      No customers added yet
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#26211a] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#EDE6D6]">{c.name}</td>
                      <td className="py-3 px-4 text-[#9C9382] font-mono-ledger">{c.phone || '—'}</td>
                      <td className="py-3 px-4 text-[#EDE6D6]/80">{c.city || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Product Panel */}
        <section className="bg-[#1E1B14] border border-[#3A331F] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col ticket-edge-top">
          <h2 className="font-display text-lg font-semibold text-[#EDE6D6] mb-4 mt-1.5 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#C9A15D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Add Product
          </h2>

          <form onSubmit={addProduct} className="space-y-3 mb-6">
            <input
              type="text"
              placeholder="Product name *"
              required
              value={prod.name}
              onChange={(e) => setProd({ ...prod, name: e.target.value })}
              className={inputCls}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Price (INR) *"
              required
              value={prod.price}
              onChange={(e) => setProd({ ...prod, price: e.target.value })}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={savingProd || !prod.name.trim() || !prod.price}
              className="shimmer-cta w-full disabled:opacity-40 disabled:animate-none disabled:cursor-not-allowed text-[#14120D] font-semibold py-2.5 rounded-xl text-sm transition-transform active:scale-[0.99]"
            >
              {savingProd ? 'Saving Product...' : 'Save Product'}
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-[#3A331F]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#171410] border-b border-[#3A331F] text-[10.5px] uppercase tracking-wider text-[#9C9382] font-semibold">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A331F]/60">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="py-6 text-center text-[#9C9382]">
                      No products added yet
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#26211a] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#EDE6D6]">{p.name}</td>
                      <td className="py-3 px-4 text-right font-semibold font-mono-ledger text-[#6FA07D]">
                        {formatInr(p.price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}