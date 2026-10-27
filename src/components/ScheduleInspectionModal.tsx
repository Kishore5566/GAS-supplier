import React, { useState } from 'react';
import { Cylinder, InspectionRecord } from '../types';
import { api } from '../services/api';
import { X, Wrench, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ScheduleInspectionModalProps {
  cylinder?: Cylinder | null;
  inspectionToRecord?: InspectionRecord | null;
  cylindersList?: Cylinder[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ScheduleInspectionModal: React.FC<ScheduleInspectionModalProps> = ({
  cylinder,
  inspectionToRecord,
  cylindersList = [],
  onClose,
  onSuccess
}) => {
  const isRecording = Boolean(inspectionToRecord);

  // Schedule fields
  const [selectedCylId, setSelectedCylId] = useState(
    cylinder?.id || inspectionToRecord?.cylinder_id || (cylindersList[0]?.id || '')
  );
  const [type, setType] = useState('Periodic Hydrostatic Test');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueDescription, setIssueDescription] = useState('');

  // Record completion fields
  const [testResult, setTestResult] = useState<'Passed' | 'Failed' | 'Repaired' | 'Decommissioned'>('Passed');
  const [certNumber, setCertNumber] = useState(`CERT-HYD-2026-${Date.now().toString().slice(-4)}`);
  const [leakDetected, setLeakDetected] = useState(false);
  const [actionTaken, setActionTaken] = useState('');
  const [nextDueDate, setNextDueDate] = useState(
    new Date(Date.now() + 5 * 365 * 86400000).toISOString().split('T')[0]
  );
  const [returnStatus, setReturnStatus] = useState('empty_depot');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCylId || !issueDescription.trim()) {
      setError('Cylinder ID and description are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.scheduleInspection({
        cylinder_id: selectedCylId,
        type,
        priority,
        scheduled_date: scheduledDate,
        issue_description: issueDescription.trim()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule inspection');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionToRecord) return;
    setLoading(true);
    setError(null);
    try {
      await api.recordInspection(inspectionToRecord.id, {
        test_result: testResult,
        certificate_number: certNumber,
        leak_detected: leakDetected,
        action_taken: actionTaken,
        next_due_date: nextDueDate,
        return_status: returnStatus
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record inspection result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">
              {isRecording ? 'Record Technical Inspection & Leak Test Result' : 'Schedule Cylinder Inspection & Testing'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRecording ? (
            <form onSubmit={handleRecordSubmit} className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900 text-sm">
                  {inspectionToRecord?.cylinder_id} — {inspectionToRecord?.type}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Scheduled for: {inspectionToRecord?.scheduled_date} · Priority: {inspectionToRecord?.priority}
                </div>
                <p className="text-slate-600 mt-1 italic">"{inspectionToRecord?.issue_description}"</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Test Result *</label>
                  <select
                    value={testResult}
                    onChange={(e) => setTestResult(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-semibold focus:border-teal-600 focus:outline-none"
                  >
                    <option value="Passed">Passed (Meets Safety Specs)</option>
                    <option value="Failed">Failed (Defect Confirmed)</option>
                    <option value="Repaired">Repaired & Re-tested</option>
                    <option value="Decommissioned">Decommissioned (Condemn to scrap)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Inspection Certificate #</label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Leak detection toggle */}
              <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Leak Detected during testing?</span>
                  <p className="text-[11px] text-slate-500">
                    If positive, cylinder will be automatically flagged unsafe and locked from rotation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={leakDetected}
                  onChange={(e) => setLeakDetected(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Findings & Action Taken *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Wall thickness passed (6.2mm). Valve disassembled, PTFE packing replaced, torqued to spec."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Inspection Due Date *</label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staging If Passed *</label>
                  <select
                    value={returnStatus}
                    onChange={(e) => setReturnStatus(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                  >
                    <option value="empty_depot">Empty (Ready for Refill)</option>
                    <option value="filled_ready">Filled (Ready for Delivery)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {loading ? 'Submitting...' : 'Record Test Result'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              {!cylinder && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Cylinder Asset *</label>
                  <select
                    value={selectedCylId}
                    onChange={(e) => setSelectedCylId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  >
                    {cylindersList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} ({c.gas_type}, status: {c.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspection / Test Procedure *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                >
                  <option value="Periodic Hydrostatic Test">Periodic Hydrostatic Volumetric Expansion Test (5-Yr/10-Yr)</option>
                  <option value="Ultrasonic Leak Check">Ultrasonic Sniffer & Neck Leak Check</option>
                  <option value="Valve Overhaul">Valve Disassembly & Stem Replacement</option>
                  <option value="Visual & Wall Thickness">Visual Inspection & Ultrasonic Wall Thickness Gauge</option>
                  <option value="Tare Weight Verification">Tare Weight Verification & Residue Cleanout</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                  >
                    <option value="Low">Low (Routine)</option>
                    <option value="Medium">Medium (Scheduled)</option>
                    <option value="High">High (Impending Expiry)</option>
                    <option value="Critical">Critical (Immediate Quarantine)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Description & Testing Mandate *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Due for statutory 5-year water jacket test. Verify volumetric expansion ratio is under 10%."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 disabled:opacity-50"
                >
                  {loading ? 'Scheduling...' : 'Schedule Inspection'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
