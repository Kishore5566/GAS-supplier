import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Cylinder, Customer, InspectionRecord } from './types';
import { api } from './services/api';

import { Navigation } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { CylindersView } from './views/CylindersView';
import { RefillingView } from './views/RefillingView';
import { DeliveriesView } from './views/DeliveriesView';
import { MaintenanceView } from './views/MaintenanceView';
import { ReportsView } from './views/ReportsView';

// Modals
import { CylinderModal } from './components/CylinderModal';
import { BarcodeModal } from './components/BarcodeModal';
import { NewCylinderModal } from './components/NewCylinderModal';
import { SafetyFlagModal } from './components/SafetyFlagModal';
import { ClearSafetyModal } from './components/ClearSafetyModal';
import { RefillActionModal } from './components/RefillActionModal';
import { ScheduleInspectionModal } from './components/ScheduleInspectionModal';
import { NewOrderModal } from './components/NewOrderModal';
import { ReturnCylinderModal } from './components/ReturnCylinderModal';

import { ShieldCheck, UserCheck, KeyRound } from 'lucide-react';

function AppContent() {
  const { user, loading, login, switchDemoRole } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Shared application state
  const [cylinders, setCylinders] = useState<Cylinder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modal states
  const [selectedCylinderId, setSelectedCylinderId] = useState<string | null>(null);
  const [barcodeModalCylinder, setBarcodeModalCylinder] = useState<Cylinder | null>(null);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [newCylinderOpen, setNewCylinderOpen] = useState(false);
  const [safetyFlagCylinder, setSafetyFlagCylinder] = useState<Cylinder | null>(null);
  const [clearSafetyCylinder, setClearSafetyCylinder] = useState<Cylinder | null>(null);
  const [refillModalCylinder, setRefillModalCylinder] = useState<Cylinder | null>(null);
  const [refillModalOpen, setRefillModalOpen] = useState(false);
  const [scheduleInspectionCylinder, setScheduleInspectionCylinder] = useState<Cylinder | null>(null);
  const [recordInspectionItem, setRecordInspectionItem] = useState<InspectionRecord | null>(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [returnCylinderOpen, setReturnCylinderOpen] = useState(false);

  // Login form state (if signed out)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const refreshGlobalData = async () => {
    try {
      const [cylRes, custRes] = await Promise.all([
        api.getCylinders(),
        api.getCustomers()
      ]);
      setCylinders(cylRes.cylinders);
      setCustomers(custRes.customers);
    } catch (err) {
      console.warn('Failed to refresh auxiliary data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshGlobalData();
    }
  }, [user, currentTab]);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError(null);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check email and password.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-3 border-teal-700 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Initializing CylinderFlow Fleet Console...</p>
        </div>
      </div>
    );
  }

  // If user signed out, display Login Screen with 1-click Demo credentials
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-900 text-white text-center space-y-1">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Gas Cylinder Lifecycle Platform</h2>
            <p className="text-xs text-slate-400">Enterprise Operations & Regulatory Safety Compliance</p>
          </div>

          <div className="p-6 space-y-5 text-xs">
            {/* Quick 1-Click Demo Login Panel */}
            <div className="bg-teal-50/70 border border-teal-200 rounded-lg p-3.5 space-y-2">
              <span className="font-semibold text-teal-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                Select Instant Demo Account
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { role: 'Admin', name: 'Sarah Jenkins', email: 'admin@cylindertrack.io' },
                  { role: 'Inventory Manager', name: 'Marcus Vance', email: 'inventory@cylindertrack.io' },
                  { role: 'Delivery Staff', name: 'Dave Rodriguez', email: 'delivery@cylindertrack.io' },
                  { role: 'Technician', name: 'Elena Rostova', email: 'tech@cylindertrack.io' }
                ].map((account) => (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => login(account.email, 'gas12345')}
                    className="p-2 text-left bg-white border border-teal-200 rounded-md hover:border-teal-400 hover:shadow-2xs transition-all"
                  >
                    <div className="font-bold text-slate-900">{account.role}</div>
                    <div className="text-[11px] text-slate-500">{account.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[11px]">or sign in with password</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {loginError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@cylindertrack.io"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Default: gas12345"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-teal-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full py-2 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loginSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeWithCustomer = cylinders.filter((c) => c.status === 'with_customer');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenBarcodeScanner={() => {
          setBarcodeModalCylinder(null);
          setBarcodeModalOpen(true);
        }}
        onOpenNewCylinder={() => setNewCylinderOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setCurrentTab}
            onSelectCylinder={setSelectedCylinderId}
            onOpenBarcode={() => {
              setBarcodeModalCylinder(null);
              setBarcodeModalOpen(true);
            }}
            onOpenNewOrder={() => setNewOrderOpen(true)}
            onOpenReturn={() => setReturnCylinderOpen(true)}
            onOpenRefill={() => {
              setRefillModalCylinder(null);
              setRefillModalOpen(true);
            }}
            onOpenNewCylinder={() => setNewCylinderOpen(true)}
          />
        )}

        {currentTab === 'cylinders' && (
          <CylindersView
            onSelectCylinder={setSelectedCylinderId}
            onOpenBarcode={(cyl) => {
              setBarcodeModalCylinder(cyl || null);
              setBarcodeModalOpen(true);
            }}
            onOpenNewCylinder={() => setNewCylinderOpen(true)}
            onOpenSafetyFlag={(cyl) => setSafetyFlagCylinder(cyl)}
            onOpenClearSafety={(cyl) => setClearSafetyCylinder(cyl)}
            onOpenRefill={(cyl) => {
              setRefillModalCylinder(cyl);
              setRefillModalOpen(true);
            }}
            onOpenScheduleInsp={(cyl) => {
              setScheduleInspectionCylinder(cyl);
              setRecordInspectionItem(null);
              setInspectionModalOpen(true);
            }}
          />
        )}

        {currentTab === 'refilling' && (
          <RefillingView
            onOpenRefillModal={(cyl) => {
              setRefillModalCylinder(cyl || null);
              setRefillModalOpen(true);
            }}
            onSelectCylinder={setSelectedCylinderId}
          />
        )}

        {currentTab === 'deliveries' && (
          <DeliveriesView
            onOpenNewOrder={() => setNewOrderOpen(true)}
            onOpenReturn={() => setReturnCylinderOpen(true)}
            onSelectCylinder={setSelectedCylinderId}
          />
        )}

        {currentTab === 'maintenance' && (
          <MaintenanceView
            onScheduleInspection={(cyl) => {
              setScheduleInspectionCylinder(cyl || null);
              setRecordInspectionItem(null);
              setInspectionModalOpen(true);
            }}
            onRecordInspection={(insp) => {
              setRecordInspectionItem(insp);
              setScheduleInspectionCylinder(null);
              setInspectionModalOpen(true);
            }}
            onClearSafety={(cyl) => setClearSafetyCylinder(cyl)}
            onSelectCylinder={setSelectedCylinderId}
          />
        )}

        {currentTab === 'reports' && <ReportsView />}
      </main>

      {/* --- MODAL DIALOGS --- */}

      {/* Cylinder Detail & Lifecycle History Modal */}
      {selectedCylinderId && (
        <CylinderModal
          cylinderId={selectedCylinderId}
          onClose={() => setSelectedCylinderId(null)}
          onRefresh={refreshGlobalData}
          onOpenBarcode={(cyl) => {
            setBarcodeModalCylinder(cyl);
            setBarcodeModalOpen(true);
          }}
          onOpenSafetyFlag={(cyl) => setSafetyFlagCylinder(cyl)}
          onOpenClearSafety={(cyl) => setClearSafetyCylinder(cyl)}
          onOpenScheduleInsp={(cyl) => {
            setScheduleInspectionCylinder(cyl);
            setRecordInspectionItem(null);
            setInspectionModalOpen(true);
          }}
          onOpenRefill={(cyl) => {
            setRefillModalCylinder(cyl);
            setRefillModalOpen(true);
          }}
        />
      )}

      {/* Barcode & Digital Tag Modal */}
      {barcodeModalOpen && (
        <BarcodeModal
          cylinder={barcodeModalCylinder}
          onClose={() => setBarcodeModalOpen(false)}
          onSelectCylinderId={(id) => setSelectedCylinderId(id)}
        />
      )}

      {/* Register New Cylinder Modal */}
      {newCylinderOpen && (
        <NewCylinderModal
          onClose={() => setNewCylinderOpen(false)}
          onSuccess={refreshGlobalData}
        />
      )}

      {/* Safety Quarantine Flag Modal */}
      {safetyFlagCylinder && (
        <SafetyFlagModal
          cylinder={safetyFlagCylinder}
          onClose={() => setSafetyFlagCylinder(null)}
          onSuccess={() => {
            refreshGlobalData();
            if (selectedCylinderId) {
              // Reload details
              setSelectedCylinderId(selectedCylinderId);
            }
          }}
        />
      )}

      {/* Clear Safety Lock Modal */}
      {clearSafetyCylinder && (
        <ClearSafetyModal
          cylinder={clearSafetyCylinder}
          onClose={() => setClearSafetyCylinder(null)}
          onSuccess={() => {
            refreshGlobalData();
            if (selectedCylinderId) {
              setSelectedCylinderId(selectedCylinderId);
            }
          }}
        />
      )}

      {/* Refill Action Modal */}
      {refillModalOpen && (
        <RefillActionModal
          cylinder={refillModalCylinder}
          pendingCylinders={cylinders.filter((c) => c.status === 'empty_depot' && c.is_safety_flagged === 0)}
          onClose={() => {
            setRefillModalOpen(false);
            setRefillModalCylinder(null);
          }}
          onSuccess={refreshGlobalData}
        />
      )}

      {/* Schedule / Record Technical Inspection Modal */}
      {inspectionModalOpen && (
        <ScheduleInspectionModal
          cylinder={scheduleInspectionCylinder}
          inspectionToRecord={recordInspectionItem}
          cylindersList={cylinders}
          onClose={() => {
            setInspectionModalOpen(false);
            setScheduleInspectionCylinder(null);
            setRecordInspectionItem(null);
          }}
          onSuccess={refreshGlobalData}
        />
      )}

      {/* New Delivery Order Modal */}
      {newOrderOpen && (
        <NewOrderModal
          customers={customers}
          availableCylinders={cylinders}
          onClose={() => setNewOrderOpen(false)}
          onSuccess={refreshGlobalData}
        />
      )}

      {/* Customer Cylinder Return Modal */}
      {returnCylinderOpen && (
        <ReturnCylinderModal
          customers={customers}
          activeWithCustomerCylinders={activeWithCustomer}
          onClose={() => setReturnCylinderOpen(false)}
          onSuccess={refreshGlobalData}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
