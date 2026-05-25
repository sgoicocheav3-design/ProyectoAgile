import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { crearPreferenciaPago, MONTO_LICENCIA } from '@/lib/mercadopago';

/**
 * POST /api/pagos/crear-preferencia
 * Crea una preferencia de pago en MercadoPago (producción)
 * No requiere autenticación — valida por tramiteId
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tramiteId } = body;

  if (!tramiteId) {
    return NextResponse.json({ error: 'tramiteId es requerido.' }, { status: 400 });
  }

  // Obtener trámite
  const tramite = await prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: { negocio: true },
  });

  if (!tramite) {
    return NextResponse.json({ error: 'Trámite no encontrado.' }, { status: 404 });
  }

  if (tramite.estado !== 'DOCUMENTOS_PENDIENTES') {
    return NextResponse.json(
      {
        error: `No se puede pagar en el estado actual: ${tramite.estado}. El trámite debe tener estado DOCUMENTOS_PENDIENTES.`,
      },
      { status: 422 }
    );
  }

  // Verificar que no haya un pago pendiente activo
  const pagoExistente = await prisma.pago.findFirst({
    where: {
      tramiteId,
      estadoPago: 'PENDIENTE',
    },
  });

  // Crear preferencia en MercadoPago
  const preferencia = await crearPreferenciaPago({
    tramiteId,
    negocioRazonSocial: tramite.negocio.razonSocial,
    ruc: tramite.negocio.ruc,
    esRenovacion: tramite.esRenovacion,
  });

  // Registrar el pago en BD (estado PENDIENTE)
  const pago = pagoExistente
    ? await prisma.pago.update({
        where: { id: pagoExistente.id },
        data: {
          preferenceId: preferencia.preferenceId,
          referenciaPasarela: null,
        },
      })
    : await prisma.pago.create({
        data: {
          tramiteId,
          monto: MONTO_LICENCIA,
          preferenceId: preferencia.preferenceId,
          estadoPago: 'PENDIENTE',
          esRenovacion: tramite.esRenovacion,
        },
      });

  return NextResponse.json({
    pagoId: pago.id,
    preferenceId: preferencia.preferenceId,
    initPoint: preferencia.initPoint,
    monto: MONTO_LICENCIA,
    moneda: 'PEN',
  });
}
