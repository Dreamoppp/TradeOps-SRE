import React, { useState, useEffect } from 'react';
import { Terminal, Search, Filter, RefreshCw, AlertTriangle, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import api from '../api/client';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      let url = '/api/logs?limit=150';
      if (query) url += `&query=${encodeURIComponent(query)}`;
      if (severity) url += `&severity=${severity}`;
      if (serviceName) url += `&service_name=${encodeURIComponent(serviceName)}`;
      if (correlationId) url += `&correlation_id=${encodeURIComponent(correlationId)}`;

      const [logsRes, statsRes] = await Promise.all([
        api.get(url),
        api.get('/api/logs/stats')
      ]);

      setLogs(logsRes.data.logs || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, [severity, serviceName]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case 'CRITICAL':
      case 'ERROR':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'WARNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-cyan-400" />
            Centralized Structured Log Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time JSON application logs with request IDs, correlation tracing, and error telemetry
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Error Breakdown Stat Pills */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-500 block">Total Buffered</span>
            <span className="text-lg font-bold text-white">{stats.total_logs}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-rose-400 block">Errors / Critical</span>
            <span className="text-lg font-bold text-rose-400">
              {(stats.severities?.ERROR || 0) + (stats.severities?.CRITICAL || 0)}
            </span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-amber-400 block">Warnings</span>
            <span className="text-lg font-bold text-amber-400">{stats.severities?.WARNING || 0}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <span className="text-cyan-400 block">Info Telemetry</span>
            <span className="text-lg font-bold text-cyan-400">{stats.severities?.INFO || 0}</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search log messages, stack traces, correlation IDs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 outline-none font-mono"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none font-mono"
          >
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <select
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none font-mono"
          >
            <option value="">All Services</option>
            <option value="tradeops-api">TradeOps API</option>
            <option value="tradeops.simulator">Simulator</option>
            <option value="tradeops.monitoring_engine">Monitoring Engine</option>
            <option value="tradeops.automation">Automation</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Log Feed */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <span>Stream view ({logs.length} matched)</span>
          <span className="text-[11px] text-slate-500">Auto-refresh active (5s)</span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-[650px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No log events matching current criteria.
            </div>
          ) : (
            logs.map((log, idx) => {
              const isExpanded = expandedLogId === idx;
              return (
                <div key={idx} className="hover:bg-slate-900/50 transition">
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : idx)}
                    className="p-3 flex items-start gap-3 cursor-pointer"
                  >
                    <span className="text-slate-600 shrink-0 mt-0.5">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-slate-500 shrink-0 select-none">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${getSeverityStyle(log.severity)}`}>
                      {log.severity}
                    </span>
                    <span className="text-slate-400 shrink-0 font-medium">[{log.service_name}]</span>
                    <p className="text-slate-200 truncate flex-1">{log.message}</p>
                    {log.correlation_id && (
                      <span className="text-[10px] text-slate-500 shrink-0 truncate max-w-[120px]">
                        {log.correlation_id}
                      </span>
                    )}
                  </div>

                  {/* Expanded JSON view */}
                  {isExpanded && (
                    <div className="px-10 pb-4 pt-1 bg-slate-900/80 border-t border-slate-800/80">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] text-slate-400">Structured Payload:</span>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(log, null, 2), idx)}
                          className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                        >
                          {copiedId === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === idx ? 'Copied' : 'Copy JSON'}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-950 rounded-lg text-slate-300 text-[11px] overflow-x-auto border border-slate-800">
                        {JSON.stringify(log, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

