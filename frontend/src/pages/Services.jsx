import React, { useState, useEffect } from 'react';
import { Server, Plus, Settings, History, Activity, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function Services() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  const loadServices = async () => {
    try {
      const res = await api.get('/api/services');
      setServices(res.data);
      if (!selectedService && res.data.length > 0) {
        setSelectedService(res.data[0]);
      } else if (selectedService) {
        const found = res.data.find((s) => s.id === selectedService.id);
        if (found) setSelectedService(found);
      }
    } catch (err) {
      console.error('Error loading services', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (serviceId) => {
    try {
      const res = await api.get(`/api/services/${serviceId}/history?limit=30`);
      setHistory(res.data);
    } catch (err) {
      console.error('Error loading history', err);
    }
  };

  useEffect(() => {
    loadServices();
    const id = setInterval(loadServices, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selectedService) {
      loadHistory(selectedService.id);
    }
  }, [selectedService?.id]);

  const handleEditClick = (service) => {
    setEditForm({
      id: service.id,
      name: service.name,
      check_interval_seconds: service.check_interval_seconds,
      timeout_seconds: service.timeout_seconds,
      failure_threshold: service.failure_threshold,
      recovery_threshold: service.recovery_threshold
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/services/${editForm.id}`, {
        check_interval_seconds: Number(editForm.check_interval_seconds),
        timeout_seconds: Number(editForm.timeout_seconds),
        failure_threshold: Number(editForm.failure_threshold),
        recovery_threshold: Number(editForm.recovery_threshold)
      });
      setIsEditModalOpen(false);
      loadServices();
    } catch (err) {
      console.error('Failed to update service', err);
    }
  };

  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    latency: h.latency_ms,
    status: h.status
  }));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-cyan-400" />
            Service Telemetry & Probes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Active synthetic probes, SLA thresholds, and health telemetry history
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {services.map((svc) => {
          const isSelected = selectedService?.id === svc.id;
          return (
            <div
              key={svc.id}
              onClick={() => setSelectedService(svc)}
              className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${isSelected
                ? 'bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {svc.service_type}
                  </span>
                  <StatusBadge status={svc.status} />
                </div>
                <h3 className="text-base font-bold text-white mt-3">{svc.name}</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5">{svc.url || 'Internal PostgreSQL Dialect'}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <div>
                  <span className="text-slate-500">Fail Threshold: </span>
                  <span className="text-rose-400 font-bold">{svc.failure_threshold}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(svc);
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                  title="Configure Thresholds"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Service Detailed Telemetry */}
      {selectedService && (
        <div className="space-y-6">
          {/* Latency History Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Probe Response Latency — {selectedService.name}
                </h2>
                <p className="text-xs text-slate-400">Past 30 probe cycles (ms)</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-400">
                  Last checked:{' '}
                  <span className="text-white">
                    {selectedService.last_check_at ? new Date(selectedService.last_check_at).toLocaleTimeString() : 'N/A'}
                  </span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  Loading probe measurements...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#06b6d4' }}
                      activeDot={{ r: 6 }}
                      name="Latency (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Probe History Log Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Raw Probe Telemetry Log
              </h2>
              <span className="text-xs font-mono text-slate-500">{history.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Latency</th>
                    <th className="pb-3 font-semibold">HTTP Code</th>
                    <th className="pb-3 font-semibold">Diagnosis / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 text-slate-400">
                        {new Date(h.timestamp).toLocaleTimeString()} · {new Date(h.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="py-2.5 font-bold text-white">{h.latency_ms} ms</td>
                      <td className="py-2.5 text-slate-300">{h.status_code || '—'}</td>
                      <td className="py-2.5 text-slate-400 truncate max-w-md">
                        {h.error_message || 'Probe succeeded with 200 OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Thresholds Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Configure Probing Policy: {editForm.name}</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Check Interval (seconds)</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={editForm.check_interval_seconds}
                  onChange={(e) => setEditForm({ ...editForm, check_interval_seconds: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Timeout (seconds)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={editForm.timeout_seconds}
                  onChange={(e) => setEditForm({ ...editForm, timeout_seconds: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Failure Threshold (consecutive probes to trip)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.failure_threshold}
                  onChange={(e) => setEditForm({ ...editForm, failure_threshold: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Recovery Threshold (consecutive probes to recover)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.recovery_threshold}
                  onChange={(e) => setEditForm({ ...editForm, recovery_threshold: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

