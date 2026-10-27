import React, { useState, useEffect } from 'react';
import { RefillLog, Cylinder } from '../types';
import { api, exportToCSV } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Gauge,
  Layers,
  ArrowRight
} from 'lucide-react';

interface RefillingViewProps {
  onOpenRefillModal: (cylinder?: Cylinder) => void;
  onSelectCylinder: (id: string) => void;
}

export const RefillingView: React.FC<RefillingViewProps> = ({ onOpenRefillModal, onSelectCylinder }) => {
  const { canManageInventory } = useAuth();
  const [logs, setLogs] = useState<RefillLog[]>([]);
  const [pendingCylinders, setPendingCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefills = async () => {
    setLoading(true);
    try {
      const res = await api.getRefills();
      setLogs(res.logs);
      setPendingCylinders(res.pendingCylinders);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load refilling operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefills();
  }, []);

  const handleExportCSV = () => {
    exportToCSV('refill_logs_export', logs);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Refilling Cycle Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manifold staging, pressure charging, gas purity certification, and safety interlocks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRefills}
            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Batch Logs</span>
          </button>
          {canManageInventory && (
            <button
              onClick={() => onOpenRefillModal()}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Refill Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Safety Interlock Guarantee Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-white tracking-wide">
              Automated Safety Interlock Active
            </span>
            <p className="text-slate-300 mt-0.5">
              The platform strictly prevents refilling or certifying cylinders marked damaged, leaking, or overdue for periodic inspection.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Total Certified Batches:</span>
          <span className="font-bold text-teal-400">{logs.length}</span>
        </div>
      </div>

      {/* Cylinders In Refill or Waiting */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Manifold Staging Queue ({pendingCylinders.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Empty cylinders currently in depot or connected to refill manifolds
            </span>
          </div>
          {canManageInventory && pendingCylinders.length > 0 && (
            <button
              onClick={() => onOpenRefillModal(pendingCylinders[0])}
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
            >
              Process Next Cylinder &rarr;
            </button>
          )}
        </div>

        {pendingCylinders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No empty cylinders currently waiting in the manifold queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingCylinders.map((cyl) => (
              <div
                key={cyl.id}
                className="p-3.5 hover:bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelectCylinder(cyl.id)}
                    className="font-mono font-bold text-slate-900 hover:text-teal-700"
                  >
                    {cyl.id}
                  </button>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    {cyl.status === 'in_refill' ? 'In Manifold Station' : 'Empty Depot Intake'}
                  </span>
                  <span className="font-semibold text-slate-800">{cyl.gas_type} ({cyl.gas_grade})</span>
                </div>

                <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                  <span>Target WP: <strong className="font-mono text-slate-700">{cyl.working_pressure_bar} Bar</strong></span>
                  <span>Tare: <strong className="font-mono text-slate-700">{cyl.tare_weight_kg} kg</strong></span>
                  <span>Location: <strong className="text-slate-700">{cyl.current_location}</strong></span>

                  {canManageInventory && (
                    <button
                      onClick={() => onOpenRefillModal(cyl)}
                      className="px-2.5 py-1 bg-teal-700 text-white rounded text-xs font-medium hover:bg-teal-800 transition-colors shadow-2xs"
                    >
                      Process Refill
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Refill Batch Logs Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-2">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Certified Refill Batch Logs
            </h3>
            <span className="text-[11px] text-slate-500">
              Complete historical record of batch codes, fill pressures, purity, and operator sign-offs
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-2" />
            Loading refill batch records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No refill logs on record yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Batch Number</th>
                  <th className="px-4 py-2.5 font-medium">Cylinder Asset</th>
                  <th className="px-4 py-2.5 font-medium">Gas Classification</th>
                  <th className="px-4 py-2.5 font-medium text-right">Fill Pressure</th>
                  <th className="px-4 py-2.5 font-medium text-right">Purity %</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium">Certified Operator</th>
                  <th className="px-4 py-2.5 font-medium">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{log.batch_number}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onSelectCylinder(log.cylinder_id)}
                        className="hover:underline text-teal-800 font-bold"
                      >
                        {log.cylinder_id}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-800">{log.gas_type}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{log.fill_pressure_bar} Bar</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-800">{log.purity_percentage}%</td>
                    <td className="px-4 py-3 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          log.result === 'Passed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.result}
                      </span>
                      {log.failure_reason && (
                        <div className="text-[10px] text-red-600 mt-0.5 truncate max-w-[150px]">
                          {log.failure_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700">{log.operator_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {new Date(log.refill_date).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
