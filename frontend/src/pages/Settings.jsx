import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Server, Bell, Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, login } = useAuth();
  const [services, setServices] = useState([]);
  const [seedMessage, setSeedMessage] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const res = await api.get('/api/services');
      setServices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await api.post('/api/services/seed-defaults');
      await api.post('/api/auth/seed-users');
      setSeedMessage('Default entities and users verified successfully');
      loadServices();
      setTimeout(() => setSeedMessage(''), 3000);
    } catch (err) {
      setSeedMessage('Error seeding defaults');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          System Settings & Configuration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Registered service definitions, telemetry thresholds, and SRE RBAC credentials
        </p>
      </div>

      {seedMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{seedMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Session & RBAC */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3>Operator Session & RBAC</h3>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Account:</span>
              <strong className="text-white">{user?.email || 'engineer@tradeops.io'}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Full Name:</span>
              <strong className="text-white">{user?.full_name || 'Production Support Engineer'}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Role:</span>
              <strong className="text-cyan-400 uppercase">{user?.role || 'engineer'}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Environment:</span>
              <strong className="text-emerald-400">DEVELOPMENT-LOCAL</strong>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed">
            Quick credential reference for portfolio testing:
            <ul className="list-disc pl-5 mt-1 space-y-0.5 font-mono text-[11px] text-slate-300">
              <li><strong>Admin:</strong> admin@tradeops.io / AdminPass123!</li>
              <li><strong>Engineer:</strong> engineer@tradeops.io / EngineerPass123!</li>
            </ul>
          </div>
        </div>

        {/* Database & Infrastructure Config */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Database className="w-5 h-5 text-indigo-400" />
            <h3>PostgreSQL & Monitoring Engine</h3>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Database URL:</span>
              <strong className="text-slate-200">postgresql://localhost:5432/tradeops</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Migrations:</span>
              <strong className="text-emerald-400">Alembic 5ff2b8157ff7 applied</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Probe Interval:</span>
              <strong className="text-white">5 seconds</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Alertmanager Webhook:</span>
              <strong className="text-cyan-400">/api/alerts/webhook</strong>
            </div>
          </div>

          <button
            onClick={handleSeedDefaults}
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verify & Reseed Default Setup</span>
          </button>
        </div>
      </div>
    </div>
  );
}

