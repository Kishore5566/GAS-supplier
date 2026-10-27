import React, { useState, useEffect } from 'react';
import { Cylinder, GasType, CylinderStatus } from '../types';
import { api, exportToCSV } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  Filter,
  Plus,
  QrCode,
  Download,
  AlertTriangle,
  Flame,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  Eye,
  RefreshCw
} from 'lucide-react';

interface CylindersViewProps {
  onSelectCylinder: (id: string) => void;
  onOpenBarcode: (cylinder?: Cylinder) => void;
  onOpenNewCylinder: () => void;
  onOpenSafetyFlag: (cylinder: Cylinder) => void;
  onOpenClearSafety: (cylinder: Cylinder) => void;
  onOpenRefill: (cylinder: Cylinder) => void;
  onOpenScheduleInsp: (cylinder: Cylinder) => void;
}

export const CylindersView: React.FC<CylindersViewProps> = ({
  onSelectCylinder,
  onOpenBarcode,
  onOpenNewCylinder,
  onOpenSafetyFlag,
  onOpenClearSafety,
  onOpenRefill,
  onOpenScheduleInsp
}) => {
  const { canManageInventory, canInspect } = useAuth();
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gasTypeFilter, setGasTypeFilter] = useState('all');
  const [inspectionFilter, setInspectionFilter] = useState('all');

  const fetchCylinders = async () => {
    setLoading(true);
    try {
      const res = await api.getCylinders({
        search: searchTerm,
        status: statusFilter,
        gas_type: gasTypeFilter,
        inspection_filter: inspectionFilter
      });
      setCylinders(res.cylinders);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cylinders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCylinders();
  }, [statusFilter, gasTypeFilter, inspectionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCylinders();
  };

  const handleExportCSV = () => {
    exportToCSV('cylinders_inventory_export', cylinders);
  };

  const gasTypes: GasType[] = [
    'Oxygen',
    'Nitrogen',
    'Argon',
    'Acetylene',
    'Carbon Dioxide',
    'Helium',
    'LPG',
    'Hydrogen'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Cylinder Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Asset tracking, barcoding, capacity specifications, and real-time status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCylinders}
            title="Refresh"
            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          {canManageInventory && (
            <button
              onClick={onOpenNewCylinder}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Cylinder</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, Serial #, Barcode, or Location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:border-teal-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md bg-white text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="filled_ready">Filled & Ready</option>
            <option value="empty_depot">Empty / Depot</option>
            <option value="in_refill">In Refill</option>
            <option value="in_transit">In Transit</option>
            <option value="with_customer">With Customer</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="flagged_safety">Safety Flagged (Locked)</option>
          </select>

          {/* Gas Type Filter */}
          <select
            value={gasTypeFilter}
            onChange={(e) => setGasTypeFilter(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md bg-white text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Gas Types</option>
            {gasTypes.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Inspection Filter */}
          <select
            value={inspectionFilter}
            onChange={(e) => setInspectionFilter(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded-md bg-white text-slate-700 focus:border-teal-600 focus:outline-none"
          >
            <option value="all">All Inspection Dates</option>
            <option value="overdue">Overdue for Testing</option>
            <option value="due_30_days">Due Within 30 Days</option>
          </select>

          {(statusFilter !== 'all' || gasTypeFilter !== 'all' || inspectionFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setGasTypeFilter('all');
                setInspectionFilter('all');
                setSearchTerm('');
              }}
              className="text-teal-700 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-slate-500 font-mono text-[11px]">
            Showing <strong>{cylinders.length}</strong> cylinders
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="animate-spin w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-2" />
            Loading cylinders database...
          </div>
        ) : cylinders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <p>No cylinders match the selected filter criteria.</p>
            {canManageInventory && (
              <button
                onClick={onOpenNewCylinder}
                className="px-3 py-1.5 bg-teal-700 text-white rounded font-medium hover:bg-teal-800"
              >
                + Register First Cylinder
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Cylinder ID</th>
                  <th className="px-4 py-2.5 font-medium">Serial & Barcode</th>
                  <th className="px-4 py-2.5 font-medium">Gas & Grade</th>
                  <th className="px-4 py-2.5 font-medium text-right">Capacity / WP</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Current Location</th>
                  <th className="px-4 py-2.5 font-medium">Next Due</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {cylinders.map((cyl) => {
                  const isOverdue = new Date(cyl.next_inspection_date) < new Date();
                  return (
                    <tr
                      key={cyl.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        cyl.is_safety_flagged === 1 ? 'bg-red-50/40' : ''
                      }`}
                    >
                      {/* ID */}
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => onSelectCylinder(cyl.id)}
                          className="hover:text-teal-700 hover:underline flex items-center gap-1.5"
                        >
                          <span>{cyl.id}</span>
                        </button>
                      </td>

                      {/* Serial & Barcode */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <div className="text-slate-800">{cyl.serial_number}</div>
                        <div className="text-[10px] text-slate-400">{cyl.barcode}</div>
                      </td>

                      {/* Gas */}
                      <td className="px-4 py-3 font-sans whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{cyl.gas_type}</div>
                        <div className="text-[10px] text-slate-500">{cyl.gas_grade}</div>
                      </td>

                      {/* Capacity & Pressure */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="text-slate-800">{cyl.capacity_liters} L</div>
                        <div className="text-[10px] text-slate-400">{cyl.working_pressure_bar} Bar</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 font-sans whitespace-nowrap">
                        <StatusBadge status={cyl.status} isFlagged={cyl.is_safety_flagged === 1} />
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 font-sans text-slate-700 text-[11px] max-w-[200px] truncate" title={cyl.current_location}>
                        {cyl.current_location}
                      </td>

                      {/* Next Inspection */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[11px] ${isOverdue ? 'font-bold text-red-700' : 'text-slate-600'}`}>
                          {cyl.next_inspection_date}
                        </span>
                        {isOverdue && (
                          <div className="text-[10px] font-sans text-red-600 font-semibold">OVERDUE</div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right font-sans whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectCylinder(cyl.id)}
                            title="Inspect History"
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenBarcode(cyl)}
                            title="View Barcode / QR Tag"
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Quick Refill trigger */}
                          {canManageInventory && cyl.status === 'empty_depot' && cyl.is_safety_flagged === 0 && (
                            <button
                              onClick={() => onOpenRefill(cyl)}
                              title="Refill Cylinder"
                              className="p-1 rounded text-teal-700 hover:text-teal-900 hover:bg-teal-50"
                            >
                              <Flame className="w-4 h-4" />
                            </button>
                          )}

                          {/* Inspection trigger */}
                          {canInspect && (
                            <button
                              onClick={() => onOpenScheduleInsp(cyl)}
                              title="Schedule / Record Inspection"
                              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                              <Wrench className="w-4 h-4" />
                            </button>
                          )}

                          {/* Safety Flag / Clear buttons */}
                          {cyl.is_safety_flagged === 1 ? (
                            canInspect && (
                              <button
                                onClick={() => onOpenClearSafety(cyl)}
                                title="Clear Safety Lock"
                                className="p-1 rounded text-emerald-700 hover:bg-emerald-50"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => onOpenSafetyFlag(cyl)}
                              title="Flag Unsafe"
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
