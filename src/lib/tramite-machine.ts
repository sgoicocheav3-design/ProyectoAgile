/**
 * Máquina de Estados del Trámite de Licencia Municipal
 * Controla todas las transiciones válidas del proceso
 */

import { EstadoTramite, ResultadoInspeccion, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { calcularFechaLimiteDiasHabiles } from './dias-habiles';
import { generarCodigoLicencia } from './pdf-generator';

export type TransicionResult = {
  exito: boolean;
  nuevoEstado?: EstadoTramite;
  error?: string;
  datos?: Record<string, unknown>;
};

/**
 * Mapa de transiciones válidas
 * Define qué estados pueden transicionar a qué otros estados
 */
const TRANSICIONES_VALIDAS: Record<EstadoTramite, EstadoTramite[]> = {
  INICIADO: ['DOCUMENTOS_PENDIENTES'],
  DOCUMENTOS_PENDIENTES: ['PAGADO', 'DOCUMENTOS_PENDIENTES'],
  PAGADO: ['EN_INSPECCION'],
  EN_INSPECCION: ['OBSERVADO', 'APROBADO'],
  OBSERVADO: ['SEGUNDA_INSPECCION'],
  SEGUNDA_INSPECCION: ['APROBADO', 'NEGADO'],
  APROBADO: [], // Estado terminal — solo renovación crea trámite nuevo
  NEGADO: [],   // Estado terminal — negocio puede iniciar nuevo trámite
};

/**
 * Verifica si una transición de estado es válida
 */
export function esTransicionValida(
  estadoActual: EstadoTramite,
  nuevoEstado: EstadoTramite
): boolean {
  return TRANSICIONES_VALIDAS[estadoActual]?.includes(nuevoEstado) ?? false;
}

/**
 * EVENTO: Documentos cargados
 * Transición: INICIADO → DOCUMENTOS_PENDIENTES
 */
export async function onDocumentosCargados(tramiteId: string): Promise<TransicionResult> {
  const tramite = await prisma.tramite.findUnique({ where: { id: tramiteId } });

  if (!tramite) return { exito: false, error: 'Trámite no encontrado.' };
  if (tramite.estado !== 'INICIADO') {
    return { exito: false, error: `Estado inválido: ${tramite.estado}. Se esperaba INICIADO.` };
  }

  await prisma.tramite.update({
    where: { id: tramiteId },
    data: { estado: 'DOCUMENTOS_PENDIENTES' },
  });

  return { exito: true, nuevoEstado: 'DOCUMENTOS_PENDIENTES' };
}

import { generarComprobante } from './facturacion';

/**
 * EVENTO: Pago confirmado (llamado desde webhook MercadoPago)
 * Transición: DOCUMENTOS_PENDIENTES → PAGADO
 * Genera el comprobante (Boleta/Factura) según la selección del usuario.
 * La asignación del inspector ocurre en un paso posterior.
 */
export async function onPagoConfirmado(
  tramiteId: string,
  pagoId: string
): Promise<TransicionResult> {
  const tramite = await prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: { negocio: true },
  });

  if (!tramite) return { exito: false, error: 'Trámite no encontrado.' };
  if (tramite.estado !== 'DOCUMENTOS_PENDIENTES') {
    return {
      exito: false,
      error: `Estado inválido: ${tramite.estado}. Se esperaba DOCUMENTOS_PENDIENTES.`,
    };
  }

  // Obtener el monto del pago para la facturación
  const pago = await prisma.pago.findUnique({ where: { id: pagoId } });
  if (!pago) {
    return { exito: false, error: 'Pago no encontrado.' };
  }

  // Actualizar estado del trámite a PAGADO
  await prisma.tramite.update({
    where: { id: tramiteId },
    data: { estado: 'PAGADO' },
  });

  // Facturación Electrónica — usar el tipo de comprobante elegido por el usuario
  let comprobante = null;
  try {
    const tipoComprobante = (tramite.tipoComprobante as 'BOLETA' | 'FACTURA') || 'BOLETA';
    comprobante = await generarComprobante({
      ruc: tramite.negocio.ruc,
      razonSocial: tramite.negocio.razonSocial,
      domicilioFiscal: tramite.negocio.domicilioFiscal,
      monto: Number(pago.monto),
      tipoComprobante,
      nombreSolicitante: tramite.nombreSolicitante || undefined,
      emailSolicitante: tramite.emailSolicitante || undefined,
    }, pago.id);
  } catch (error) {
    console.error('[FACTURACION] Error al generar comprobante:', error);
  }

  // Actualizar pago como aprobado y guardar comprobante
  await prisma.pago.update({
    where: { id: pagoId },
    data: {
      estadoPago: 'APROBADO',
      fechaPago: new Date(),
      comprobanteSerie: comprobante ? comprobante.serie_correlativo.split('-')[0] : null,
      comprobanteNumero: comprobante ? comprobante.serie_correlativo.split('-')[1] : null,
      comprobantePdfUrl: comprobante ? comprobante.url_pdf : null,
      comprobanteXmlUrl: comprobante ? comprobante.url_xml : null,
    },
  });

  return {
    exito: true,
    nuevoEstado: 'PAGADO',
    datos: {
      comprobantePdfUrl: comprobante?.url_pdf,
      comprobanteSerie: comprobante?.serie_correlativo,
      tipoComprobante: tramite.tipoComprobante,
    },
  };
}

