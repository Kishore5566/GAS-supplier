import React, { useState } from 'react';
import { Cylinder } from '../types';
import { X, Search, QrCode, Copy, Check } from 'lucide-react';

interface BarcodeModalProps {
  cylinder?: Cylinder | null;
  onClose: () => void;
  onSelectCylinderId: (id: string) => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ cylinder, onClose, onSelectCylinderId }) => {
  const [searchInput, setSearchInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSelectCylinderId(searchInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-slate-900 text-sm">Cylinder Barcode & Digital Tag</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {cylinder ? (
            <div className="text-center space-y-4">
              <div>
                <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Cylinder ID</span>
                <div className="text-lg font-bold text-slate-900 font-mono">{cylinder.id}</div>
                <div className="text-xs text-slate-500 font-mono">Serial: {cylinder.serial_number}</div>
              </div>

              {/* Simulated Code-128 Barcode Graphic */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 inline-block mx-auto shadow-2xs">
                <div className="flex items-center justify-center gap-[3px] h-16 w-64 overflow-hidden mx-auto bg-white px-2">
                  {/* Procedural barcode stripes */}
                  {Array.from({ length: 48 }).map((_, i) => {
                    const isThick = (i * 7 + 3) % 4 === 0;
                    const isMedium = (i * 5 + 1) % 3 === 0;
                    const isSpace = (i * 3 + 2) % 5 === 0;
                    if (isSpace) return <div key={i} className="w-[2px] h-full bg-transparent" />;
                    return (
                      <div
                        key={i}
                        className={`h-full bg-slate-900 ${
                          isThick ? 'w-[4px]' : isMedium ? 'w-[2.5px]' : 'w-[1.5px]'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="text-center font-mono text-xs text-slate-700 tracking-widest mt-2">
                  *{cylinder.barcode || cylinder.id}*
                </div>
              </div>

              {/* Tag Details */}
              <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Gas Type:</span>{' '}
                  <span className="font-semibold text-slate-800">{cylinder.gas_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">Grade:</span>{' '}
                  <span className="font-semibold text-slate-800">{cylinder.gas_grade}</span>
                </div>
                <div>
                  <span className="text-slate-500">Working Pressure:</span>{' '}
                  <span className="font-semibold text-slate-800 font-mono">{cylinder.working_pressure_bar} bar</span>
                </div>
                <div>
                  <span className="text-slate-500">Tare Weight:</span>{' '}
                  <span className="font-semibold text-slate-800 font-mono">{cylinder.tare_weight_kg} kg</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => handleCopy(cylinder.barcode || cylinder.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Barcode'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-slate-600 mb-4">
                Scan or enter a cylinder barcode, serial number, or ID to look up its lifecycle history and current status.
              </p>
            </div>
          )}

          {/* Quick Lookup Bar */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quick Barcode / ID Lookup
            </label>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. CYL-O2-101, BAR-8801, or SN-O2"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:border-teal-600"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Lookup
              </button>
            </form>
            <div className="flex gap-1.5 mt-2 overflow-x-auto text-[11px] text-slate-500">
              <span className="shrink-0 text-slate-400">Try demo:</span>
              {['CYL-O2-101', 'CYL-N2-302', 'CYL-AR-201', 'CYL-LPG-701'].map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    onSelectCylinderId(id);
                    onClose();
                  }}
                  className="font-mono text-teal-700 hover:underline shrink-0"
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
