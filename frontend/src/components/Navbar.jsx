import React, { useState } from 'react';
import { RefreshCw, Flame, ShieldAlert, CheckCircle, ExternalLink, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  faultActive,
  onOpenFaultModal,
  refreshInterval,
  onChangeRefreshInterval,
  onManualRefresh,
  refreshing,
  systemStatus = 'HEALTHY'
}) {
  const { user, logout, login } = useAuth();
  const [userDropdown, setUserDropdown] = useState(false);

  const switchRole = async (targetRole) => {
    if (targetRole === 'admin') {
      await login('admin@tradeops.io', 'AdminPass123!');
    } else {
      await login('engineer@tradeops.io', 'EngineerPass123!');
    }
    setUserDropdown(false);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Left: Brand & Live Heartbeat */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight">TradeOps</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                PROD-SRE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Fintech Reliability & Incident Management</p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 hidden md:block" />

        {/* System Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
          {faultActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Fault Injection Active
              </span>
            </>
          ) : systemStatus === 'HEALTHY' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator" />
              <span className="text-emerald-400 font-medium">All Probes Nominal</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 font-medium">Degraded State</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions, Fault Lab Trigger, Polling Selector, User */}
      <div className="flex items-center gap-3">
        {/* Fault Injection Button */}
        <button
          onClick={onOpenFaultModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            faultActive
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 shadow-lg shadow-rose-500/20 animate-pulse'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-rose-500/50 hover:text-rose-400'
          }`}
          title="Open Fault Injection & Chaos Testing Controls"
        >
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>Fault Injection Lab</span>
          {faultActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
        </button>

        {/* Polling Interval Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          <span className="text-slate-500 px-2 text-[11px]">Auto:</span>
          {[
            { label: '5s', val: 5000 },
            { label: '10s', val: 10000 },
            { label: 'Off', val: 0 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onChangeRefreshInterval(opt.val)}
              className={`px-2 py-1 rounded font-mono text-[11px] transition ${
                refreshInterval === opt.val
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onManualRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          title="Manual Probe Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* External Links */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pl-2 border-l border-slate-800">
          <a
            href="http://localhost:9090"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 flex items-center gap-1 transition"
          >
            Prometheus <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan-400 flex items-center gap-1 transition"
          >
            Grafana <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* User Profile / Role Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
          >
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-white leading-tight">{user?.full_name || 'Production Engineer'}</p>
              <p className="text-[10px] text-cyan-400 font-mono uppercase">{user?.role || 'engineer'}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {userDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-800 mb-1">
                <p className="font-semibold text-white">{user?.full_name || 'Production User'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'engineer@tradeops.io'}</p>
              </div>
              <div className="space-y-1 py-1">
                <button
                  onClick={() => switchRole('admin')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between"
                >
                  <span>Switch to Admin</span>
                  {user?.role === 'admin' && <span className="text-[10px] text-cyan-400 font-bold">Active</span>}
                </button>
                <button
                  onClick={() => switchRole('engineer')}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between"
                >
                  <span>Switch to Engineer</span>
                  {user?.role === 'engineer' && <span className="text-[10px] text-cyan-400 font-bold">Active</span>}
                </button>
              </div>
              <div className="border-t border-slate-800 pt-1 mt-1">
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