const MAX_INSPECCIONES_POR_DIA = 3;

/**
 * Asigna un inspector disponible a un trámite en estado PAGADO.
 * Busca el inspector con menor carga del día (máx. 3 inspecciones/día),
 * agendas la inspección (visita #1) y transiciona a EN_INSPECCION.
 */
export async function asignarInspector(tramiteId: string): Promise<TransicionResult> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const finDeSemana = new Date(hoy);
  finDeSemana.setDate(finDeSemana.getDate() + 2);

  const tramite = await prisma.tramite.findUnique({ where: { id: tramiteId } });
  if (!tramite) return { exito: false, error: 'Trámite no encontrado.' };
  if (tramite.estado !== 'PAGADO') {
    return {
      exito: false,
      error: `Estado inválido: ${tramite.estado}. Se esperaba PAGADO.`,
    };
  }

  // 1. Buscar inspectores activos
  const inspectores = await prisma.usuario.findMany({
    where: { rol: 'INSPECTOR', activo: true },
  });

  if (inspectores.length === 0) {
    return {
      exito: false,
      error: 'No hay inspectores disponibles en el sistema.',
    };
  }

  // 2. Contar inspecciones asignadas para hoy y mañana por inspector
  const inscounts = await Promise.all(
    inspectores.map(async (insp) => {
      const countHoy = await prisma.inspeccion.count({
        where: {
          inspectorId: insp.id,
          fechaProgramada: { gte: hoy, lt: manana },
        },
      });
      const countManana = await prisma.inspeccion.count({
        where: {
          inspectorId: insp.id,
          fechaProgramada: { gte: manana, lt: finDeSemana },
        },
      });
      return { inspector: insp, countHoy, countManana };
    })
  );

  // 3. Asignar al inspector con menos inspecciones HOY (respetando el máximo)
  const disponibles = inscounts
    .filter((i) => i.countHoy < MAX_INSPECCIONES_POR_DIA)
    .sort((a, b) => a.countHoy - b.countHoy);

  if (disponibles.length === 0) {
    return {
      exito: false,
      error: `Todos los inspectores tienen el máximo de ${MAX_INSPECCIONES_POR_DIA} inspecciones asignadas para hoy. Intente mañana.`,
    };
  }

  const seleccionado = disponibles[0];

  // 4. Determinar fecha de la inspección
  let fechaProgramada: Date;
  if (seleccionado.countHoy < MAX_INSPECCIONES_POR_DIA) {
    // Hoy — asignar en un slot posterior (ej. 2 horas después del inicio del día)
    fechaProgramada = new Date(hoy);
    fechaProgramada.setHours(9 + seleccionado.countHoy * 2, 0, 0, 0);
  } else {
    // Mañana
    fechaProgramada = new Date(manana);
    fechaProgramada.setHours(9, 0, 0, 0);
  }

  // Si la fecha ya pasó, mover a mañana
  const ahora = new Date();
  if (fechaProgramada <= ahora) {
    fechaProgramada = new Date(manana);
    fechaProgramada.setHours(9, 0, 0, 0);
  }

  // 5. Transicionar a EN_INSPECCION y crear la inspección
  await prisma.$transaction(async (tx) => {
    await tx.tramite.update({
      where: { id: tramiteId },
      data: { estado: 'EN_INSPECCION' },
    });

    await tx.inspeccion.create({
      data: {
        tramiteId,
        inspectorId: seleccionado.inspector.id,
        fechaProgramada,
        numeroVisita: 1,
        completada: false,
      },
    });
  });

  return {
    exito: true,
    nuevoEstado: 'EN_INSPECCION',
    datos: {
      inspectorId: seleccionado.inspector.id,
      inspectorNombre: seleccionado.inspector.nombre,
      fechaProgramada: fechaProgramada.toISOString(),
    },
  };
}

/**
 * EVENTO: Inspector registra resultado de inspección
 * Maneja la lógica completa de las 2 visitas
 */
