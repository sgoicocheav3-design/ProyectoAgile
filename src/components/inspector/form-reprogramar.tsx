'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';

export default function FormReprogramarInspeccion({ inspeccionId, fechaProgramadaActual }: { inspeccionId: string, fechaProgramadaActual: Date }) {
  const router = useRouter();
  const [expandido, setExpandido] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFecha) {
      setError('Seleccione una nueva fecha.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch(`/api/inspecciones/${inspeccionId}/reprogramar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevaFecha }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Error al reprogramar.');
      setLoading(false);
      return;
    }

    alert(`✅ ${data.mensaje}`);
    setExpandido(false);
    setNuevaFecha('');
    router.refresh();
  };

  if (!expandido) {
    return (
      <button
        onClick={() => setExpandido(true)}
        className="w-full py-2.5 border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition"
      >
        <Calendar className="w-4 h-4" />
        Reprogramar Visita
      </button>
    );
  }

  // Mínimo hoy (no se puede reprogramar al pasado)
  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-orange-200 bg-orange-50/50 rounded-lg animate-fade-in space-y-3">
      <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Reprogramar Inspección
      </h4>
      <p className="text-xs text-orange-700">
        Seleccione una nueva fecha hábil (máximo 30 días posteriores).
      </p>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div>
        <input
          type="date"
          value={nuevaFecha}
          min={hoyStr}
          onChange={(e) => setNuevaFecha(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          required
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => { setExpandido(false); setError(''); }}
          className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !nuevaFecha}
          className="flex-1 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Confirmar Fecha
        </button>
      </div>
    </form>
  );
}
