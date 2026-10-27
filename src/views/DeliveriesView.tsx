import React, { useState, useEffect } from 'react';
import { DeliveryOrder, Customer, Cylinder } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Plus,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  User,
  Package,
  Calendar,
  XCircle,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DeliveriesViewProps {
  onOpenNewOrder: () => void;
  onOpenReturn: () => void;
  onSelectCylinder: (id: string) => void;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  onOpenNewOrder,
  onOpenReturn,
  onSelectCylinder
}) => {
  const { canDeliver, canManageInventory } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes] = await Promise.all([
        api.getOrders({ status: statusFilter }),
        api.getCustomers()
      ]);
      setOrders(ordersRes.orders);
      setCustomers(custRes.customers);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleUpdateStatus = async (orderId: string, status: string, failedReason?: string) => {
    setActionLoading(true);
    try {
      await api.updateOrderStatus(orderId, status, failedReason);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Customer Deliveries & Cylinder Returns
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Logistics route dispatching, on-site drop-offs, proof of delivery, and cylinder intake.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenReturn}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-700" />
            <span>Record Cylinder Return</span>
          </button>
          {canManageInventory && (
            <button
              onClick={onOpenNewOrder}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>Create Delivery Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'orders'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Delivery Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-2 transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'customers'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Customer Accounts & Balances ({customers.length})</span>
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit text-xs">
            {['all', 'pending', 'dispatched', 'delivered', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors capitalize ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <div className="animate-spin w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full mx-auto mb-2" />
              Loading delivery orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500 space-y-2">
              <p>No delivery orders found for status "{statusFilter}".</p>
              {canManageInventory && (
                <button
                  onClick={onOpenNewOrder}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded font-medium text-xs hover:bg-slate-800"
                >
                  Create Delivery Order
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => {
                const isExpanded = expandedOrderId === ord.id;
                const isPending = ord.status === 'pending';
                const isDispatched = ord.status === 'dispatched';
                const isDelivered = ord.status === 'delivered';
                const isFailed = ord.status === 'failed';

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Left Block */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 font-mono">
                          <Truck className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-900 text-sm">{ord.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                                isDelivered
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isDispatched
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                          <div className="text-slate-800 font-semibold mt-0.5">
                            {ord.customer_name}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ord.delivery_address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Logistics Info */}
                      <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                        <div>Scheduled: <strong className="text-slate-800">{ord.scheduled_date}</strong></div>
                        <div>Vehicle: <span className="text-slate-700">{ord.vehicle_id}</span></div>
                        <div>Driver: <span className="text-slate-700">{ord.assigned_staff_name}</span></div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2">
                        {canDeliver && isPending && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, 'dispatched')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-cyan-700 text-white font-medium rounded-md hover:bg-cyan-800 transition-colors shadow-2xs"
                          >
                            Dispatch Vehicle
                          </button>
                        )}

                        {canDeliver && isDispatched && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(ord.id, 'delivered')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-700 text-white font-medium rounded-md hover:bg-emerald-800 transition-colors shadow-2xs"
                            >
                              Confirm Delivered
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for failed delivery (e.g. Premises closed / Access denied):');
                                if (reason) handleUpdateStatus(ord.id, 'failed', reason);
                              }}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 border border-red-300 text-red-700 font-medium rounded-md hover:bg-red-50 transition-colors"
                            >
                              Mark Failed
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Order Details Accordion */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs space-y-3">
                        {ord.notes && (
                          <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                            <strong>Dispatch Notes:</strong> {ord.notes}
                          </p>
                        )}

                        {ord.failed_reason && (
                          <p className="text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                            <strong>Failed Reason:</strong> {ord.failed_reason}
                          </p>
                        )}

                        <div>
                          <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                            Assigned Cylinder Manifest ({ord.items?.length || 0})
                          </span>
                          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {ord.items?.map((item) => (
                              <div
                                key={item.id}
                                className="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between"
                              >
                                <div>
                                  <button
                                    onClick={() => onSelectCylinder(item.cylinder_id)}
                                    className="font-mono font-bold text-teal-800 hover:underline"
                                  >
                                    {item.cylinder_id}
                                  </button>
                                  <div className="text-[11px] text-slate-500">
                                    {item.gas_type} · {item.capacity_liters || 50}L
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {item.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CUSTOMER ACCOUNTS TAB */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Customer Fleet Balances & Contact Accounts
              </h3>
              <span className="text-[11px] text-slate-500">
                Track active cylinder holding balances per facility
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Customer Code</th>
                  <th className="px-4 py-2.5 font-medium">Facility / Company</th>
                  <th className="px-4 py-2.5 font-medium">Sector</th>
                  <th className="px-4 py-2.5 font-medium">Contact Person</th>
                  <th className="px-4 py-2.5 font-medium">Delivery Address</th>
                  <th className="px-4 py-2.5 font-medium text-right">Holding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{cust.code}</td>
                    <td className="px-4 py-3 font-sans font-semibold text-slate-900">{cust.company}</td>
                    <td className="px-4 py-3 font-sans text-slate-600">{cust.category}</td>
                    <td className="px-4 py-3 font-sans text-slate-700">
                      <div>{cust.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{cust.phone}</div>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-600 text-[11px] max-w-[200px] truncate" title={cust.delivery_address}>
                      {cust.delivery_address}, {cust.city}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                        {cust.live_cylinder_count ?? cust.active_cylinder_count} cylinders
                      </span>
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
