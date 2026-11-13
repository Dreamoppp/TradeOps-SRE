import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Plus,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  X,
  Send,
  AlertTriangle
} from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { useAuth } from '../context/AuthContext';

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    service_name: 'Simulated Order Gateway',
    severity: 'P2',
    notes: ''
  });
  const [timelineNote, setTimelineNote] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [rootCauseText, setRootCauseText] = useState('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  const loadIncidents = async () => {
    try {
      let url = '/api/incidents?limit=50';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (severityFilter) url += `&severity=${severityFilter}`;
      const res = await api.get(url);
      setIncidents(res.data);
      if (selectedIncident) {
        const updated = res.data.find((i) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (err) {
      console.error('Failed to load incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    const id = setInterval(loadIncidents, 5000);
    return () => clearInterval(id);
  }, [statusFilter, severityFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/incidents', newIncident);
      setIsCreateOpen(false);
      setNewIncident({ title: '', service_name: 'Simulated Order Gateway', severity: 'P2', notes: '' });
      loadIncidents();
      setSelectedIncident(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create incident');
    }
  };

  const handleStatusChange = async (targetStatus) => {
    if (!selectedIncident) return;
    try {
      const payload = { status: targetStatus };
      if (targetStatus === 'ACKNOWLEDGED') {
        payload.assigned_to = user?.email || 'engineer@tradeops.io';
      }
      const res = await api.patch(`/api/incidents/${selectedIncident.id}`, payload);
      setSelectedIncident(res.data);
      loadIncidents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!timelineNote.trim() || !selectedIncident) return;
    try {
      const res = await api.patch(`/api/incidents/${selectedIncident.id}`, { notes: timelineNote });
      setSelectedIncident(res.data);
      setTimelineNote('');
      loadIncidents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add note');
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      const res = await api.patch(`/api/incidents/${selectedIncident.id}`, {
        status: 'RESOLVED',
        root_cause: rootCauseText,
        resolution: resolutionText
      });
      setSelectedIncident(res.data);
      setIsResolveModalOpen(false);
      setRootCauseText('');
      setResolutionText('');
      loadIncidents();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve incident');
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      i.incident_number.toLowerCase().includes(q) ||
      i.service_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-400" />
            Incident Response & Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            End-to-end incident lifecycle: detection, assignment, audit timeline, and resolution
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm shadow-rose-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Declare Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by incident number, title, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 outline-none font-mono"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none font-mono"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none font-mono"
          >
            <option value="">All Severities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>
        </div>
      </div>

      {/* Main Grid: List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Incident List */}
        <div className={`space-y-3 ${selectedIncident ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          {filteredIncidents.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">No incidents matching filter</p>
              <p className="text-xs text-slate-500 mt-1">Change search filter or declare a new incident</p>
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-300">{inc.incident_number}</span>
                      <SeverityBadge severity={inc.severity} />
                      <StatusBadge status={inc.status} />
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(inc.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2 leading-snug">{inc.title}</h3>
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Service: <strong className="text-slate-300">{inc.service_name}</strong></span>
                    <span>Assigned: <strong className="text-cyan-400">{inc.assigned_to || 'Unassigned'}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Incident Drawer / Details */}
        {selectedIncident && (
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24 space-y-6 max-h-[85vh] overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">{selectedIncident.incident_number}</span>
                  <SeverityBadge severity={selectedIncident.severity} showLabel />
                  <StatusBadge status={selectedIncident.status} />
                </div>
                <h2 className="text-base font-bold text-white mt-1">{selectedIncident.title}</h2>
                <p className="text-xs text-slate-400">
                  Impacted Service: <span className="text-slate-200 font-semibold">{selectedIncident.service_name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SRE Action Toolbar */}
            <div className="flex flex-wrap gap-2 pt-1 pb-3 border-b border-slate-800">
              {selectedIncident.status === 'OPEN' && (
                <button
                  onClick={() => handleStatusChange('ACKNOWLEDGED')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition"
                >
                  Acknowledge & Assign
                </button>
              )}

              {selectedIncident.status === 'ACKNOWLEDGED' && (
                <button
                  onClick={() => handleStatusChange('INVESTIGATING')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition"
                >
                  Start Investigation
                </button>
              )}

              {['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(selectedIncident.status) && (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition"
                >
                  Resolve Incident
                </button>
              )}

              {selectedIncident.status === 'RESOLVED' && (
                <>
                  <button
                    onClick={() => handleStatusChange('CLOSED')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                  >
                    Close Ticket
                  </button>
                  <button
                    onClick={() => handleStatusChange('OPEN')}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition"
                  >
                    Reopen Incident
                  </button>
                </>
              )}

              {selectedIncident.status === 'CLOSED' && (
                <button
                  onClick={() => handleStatusChange('OPEN')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition"
                >
                  Reopen Incident
                </button>
              )}
            </div>

            {/* SRE Metrics (MTTD & MTTR) */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">MTTD (Detection Time)</span>
                <span className="text-slate-200 font-bold">
                  {selectedIncident.mttd_seconds ? `${selectedIncident.mttd_seconds}s` : 'Real-time telemetry'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">MTTR (Resolution Time)</span>
                <span className="text-emerald-400 font-bold">
                  {selectedIncident.mttr_seconds
                    ? `${(selectedIncident.mttr_seconds / 60).toFixed(1)} mins (${selectedIncident.mttr_seconds.toFixed(0)}s)`
                    : 'Ongoing'}
                </span>
              </div>
            </div>

            {/* Root Cause & Resolution Info */}
            {(selectedIncident.root_cause || selectedIncident.resolution) && (
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                {selectedIncident.root_cause && (
                  <div>
                    <span className="font-semibold text-rose-400 block mb-0.5">Root Cause:</span>
                    <p className="text-slate-300">{selectedIncident.root_cause}</p>
                  </div>
                )}
                {selectedIncident.resolution && (
                  <div>
                    <span className="font-semibold text-emerald-400 block mb-0.5">Resolution Notes:</span>
                    <p className="text-slate-300">{selectedIncident.resolution}</p>
                  </div>
                )}
              </div>
            )}

            {/* Audit Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Audit Timeline Events ({selectedIncident.events?.length || 0})
              </h4>
              <div className="space-y-3 pl-2 border-l border-slate-800">
                {selectedIncident.events?.map((ev) => (
                  <div key={ev.id} className="relative pl-4 text-xs space-y-0.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 absolute -left-[5px] top-1.5" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white uppercase text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800">
                        {ev.event_type}
                      </span>
                      <span className="text-slate-500 text-[10px] font-mono">
                        {new Date(ev.created_at).toLocaleTimeString()} by{' '}
                        <strong className="text-slate-400">{ev.actor}</strong>
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add troubleshooting note to incident timeline..."
                value={timelineNote}
                onChange={(e) => setTimelineNote(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Declare Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Declare New Incident</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order Gateway Latency Spike > 1000ms"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Impacted Service</label>
                <select
                  value={newIncident.service_name}
                  onChange={(e) => setNewIncident({ ...newIncident, service_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="Simulated Order Gateway">Simulated Order Gateway</option>
                  <option value="TradeOps Core API">TradeOps Core API</option>
                  <option value="PostgreSQL Database">PostgreSQL Database</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Severity</label>
                <select
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="P1">P1 - Critical (Outage / Financial Risk)</option>
                  <option value="P2">P2 - High (Significant degradation)</option>
                  <option value="P3">P3 - Medium (Partial impairment)</option>
                  <option value="P4">P4 - Low (Minor anomaly)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Initial Triage Notes</label>
                <textarea
                  rows="3"
                  placeholder="Observed symptoms, error codes, impact..."
                  value={newIncident.notes}
                  onChange={(e) => setNewIncident({ ...newIncident, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold"
                >
                  Declare Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Post-Mortem Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Resolve Incident Post-Mortem</h3>
            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Root Cause Explanation</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Memory leak in matching worker thread caused GC freeze..."
                  value={rootCauseText}
                  onChange={(e) => setRootCauseText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Corrective Resolution Actions</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Restarted process pool, increased heap limit, applied socket keepalive..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  Submit & Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

