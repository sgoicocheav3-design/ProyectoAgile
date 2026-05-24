'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Eye,
} from 'lucide-react';

export interface InspeccionCalendario {
  id: string;
  fechaProgramada: string;
  completada: boolean;
  resultado: 'CONFORME' | 'OBSERVADO' | 'RECHAZADO' | null;
  numeroVisita: number;
  fechaLimite: string | null;
  negocioRazonSocial: string;
  negocioRuc: string;
  negocioDomicilio: string;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getColorClass(insp: InspeccionCalendario): string {
  if (!insp.completada) return 'bg-blue-500';
  if (insp.resultado === 'CONFORME') return 'bg-green-500';
  return 'bg-red-500';
}

function getResultadoBadge(insp: InspeccionCalendario) {
  if (!insp.completada) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">
        Pendiente
      </span>
    );
  }
  if (insp.resultado === 'CONFORME') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
        Conforme
      </span>
    );
  }
  if (insp.resultado === 'OBSERVADO') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">
        Observado
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
      Rechazado
    </span>
  );
}

export default function CalendarioInspecciones({
  inspecciones,
}: {
  inspecciones: InspeccionCalendario[];
}) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  // Build inspection map by date key (YYYY-MM-DD)
  const inspeccionesPorDia = useMemo(() => {
    const map = new Map<string, InspeccionCalendario[]>();
    inspecciones.forEach((insp) => {
      const d = new Date(insp.fechaProgramada);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(insp);
    });
    return map;
  }, [inspecciones]);

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    const totalDays = lastDay.getDate();

    const days: (Date | null)[] = [];
    // Padding before first day
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(currentYear, currentMonth, d));
    }
    // Padding after last day to fill the grid
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth, currentYear]);

  const getDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  // Inspections for selected day or upcoming
  const inspeccionesFiltradas = useMemo(() => {
    if (selectedDate) {
      const key = getDateKey(selectedDate);
      return inspeccionesPorDia.get(key) || [];
    }
    // Show upcoming inspections (from today onwards)
    return inspecciones
      .filter((i) => new Date(i.fechaProgramada) >= today && !i.completada)
      .slice(0, 5);
  }, [selectedDate, inspeccionesPorDia, inspecciones, today]);

  const tituloLista = selectedDate
    ? `Inspecciones del ${selectedDate.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Lima' })}`
    : 'Próximas inspecciones';

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="card">
        {/* Header con navegación */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h3 className="font-bold text-gray-800 text-lg">
              {MESES[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={goToToday}
              className="text-xs text-blue-600 hover:underline"
            >
              Ir a hoy
            </button>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="text-center text-xs font-semibold text-gray-500 py-2"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="p-2 min-h-[64px]" />;
            }

            const key = getDateKey(day);
            const dayInsps = inspeccionesPorDia.get(key) || [];
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`p-1.5 min-h-[64px] border border-gray-50 rounded-lg text-left transition-all hover:bg-blue-50 ${
                  isSelected
                    ? 'bg-blue-100 ring-2 ring-blue-400'
                    : isToday
                    ? 'bg-yellow-50 ring-1 ring-yellow-300'
                    : ''
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    isToday ? 'text-blue-700 font-bold' : 'text-gray-600'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayInsps.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayInsps.slice(0, 3).map((insp) => (
                      <span
                        key={insp.id}
                        className={`w-2 h-2 rounded-full ${getColorClass(insp)}`}
                        title={insp.negocioRazonSocial}
                      />
                    ))}
                    {dayInsps.length > 3 && (
                      <span className="text-[10px] text-gray-400">
                        +{dayInsps.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Pendiente
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Conforme
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Observado / Rechazado
          </div>
        </div>
      </div>

      {/* Inspections list for selected day */}
      <div>
        <h2 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          {tituloLista}
        </h2>

        {inspeccionesFiltradas.length === 0 ? (
          <div className="card text-center py-8 text-gray-400 text-sm">
            No hay inspecciones para esta fecha.
          </div>
        ) : (
          <div className="space-y-3">
            {inspeccionesFiltradas.map((insp) => (
              <Link
                key={insp.id}
                href={`/inspector/inspeccion/${insp.id}`}
                className="card border-l-4 flex items-center justify-between hover:shadow-md transition-shadow group"
                style={{
                  borderLeftColor: !insp.completada
                    ? '#3b82f6'
                    : insp.resultado === 'CONFORME'
                    ? '#22c55e'
                    : '#ef4444',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        insp.numeroVisita === 1
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      Visita #{insp.numeroVisita}
                    </span>
                    {getResultadoBadge(insp)}
                  </div>
                  <h3 className="font-bold text-gray-800 truncate">
                    {insp.negocioRazonSocial}
                  </h3>
                  <p className="text-sm text-gray-500">RUC: {insp.negocioRuc}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {insp.negocioDomicilio}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(insp.fechaProgramada).toLocaleDateString('es-PE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      timeZone: 'America/Lima',
                    })}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-medium">Ver detalle</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
