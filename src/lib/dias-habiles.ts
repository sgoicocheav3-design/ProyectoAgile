/**
 * Cálculo de días hábiles para el sistema de licencias municipales
 * Incluye feriados nacionales del Perú 2025-2026 y manejo de BD de fechas no hábiles
 */

import { prisma } from './prisma';

// Feriados fijos del Perú (mes-día)
const FERIADOS_FIJOS_PERU: string[] = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-29', // San Pedro y San Pablo
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Día de Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-25', // Navidad
];

// Feriados variables 2025-2026 (fecha ISO)
const FERIADOS_VARIABLES: string[] = [
  '2025-04-17', // Jueves Santo 2025
  '2025-04-18', // Viernes Santo 2025
  '2026-04-02', // Jueves Santo 2026
  '2026-04-03', // Viernes Santo 2026
];

/**
 * Verifica si una fecha es día hábil
 * @param fecha - Fecha a verificar
 * @param fechasNoHabilesDB - Fechas no hábiles adicionales de la BD
 */
function esDiaHabil(fecha: Date, fechasNoHabilesDB: Set<string>): boolean {
  const diaSemana = fecha.getDay(); // 0=domingo, 6=sábado

  // Sábados y domingos no son hábiles
  if (diaSemana === 0 || diaSemana === 6) return false;

  const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
  const mesDia = fechaStr.slice(5); // MM-DD

  // Verificar feriados fijos
  if (FERIADOS_FIJOS_PERU.includes(mesDia)) return false;

  // Verificar feriados variables conocidos
  if (FERIADOS_VARIABLES.includes(fechaStr)) return false;

  // Verificar fechas no hábiles de la BD
  if (fechasNoHabilesDB.has(fechaStr)) return false;

  return true;
}

/**
 * Calcula la fecha límite agregando N días hábiles a partir de una fecha
 * @param fechaInicio - Fecha desde la que calcular
 * @param diasHabiles - Número de días hábiles a agregar (default: 30)
 * @returns Fecha límite con los días hábiles agregados
 */
export async function calcularFechaLimiteDiasHabiles(
  fechaInicio: Date,
  diasHabiles: number = 30
): Promise<Date> {
  // Obtener fechas no hábiles registradas en BD
  const fechasNoHabilesDB = await prisma.fechaNoHabil.findMany({
    where: {
      fecha: {
        gte: fechaInicio,
      },
    },
  });

  const setFechasNoHabiles = new Set<string>(
    fechasNoHabilesDB.map((f) => f.fecha.toISOString().split('T')[0])
  );

  let diasContados = 0;
  const fechaActual = new Date(fechaInicio);
  fechaActual.setDate(fechaActual.getDate() + 1); // Empezar el día siguiente

  while (diasContados < diasHabiles) {
    if (esDiaHabil(fechaActual, setFechasNoHabiles)) {
      diasContados++;
    }
    if (diasContados < diasHabiles) {
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
  }

  // Setear al final del día hábil (23:59:59)
  fechaActual.setHours(23, 59, 59, 999);
  return fechaActual;
}

/**
 * Versión síncrona sin BD (para cálculos rápidos)
 */
export function calcularFechaLimiteSincrona(
  fechaInicio: Date,
  diasHabiles: number = 30
): Date {
  const setVacio = new Set<string>();
  let diasContados = 0;
  const fechaActual = new Date(fechaInicio);
  fechaActual.setDate(fechaActual.getDate() + 1);

  while (diasContados < diasHabiles) {
    if (esDiaHabil(fechaActual, setVacio)) {
      diasContados++;
    }
    if (diasContados < diasHabiles) {
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
  }

  fechaActual.setHours(23, 59, 59, 999);
  return fechaActual;
}

/**
 * Obtiene la próxima fecha de inspección disponible
 * Mínimo 2 días hábiles desde hoy para dar tiempo al inspector
 */
export async function obtenerProximaFechaInspeccion(): Promise<Date> {
  const hoy = new Date();
  return calcularFechaLimiteDiasHabiles(hoy, 2);
}

/**
 * Formatea fecha a formato peruano legible
 */
export function formatearFechaPeruana(fecha: Date): string {
  return fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Lima',
  });
}
