'use client';

import { useState } from 'react';
import {
  X,
  Shield,
  ClipboardList,
  MapPin,
  Clock,
  User,
  LogOut,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type InspeccionData = {
  id: string;
  idTramite: string;
  contribuyente: string;
  direccion: string;
  fechaProgramada: string;
  hora: string;
  numeroVisita: number;
  resultado: string | null;
  ruc: string;
};

type InspectorData = {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  rol: string;
};

export default function ModalAccesoInspector() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentInspector, setCurrentInspector] = useState<InspectorData | null>(null);
  const [inspecciones, setInspecciones] = useState<InspeccionData[]>([]);

  const handleIngresar = async () => {
    const trimmed = codigo.trim().toUpperCase();
    if (!trimmed) {
      setError('Ingrese un código de credencial');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/inspectores/acceso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Código de inspector no válido o no activo');
        return;
      }

      setCurrentInspector(data.inspector);
      setInspecciones(data.inspecciones);
      setIsModalOpen(false);
      setCodigo('');
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCerrarSesion = () => {
    setCurrentInspector(null);
    setInspecciones([]);
  };

  const handleCancelar = () => {
    setIsModalOpen(false);
    setCodigo('');
    setError('');
  };

  if (currentInspector) {
    const esAdmin = currentInspector.rol === 'ADMINISTRADOR';

    return (
      <div className="fixed inset-0 z-50 min-h-screen bg-gray-50 overflow-y-auto">
        <header className="bg-blue-900 text-white px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <p className="text-blue-300 text-xs uppercase tracking-wider">
                  {esAdmin ? 'Administrador Municipal' : 'Inspector Municipal'}
                </p>
                <h1 className="font-bold text-lg">Agenda de Inspecciones del Día</h1>
              </div>
            </div>
            <button
              onClick={handleCerrarSesion}
              className="flex items-center gap-2 text-xs bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión de Inspector
            </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold">
                Bienvenido, {esAdmin ? 'Admin' : 'Inspector'} {currentInspector.nombre}
              </h2>
            </div>
            <p className="text-blue-200 text-sm">
              ID de Credencial:{' '}
              <span className="font-mono text-yellow-400 font-semibold">
                {currentInspector.dni}
              </span>
              <span className="text-blue-300 ml-3 text-xs bg-blue-700/40 px-2 py-0.5 rounded uppercase">
                {currentInspector.rol}
              </span>
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-blue-700" />
              <h3 className="text-lg font-bold text-gray-800">
                Inspecciones Agendadas ({inspecciones.length})
              </h3>
            </div>

            {inspecciones.length === 0 ? (
              <div className="card text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  No tienes inspecciones pendientes
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Las inspecciones aparecerán aquí cuando un trámite tenga el pago confirmado y el plano validado.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inspecciones.map((ins) => (
                  <div
                    key={ins.id}
                    className="card hover:shadow-md transition-shadow border-l-4 border-l-yellow-400"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                            {ins.idTramite}
                          </span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-semibold">
                            Visita #{ins.numeroVisita}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {ins.contribuyente}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {ins.direccion}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">RUC: {ins.ruc}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <span className="font-bold text-yellow-700 text-lg">{ins.hora}</span>
                        </div>
                        {ins.resultado && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            ins.resultado === 'CONFORME'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {ins.resultado === 'CONFORME' ? 'Conforme' : ins.resultado}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-white/10 transition text-sm font-medium cursor-pointer"
      >
        Soy Inspector / Admin
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-900" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Acceso de Inspector</h2>
                    <p className="text-blue-300 text-xs">Municipalidad Provincial de Trujillo</p>
                  </div>
                </div>
                <button
                  onClick={handleCancelar}
                  className="text-blue-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ingrese su Código de Credencial (DNI)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 00000002"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleIngresar();
                  }}
                  className="input-base"
                  autoFocus
                  disabled={loading}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <span className="font-semibold">Demo:</span> Usa{' '}
                <span className="font-mono text-blue-600">00000002</span> (Inspector Juan) o{' '}
                <span className="font-mono text-blue-600">00000003</span> (Inspector María)
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleCancelar}
                className="btn-secondary text-sm cursor-pointer"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleIngresar}
                className="btn-primary text-sm cursor-pointer inline-flex items-center gap-2"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Validando...' : 'Ingresar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
