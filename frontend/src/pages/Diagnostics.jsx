import React, { useState, useEffect } from 'react';
import { Cpu, Database, HardDrive, Play, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';
import api from '../api/client';

export default function Diagnostics() {
  const [system, setSystem] = useState(null);
  const [dbHealth, setDbHealth] = useState(null);
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState('');

  const fetchDiagnostics = async () => {
    try {
      const [sysRes, dbRes, histRes] = await Promise.all([
        api.get('/api/diagnostics/system'),
        api.get('/api/diagnostics/database'),
        api.get('/api/diagnostics/history?limit=15')
      ]);
      setSystem(sysRes.data);
      setDbHealth(dbRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load diagnostics', err);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const id = setInterval(fetchDiagnostics, 5000);
    return () => clearInterval(id);
  }, []);

  const handleRunAll = async () => {
    setRunning(true);
    setRunMessage('');
    try {
      const res = await api.post('/api/diagnostics/run?service_name=TradeOps%20API');
      setRunMessage(`Diagnostics complete: ${res.data.reports?.length || 0} checks completed successfully.`);
      fetchDiagnostics();
    } catch (err) {
      setRunMessage('Error running diagnostic checks');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Infrastructure & Database Diagnostics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Safe, non-destructive host telemetry, memory inspection, and PostgreSQL health queries
          </p>
        </div>
        <button
          onClick={handleRunAll}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm shadow-cyan-600/20 disabled:opacity-50"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>Execute Full Diagnostic Suite</span>
        </button>
      </div>

      {runMessage && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{runMessage}</span>
        </div>
      )}

      {/* Host Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CPU */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-white">CPU Utilization</span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {system?.data?.cpu_percent || 0}%
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (system?.data?.cpu_percent || 0) > 85
                  ? 'bg-rose-500'
                  : (system?.data?.cpu_percent || 0) > 70
                  ? 'bg-amber-500'
                  : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(system?.data?.cpu_percent || 0, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 font-mono">
            {system?.data?.cpu_count || 0} logical CPU threads active
          </p>
        </div>

        {/* RAM */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold text-white">System Memory (RAM)</span>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {system?.data?.memory_percent || 0}%
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (system?.data?.memory_percent || 0) > 90 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(system?.data?.memory_percent || 0, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 font-mono">
            {system?.data?.memory_used_mb || 0} MB used of {system?.data?.memory_total_mb || 0} MB
          </p>
        </div>

        {/* Database */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-white">PostgreSQL Engine</span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {dbHealth?.status || 'HEALTHY'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Query Latency:</span>
              <strong className="text-white">{dbHealth?.data?.query_latency_ms || 0} ms</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Active Backends:</span>
              <strong className="text-white">{dbHealth?.data?.active_connections || 1}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>DB Size:</span>
              <strong className="text-white">{dbHealth?.data?.db_size_mb || 0} MB</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Snapshot History Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-400" />
            Historical Diagnostic Reports
          </h2>
          <span className="text-xs font-mono text-slate-500">{history.length} snapshots recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Service</th>
                <th className="pb-3">Check Type</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Execution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No diagnostic snapshots recorded yet. Click "Execute Full Diagnostic Suite" above.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 text-slate-400">{new Date(h.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 text-slate-200">{h.service_name}</td>
                    <td className="py-2.5 text-cyan-400 font-semibold">{h.check_type}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{h.execution_time_ms} ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

