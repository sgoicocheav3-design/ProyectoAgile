'use client';

import { useState } from 'react';
import { X, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { INSPECTORES_DEMO, InspectorDemo } from '@/lib/inspectores-demo';

interface ModalAccesoProps {
  abierto: boolean;
  onCerrar: () => void;
  onIngresar: (inspector: InspectorDemo) => void;
}

export default function ModalAcceso({ abierto, onCerrar, onIngresar }: ModalAccesoProps) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!abierto) return null;

  const handleIngresar = () => {
    const codigoTrim = codigo.trim().toUpperCase();
    if (!codigoTrim) {
      setError('Ingrese un código de credencial.');
      return;
    }

    setLoading(true);
    setError('');

    // Simular verificación
    setTimeout(() => {
      const inspector = INSPECTORES_DEMO.find((i) => i.id === codigoTrim);
      if (!inspector) {
        setError('Código de inspector no válido o no activo.');
        setLoading(false);
        return;
      }

      onIngresar(inspector);
      setCodigo('');
      setError('');
      setLoading(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleIngresar();
    if (e.key === 'Escape') { setCodigo(''); setError(''); onCerrar(); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setCodigo(''); setError(''); onCerrar();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">
                Municipalidad de Trujillo
              </p>
              <h2 className="text-white font-bold">Acceso Inspector / Admin</h2>
            </div>
          </div>
          <button
            onClick={() => { setCodigo(''); setError(''); onCerrar(); }}
            className="text-blue-300 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ingrese su Código de Credencial
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="Ej: INS-001"
              className="input-base font-mono tracking-wider text-center text-lg"
              autoFocus
              maxLength={10}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">Inspectores de prueba:</p>
            <div className="space-y-1">
              {INSPECTORES_DEMO.map((insp) => (
                <button
                  key={insp.id}
                  type="button"
                  onClick={() => setCodigo(insp.id)}
                  className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded px-2 py-1 transition font-mono"
                >
                  {insp.id} — {insp.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { setCodigo(''); setError(''); onCerrar(); }}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleIngresar}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Ingresar
          </button>
        </div>
      </div>
    </div>
  );
}
