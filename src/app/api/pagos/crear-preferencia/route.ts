import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { crearPreferenciaPago, MONTO_LICENCIA, MercadoPagoError } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tramiteId } = body;

    if (!tramiteId) {
      return NextResponse.json({ error: 'tramiteId es requerido.' }, { status: 400 });
    }

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

    const pagoExistente = await prisma.pago.findFirst({
      where: {
        tramiteId,
        estadoPago: 'PENDIENTE',
      },
    });

    const preferencia = await crearPreferenciaPago({
      tramiteId,
      negocioRazonSocial: tramite.negocio.razonSocial,
      ruc: tramite.negocio.ruc,
      esRenovacion: tramite.esRenovacion,
    });

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

  } catch (error) {
    if (error instanceof MercadoPagoError) {
      const statusMap: Record<string, number> = {
        auth: 502,
        api: 502,
        network: 504,
      };
      const httpStatus = statusMap[error.kind] || 502;

      console.error(`[CREAR_PREF] Error MercadoPago (${error.kind}):`, error.message, error.cause || '');
      return NextResponse.json(
        {
          error: error.message,
          codigo: `MP_${error.kind.toUpperCase()}`,
          detalle: 'El servicio de pagos externo no está disponible.',
        },
        { status: httpStatus }
      );
    }

    console.error('[CREAR_PREF] Error interno:', error);
    return NextResponse.json(
      { error: 'Error interno al crear la preferencia de pago.' },
      { status: 500 }
    );
  }
}
