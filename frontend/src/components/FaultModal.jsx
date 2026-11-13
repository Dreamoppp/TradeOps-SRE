import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Check, Flame } from 'lucide-react';
import api from '../api/client';

export default function FaultModal({ isOpen, onClose, onUpdated }) {
  const [config, setConfig] = useState({
    enabled: false,
    fail_all_orders: false,
    injected_latency_ms: 0,
    fail_database: false,
    error_rate_percent: 0,
    high_cpu_simulation: false
  });
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    try {
      const res = await api.get('/api/simulator/fault-injection');
      setConfig(res.data);
    } catch (err) {
      console.error('Failed to load fault config', err);
    }
  };

  const saveConfig = async (newConfig) => {
    setLoading(true);
    setStatusMessage('');
    try {
      const res = await api.post('/api/simulator/fault-injection', newConfig);
      setConfig(res.data);
      setStatusMessage('Fault injection settings applied successfully');
      if (onUpdated) onUpdated(res.data);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      setStatusMessage('Error updating fault injection');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    const updated = { ...config, [key]: !config[key] };
    // If enabling any fault, ensure enabled=true
    if (!config.enabled && !config[key]) {
      updated.enabled = true;
    }
    setConfig(updated);
  };

  const resetAll = () => {
    const clean = {
      enabled: false,
      fail_all_orders: false,
      injected_latency_ms: 0,
      fail_database: false,
      error_rate_percent: 0,
      high_cpu_simulation: false
    };
    saveConfig(clean);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 text-rose-400">
            <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="font-semibold text-lg text-white">Chaos & Fault Injection Lab</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300 leading-relaxed">
              <strong className="text-rose-200">Controlled SRE Reliability Testing:</strong> Injected faults simulate real-world trading gateway failures, latency degradation, and server errors to test detection, alerting, and auto-incident workflows.
            </p>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div>
              <span className="font-medium text-sm text-white">Master Fault Injection Switch</span>
              <p className="text-xs text-slate-400">Arm or disarm all active failure scenarios</p>
            </div>
            <button
              onClick={() => handleToggle('enabled')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                config.enabled ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {config.enabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          {/* Scenario 1: Order Gateway 500 Failure */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800">
            <div>
              <span className="text-sm font-medium text-slate-200">Simulate Gateway Outage (HTTP 500)</span>
              <p className="text-xs text-slate-500">Causes /api/simulator/health to return 500 and orders to fail</p>
            </div>
            <input
              type="checkbox"
              checked={config.fail_all_orders}
              onChange={() => handleToggle('fail_all_orders')}
              className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
            />
          </div>

          {/* Scenario 2: Latency Injection */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-200">Injected Probe Latency</span>
              <span className="text-xs font-mono font-bold text-amber-400">{config.injected_latency_ms} ms</span>
            </div>
            <input
              type="range"
              min="0"
              max="2500"
              step="100"
              value={config.injected_latency_ms}
              onChange={(e) => setConfig({ ...config, injected_latency_ms: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0ms (Normal)</span>
              <span>1000ms (Degraded)</span>
              <span>2500ms (Critical Timeout)</span>
            </div>
          </div>

          {/* Scenario 3: Error Rate Percentage */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-200">Synthetic Transaction Error Rate</span>
              <span className="text-xs font-mono font-bold text-rose-400">{config.error_rate_percent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={config.error_rate_percent}
              onChange={(e) => setConfig({ ...config, error_rate_percent: parseInt(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {statusMessage && (
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              {statusMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={resetAll}
            disabled={loading}
            className="text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Reset All to Healthy
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={() => saveConfig(config)}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
            >
              Apply Fault Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

