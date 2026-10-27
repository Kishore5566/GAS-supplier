import React, { useState } from 'react';
import { Customer, Cylinder } from '../types';
import { api } from '../services/api';
import { X, RotateCcw, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ReturnCylinderModalProps {
  customers: Customer[];
  activeWithCustomerCylinders: Cylinder[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ReturnCylinderModal: React.FC<ReturnCylinderModalProps> = ({
  customers,
  activeWithCustomerCylinders,
  onClose,
  onSuccess
}) => {
  const [selectedCylId, setSelectedCylId] = useState(activeWithCustomerCylinders[0]?.id || '');
  const [returnCondition, setReturnCondition] = useState<string>('good_empty');
  const [tareWeightCheck, setTareWeightCheck] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCylinder = activeWithCustomerCylinders.find((c) => c.id === selectedCylId);
  const assignedCustomer = customers.find((cust) => cust.id === activeCylinder?.current_customer_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCylId) {
      setError('Please select a cylinder to return');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.returnCylinder({
        cylinder_id: selectedCylId,
        customer_id: activeCylinder?.current_customer_id || undefined,
        order_id: activeCylinder?.current_order_id || undefined,
        return_condition: returnCondition,
        notes,
        tare_weight_check: tareWeightCheck ? parseFloat(tareWeightCheck) : undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record cylinder return');
    } finally {
      setLoading(false);
    }
  };

  const isDefective = returnCondition !== 'good_empty';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">Record Customer Cylinder Return</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Cylinder Being Returned *</label>
            <select
              value={selectedCylId}
              onChange={(e) => setSelectedCylId(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
            >
              {activeWithCustomerCylinders.length === 0 ? (
                <option value="">No cylinders currently logged with customers</option>
              ) : (
                activeWithCustomerCylinders.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.gas_type} ({c.current_location})
                  </option>
                ))
              )}
            </select>
          </div>

          {activeCylinder && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-[11px]">
              <div>
                <span className="text-slate-500">Customer On Record:</span>{' '}
                <strong className="text-slate-800">{assignedCustomer ? assignedCustomer.company : activeCylinder.current_location}</strong>
              </div>
              <div className="flex gap-4">
                <span>Gas: <strong className="text-slate-700">{activeCylinder.gas_type}</strong></span>
                <span>Capacity: <strong className="font-mono text-slate-700">{activeCylinder.capacity_liters}L</strong></span>
                <span>Original Tare: <strong className="font-mono text-slate-700">{activeCylinder.tare_weight_kg} kg</strong></span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Physical Return Condition Check *</label>
            <select
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none font-medium"
            >
              <option value="good_empty">Nominal / Empty (Ready for Refill Cleaning)</option>
              <option value="valve_issue">Valve Handle Stiff or Handwheel Damage</option>
              <option value="damaged">Physical Dent, Deep Scratch, or Foot Ring Damage</option>
              <option value="suspected_leak">Suspected Odor / Acoustic Leak Hiss</option>
            </select>
          </div>

          {isDefective && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                Automatic Safety Quarantine Alert
              </div>
              <p className="text-[11px]">
                Because this cylinder has a reported defect, it will be automatically <strong>flagged unsafe</strong>, staged in the quarantine bay, and scheduled for urgent ultrasonic & hydrostatic inspection.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tare Weight Check (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder={activeCylinder ? `${activeCylinder.tare_weight_kg}` : 'e.g. 52.5'}
                value={tareWeightCheck}
                onChange={(e) => setTareWeightCheck(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Inspection Notes</label>
              <input
                type="text"
                placeholder="e.g. Returned with cap on. Gasket nominal."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCylId}
              className="px-4 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Recording Return...' : 'Accept Return into Depot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
