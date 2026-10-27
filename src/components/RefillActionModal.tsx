import React, { useState } from 'react';
import { Cylinder } from '../types';
import { api } from '../services/api';
import { X, Flame, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RefillActionModalProps {
  cylinder?: Cylinder | null;
  pendingCylinders?: Cylinder[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RefillActionModal: React.FC<RefillActionModalProps> = ({
  cylinder,
  pendingCylinders = [],
  onClose,
  onSuccess
}) => {
  const [selectedCylId, setSelectedCylId] = useState<string>(cylinder?.id || (pendingCylinders[0]?.id || ''));
  const [step, setStep] = useState<'start' | 'complete'>('complete');
  const [batchNumber, setBatchNumber] = useState(`BAT-2026-${Date.now().toString().slice(-4)}`);
  const [fillPressure, setFillPressure] = useState<number>(cylinder?.working_pressure_bar || 200);
  const [purity, setPurity] = useState<number>(99.9);
  const [result, setResult] = useState<'Passed' | 'Failed'>('Passed');
  const [failureReason, setFailureReason] = useState('');
  const [destinationBay, setDestinationBay] = useState('Central Depot - Bay A1');
  const [station, setStation] = useState('Refill Station #1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCylinder = cylinder || pendingCylinders.find((c) => c.id === selectedCylId);

  const handleStartRefill = async () => {
    if (!selectedCylId) {
      setError('Please select a cylinder');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.startRefill(selectedCylId, station);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start refill');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCylId) {
      setError('Please select a cylinder');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.completeRefill({
        cylinder_id: selectedCylId,
        batch_number: batchNumber,
        fill_pressure_bar: fillPressure,
        purity_percentage: purity,
        result,
        failure_reason: result === 'Failed' ? failureReason : undefined,
        destination_bay: destinationBay
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete refill batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">Refilling Cycle Operations</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* If no cylinder passed in directly, show select */}
          {!cylinder && (
            <div>
              <label className="block font-medium text-slate-700 mb-1">Select Cylinder to Process *</label>
              <select
                value={selectedCylId}
                onChange={(e) => setSelectedCylId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              >
                {pendingCylinders.length === 0 ? (
                  <option value="">No pending cylinders in depot</option>
                ) : (
                  pendingCylinders.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.gas_type} ({c.capacity_liters}L, status: {c.status})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {activeCylinder && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Asset:</span>{' '}
                <strong className="font-mono text-slate-800">{activeCylinder.id}</strong>
              </div>
              <div>
                <span className="text-slate-500">Gas:</span>{' '}
                <strong className="text-slate-800">{activeCylinder.gas_type} ({activeCylinder.gas_grade})</strong>
              </div>
              <div>
                <span className="text-slate-500">Rated WP:</span>{' '}
                <strong className="font-mono text-slate-800">{activeCylinder.working_pressure_bar} Bar</strong>
              </div>
              <div>
                <span className="text-slate-500">Next Insp:</span>{' '}
                <strong className="font-mono text-slate-800">{activeCylinder.next_inspection_date}</strong>
              </div>
            </div>
          )}

          {/* Action Choice Tabs */}
          <div className="flex border-b border-slate-200 pb-1 gap-2">
            <button
              type="button"
              onClick={() => setStep('complete')}
              className={`pb-1.5 px-3 font-semibold border-b-2 transition-colors ${
                step === 'complete'
                  ? 'border-teal-700 text-teal-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Log & Certify Refill Batch
            </button>
            <button
              type="button"
              onClick={() => setStep('start')}
              className={`pb-1.5 px-3 font-semibold border-b-2 transition-colors ${
                step === 'start'
                  ? 'border-teal-700 text-teal-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Stage to Refill Manifold
            </button>
          </div>

          {step === 'start' ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Manifold Station Bay *</label>
                <select
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                >
                  <option value="Refill Station #1 - Medical High Pressure">Refill Station #1 - Medical High Pressure</option>
                  <option value="Refill Station #2 - Industrial Cryogenic Evaporator">Refill Station #2 - Industrial Cryogenic Evaporator</option>
                  <option value="Refill Station #3 - Porous Mass Manifold">Refill Station #3 - Porous Mass Manifold</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartRefill}
                  disabled={loading || !selectedCylId}
                  className="px-4 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 disabled:opacity-50"
                >
                  {loading ? 'Queuing...' : 'Move to Manifold'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCompleteRefill} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Batch Code *</label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fill Pressure (Bar) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={fillPressure}
                    onChange={(e) => setFillPressure(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tested Purity (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    max="100"
                    required
                    value={purity}
                    onChange={(e) => setPurity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fill Result *</label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="Passed">Passed - Ready For Delivery</option>
                    <option value="Failed">Failed - Pressure/Purity Anomaly</option>
                  </select>
                </div>
              </div>

              {result === 'Passed' ? (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Destination Depot Bay *</label>
                  <input
                    type="text"
                    required
                    value={destinationBay}
                    onChange={(e) => setDestinationBay(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-red-700 mb-1">Failure Reason & Anomaly *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Soak hold failed. Pressure dropped by 8 bar in 15 minutes."
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full px-3 py-1.5 border border-red-300 rounded-md focus:border-red-600 focus:outline-none text-red-900"
                  />
                </div>
              )}

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
                  disabled={loading || !selectedCylId}
                  className="px-4 py-1.5 bg-teal-700 text-white font-medium rounded-md hover:bg-teal-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {loading ? 'Logging Refill...' : 'Record Batch & Update Asset'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
