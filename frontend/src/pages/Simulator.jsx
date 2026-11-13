import React, { useState, useEffect } from 'react';
import { TrendingUp, Send, CheckCircle2, AlertTriangle, RefreshCw, XCircle, ShieldCheck, Flame, Info } from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

const SAMPLE_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.', refPrice: 182.50 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', refPrice: 420.10 },
  { symbol: 'NVDA', name: 'Nvidia Corp.', refPrice: 128.75 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', refPrice: 186.40 },
  { symbol: 'BTC-USD', name: 'Bitcoin / USD', refPrice: 88500.0 },
  { symbol: 'ETH-USD', name: 'Ethereum / USD', refPrice: 3150.0 },
];

export default function Simulator({ onOpenFaultModal }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Ticket Form
  const [form, setForm] = useState({
    client_order_id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    symbol: 'AAPL',
    side: 'BUY',
    order_type: 'LIMIT',
    quantity: 10,
    price: 182.50
  });

  const [validationResult, setValidationResult] = useState(null);
  const [message, setMessage] = useState('');

  const loadOrders = async () => {
    try {
      const res = await api.get('/api/simulator/orders?limit=40');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const id = setInterval(loadOrders, 5000);
    return () => clearInterval(id);
  }, []);

  const handleSymbolChange = (sym) => {
    const found = SAMPLE_SYMBOLS.find((s) => s.symbol === sym);
    setForm({
      ...form,
      symbol: sym,
      price: found ? found.refPrice : form.price
    });
    setValidationResult(null);
  };

  const handleValidate = async () => {
    try {
      const res = await api.post('/api/simulator/orders/validate', {
        symbol: form.symbol,
        side: form.side,
        order_type: form.order_type,
        quantity: Number(form.quantity),
        price: form.order_type === 'LIMIT' ? Number(form.price) : null
      });
      setValidationResult(res.data);
    } catch (err) {
      setValidationResult({
        is_valid: false,
        rejection_reason: err.response?.data?.detail || 'Validation request failed'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const res = await api.post('/api/simulator/orders', {
        client_order_id: form.client_order_id,
        symbol: form.symbol,
        side: form.side,
        order_type: form.order_type,
        quantity: Number(form.quantity),
        price: form.order_type === 'LIMIT' ? Number(form.price) : null
      });

      setMessage(`Order submitted: ${res.data.status} in ${res.data.execution_delay_ms}ms`);
      // Generate new idempotency key
      setForm({
        ...form,
        client_order_id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      });
      setValidationResult(null);
      loadOrders();
    } catch (err) {
      setMessage(`Order execution error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await api.post(`/api/simulator/orders/${orderId}/cancel`);
      loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel order');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            Trading Service Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulated low-latency order routing, matching state machine, and idempotency engine
          </p>
        </div>
        <button
          onClick={onOpenFaultModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition"
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>Inject Simulated Faults</span>
        </button>
      </div>

      {/* Financial Disclaimer Banner */}
      <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3.5 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-200 leading-relaxed">
          <strong>SIMULATION ONLY:</strong> This module is a synthetic trading simulator designed strictly for Site Reliability Engineering and Production Support testing. No real financial capital, broker connectivity, or live assets are utilized.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Order Ticket Form */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-white flex items-center justify-between">
            <span>Simulated Order Ticket</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              IDEMPOTENCY ENABLED
            </span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Client Order ID (Idempotency Key) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Idempotency Key (Client Order ID)</label>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, client_order_id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })
                  }
                  className="text-cyan-400 hover:text-cyan-300 text-[10px] font-mono"
                >
                  Regenerate
                </button>
              </div>
              <input
                type="text"
                required
                value={form.client_order_id}
                onChange={(e) => setForm({ ...form, client_order_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Resending identical key tests idempotency deduplication.
              </span>
            </div>

            {/* Symbol */}
            <div>
              <label className="text-slate-400 font-medium block mb-1">Trading Instrument</label>
              <select
                value={form.symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
              >
                {SAMPLE_SYMBOLS.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name} (~${s.refPrice.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Side & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Side</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, side: 'BUY' })}
                    className={`py-2 rounded-lg font-bold transition ${
                      form.side === 'BUY'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, side: 'SELL' })}
                    className={`py-2 rounded-lg font-bold transition ${
                      form.side === 'SELL'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Order Type</label>
                <select
                  value={form.order_type}
                  onChange={(e) => setForm({ ...form, order_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                >
                  <option value="LIMIT">LIMIT</option>
                  <option value="MARKET">MARKET</option>
                </select>
              </div>
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Quantity</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {form.order_type === 'LIMIT' ? 'Limit Price ($)' : 'Est. Price ($)'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  disabled={form.order_type === 'MARKET'}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono disabled:opacity-50"
                />
              </div>
            </div>

            {/* Pre-trade validation feedback */}
            {validationResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  validationResult.is_valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {validationResult.is_valid ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Risk Check Passed: Est. Notional ${validationResult.estimated_notional.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Risk Rejected: {validationResult.rejection_reason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Status message */}
            {message && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300">
                {message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleValidate}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold transition"
              >
                Validate Risk
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md shadow-cyan-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Transmit Order</span>
              </button>
            </div>
          </form>
        </div>

        {/* Order Lifecycle History Table */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Execution Lifecycle & Audit</h2>
              <p className="text-xs text-slate-400">Order transitions: PENDING → VALIDATED → EXECUTED / REJECTED</p>
            </div>
            <button
              onClick={loadOrders}
              className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                  <th className="pb-3">Client Order ID</th>
                  <th className="pb-3">Inst</th>
                  <th className="pb-3">Side</th>
                  <th className="pb-3">Qty @ Px</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Delay</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No simulated orders recorded yet. Transmit an order above.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 text-slate-300 font-bold truncate max-w-[130px]">{o.client_order_id}</td>
                      <td className="py-2.5 text-cyan-400">{o.symbol}</td>
                      <td className={`py-2.5 font-bold ${o.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {o.side}
                      </td>
                      <td className="py-2.5 text-slate-200">
                        {o.quantity} @ ${o.price?.toFixed(2) || 'MKT'}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="py-2.5 text-slate-400">{o.execution_delay_ms}ms</td>
                      <td className="py-2.5">
                        {['PENDING', 'VALIDATED'].includes(o.status) ? (
                          <button
                            onClick={() => handleCancel(o.id)}
                            className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

