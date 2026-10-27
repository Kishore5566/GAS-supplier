import React, { useState, useEffect } from 'react';
import { api, exportToCSV } from '../services/api';
import {
  FileText,
  Download,
  Calendar,
  Layers,
  Flame,
  Wrench,
  Truck,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [data, setData] = useState<{
    inventoryReport: any[];
    refillReport: any[];
    complianceReport: any[];
    deliveryReport: any[];
    customerTurnaround: any[];
  } | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'inventory' | 'compliance' | 'refill' | 'deliveries'>('inventory');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getReportsSummary();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCurrent = () => {
    if (!data) return;
    if (activeReportTab === 'inventory') {
      exportToCSV('inventory_distribution_report', data.inventoryReport);
    } else if (activeReportTab === 'compliance') {
      exportToCSV('testing_and_compliance_report', data.complianceReport);
    } else if (activeReportTab === 'refill') {
      exportToCSV('refill_efficiency_report', data.refillReport);
    } else if (activeReportTab === 'deliveries') {
      exportToCSV('customer_fleet_turnaround_report', data.customerTurnaround);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center text-xs text-slate-500">
        <div className="animate-spin w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-2" />
        Generating operations intelligence reports...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Operations & Compliance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready reports for inventory utilization, delivery turnarounds, refill metrics, and inspection compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCurrent}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Active Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Category Switcher */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveReportTab('inventory')}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeReportTab === 'inventory'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Fleet Inventory Distribution</span>
        </button>
        <button
          onClick={() => setActiveReportTab('compliance')}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeReportTab === 'compliance'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Testing & Compliance Audits</span>
        </button>
        <button
          onClick={() => setActiveReportTab('refill')}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeReportTab === 'refill'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Refill Batch Efficiency</span>
        </button>
        <button
          onClick={() => setActiveReportTab('deliveries')}
          className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeReportTab === 'deliveries'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Customer Holding Balances</span>
        </button>
      </div>

      {/* 1. INVENTORY REPORT */}
      {activeReportTab === 'inventory' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-2">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Fleet Breakdown by Gas Type, Grade & Capacity
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Gas Type</th>
                  <th className="px-4 py-2.5 font-medium">Grade</th>
                  <th className="px-4 py-2.5 font-medium text-right">Capacity (L)</th>
                  <th className="px-4 py-2.5 font-medium text-right">Filled</th>
                  <th className="px-4 py-2.5 font-medium text-right">Empty</th>
                  <th className="px-4 py-2.5 font-medium text-right">In Refill</th>
                  <th className="px-4 py-2.5 font-medium text-right">With Customer</th>
                  <th className="px-4 py-2.5 font-medium text-right">Safety Locked</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Fleet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data?.inventoryReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-sans font-semibold text-slate-900">{row.gas_type}</td>
                    <td className="px-4 py-3 font-sans text-slate-600">{row.gas_grade}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.capacity_liters} L</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{row.filled}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.empty}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{row.in_refill}</td>
                    <td className="px-4 py-3 text-right text-indigo-600">{row.with_customer}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{row.safety_flagged}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. COMPLIANCE & SAFETY REPORT */}
      {activeReportTab === 'compliance' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-2">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Statutory Periodic Inspection Pass/Fail & Leak Incidence
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Inspection Test Procedure</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Inspected</th>
                  <th className="px-4 py-2.5 font-medium text-right">Passed</th>
                  <th className="px-4 py-2.5 font-medium text-right">Failed</th>
                  <th className="px-4 py-2.5 font-medium text-right">Leaks Detected</th>
                  <th className="px-4 py-2.5 font-medium text-center">Compliance Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data?.complianceReport.map((row, idx) => {
                  const rate = row.total_inspected > 0 ? Math.round((row.passed / row.total_inspected) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-sans font-semibold text-slate-900">{row.type}</td>
                      <td className="px-4 py-3 text-right text-slate-800">{row.total_inspected}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-bold">{row.passed}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold">{row.failed}</td>
                      <td className="px-4 py-3 text-right text-red-700 font-bold">{row.leaks_detected}</td>
                      <td className="px-4 py-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {rate}% Pass Rate
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. REFILL BATCH REPORT */}
      {activeReportTab === 'refill' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-2">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Gas Refilling Performance & Average Purity
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Gas Classification</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Refills</th>
                  <th className="px-4 py-2.5 font-medium text-right">Passed Batches</th>
                  <th className="px-4 py-2.5 font-medium text-right">Failed Batches</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avg Purity %</th>
                  <th className="px-4 py-2.5 font-medium text-right">Avg Fill Pressure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data?.refillReport.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-sans font-semibold text-slate-900">{row.gas_type}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{row.total_refills}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">{row.passed_refills}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{row.failed_refills}</td>
                    <td className="px-4 py-3 text-right text-teal-800 font-bold">{row.avg_purity}%</td>
                    <td className="px-4 py-3 text-right text-slate-800">{row.avg_pressure} Bar</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CUSTOMER FLEET HOLDING REPORT */}
      {activeReportTab === 'deliveries' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-2">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Customer Cylinder Holding Balances & Facility Locations
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Customer Facility</th>
                  <th className="px-4 py-2.5 font-medium">Sector</th>
                  <th className="px-4 py-2.5 font-medium">City / District</th>
                  <th className="px-4 py-2.5 font-medium text-right">Active Cylinder Holdings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data?.customerTurnaround.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-sans font-semibold text-slate-900">{row.company}</td>
                    <td className="px-4 py-3 font-sans text-slate-600">{row.category}</td>
                    <td className="px-4 py-3 font-sans text-slate-600">{row.city}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      {row.active_cylinders} cylinders
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
