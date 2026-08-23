import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import CreateOrder from './pages/CreateOrder';
import Catalog from './pages/Catalog';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Shop from './pages/Shop';
import './styles/ledger.css';

function Guard({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/' : '/shop'} replace />;
  }
  return children;
}

const NAV_ICONS = {
  Dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z',
  'All Orders': 'M9 17V7l8 5-8 5z M4 4h16v16H4z',
  'Create Order': 'M12 4v16m8-8H4',
  'Catalog & Users': 'M4 6h16M4 12h16M4 18h7',
  Products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  'My Orders': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
};

function NavIcon({ label }) {
  const d = NAV_ICONS[label];
  if (!d) return null;
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d={d} />
    </svg>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const admin = user?.role === 'admin';

  const navLinkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 pl-4 pr-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 overflow-hidden ${
      isActive
        ? 'text-[#14120D] bg-[#C9A15D] shadow-[0_6px_20px_-4px_rgba(201,161,93,0.55)]'
        : 'text-[#9C9382] hover:text-[#EDE6D6] hover:bg-[#26211480]'
    }`;

  return (
    <div className="min-h-screen bg-[#14120D] text-[#EDE6D6] font-body flex flex-col md:flex-row antialiased selection:bg-[#C9A15D] selection:text-[#14120D]">
      {/* Sidebar — the "ledger spine" */}
      <aside className="relative w-full md:w-72 bg-[#1A1710] border-b md:border-b-0 md:border-r border-[#3A331F] p-6 flex flex-col justify-between shrink-0">
        {/* brass spine rule */}
        <div className="hidden md:block absolute top-0 right-0 h-full w-[3px] bg-gradient-to-b from-[#C9A15D] via-[#3A331F] to-[#C9A15D]" />

        <div className="space-y-9">
          {/* Brand mark: wax-seal style */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-[#C9A15D] to-[#8f6f37] flex items-center justify-center shadow-[0_4px_14px_-2px_rgba(201,161,93,0.5)] rotate-[-6deg]">
              <span className="font-display font-semibold text-[#14120D] text-base">OM</span>
              <span className="absolute inset-0 rounded-full border border-[#F3DFA8]/40" />
            </div>
            <div>
              <div className="font-display font-semibold text-[#EDE6D6] text-lg leading-tight tracking-wide">
                Order Desk
              </div>
              <div className="text-[10px] font-mono-ledger font-medium uppercase tracking-[0.22em] text-[#C9A15D] mt-1">
                {admin ? 'Ledger · Admin' : 'Ledger · Customer'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            {admin ? (
              <>
                <NavLink to="/" end className={navLinkClass}>
                  <NavIcon label="Dashboard" /> Dashboard
                </NavLink>
                <NavLink to="/orders" className={navLinkClass}>
                  <NavIcon label="All Orders" /> All Orders
                </NavLink>
                <NavLink to="/orders/new" className={navLinkClass}>
                  <NavIcon label="Create Order" /> Create Order
                </NavLink>
                <NavLink to="/catalog" className={navLinkClass}>
                  <NavIcon label="Catalog & Users" /> Catalog & Users
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/shop" className={navLinkClass}>
                  <NavIcon label="Products" /> Products
                </NavLink>
                <NavLink to="/orders" className={navLinkClass}>
                  <NavIcon label="My Orders" /> My Orders
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* User card */}
        <div className="pt-6 border-t border-dashed border-[#3A331F] space-y-4">
          <div className="flex items-center gap-3 bg-[#211D16] p-3 rounded-xl border border-[#3A331F]">
            <div className="w-9 h-9 rounded-full bg-[#C9A15D]/15 text-[#C9A15D] font-display font-semibold flex items-center justify-center text-sm border border-[#C9A15D]/40">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-[#EDE6D6] truncate">{user?.name}</div>
              <div className="text-xs text-[#9C9382] truncate font-mono-ledger">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center rounded-xl border border-[#3A331F] bg-[#211D16] hover:bg-[#C15C4F]/10 hover:border-[#C15C4F]/40 hover:text-[#C15C4F] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#9C9382] transition-all duration-200 active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        <Routes>
          <Route path="/shop" element={<Guard role="customer"><Shop /></Guard>} />
          <Route path="/" element={<Guard role="admin"><Dashboard /></Guard>} />
          <Route path="/orders" element={<Guard><Orders /></Guard>} />
          <Route path="/orders/new" element={<Guard role="admin"><CreateOrder /></Guard>} />
          <Route path="/orders/:id" element={<Guard><OrderDetail /></Guard>} />
          <Route path="/catalog" element={<Guard role="admin"><Catalog /></Guard>} />
          <Route path="*" element={<Navigate to={admin ? '/' : '/shop'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Root() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/' : '/shop'} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/shop" /> : <Signup />} />
      <Route path="/*" element={user ? <Shell /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}