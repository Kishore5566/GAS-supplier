import React, { useState } from 'react';
import { Cylinder } from '../types';
import { api } from '../services/api';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ClearSafetyModalProps {
  cylinder: Cylinder;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClearSafetyModal: React.FC<ClearSafetyModalProps> = ({ cylinder, onClose, onSuccess }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [newStatus, setNewStatus] = useState('empty_depot');
  const [newLocation, setNewLocation] = useState('Central Depot - Bay A1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      setError('Technician sign-off notes are required to clear safety lock.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.clearSafety(cylinder.id, resolutionNotes.trim(), newStatus, newLocation);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clear safety lock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-emerald-200 overflow-hidden">
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm tracking-wide">CLEAR SAFETY LOCK</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 space-y-1">
            <div className="font-semibold">Target Asset: {cylinder.id}</div>
            <p className="text-[11px] text-emerald-800">
              Current Flag Reason: <em>{cylinder.flag_reason || 'Quarantined'}</em>
            </p>
          </div>

          {error && (
            <div className="p-2.5 bg-red-100 text-red-900 rounded text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Technician Inspection & Resolution Sign-Off *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Neck valve gland repacked and torqued. Passed 24-hr soak hold test with zero helium escape."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Return Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-emerald-600 focus:outline-none"
                >
                  <option value="empty_depot">Empty (Ready for Refill)</option>
                  <option value="filled_ready">Filled & Ready (Delivery Staging)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Depot Staging Location *</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-emerald-600 focus:outline-none font-mono"
                />
              </div>
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
              className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-md hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Certifying...' : 'Certify & Release Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
