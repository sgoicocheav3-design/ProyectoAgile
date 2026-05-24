'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Shield, Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, Download, ArrowLeft } from 'lucide-react';

interface TramitePublico {
  id: string;
  estado: string;
  razonSocial: string;
  ruc: string;
  fechaInicio: string;
  codigoLicencia?: string;
  licenciaVigenteHasta?: string;
}

const estadoConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  INICIADO:              { color: 'bg-gray-100 text-gray-700', label: 'Solicitud Iniciada', icon: <Clock className="w-5 h-5" /> },
  DOCUMENTOS_PENDIENTES: { color: 'bg-yellow-100 text-yellow-800', label: 'Documentos Pendientes', icon: <Clock className="w-5 h-5" /> },
  PAGADO:                { color: 'bg-blue-100 text-blue-800', label: 'Pago Confirmado', icon: <CheckCircle2 className="w-5 h-5" /> },
  EN_INSPECCION:         { color: 'bg-indigo-100 text-indigo-800', label: 'En Inspección', icon: <Search className="w-5 h-5" /> },
  OBSERVADO:             { color: 'bg-orange-100 text-orange-800', label: 'Observado', icon: <AlertTriangle className="w-5 h-5" /> },
  SEGUNDA_INSPECCION:    { color: 'bg-purple-100 text-purple-800', label: 'Segunda Inspección', icon: <Clock className="w-5 h-5" /> },
  APROBADO:              { color: 'bg-green-100 text-green-800', label: 'Licencia Aprobada ✓', icon: <CheckCircle2 className="w-5 h-5" /> },
  NEGADO:                { color: 'bg-red-100 text-red-800', label: 'Solicitud Rechazada', icon: <XCircle className="w-5 h-5" /> },
};

export default function ConsultaPage() {
  const [ruc, setRuc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tramites, setTramites] = useState<TramitePublico[]>([]);
  const [searched, setSearched] = useState(false);

  const buscar = async () => {
    if (ruc.length !== 11) {
      setError('El RUC debe tener exactamente 11 dígitos.');
      return;
    }
    setLoading(true);
    setError('');
    setTramites([]);
    setSearched(false);

    try {
      const res = await fetch(`/api/consulta?ruc=${ruc}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al buscar.');
        setLoading(false);
        return;
      }

      setTramites(data.tramites || []);
      setSearched(true);
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <header className="bg-blue-950/50 backdrop-blur-sm border-b border-blue-700/30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">MPT</p>
              <h1 className="text-white font-bold text-sm">Consulta de Trámite</h1>
            </div>
          </div>
          <Link href="/" className="text-blue-300 hover:text-white text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <Search className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white mb-2">Consultar Estado de Trámite</h2>
          <p className="text-blue-200">
            Ingrese el número de RUC del negocio para ver el estado de su solicitud de licencia.
          </p>
        </div>

        {/* Campo de búsqueda */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 mb-6">
          <label className="block text-white text-sm font-medium mb-2">Número de RUC</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="Ej: 20600000000"
              maxLength={11}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              id="input-ruc-consulta"
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
            />
            <button
              onClick={buscar}
              disabled={loading || ruc.length !== 11}
              className="px-6 py-3 bg-yellow-400 text-blue-900 rounded-xl font-bold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              id="btn-buscar-ruc"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Buscar
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Resultados */}
        {searched && tramites.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <XCircle className="w-12 h-12 text-blue-400/50 mx-auto mb-3" />
            <p className="text-white font-semibold mb-2">No se encontraron trámites</p>
            <p className="text-blue-300 text-sm">
              El RUC ingresado no tiene solicitudes registradas en el sistema.
            </p>
            <Link
              href="/solicitud"
              className="inline-block mt-4 px-6 py-3 bg-yellow-400 text-blue-900 rounded-xl font-bold hover:bg-yellow-300 transition"
            >
              Iniciar Nueva Solicitud
            </Link>
          </div>
        )}

        {tramites.length > 0 && (
          <div className="space-y-4">
            <p className="text-blue-200 text-sm">{tramites.length} trámite(s) encontrado(s)</p>
            {tramites.map((t) => {
              const cfg = estadoConfig[t.estado] || estadoConfig['INICIADO'];
              return (
                <div key={t.id} className="bg-white rounded-2xl p-6 shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{t.razonSocial}</h3>
                      <p className="text-gray-500 text-sm font-mono">RUC: {t.ruc}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 mb-4">
                    Fecha de solicitud: {new Date(t.fechaInicio).toLocaleDateString('es-PE', { dateStyle: 'long' })}
                  </div>

                  {/* Si está aprobado, mostrar licencia */}
                  {t.estado === 'APROBADO' && t.codigoLicencia && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-800">Licencia Aprobada</span>
                      </div>
                      <p className="text-green-700 text-sm mb-1">
                        Código: <strong className="font-mono">{t.codigoLicencia}</strong>
                      </p>
                      {t.licenciaVigenteHasta && (
                        <p className="text-green-600 text-xs">
                          Vigente hasta: {new Date(t.licenciaVigenteHasta).toLocaleDateString('es-PE')}
                        </p>
                      )}
                      <a
                        href={`/verificar/${t.codigoLicencia}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                      >
                        <Download className="w-4 h-4" />
                        Ver Licencia
                      </a>
                    </div>
                  )}

                  {/* Si está rechazado */}
                  {t.estado === 'NEGADO' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-700 text-sm mb-3">
                        La solicitud fue rechazada tras la inspección. Puede iniciar una nueva solicitud en cualquier momento.
                      </p>
                      <Link
                        href="/solicitud"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        Iniciar Nueva Solicitud
                      </Link>
                    </div>
                  )}

                  {/* Nota de seguridad */}
                  <p className="text-xs text-gray-400 mt-4 italic">
                    Por seguridad del negocio, los detalles de inspección, pagos y dirección solo son visibles para el titular con cuenta registrada.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
