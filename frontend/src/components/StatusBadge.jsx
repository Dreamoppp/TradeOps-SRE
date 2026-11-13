import React from 'react';

const STATUS_CONFIG = {
  // Service health states
  healthy: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  degraded: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400 animate-ping' },
  down: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-500 animate-pulse' },

  // Incident lifecycle states
  OPEN: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-500' },
  ACKNOWLEDGED: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
  INVESTIGATING: { bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400' },
  RESOLVED: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  CLOSED: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },

  // Order states
  PENDING: { bg: 'bg-slate-500/10 text-slate-300 border-slate-500/30', dot: 'bg-slate-400' },
  VALIDATED: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
  EXECUTED: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  REJECTED: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-400' },
  CANCELLED: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' },
  FAILED: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-500' }
};

export default function StatusBadge({ status }) {
  const norm = (status || '').toString();
  const config = STATUS_CONFIG[norm] || STATUS_CONFIG[norm.toLowerCase()] || {
    bg: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {norm}
    </span>
  );
}