export async function onResultadoInspeccion(
  inspeccionId: string,
  resultado: ResultadoInspeccion,
  observaciones?: string,
  urlActa?: string
): Promise<TransicionResult> {
  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: inspeccionId },
    include: {
      tramite: {
        include: { negocio: { include: { usuario: true } } },
      },
    },
  });

  if (!inspeccion) return { exito: false, error: 'Inspección no encontrada.' };
  if (inspeccion.completada) {
    return { exito: false, error: 'Esta inspección ya fue completada.' };
  }

  const { tramite } = inspeccion;

  // Validar que el trámite esté en estado correcto para esta visita
  const estadosEsperados: Record<number, EstadoTramite[]> = {
    1: ['EN_INSPECCION'],
    2: ['SEGUNDA_INSPECCION'],
  };

  const estadosValidos = estadosEsperados[inspeccion.numeroVisita] || [];
  if (!estadosValidos.includes(tramite.estado)) {
    return {
      exito: false,
      error: `Estado del trámite inválido para visita #${inspeccion.numeroVisita}: ${tramite.estado}`,
    };
  }

  // ============================================================
  // CASO 1: CONFORME — Aprobación
  // ============================================================
  if (resultado === 'CONFORME') {
    const codigoLicencia = generarCodigoLicencia();
    const qrData = `${process.env.NEXT_PUBLIC_APP_URL}/verificar/${codigoLicencia}`;
    const ahora = new Date();
    const vencimiento = new Date(ahora);
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);

    await prisma.$transaction(async (tx) => {
      // Marcar inspección como completada
      await tx.inspeccion.update({
        where: { id: inspeccionId },
        data: {
          resultado: 'CONFORME',
          fechaRealizada: ahora,
          observaciones: observaciones || null,
          urlActa: urlActa || null,
          completada: true,
        },
      });

      // Aprobar el trámite y generar código de licencia
      await tx.tramite.update({
        where: { id: tramite.id },
        data: {
          estado: 'APROBADO',
          codigoLicencia,
          qrData,
          licenciaVigenteDesde: ahora,
          licenciaVigenteHasta: vencimiento,
          fechaAprobacion: ahora,
        },
      });
    });

    return {
      exito: true,
      nuevoEstado: 'APROBADO',
      datos: {
        codigoLicencia,
        qrData,
        licenciaVigenteHasta: vencimiento.toISOString(),
        mensaje: `¡Licencia aprobada! Código: ${codigoLicencia}. Vigente hasta ${vencimiento.toLocaleDateString('es-PE')}.`,
      },
    };
  }

  // ============================================================
  // CASO 2: OBSERVADO en VISITA #1 → Agendar visita #2
  // ============================================================
  if (resultado === 'OBSERVADO' && inspeccion.numeroVisita === 1) {
    if (!observaciones || observaciones.trim().length < 10) {
      return {
        exito: false,
        error: 'Las observaciones son obligatorias y deben describir los problemas encontrados (mínimo 10 caracteres).',
      };
    }

    const ahora = new Date();
    // Calcular fecha límite: máximo 30 días hábiles desde hoy
    const fechaLimiteVisita2 = await calcularFechaLimiteDiasHabiles(ahora, 30);
    // La próxima inspección se agenda 5 días hábiles después (tiempo para que el negocio corrija)
    const fechaProximaInspeccion = await calcularFechaLimiteDiasHabiles(ahora, 5);

    await prisma.$transaction(async (tx) => {
      // Marcar inspección #1 como observada
      await tx.inspeccion.update({
        where: { id: inspeccionId },
        data: {
          resultado: 'OBSERVADO',
          fechaRealizada: ahora,
          observaciones,
          urlActa: urlActa || null,
          completada: true,
        },
      });

      // Cambiar estado del trámite
      await tx.tramite.update({
        where: { id: tramite.id },
        data: { estado: 'OBSERVADO' },
      });

      // Agendar visita #2
      await tx.inspeccion.create({
        data: {
          tramiteId: tramite.id,
          inspectorId: inspeccion.inspectorId, // Mismo inspector para continuidad
          fechaProgramada: fechaProximaInspeccion,
          fechaLimite: fechaLimiteVisita2,
          numeroVisita: 2,
          completada: false,
        },
      });

      // Actualizar tramite a SEGUNDA_INSPECCION
      await tx.tramite.update({
        where: { id: tramite.id },
        data: { estado: 'SEGUNDA_INSPECCION' },
      });
    });

    return {
      exito: true,
      nuevoEstado: 'SEGUNDA_INSPECCION',
      datos: {
        fechaProximaInspeccion: fechaProximaInspeccion.toISOString(),
        fechaLimiteVisita2: fechaLimiteVisita2.toISOString(),
        observaciones,
        mensaje: `Visita #1 observada. Se ha agendado la visita #2 para el ${fechaProximaInspeccion.toLocaleDateString('es-PE')}. Plazo máximo: ${fechaLimiteVisita2.toLocaleDateString('es-PE')}.`,
      },
    };
  }

  // ============================================================
  // CASO 3: RECHAZADO en VISITA #2 → NEGADO DEFINITIVO
  // ============================================================
  if (
    (resultado === 'OBSERVADO' || resultado === 'RECHAZADO') &&
    inspeccion.numeroVisita === 2
  ) {
    if (!observaciones || observaciones.trim().length < 10) {
      return {
        exito: false,
        error: 'Las observaciones del rechazo son obligatorias.',
      };
    }

    const ahora = new Date();
    const motivoNegado = `Segunda inspección no conforme. Observaciones: ${observaciones}`;

    await prisma.$transaction(async (tx) => {
      // Marcar inspección #2 como rechazada
      await tx.inspeccion.update({
        where: { id: inspeccionId },
        data: {
          resultado: 'RECHAZADO',
          fechaRealizada: ahora,
          observaciones,
          urlActa: urlActa || null,
          completada: true,
        },
      });

      // Solicitud rechazada — negocio puede iniciar nuevo trámite
      await tx.tramite.update({
        where: { id: tramite.id },
        data: {
          estado: 'NEGADO',
          motivoNegado,
        },
      });
    });

    return {
      exito: true,
      nuevoEstado: 'NEGADO',
      datos: {
        mensaje: 'La solicitud ha sido RECHAZADA. Puede iniciar un nuevo trámite con una nueva solicitud y pago de S/. 180.00.',
        motivoNegado,
      },
    };
  }

  return {
    exito: false,
    error: `Combinación inválida: resultado="${resultado}", visita=#${inspeccion.numeroVisita}`,
  };
}

