import React, { useState } from 'react';
import { GasType, GasGrade } from '../types';
import { api } from '../services/api';
import { X, Plus, AlertCircle } from 'lucide-react';

interface NewCylinderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const GAS_TYPES: GasType[] = [
  'Oxygen',
  'Nitrogen',
  'Argon',
  'Acetylene',
  'Carbon Dioxide',
  'Helium',
  'LPG',
  'Hydrogen'
];

const GAS_GRADES: GasGrade[] = [
  'Medical',
  'Industrial',
  'Food Grade',
  'Ultra High Purity'
];

export const NewCylinderModal: React.FC<NewCylinderModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    id: `CYL-${Math.floor(1000 + Math.random() * 9000)}`,
    serial_number: `SN-${Date.now().toString().slice(-6)}`,
    barcode: '',
    gas_type: 'Oxygen' as GasType,
    gas_grade: 'Medical' as GasGrade,
    capacity_liters: 50,
    working_pressure_bar: 200,
    tare_weight_kg: 52.5,
    current_location: 'Central Depot - Bay A1',
    next_inspection_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createCylinder(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create cylinder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">Register New Cylinder Asset</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Cylinder Asset ID *</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Manufacturer Serial # *</label>
              <input
                type="text"
                required
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Gas Type *</label>
              <select
                value={formData.gas_type}
                onChange={(e) => setFormData({ ...formData, gas_type: e.target.value as GasType })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              >
                {GAS_TYPES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Gas Grade *</label>
              <select
                value={formData.gas_grade}
                onChange={(e) => setFormData({ ...formData, gas_grade: e.target.value as GasGrade })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              >
                {GAS_GRADES.map((gr) => (
                  <option key={gr} value={gr}>{gr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Capacity (Liters) *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.capacity_liters}
                onChange={(e) => setFormData({ ...formData, capacity_liters: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Pressure (Bar) *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.working_pressure_bar}
                onChange={(e) => setFormData({ ...formData, working_pressure_bar: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tare Wt. (kg) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.tare_weight_kg}
                onChange={(e) => setFormData({ ...formData, tare_weight_kg: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Depot Storage Location *</label>
              <input
                type="text"
                required
                value={formData.current_location}
                onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Next Inspection Due *</label>
              <input
                type="date"
                required
                value={formData.next_inspection_date}
                onChange={(e) => setFormData({ ...formData, next_inspection_date: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono focus:border-teal-600 focus:outline-none"
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
              className="px-4 py-1.5 bg-teal-700 text-white text-xs font-medium rounded-md hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Cylinder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
