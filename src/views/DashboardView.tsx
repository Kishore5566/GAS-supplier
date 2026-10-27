import React, { useState, useEffect } from 'react';
import { DashboardData, Cylinder } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Users,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Flame,
  ArrowRight,
  RefreshCw,
  QrCode,
  RotateCcw,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onSelectCylinder: (id: string) => void;
  onOpenBarcode: () => void;
  onOpenNewOrder: () => void;
  onOpenReturn: () => void;
  onOpenRefill: () => void;
  onOpenNewCylinder: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onSelectCylinder,
  onOpenBarcode,
  onOpenNewOrder,
  onOpenReturn,
  onOpenRefill,
  onOpenNewCylinder
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-lg border border-slate-200 p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
        <p className="text-sm text-slate-700">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, gasBreakdown, lowStockAlerts, criticalCylinders, recentEvents } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Title & Operational Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Operations & Fleet Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time cylinder tracking, manifold refilling cycles, deliveries, and safety compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchDashboard}
            title="Refresh Metrics"
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenBarcode}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5 text-teal-700" />
            <span>Scan Tag</span>
          </button>
          <button
            onClick={onOpenReturn}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Customer Return</span>
          </button>
          <button
            onClick={onOpenRefill}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Flame className="w-3.5 h-3.5 text-teal-700" />
            <span>Refill Manifold</span>
          </button>
          <button
            onClick={onOpenNewOrder}
            className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Truck className="w-3.5 h-3.5 text-teal-400" />
            <span>New Delivery</span>
          </button>
        </div>
      </div>

      {/* Safety Quarantine Alert Bar (if flagged cylinders exist) */}
      {metrics.flaggedSafety > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-red-900 tracking-wide uppercase">
                {metrics.flaggedSafety} Cylinder(s) Quarantined — Safety Protocols Engaged
              </span>
              <p className="text-red-700 mt-0.5">
                Critical micro-leak or physical defect detected. These cylinders are locked from delivery dispatch and refill stations.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('maintenance')}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors shrink-0 whitespace-nowrap shadow-2xs"
          >
            Inspect Quarantine &rarr;
          </button>
        </div>
      )}

      {/* Primary Metrics Grid (Anti-slop clean cards with tabular numerals) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onNavigateTab('cylinders')}
          className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Fleet</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {metrics.totalCylinders}
          </div>
          <span className="text-[11px] text-slate-500">Active tracked assets</span>
        </div>

        <div
          onClick={() => onNavigateTab('cylinders')}
          className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-700">Filled & Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 font-mono tabular-nums">
            {metrics.filledReady}
          </div>
          <span className="text-[11px] text-slate-500">Available for delivery</span>
        </div>

        <div
          onClick={() => onNavigateTab('refilling')}
          className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-blue-700">In Refill</span>
            <Flame className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono tabular-nums">
            {metrics.inRefill}
          </div>
          <span className="text-[11px] text-slate-500">Processing on manifolds</span>
        </div>

        <div
          onClick={() => onNavigateTab('deliveries')}
          className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-cyan-700">In Transit</span>
            <Truck className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-cyan-900 font-mono tabular-nums">
            {metrics.inTransit}
          </div>
          <span className="text-[11px] text-slate-500">On fleet delivery trucks</span>
        </div>

        <div
          onClick={() => onNavigateTab('deliveries')}
          className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-indigo-700">With Customer</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-900 font-mono tabular-nums">
            {metrics.withCustomer}
          </div>
          <span className="text-[11px] text-slate-500">At customer facilities</span>
        </div>

        <div
          onClick={() => onNavigateTab('maintenance')}
          className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-700">Testing / Insp.</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums">
            {metrics.underMaintenance + metrics.overdueInspections}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">
            {metrics.overdueInspections} overdue tests
          </span>
        </div>
      </div>

      {/* Two-Column Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Gas Inventory & Depot Readiness (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inventory Breakdown by Gas Type */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Gas Fleet Distribution & Depot Readiness
                </h3>
                <span className="text-[11px] text-slate-500">Current stock across all technical classifications</span>
              </div>
              <button
                onClick={() => onNavigateTab('cylinders')}
                className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                View all inventory <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Gas Classification</th>
                    <th className="px-4 py-2.5 font-medium text-right">Filled & Ready</th>
                    <th className="px-4 py-2.5 font-medium text-right">Empty / Intake</th>
                    <th className="px-4 py-2.5 font-medium text-right">In Refill</th>
                    <th className="px-4 py-2.5 font-medium text-right">With Customer</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total Fleet</th>
                    <th className="px-4 py-2.5 font-medium text-center">Readiness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {gasBreakdown.map((item) => {
                    const ratio = item.total > 0 ? Math.round((item.filled / item.total) * 100) : 0;
                    return (
                      <tr key={item.gas_type} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-900">
                          {item.gas_type}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                          {item.filled}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">
                          {item.empty}
                        </td>
                        <td className="px-4 py-2.5 text-right text-blue-600">
                          {item.in_refill}
                        </td>
                        <td className="px-4 py-2.5 text-right text-indigo-600">
                          {item.with_customer}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                          {item.total}
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              item.filled <= 1
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {ratio}% Ready
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockAlerts.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Low Ready-Stock Notice</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                The following gas types have &le;1 filled cylinder ready for dispatch:{' '}
                {lowStockAlerts.map((a) => (
                  <strong key={a.gas_type} className="font-semibold text-amber-950 mr-2">
                    {a.gas_type} ({a.filled} ready)
                  </strong>
                ))}
                . Consider starting a refill batch.
              </p>
            </div>
          )}

          {/* Critical Cylinders & Periodic Inspection Watchlist */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Critical Safety & Inspection Watchlist
                </h3>
                <span className="text-[11px] text-slate-500">
                  Cylinders requiring hydrostatic tests, sniffer leak checks, or clearance
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('maintenance')}
                className="text-xs font-medium text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                Quality Lab &rarr;
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {criticalCylinders.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  All cylinders currently comply with periodic inspection and leak requirements.
                </div>
              ) : (
                criticalCylinders.map((cyl) => (
                  <div
                    key={cyl.id}
                    onClick={() => onSelectCylinder(cyl.id)}
                    className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold text-slate-900">{cyl.id}</div>
                      <StatusBadge status={cyl.status} isFlagged={cyl.is_safety_flagged === 1} />
                      <span className="text-slate-500">{cyl.gas_type}</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                      <span>Location: <strong className="text-slate-700">{cyl.current_location}</strong></span>
                      <span>Next Insp: <strong className="font-mono text-slate-800">{cyl.next_inspection_date}</strong></span>
                      <span className="text-teal-700 font-semibold hover:underline">View Record &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Audit Activity Stream & Quick Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                Live Audit Activity Stream
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Last 10 events</span>
            </div>

            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {recentEvents.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">No events logged yet.</div>
              ) : (
                recentEvents.map((evt) => (
                  <div key={evt.id} className="text-xs space-y-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectCylinder(evt.cylinder_id)}
                        className="font-mono font-bold text-teal-800 hover:underline"
                      >
                        {evt.cylinder_id}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-800 text-[11px]">{evt.title}</div>
                    <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{evt.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>{evt.performed_by} ({evt.role})</span>
                      <span className="font-mono">{evt.location}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
