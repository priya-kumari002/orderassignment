const STYLES = {
  pending: { ink: '#C9A15D', label: 'Pending' },
  confirmed: { ink: '#6FA07D', label: 'Confirmed' },
  shipped: { ink: '#7FA0C4', label: 'Shipped' },
  delivered: { ink: '#6FA07D', label: 'Delivered' },
  cancelled: { ink: '#C15C4F', label: 'Cancelled' },
};

/**
 * A rotated, ink-stamp style status badge — the recurring signature
 * motif of the Order Desk ledger design. Stamps itself onto the page
 * with a small overshoot animation whenever it mounts (i.e. whenever
 * a status changes and the row/card re-renders).
 */
export default function StampBadge({ status, size = 'md' }) {
  const s = STYLES[status] || { ink: '#9C9382', label: status || 'Unknown' };
  const dims =
    size === 'sm' ? 'text-[9px] px-2 py-1 gap-1' : 'text-[10.5px] px-3 py-1.5 gap-1.5';

  return (
    <span
      key={status}
      className={`stamp-in inline-flex items-center ${dims} rounded-full border-[1.5px] font-mono-ledger font-semibold uppercase tracking-[0.14em] -rotate-3 select-none whitespace-nowrap`}
      style={{
        color: s.ink,
        borderColor: s.ink,
        background: `${s.ink}17`,
        textShadow: `0 0 10px ${s.ink}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.ink }} />
      {s.label}
    </span>
  );
}