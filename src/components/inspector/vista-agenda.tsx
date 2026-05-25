'use client';

import { InspectorDemo } from '@/lib/inspectores-demo';
import {
  Shield,
  MapPin,
  Clock,
  Building2,
  FileText,
  Users,
  LogOut,
  ClipboardCheck,
} from 'lucide-react';

interface VistaAgendaProps {
  inspector: InspectorDemo;
  onCerrarSesion: () => void;
}

export default function VistaAgenda({ inspector, onCerrarSesion }: VistaAgendaProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest">
                Municipalidad Provincial de Trujillo
              </p>
              <h1 className="text-white font-bold text-lg">Sistema de Inspecciones</h1>
            </div>
          </div>
          <button
            onClick={onCerrarSesion}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión de Inspector
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Perfil del inspector */}
        <div className="card mb-8 bg-gradient-to-r from-blue-50 to-white border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-white font-black text-2xl">
              {inspector.nombre.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-800">
                Bienvenido, Inspector {inspector.nombre}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  ID: <strong className="font-mono text-blue-700">{inspector.id}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <ClipboardCheck className="w-4 h-4" />
                  Inspecciones hoy: <strong className="text-blue-700">{inspector.inspeccionesAgendadas.length}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de inspecciones */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Agenda del Día — Inspecciones Programadas
            </h3>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                timeZone: 'America/Lima',
              })}
            </span>
          </div>

          {inspector.inspeccionesAgendadas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No tiene inspecciones agendadas para hoy.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Hora</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Contribuyente</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Dirección</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Trámite</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inspector.inspeccionesAgendadas.map((insp) => (
                    <tr
                      key={insp.idTramite}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-gray-800">{insp.hora}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-800">{insp.contribuyente}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{insp.direccion}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {insp.idTramite}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-blue-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-default">
                          Ver detalle →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Regla de negocio */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <strong>Regla de negocio:</strong> Cada inspector puede atender máximo 3 inspecciones por día para garantizar la calidad del servicio.
          </p>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-6 text-center text-gray-400 text-sm">
        © 2025 Municipalidad Provincial de Trujillo — Sistema de Inspecciones
      </footer>
    </div>
  );
}
