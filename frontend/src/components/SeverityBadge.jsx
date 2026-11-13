import React from 'react';

const SEVERITY_CONFIG = {
  P1: {
    bg: 'bg-red-500/10 text-red-400 border-red-500/30',
    dot: 'bg-red-500 animate-pulse',
    label: 'P1 - CRITICAL'
  },
  P2: {
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'P2 - HIGH'
  },
  P3: {
    bg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    dot: 'bg-yellow-500',
    label: 'P3 - MEDIUM'
  },
  P4: {
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
    label: 'P4 - LOW'
  }
};

export default function SeverityBadge({ severity, showLabel = false }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.P3;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showLabel ? config.label : severity}
    </span>
  );
}

