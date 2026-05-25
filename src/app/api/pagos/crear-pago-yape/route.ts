import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { crearPagoYapeQR, MONTO_LICENCIA, MercadoPagoError } from '@/lib/mercadopago';
import { EnvError } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tramiteId, emailContacto } = body;

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
        { error: `No se puede pagar en el estado actual: ${tramite.estado}.` },
        { status: 422 }
      );
    }

    const pagoExistente = await prisma.pago.findFirst({
      where: { tramiteId, estadoPago: 'PENDIENTE' },
    });

    const yapeData = await crearPagoYapeQR({
      tramiteId,
      negocioRazonSocial: tramite.negocio.razonSocial,
      ruc: tramite.negocio.ruc,
      emailContacto,
    });

    const pago = pagoExistente
      ? await prisma.pago.update({
          where: { id: pagoExistente.id },
          data: {
            referenciaPasarela: String(yapeData.paymentId),
          },
        })
      : await prisma.pago.create({
          data: {
            tramiteId,
            monto: MONTO_LICENCIA,
            referenciaPasarela: String(yapeData.paymentId),
            estadoPago: 'PENDIENTE',
            esRenovacion: tramite.esRenovacion,
          },
        });

    return NextResponse.json({
      pagoId: pago.id,
      paymentId: yapeData.paymentId,
      qrCodeBase64: yapeData.qrCodeBase64,
      qrCodeText: yapeData.qrCodeText,
      ticketUrl: yapeData.ticketUrl,
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

      console.error(`[YAPE_QR] Error MercadoPago (${error.kind}):`, error.message, error.cause || '');
      return NextResponse.json(
        {
          error: error.message,
          codigo: `MP_${error.kind.toUpperCase()}`,
          detalle: 'El servicio de pagos externo no está disponible.',
        },
        { status: httpStatus }
      );
    }

    if (error instanceof EnvError) {
      console.error('[YAPE_QR] Error de configuración:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.error('[YAPE_QR] Error interno:', error);
    return NextResponse.json(
      { error: 'Error interno al generar el pago.' },
      { status: 500 }
    );
  }
}
