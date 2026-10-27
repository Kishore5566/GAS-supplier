import React, { useState, useEffect } from 'react';
import { InspectionRecord, Cylinder } from '../types';
import { api, exportToCSV } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge } from '../components/StatusBadge';
import {
  Wrench,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileCheck,
  RefreshCw,
  Search
} from 'lucide-react';

interface MaintenanceViewProps {
  onScheduleInspection: (cylinder?: Cylinder) => void;
  onRecordInspection: (insp: InspectionRecord) => void;
  onClearSafety: (cylinder: Cylinder) => void;
  onSelectCylinder: (id: string) => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  onScheduleInspection,
  onRecordInspection,
  onClearSafety,
  onSelectCylinder
}) => {
  const { canInspect } = useAuth();
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [quarantinedCylinders, setQuarantinedCylinders] = useState<Cylinder[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await api.getInspections({
        priority: priorityFilter,
        result: resultFilter
      });
      setInspections(res.inspections);
      setQuarantinedCylinders(res.cylindersNeedingInspection);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [priorityFilter, resultFilter]);

  const handleExportCSV = () => {
    exportToCSV('inspections_and_leak_tests', inspections);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Maintenance, Leak Testing & Safety Quarantine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Periodic hydrostatic testing, ultrasonic sniffer leak detection, valve overhauls, and statutory re-certification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInspections}
            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Test Records</span>
          </button>
          {canInspect && (
            <button
              onClick={() => onScheduleInspection()}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Inspection</span>
            </button>
          )}
        </div>
      </div>

      {/* Safety Quarantine Bay: Active Flagged Hazards */}
      <div className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-red-50/80 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                Quarantine Holding & Safety Locked Assets ({quarantinedCylinders.length})
              </h3>
              <p className="text-[11px] text-red-800">
                These cylinders are strictly isolated from inventory rotation until an authorized technician records a certified test pass.
              </p>
            </div>
          </div>
        </div>

        {quarantinedCylinders.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No active safety-locked or quarantined cylinders currently in holding.
          </div>
        ) : (
          <div className="divide-y divide-red-100">
            {quarantinedCylinders.map((cyl) => (
              <div
                key={cyl.id}
                className="p-4 hover:bg-red-50/40 transition-colors flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onSelectCylinder(cyl.id)}
                      className="font-mono font-bold text-red-900 text-sm hover:underline"
                    >
                      {cyl.id}
                    </button>
                    {cyl.is_safety_flagged === 1 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white">
                        SAFETY LOCKED
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{cyl.gas_type} ({cyl.gas_grade})</span>
                    <span className="text-slate-500 font-mono">SN: {cyl.serial_number}</span>
                  </div>

                  <p className="text-red-700 font-medium text-[11px] max-w-2xl">
                    {cyl.flag_reason || 'Periodic statutory inspection interval expired.'}
                  </p>

                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Location: <strong className="text-slate-700">{cyl.current_location}</strong></span>
                    <span>Next Due: <strong className="font-mono text-slate-800">{cyl.next_inspection_date}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canInspect && cyl.is_safety_flagged === 1 && (
                    <button
                      onClick={() => onClearSafety(cyl)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded font-semibold text-xs hover:bg-emerald-50 transition-colors shadow-2xs"
                    >
                      Certify & Release
                    </button>
                  )}
                  {canInspect && (
                    <button
                      onClick={() => onScheduleInspection(cyl)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded font-medium text-xs hover:bg-slate-800 transition-colors"
                    >
                      Run Test / Inspect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspections & Tests Work Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-2">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Testing Work Orders & Compliance Records
            </h3>
            <span className="text-[11px] text-slate-500">
              Hydrostatic water jackets, ultrasonic sniffer checks, tare verification
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="Pending">Pending Testing</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Repaired">Repaired</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-2" />
            Loading inspection records...
          </div>
        ) : inspections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No test records match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Test Type</th>
                  <th className="px-4 py-2.5 font-medium">Cylinder ID</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium">Leak Status</th>
                  <th className="px-4 py-2.5 font-medium">Certificate #</th>
                  <th className="px-4 py-2.5 font-medium">Assigned Tech</th>
                  <th className="px-4 py-2.5 font-medium">Scheduled Date</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-sans font-semibold text-slate-900">
                      {insp.type}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onSelectCylinder(insp.cylinder_id)}
                        className="text-teal-800 font-bold hover:underline"
                      >
                        {insp.cylinder_id}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <PriorityBadge priority={insp.priority} />
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          insp.test_result === 'Passed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : insp.test_result === 'Failed'
                            ? 'bg-red-100 text-red-800'
                            : insp.test_result === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {insp.test_result}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {insp.leak_detected === 1 ? (
                        <span className="font-bold text-red-700 text-[11px]">POSITIVE (LEAK)</span>
                      ) : (
                        <span className="text-emerald-700 text-[11px]">Negative (Tight)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {insp.certificate_number || 'Pending'}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700">
                      {insp.technician_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {insp.scheduled_date}
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      {canInspect && insp.test_result === 'Pending' && (
                        <button
                          onClick={() => onRecordInspection(insp)}
                          className="px-2.5 py-1 bg-teal-700 text-white rounded text-xs font-medium hover:bg-teal-800 transition-colors shadow-2xs"
                        >
                          Record Result
                        </button>
                      )}
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
