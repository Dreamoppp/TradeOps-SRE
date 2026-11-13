import React, { useState, useEffect } from 'react';
import {
  Server,
  AlertOctagon,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Flame
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import SeverityBadge from '../components/SeverityBadge';
import { Link } from 'react-router-dom';

export default function Overview({ onOpenFaultModal }) {
  const [analytics, setAnalytics] = useState(null);
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [analyticsRes, servicesRes, incidentsRes, alertsRes] = await Promise.all([
        api.get('/api/analytics/overview'),
        api.get('/api/services'),
        api.get('/api/incidents?limit=5'),
        api.get('/api/alerts?limit=5')
      ]);
      setAnalytics(analyticsRes.data);
      setServices(servicesRes.data);
      setIncidents(incidentsRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Error fetching overview data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  const acknowledgeIncident = async (id) => {
    try {
      await api.patch(`/api/incidents/${id}`, { status: 'ACKNOWLEDGED' });
      fetchData();
    } catch (err) {
      console.error('Failed to acknowledge incident', err);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-mono">Loading telemetry feed...</p>
        </div>
      </div>
    );
  }

  // Flatten latency trends for charting
  const latencyData = [];
  if (analytics?.latency_trends) {
    const gatewayPoints = analytics.latency_trends['Simulated Order Gateway'] || [];
    const apiPoints = analytics.latency_trends['TradeOps Core API'] || [];
    const maxLen = Math.max(gatewayPoints.length, apiPoints.length);
    for (let i = 0; i < maxLen; i++) {
      latencyData.push({
        time: gatewayPoints[i]?.time || apiPoints[i]?.time || `${i}`,
        gateway: gatewayPoints[i]?.latency || 0,
        api: apiPoints[i]?.latency || 0,
      });
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Operations Mission Control
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry, synthetic order health, and incident response center
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenFaultModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition shadow-sm"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Simulate Failure Scenario</span>
          </button>
          <Link
            to="/simulator"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-sm shadow-cyan-600/20"
          >
            <span>Place Order</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored Services"
          value={`${analytics?.services?.healthy || 0}/${analytics?.services?.total || 0}`}
          subtext={`${analytics?.services?.down || 0} down · ${analytics?.services?.degraded || 0} degraded`}
          icon={Server}
          color={analytics?.services?.down > 0 ? 'rose' : analytics?.services?.degraded > 0 ? 'amber' : 'emerald'}
          badge={analytics?.services?.down > 0 ? 'CRITICAL' : 'ALL NOMINAL'}
        />
        <MetricCard
          title="Active Incidents"
          value={analytics?.incidents?.active || 0}
          subtext={`Total recorded: ${analytics?.incidents?.total || 0}`}
          icon={AlertOctagon}
          color={analytics?.incidents?.active > 0 ? 'rose' : 'emerald'}
          badge={analytics?.incidents?.active > 0 ? 'ATTENTION' : 'CLEAR'}
        />
        <MetricCard
          title="SLA Availability"
          value={`${analytics?.services?.availability_percentage || 100}%`}
          subtext="24-hour probe health window"
          icon={CheckCircle2}
          color="cyan"
          badge="TIER 1"
        />
        <MetricCard
          title="Avg Probe Latency"
          value={`${analytics?.services?.average_latency_ms || 0} ms`}
          subtext="Real HTTP/DB query roundtrip"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Latency Chart & Service Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Probe Latency Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Service Probe Latency Timeline
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Telemetry probes captured every 5s</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Gateway
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Core API
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {latencyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                Awaiting telemetry samples...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyData}>
                  <defs>
                    <linearGradient id="colorGateway" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="gateway"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGateway)"
                    name="Gateway (ms)"
                  />
                  <Area
                    type="monotone"
                    dataKey="api"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApi)"
                    name="Core API (ms)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monitored Services Quick List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Target Services</h2>
              <Link to="/services" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{svc.name}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{svc.service_type} endpoint</p>
                    </div>
                    <StatusBadge status={svc.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-900 font-mono">
                    <span>Failures: {svc.consecutive_failures}</span>
                    <span>Interval: {svc.check_interval_seconds}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
            Automated monitoring probes active via local scheduler.
          </div>
        </div>
      </div>

      {/* Active Incidents & Firing Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Incidents Panel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-semibold text-white">Active Incidents</h2>
            </div>
            <Link to="/incidents" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              Manage Incidents →
            </Link>
          </div>

          <div className="space-y-3">
            {incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">No active incidents</p>
                <p className="text-xs text-slate-500 mt-1">All monitored systems operating within SLA thresholds</p>
              </div>
            ) : (
              incidents
                .filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED')
                .map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-300">{inc.incident_number}</span>
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} />
                      </div>
                      <h3 className="text-sm font-semibold text-white">{inc.title}</h3>
                      <p className="text-xs text-slate-400">
                        Service: <span className="text-slate-300">{inc.service_name}</span> · Assigned:{' '}
                        <span className="text-cyan-400 font-mono">{inc.assigned_to || 'Unassigned'}</span>
                      </p>
                    </div>

                    {inc.status === 'OPEN' && (
                      <button
                        onClick={() => acknowledgeIncident(inc.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition shrink-0"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Prometheus / Alertmanager Firing Alerts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Prometheus Alert Records</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">Webhook Correlated</span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">No alert rules firing</p>
                <p className="text-xs text-slate-500 mt-1">Alertmanager webhook configured and ready</p>
              </div>
            ) : (
              alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{al.alert_name}</span>
                      <SeverityBadge severity={al.severity} />
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        al.status === 'FIRING' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {al.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{al.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Service: {al.service_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

