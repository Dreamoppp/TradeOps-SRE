import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  AlertOctagon,
  Terminal,
  TrendingUp,
  Cpu,
  BarChart3,
  Settings,
  Flame
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/services', label: 'Service Monitoring', icon: Server },
  { to: '/incidents', label: 'Incident Management', icon: AlertOctagon },
  { to: '/logs', label: 'Log Explorer', icon: Terminal },
  { to: '/simulator', label: 'Trading Simulator', icon: TrendingUp },
  { to: '/diagnostics', label: 'System Diagnostics', icon: Cpu },
  { to: '/analytics', label: 'SRE Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeIncidentsCount = 0 }) {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 backdrop-blur shrink-0 hidden md:flex flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="px-3 pt-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Observability Platform
          </p>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.to === '/incidents' && activeIncidentsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {activeIncidentsCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-1 text-slate-300 font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Local Engine Active</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Probing interval: 5s. PostgreSQL persistence connected.
        </p>
      </div>
    </aside>
  );
}

