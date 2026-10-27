import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Layers,
  QrCode,
  Plus,
  Shield,
  ChevronDown,
  LogOut,
  UserCheck,
  Menu,
  X
} from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenBarcodeScanner: () => void;
  onOpenNewCylinder: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenBarcodeScanner,
  onOpenNewCylinder
}) => {
  const { user, switchDemoRole, logout, canManageInventory } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'cylinders', label: 'Cylinders' },
    { id: 'refilling', label: 'Refilling' },
    { id: 'deliveries', label: 'Deliveries & Returns' },
    { id: 'maintenance', label: 'Maintenance & Safety' },
    { id: 'reports', label: 'Reports' },
  ];

  const roles: UserRole[] = ['Admin', 'Inventory Manager', 'Delivery Staff', 'Technician'];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-teal-400 font-bold shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                CylinderFlow <span className="font-semibold text-teal-600">Ops</span>
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links (single line, whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Quick scan & Role Account Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Scan barcode quick affordance */}
            <button
              onClick={onOpenBarcodeScanner}
              title="Lookup Cylinder by Barcode / QR ID"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Scan / Lookup</span>
            </button>

            {canManageInventory && (
              <button
                onClick={onOpenNewCylinder}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Cylinder</span>
              </button>
            )}

            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-xs font-semibold text-slate-700">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <div className="text-xs font-medium text-slate-900 leading-tight truncate max-w-[100px]">
                    {user?.name}
                  </div>
                  <div className="text-[10px] text-teal-700 font-semibold leading-none">
                    {user?.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50 text-xs"
                  onMouseLeave={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Active User & Role
                    </p>
                    <p className="font-semibold text-slate-800 text-sm">{user?.name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">{user?.email}</p>
                  </div>

                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-teal-600" /> Switch Demo Role
                    </p>
                    <div className="space-y-1">
                      {roles.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            switchDemoRole(r);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-xs transition-colors flex items-center justify-between ${
                            user?.role === r
                              ? 'bg-teal-50 text-teal-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{r}</span>
                          {user?.role === r && <span className="text-[10px] text-teal-600">Active</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="px-2 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setRoleDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center gap-1.5 text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav bar dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-slate-200 bg-white space-y-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {canManageInventory && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onOpenNewCylinder();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-md"
              >
                + Register New Cylinder
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
