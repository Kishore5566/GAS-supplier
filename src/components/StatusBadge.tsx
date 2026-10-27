import React from 'react';
import { CylinderStatus } from '../types';
import { AlertTriangle, CheckCircle2, Clock, Truck, ShieldAlert, Archive, Wrench, Package } from 'lucide-react';

interface StatusBadgeProps {
  status: CylinderStatus | string;
  isFlagged?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isFlagged, className = '' }) => {
  if (isFlagged || status === 'flagged_leaking') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-900 border border-red-300 ${className}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-red-700 shrink-0" />
        SAFETY LOCKED
      </span>
    );
  }

  switch (status) {
    case 'filled_ready':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          Filled & Ready
        </span>
      );
    case 'empty_depot':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <Package className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          Empty / Depot
        </span>
      );
    case 'in_refill':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          In Refill Station
        </span>
      );
    case 'in_transit':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 ${className}`}>
          <Truck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
          In Transit
        </span>
      );
    case 'with_customer':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 ${className}`}>
          <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          With Customer
        </span>
      );
    case 'under_maintenance':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}>
          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Maintenance / Test
        </span>
      );
    case 'archived':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-300 ${className}`}>
          <Archive className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          Decommissioned
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  switch (priority) {
    case 'Critical':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
          <AlertTriangle className="w-3 h-3" /> Critical
        </span>
      );
    case 'High':
      return (
        <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          High
        </span>
      );
    case 'Medium':
      return (
        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          Medium
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-xs font-normal text-slate-500 px-2 py-0.5 rounded">
          {priority}
        </span>
      );
  }
};
