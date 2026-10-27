import React, { useState, useEffect } from 'react';
import { Cylinder, CylinderEvent, InspectionRecord, RefillLog, Customer } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import {
  X,
  History,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Flame,
  Truck,
  QrCode,
  Calendar,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  User,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';

interface CylinderModalProps {
  cylinderId: string;
  onClose: () => void;
  onRefresh: () => void;
  onOpenBarcode: (cylinder: Cylinder) => void;
  onOpenSafetyFlag: (cylinder: Cylinder) => void;
  onOpenClearSafety: (cylinder: Cylinder) => void;
  onOpenScheduleInsp: (cylinder: Cylinder) => void;
  onOpenRefill: (cylinder: Cylinder) => void;
}

export const CylinderModal: React.FC<CylinderModalProps> = ({
  cylinderId,
  onClose,
  onRefresh,
  onOpenBarcode,
  onOpenSafetyFlag,
  onOpenClearSafety,
  onOpenScheduleInsp,
  onOpenRefill
}) => {
  const { user, canInspect, canManageInventory } = useAuth();
  const [data, setData] = useState<{
    cylinder: Cylinder;
    events: CylinderEvent[];
    inspections: InspectionRecord[];
    refills: RefillLog[];
    deliveryHistory: any[];
    currentCustomer: Customer | null;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'specs' | 'inspections' | 'refills'>('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getCylinder(cylinderId);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load cylinder details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cylinderId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center">
          <div className="animate-spin w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-xs text-slate-600">Retrieving cylinder telemetry & audit records...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="font-semibold text-slate-900 text-sm">Failed to Load Cylinder</h3>
          <p className="text-xs text-slate-500">{error || 'Cylinder not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs rounded-md font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { cylinder, events, inspections, refills, currentCustomer } = data;
  const isOverdue = new Date(cylinder.next_inspection_date) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-teal-400 font-mono font-bold text-sm shrink-0">
              {cylinder.gas_type.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">{cylinder.id}</h2>
                <StatusBadge status={cylinder.status} isFlagged={cylinder.is_safety_flagged === 1} />
                {isOverdue && (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                    Inspection Overdue
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                <span>SN: <span className="font-mono">{cylinder.serial_number}</span></span>
                <span>·</span>
                <span>{cylinder.gas_type} ({cylinder.gas_grade})</span>
                <span>·</span>
                <span className="font-mono">{cylinder.capacity_liters}L</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenBarcode(cylinder)}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="View Barcode / QR Tag"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prominent Safety Alert Banner if flagged */}
        {cylinder.is_safety_flagged === 1 && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-bold text-red-900 uppercase tracking-wide">
                SAFETY LOCK ENGAGED — DISPATCH & REFILL BLOCKED
              </span>
              <p className="text-red-700 mt-0.5">
                {cylinder.flag_reason || 'Cylinder is quarantined for suspected leak, valve defect, or structural hazard.'}
              </p>
            </div>
            {canInspect && (
              <button
                onClick={() => onOpenClearSafety(cylinder)}
                className="shrink-0 px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 rounded text-xs font-semibold hover:bg-emerald-50 transition-colors shadow-2xs"
              >
                Clear Safety Lock
              </button>
            )}
          </div>
        )}

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'timeline'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lifecycle Audit Trail ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'specs'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Specifications & Location
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'inspections'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inspections & Tests ({inspections.length})
            </button>
            <button
              onClick={() => setActiveTab('refills')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'refills'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Refill Batches ({refills.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canManageInventory && cylinder.status === 'empty_depot' && cylinder.is_safety_flagged === 0 && (
              <button
                onClick={() => onOpenRefill(cylinder)}
                className="px-2.5 py-1 bg-teal-700 text-white rounded text-xs font-medium hover:bg-teal-800 transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Flame className="w-3.5 h-3.5" /> Start Refill
              </button>
            )}

            {canInspect && (
              <button
                onClick={() => onOpenScheduleInsp(cylinder)}
                className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Wrench className="w-3.5 h-3.5" /> Schedule Test
              </button>
            )}

            {cylinder.is_safety_flagged === 0 && (
              <button
                onClick={() => onOpenSafetyFlag(cylinder)}
                className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1 shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Flag Unsafe
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: LIFECYCLE AUDIT TRAIL */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-700" />
                  Immutable Lifecycle History
                </h4>
                <span className="text-xs text-slate-500">
                  Total audited actions: <strong className="font-mono text-slate-700">{events.length}</strong>
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {events.map((evt) => (
                  <div key={evt.id} className="relative group">
                    {/* Event Node Marker */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-teal-600 flex items-center justify-center text-[10px] font-bold text-teal-800 shadow-2xs">
                      •
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 mb-2 leading-relaxed">{evt.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <strong className="text-slate-700">{evt.performed_by}</strong> ({evt.role})
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{evt.location}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SPECIFICATIONS & CURRENT LOCATION */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              {/* Technical Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Cylinder ID</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{cylinder.id}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Serial Number</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{cylinder.serial_number}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Barcode / RFID</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{cylinder.barcode}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Gas Type & Grade</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{cylinder.gas_type} ({cylinder.gas_grade})</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Water Capacity</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{cylinder.capacity_liters} Liters</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Working Pressure</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{cylinder.working_pressure_bar} Bar</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Tare Weight</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">{cylinder.tare_weight_kg} kg</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-medium">Last Periodic Inspection</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {cylinder.last_inspection_date || 'None on record'}
                  </div>
                </div>
                <div className={`p-3 rounded-lg border ${isOverdue ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-[11px] uppercase font-medium ${isOverdue ? 'text-amber-800' : 'text-slate-500'}`}>
                    Next Inspection Due
                  </span>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${isOverdue ? 'text-amber-900' : 'text-slate-900'}`}>
                    {cylinder.next_inspection_date} {isOverdue && '(OVERDUE)'}
                  </div>
                </div>
              </div>

              {/* Current Location & Customer */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-700" /> Location Staging
                </h4>
                <div className="text-sm font-semibold text-slate-900">{cylinder.current_location}</div>

                {currentCustomer && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Assigned Customer:</span>{' '}
                      <span className="font-semibold text-slate-900">{currentCustomer.company}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Contact:</span>{' '}
                      <span className="text-slate-800">{currentCustomer.name} ({currentCustomer.phone})</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Delivery Address:</span>{' '}
                      <span className="text-slate-800">{currentCustomer.delivery_address}, {currentCustomer.city}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INSPECTIONS & TESTS */}
          {activeTab === 'inspections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mandatory Tests & Periodic Inspections
                </h4>
                {canInspect && (
                  <button
                    onClick={() => onOpenScheduleInsp(cylinder)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    + Schedule New Inspection
                  </button>
                )}
              </div>

              {inspections.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                  No inspection records logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {inspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{insp.type}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              insp.test_result === 'Passed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : insp.test_result === 'Failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {insp.test_result}
                          </span>
                          {insp.leak_detected === 1 && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white">
                              LEAK CONFIRMED
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          Scheduled: {insp.scheduled_date}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600">{insp.issue_description}</p>
                      {insp.action_taken && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                          <strong>Action Taken:</strong> {insp.action_taken}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <span>Technician: <strong className="text-slate-700">{insp.technician_name}</strong></span>
                        {insp.certificate_number && (
                          <span>Cert #: <strong className="font-mono text-slate-800">{insp.certificate_number}</strong></span>
                        )}
                        <span>Next Due: <strong className="font-mono text-slate-800">{insp.next_due_date}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REFILL BATCHES */}
          {activeTab === 'refills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Refilling Batch Logs & Purity Tests
                </h4>
                {canManageInventory && cylinder.status === 'empty_depot' && cylinder.is_safety_flagged === 0 && (
                  <button
                    onClick={() => onOpenRefill(cylinder)}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                  >
                    + Refill This Cylinder
                  </button>
                )}
              </div>

              {refills.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                  No refill batch records logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-medium">Batch Number</th>
                        <th className="px-3 py-2 font-medium">Refill Date</th>
                        <th className="px-3 py-2 font-medium">Pressure</th>
                        <th className="px-3 py-2 font-medium">Purity %</th>
                        <th className="px-3 py-2 font-medium">Result</th>
                        <th className="px-3 py-2 font-medium">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {refills.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-bold text-slate-900">{r.batch_number}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(r.refill_date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-slate-700">{r.fill_pressure_bar} bar</td>
                          <td className="px-3 py-2 text-slate-700">{r.purity_percentage}%</td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-sans font-semibold ${
                                r.result === 'Passed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {r.result}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-sans text-slate-600">{r.operator_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
