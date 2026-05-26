'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// 1. DATOS QUEMADOS (Hardcoded)
const INSPECTORES = [
  {
    id: "INS-001",
    nombre: "Carlos Mendoza",
    inspeccionesAgendadas: [
      { idTramite: "TRM-101", contribuyente: "Bodega Don Pepe EIRL", direccion: "Av. España 1020, Trujillo", hora: "09:00 AM" },
      { idTramite: "TRM-102", contribuyente: "Librería Central SAC", direccion: "Jr. Pizarro 450, Trujillo", hora: "11:30 AM" },
      { idTramite: "TRM-103", contribuyente: "Restaurant El Buen Sabor", direccion: "Av. Larco 800, Trujillo", hora: "03:00 PM" }
    ]
  },
  {
    id: "INS-002",
    nombre: "Ana Lucia Ruiz",
    inspeccionesAgendadas: [
      { idTramite: "TRM-201", contribuyente: "Ferretería El Maestro", direccion: "Prol. Vallejo 210, Trujillo", hora: "10:00 AM" },
      { idTramite: "TRM-202", contribuyente: "Panadería San José", direccion: "Jr. Gamarra 320, Trujillo", hora: "02:00 PM" }
    ]
  },
  {
    id: "INS-003",
    nombre: "Jorge Villanueva",
    inspeccionesAgendadas: [
      { idTramite: "TRM-301", contribuyente: "Gimnasio FitLife", direccion: "Av. Husares de Junin 550, Trujillo", hora: "08:30 AM" },
      { idTramite: "TRM-302", contribuyente: "Farmacia Salud", direccion: "Av. América Sur 1200, Trujillo", hora: "04:15 PM" }
    ]
  }
];

export default function InspectorMockSystem() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [currentInspector, setCurrentInspector] = useState<any>(null);

  // 3. LÓGICA DE VALIDACIÓN EN TRADICIONAL REACT
  const handleIngresar = () => {
    const inspector = INSPECTORES.find(i => i.id.toUpperCase() === codigo.toUpperCase().trim());
    if (inspector) {
      setCurrentInspector(inspector);
      setIsModalOpen(false);
      setError('');
      setCodigo('');
    } else {
      setError('Código de inspector no válido o no activo');
    }
  };

  if (currentInspector) {
    // 4. VISTA DE LA AGENDA DEL INSPECTOR
    // Renderizamos una capa que cubre toda la pantalla para ocultar la landing page
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
        <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-blue-300 text-xs uppercase tracking-wider">Módulo de Inspecciones</p>
            <h1 className="font-bold text-lg">Bienvenido, Inspector {currentInspector.nombre}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium bg-blue-800 px-3 py-1 rounded-full">{currentInspector.id}</span>
            <button 
              onClick={() => setCurrentInspector(null)}
              className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition font-bold"
            >
              Cerrar Sesión de Inspector
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-black text-gray-800 mb-6">Agenda del Día</h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                  <th className="p-4 font-semibold">Hora</th>
                  <th className="p-4 font-semibold">Trámite</th>
                  <th className="p-4 font-semibold">Contribuyente</th>
                  <th className="p-4 font-semibold">Dirección</th>
                  <th className="p-4 font-semibold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentInspector.inspeccionesAgendadas.map((insp: any) => (
                  <tr key={insp.idTramite} className="hover:bg-gray-50 transition">
                    <td className="p-4 text-sm font-medium text-gray-900">{insp.hora}</td>
                    <td className="p-4 text-sm text-gray-500">{insp.idTramite}</td>
                    <td className="p-4 text-sm font-bold text-gray-800">{insp.contribuyente}</td>
                    <td className="p-4 text-sm text-gray-500">{insp.direccion}</td>
                    <td className="p-4 text-center">
                      <button className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-medium transition">
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-white/10 transition text-sm font-medium"
      >
        Soy Inspector / Admin
      </button>

      {/* 2. COMPONENTE MODAL DE ACCESO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-blue-900 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Acceso de Inspectores</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-blue-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Ingrese su código de credencial para acceder a su agenda del día.
              </p>
              
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Código de Credencial
                </label>
                <input 
                  type="text" 
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: INS-001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && handleIngresar()}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleIngresar}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  Ingresar
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 border-t border-gray-100 text-xs text-gray-500 text-center">
              Módulo de uso exclusivo para personal de la municipalidad.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
