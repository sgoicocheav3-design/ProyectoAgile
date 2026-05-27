'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ReprogramarInspeccion({
  inspeccionId,
  fechaActual,
}: {
  inspeccionId: string;
  fechaActual: string | null;
}) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(
    fechaActual
      ? new Date(fechaActual).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const tieneFecha = fechaActual !== null;
  const tituloBoton = tieneFecha ? 'Reprogramar Visita' : 'Asignar Fecha de Inspección';
  const tituloFormulario = tieneFecha ? 'Nueva fecha y hora de la visita:' : 'Seleccione la fecha y hora de la inspección:';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setExito('');

    try {
      const res = await fetch(`/api/inspecciones/${inspeccionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaProgramada: new Date(nuevaFecha).toISOString() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar la fecha.');
        setLoading(false);
        return;
      }

      setExito(`Visita ${tieneFecha ? 'reprogramada' : 'programada'} para el ${new Date(data.fechaProgramada).toLocaleDateString('es-PE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
      })}`);
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      {!expandido ? (
        <button
          onClick={() => setExpandido(true)}
          className={`w-full py-2.5 border-2 border-dashed rounded-lg transition text-sm font-medium flex items-center justify-center gap-2 ${
            tieneFecha
              ? 'border-orange-300 text-orange-600 hover:border-orange-500 hover:bg-orange-50'
              : 'border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {tituloBoton}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in">
          <p className="text-sm font-semibold text-gray-700">{tituloFormulario}</p>

          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          {exito && (
            <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> {exito}
            </div>
          )}

          <input
            type="datetime-local"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="input-base text-sm w-full"
            min={new Date().toISOString().slice(0, 16)}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setExpandido(false); setError(''); setExito(''); }}
              className="btn-secondary text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nuevaFecha}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {tieneFecha ? 'Guardar nueva fecha' : 'Establecer fecha'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
