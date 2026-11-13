import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import FaultModal from './components/FaultModal';
import Overview from './pages/Overview';
import Services from './pages/Services';
import Incidents from './pages/Incidents';
import Logs from './pages/Logs';
import Simulator from './pages/Simulator';
import Diagnostics from './pages/Diagnostics';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import api from './api/client';

export default function App() {
  const [faultModalOpen, setFaultModalOpen] = useState(false);
  const [faultActive, setFaultActive] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIncidentsCount, setActiveIncidentsCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState('HEALTHY');

  const checkGlobalStatus = async () => {
    try {
      const [faultRes, incRes, servicesRes] = await Promise.all([
        api.get('/api/simulator/fault-injection'),
        api.get('/api/incidents/metrics/summary'),
        api.get('/api/services')
      ]);

      setFaultActive(faultRes.data.enabled);
      setActiveIncidentsCount(incRes.data.active_incidents || 0);

      const anyDown = servicesRes.data.some((s) => s.status === 'down');
      const anyDegraded = servicesRes.data.some((s) => s.status === 'degraded');
      if (anyDown) setSystemStatus('DOWN');
      else if (anyDegraded) setSystemStatus('DEGRADED');
      else setSystemStatus('HEALTHY');
    } catch (err) {
      console.warn('Telemetry poll error', err);
    }
  };

  useEffect(() => {
    checkGlobalStatus();
    if (refreshInterval > 0) {
      const id = setInterval(checkGlobalStatus, refreshInterval);
      return () => clearInterval(id);
    }
  }, [refreshInterval]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await checkGlobalStatus();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        faultActive={faultActive}
        onOpenFaultModal={() => setFaultModalOpen(true)}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        onManualRefresh={handleManualRefresh}
        refreshing={refreshing}
        systemStatus={systemStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeIncidentsCount={activeIncidentsCount} />
        
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview onOpenFaultModal={() => setFaultModalOpen(true)} />} />
            <Route path="/services" element={<Services />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/simulator" element={<Simulator onOpenFaultModal={() => setFaultModalOpen(true)} />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>

      {/* Fault Injection Chaos Modal */}
      <FaultModal
        isOpen={faultModalOpen}
        onClose={() => setFaultModalOpen(false)}
        onUpdated={(cfg) => setFaultActive(cfg.enabled)}
      />
    </div>
  );
}

