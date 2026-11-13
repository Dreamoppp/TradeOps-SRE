import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, TrendingUp, AlertOctagon, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../api/client';
import MetricCard from '../components/MetricCard';

const SEVERITY_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#3b82f6'];

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [incMetrics, setIncMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [anRes, incRes] = await Promise.all([
          api.get('/api/analytics/overview'),
          api.get('/api/incidents/metrics/summary')
        ]);
        setAnalytics(anRes.data);
        setIncMetrics(incRes.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const severityPieData = [
    { name: 'P1 - Critical', value: incMetrics?.p1_count || 0 },
    { name: 'P2 - High', value: incMetrics?.p2_count || 0 },
    { name: 'P3 - Medium', value: incMetrics?.p3_count || 0 },
    { name: 'P4 - Low', value: incMetrics?.p4_count || 0 },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-cyan-400" />
          SRE Observability & Reliability Analytics
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quantitative incident management performance, MTTR/MTTD benchmarks, and system availability SLAs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="MTTR (Mean Time To Resolve)"
          value={`${incMetrics?.mttr_avg_minutes || 0} m`}
          subtext="Resolution average across closed tickets"
          icon={Clock}
          color="emerald"
          badge="TARGET < 15m"
        />
        <MetricCard
          title="MTTD (Mean Time To Detect)"
          value={`${incMetrics?.mttd_avg_minutes || 0} m`}
          subtext="Consecutive probe detection cycle"
          icon={Activity}
          color="cyan"
          badge="AUTOMATED"
        />
        <MetricCard
          title="Total Incidents"
          value={incMetrics?.total_incidents || 0}
          subtext={`${incMetrics?.active_incidents || 0} currently active`}
          icon={AlertOctagon}
          color={incMetrics?.active_incidents > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Simulated Execution Rate"
          value={`${analytics?.orders?.executed || 0}`}
          subtext={`Total orders: ${analytics?.orders?.total || 0}`}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-white mb-1">Incident Severity Distribution</h2>
          <p className="text-xs text-slate-400 mb-6">Historical breakdown across P1 through P4 classifications</p>

          <div className="h-64 w-full flex items-center justify-center">
            {severityPieData.every((d) => d.value === 0) ? (
              <div className="text-xs text-slate-500 font-mono">No incidents recorded yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={4}
                    label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SRE SLA Definitions Guide */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white mb-2">Production Support SRE Definitions</h2>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-cyan-400 font-mono block mb-1">MTTR (Mean Time to Resolution)</span>
                <p className="text-slate-400 leading-relaxed">
                  Defined mathematically as: <code className="text-slate-200 font-mono">MTTR = \sum (resolved_at - created_at) / N</code>. Measures operational incident triage efficiency and automated rollback speed.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-indigo-400 font-mono block mb-1">MTTD (Mean Time to Detection)</span>
                <p className="text-slate-400 leading-relaxed">
                  Defined mathematically as: <code className="text-slate-200 font-mono">MTTD = (first_failed_probe_timestamp - incident_logged_timestamp)</code>. Represents probe frequency and synthetic trip sensitivity.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-emerald-400 font-mono block mb-1">SLA Availability Target</span>
                <p className="text-slate-400 leading-relaxed">
                  Standard tier 1 trading system objective: 99.9% uptime for order matching gateway.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

