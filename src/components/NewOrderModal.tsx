import React, { useState } from 'react';
import { Customer, Cylinder } from '../types';
import { api } from '../services/api';
import { X, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface NewOrderModalProps {
  customers: Customer[];
  availableCylinders: Cylinder[];
  onClose: () => void;
  onSuccess: () => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  customers,
  availableCylinders,
  onClose,
  onSuccess
}) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleId, setVehicleId] = useState('Truck-02 (Heavy Cargo)');
  const [staffName, setStaffName] = useState('Dave Rodriguez');
  const [notes, setNotes] = useState('');
  const [selectedCylinders, setSelectedCylinders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const toggleCylinder = (id: string) => {
    if (selectedCylinders.includes(id)) {
      setSelectedCylinders(selectedCylinders.filter((c) => c !== id));
    } else {
      setSelectedCylinders([...selectedCylinders, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || selectedCylinders.length === 0) {
      setError('Please select a customer and at least one cylinder');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createOrder({
        customer_id: customerId,
        scheduled_date: scheduledDate,
        vehicle_id: vehicleId,
        assigned_staff_name: staffName,
        notes,
        cylinder_ids: selectedCylinders
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create delivery order');
    } finally {
      setLoading(false);
    }
  };

  // Cylinders eligible for delivery (must be filled_ready, not safety flagged, not overdue)
  const readyCylinders = availableCylinders.filter(
    (c) => c.status === 'filled_ready' && c.is_safety_flagged === 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">Create Customer Delivery Order</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Account *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Delivery Date *</label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {selectedCustomer && (
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">Destination:</span> {selectedCustomer.delivery_address},{' '}
              {selectedCustomer.city} · <span className="font-semibold text-slate-800">Contact:</span>{' '}
              {selectedCustomer.phone}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Logistics Vehicle *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              >
                <option value="Truck-01 (Standard Freight)">Truck-01 (Standard Freight)</option>
                <option value="Truck-02 (Heavy Cargo)">Truck-02 (Heavy Cargo)</option>
                <option value="Truck-03 (Flatbed Cryo)">Truck-03 (Flatbed Cryo)</option>
                <option value="Van-04 (Express Medical)">Van-04 (Express Medical)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Delivery Driver *</label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Delivery Dispatch Notes</label>
            <input
              type="text"
              placeholder="e.g. Loading dock requires hardhat. Call facility manager on arrival."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
            />
          </div>

          {/* Cylinder Assignment Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">
                Select Filled Cylinders to Dispatch ({selectedCylinders.length} selected) *
              </label>
              <span className="text-[11px] text-teal-700 font-medium">
                {readyCylinders.length} ready in depot
              </span>
            </div>

            {readyCylinders.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-center text-amber-800">
                No filled & certified cylinders currently available in depot inventory. Complete a refill batch first.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {readyCylinders.map((cyl) => {
                  const isChecked = selectedCylinders.includes(cyl.id);
                  return (
                    <label
                      key={cyl.id}
                      className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                        isChecked ? 'bg-teal-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCylinder(cyl.id)}
                          className="w-4 h-4 text-teal-700 rounded border-slate-300"
                        />
                        <div>
                          <div className="font-mono font-bold text-slate-900">{cyl.id}</div>
                          <div className="text-[11px] text-slate-500">
                            {cyl.gas_type} ({cyl.gas_grade}) · {cyl.capacity_liters}L @ {cyl.working_pressure_bar} Bar
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="font-mono text-slate-600">{cyl.current_location}</span>
                        <div className="text-slate-400">Batch: {cyl.last_refill_batch || 'Verified'}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
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
              disabled={loading || selectedCylinders.length === 0}
              className="px-4 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Creating Order...' : `Create Order (${selectedCylinders.length} Cylinders)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
