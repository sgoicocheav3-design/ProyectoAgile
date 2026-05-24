'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';

interface Comentario {
  id: string;
  contenido: string;
  createdAt: string;
  autor: {
    id: string;
    nombre: string;
    rol: string;
  };
}

export default function ComentariosSection({ inspeccionId }: { inspeccionId: string }) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [contenido, setContenido] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const cargarComentarios = useCallback(async () => {
    try {
      const res = await fetch(`/api/comentarios?inspeccionId=${inspeccionId}`);
      if (!res.ok) throw new Error('Error al cargar comentarios');
      const data = await res.json();
      setComentarios(data.comentarios);
    } catch {
      setError('No se pudieron cargar los comentarios.');
    } finally {
      setLoading(false);
    }
  }, [inspeccionId]);

  useEffect(() => {
    cargarComentarios();
  }, [cargarComentarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenido.trim()) return;

    setEnviando(true);
    setError('');

    try {
      const res = await fetch('/api/comentarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspeccionId, contenido: contenido.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar comentario');
      }

      const data = await res.json();
      setComentarios((prev) => [...prev, data.comentario]);
      setContenido('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar comentario.');
    } finally {
      setEnviando(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        Comentarios ({comentarios.length})
      </h3>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Lista de comentarios */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Cargando comentarios...
          </div>
        ) : comentarios.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No hay comentarios aún. Sea el primero en comentar.
          </div>
        ) : (
          comentarios.map((c) => (
            <div
              key={c.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {c.autor.nombre}
                  </p>
                  <p className="text-xs text-gray-400">{formatFecha(c.createdAt)}</p>
                </div>
                <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                  {c.autor.rol === 'INSPECTOR' ? 'Inspector' : 'Admin'}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.contenido}</p>
            </div>
          ))
        )}
      </div>

      {/* Formulario para nuevo comentario */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="Escriba un comentario..."
          rows={2}
          className="input-base resize-none text-sm flex-1"
          disabled={enviando}
        />
        <button
          type="submit"
          disabled={enviando || !contenido.trim()}
          className="btn-primary self-end px-4 py-2.5 flex items-center gap-1.5"
        >
          {enviando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
