'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

export default function FormResultadoInspeccion({ inspeccionId }: { inspeccionId: string }) {
  const router = useRouter();
  const [resultado, setResultado] = useState<'CONFORME' | 'OBSERVADO' | 'RECHAZADO' | ''>('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultado) { setError('Seleccione un resultado.'); return; }
    if (resultado !== 'CONFORME' && observaciones.trim().length < 10) {
      setError('Describa las observaciones (mínimo 10 caracteres).');
      return;
    }

    setLoading(true);
    setError('');

    const res = await fetch(`/api/inspecciones/${inspeccionId}/resultado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultado,
        observaciones: resultado !== 'CONFORME' ? observaciones : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Error al registrar resultado.');
      setLoading(false);
      return;
    }

    // Mostrar mensaje de éxito y recargar
    alert(`✅ ${data.mensaje || 'Resultado registrado.'}`);
    router.refresh();
  };

  if (!expandido) {
    return (
      <button
        onClick={() => setExpandido(true)}
        id={`btn-registrar-${inspeccionId}`}
        className="w-full py-2.5 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium"
      >
        + Registrar Resultado de Visita
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t pt-4 space-y-3 animate-fade-in">
      <p className="text-sm font-semibold text-gray-700">Resultado de la Inspección:</p>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {([
          { val: 'CONFORME', label: 'Conforme', icon: <CheckCircle2 className="w-4 h-4" />, color: 'border-green-500 bg-green-50 text-green-700' },
          { val: 'OBSERVADO', label: 'Observado', icon: <AlertTriangle className="w-4 h-4" />, color: 'border-orange-500 bg-orange-50 text-orange-700' },
          { val: 'RECHAZADO', label: 'Rechazado', icon: <XCircle className="w-4 h-4" />, color: 'border-red-500 bg-red-50 text-red-700' },
        ] as const).map((op) => (
          <button
            key={op.val}
            type="button"
            id={`btn-resultado-${op.val.toLowerCase()}-${inspeccionId}`}
            onClick={() => setResultado(op.val)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${
              resultado === op.val ? op.color : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {op.icon} {op.label}
          </button>
        ))}
      </div>

      {resultado && resultado !== 'CONFORME' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Observaciones Detalladas *
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Describa específicamente los problemas encontrados: accesos de emergencia bloqueados, falta de extintores, área no coincide con plano, etc."
            rows={4}
            className="input-base resize-none text-sm"
            id={`observaciones-${inspeccionId}`}
          />
          <p className="text-xs text-gray-400 mt-1">{observaciones.length} caracteres (mínimo 10)</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setExpandido(false); setResultado(''); setObservaciones(''); setError(''); }}
          className="btn-secondary text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !resultado}
          id={`btn-confirmar-resultado-${inspeccionId}`}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Confirmar Resultado
        </button>
      </div>
    </form>
  );
}
