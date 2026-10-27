import React, { useState } from 'react';
import { Cylinder } from '../types';
import { api } from '../services/api';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';

interface SafetyFlagModalProps {
  cylinder: Cylinder;
  onClose: () => void;
  onSuccess: () => void;
}

export const SafetyFlagModal: React.FC<SafetyFlagModalProps> = ({ cylinder, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [hazardType, setHazardType] = useState('Micro-leak detected');
  const [location, setLocation] = useState('Quarantine Cell #1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific hazard description.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fullReason = `[${hazardType}] ${reason.trim()}`;
      await api.flagSafety(cylinder.id, fullReason, location);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to engage safety flag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-red-200 overflow-hidden">
        <div className="px-5 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm tracking-wide">ENGAGE CYLINDER SAFETY LOCK</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-red-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              Target Asset: {cylinder.id} ({cylinder.gas_type})
            </div>
            <p>
              Flagging this cylinder will immediately <strong>quarantine and lock it</strong> from customer delivery orders, dispatch schedules, and refilling manifolds until an authorized technician certifies clearance.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-900 rounded text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hazard Classification *</label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-red-600 focus:outline-none"
              >
                <option value="Micro-leak detected">Micro-leak detected (Sniffer/Bubble test)</option>
                <option value="Valve thread defect">Valve / Neck Thread Damage</option>
                <option value="Pressure seal blowout">Pressure Relief Device (PRD) / Seal Compromised</option>
                <option value="Corrosion / Wall Pitting">Severe Corrosion / Wall Gouge</option>
                <option value="Customer Return Hazard">Reported Defect on Customer Return</option>
                <option value="Other Safety Defect">Other Structural Hazard</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hazard Description & Telemetry *</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Ultrasonic leak test showed 35 ppm helium escape at valve neck junction."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-red-600 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quarantine Staging Location *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-red-600 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {loading ? 'Locking Asset...' : 'Confirm Safety Lock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