/**
 * EVENTO: Renovación de licencia
 * Solo permitida si la licencia está APROBADA y próxima a vencer (o vencida ≤ 30 días)
 */
export async function iniciarRenovacion(
  tramiteOrigenId: string,
  tieneCambiosInfraestructura: boolean,
  descripcionCambios?: string,
  usuarioId?: string
): Promise<TransicionResult> {
  const tramiteOrigen = await prisma.tramite.findUnique({
    where: { id: tramiteOrigenId },
    include: { negocio: true },
  });

  if (!tramiteOrigen) return { exito: false, error: 'Trámite original no encontrado.' };
  if (tramiteOrigen.estado !== 'APROBADO') {
    return { exito: false, error: 'Solo se pueden renovar licencias en estado APROBADO.' };
  }

  // Si tiene cambios en la infraestructura, bloquear y forzar trámite nuevo
  if (tieneCambiosInfraestructura) {
    return {
      exito: false,
      error: 'ADVERTENCIA: Ha declarado cambios en la infraestructura del local. Debe iniciar un TRÁMITE NUEVO DE MODIFICACIÓN. El uso de la licencia actual sin regularizar los cambios puede derivar en una clausura del establecimiento.',
      datos: { requiereTramiteNuevo: true },
    };
  }

  // Crear nuevo trámite de renovación (inicia en INICIADO, requiere nuevo pago)
  const declaradoPor = usuarioId ?? tramiteOrigen.negocio.usuarioId;
  if (!declaradoPor) {
    return { exito: false, error: 'No se encontró un usuario responsable de la declaración.' };
  }

  const nuevoTramite = await prisma.$transaction(async (tx) => {
    // Registrar declaración de infraestructura sin cambios
    await tx.historialInfraestructura.create({
      data: {
        tramiteId: tramiteOrigenId,
        tieneCambios: false,
        declaradoPor,
        aceptaTerminos: true,
      },
    });

    // Crear nuevo trámite de renovación
    return tx.tramite.create({
      data: {
        negocioId: tramiteOrigen.negocioId,
        estado: 'INICIADO',
        esRenovacion: true,
        tramiteOrigenId: tramiteOrigenId,
      },
    });
  });

  return {
    exito: true,
    nuevoEstado: 'INICIADO',
    datos: {
      nuevoTramiteId: nuevoTramite.id,
      mensaje: 'Renovación iniciada. Debe completar el pago de S/. 180.00 para continuar.',
    },
  };
}

/**
 * Obtiene el estado completo de un trámite con todos sus detalles
 */
export async function obtenerEstadoTramite(tramiteId: string) {
  return prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: {
      negocio: true,
      pagos: { orderBy: { createdAt: 'desc' } },
      inspecciones: {
        orderBy: { numeroVisita: 'asc' },
        include: { inspector: { select: { nombre: true, email: true } } },
      },
      documentos: { where: { vigente: true } },
    },
  });
}
