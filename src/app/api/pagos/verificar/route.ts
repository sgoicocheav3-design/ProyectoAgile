import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verificarPago, MercadoPagoError } from '@/lib/mercadopago';
import { onPagoConfirmado, asignarInspector } from '@/lib/tramite-machine';
import { EnvError } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tramiteId, paymentId } = body;

    if (!tramiteId || !paymentId) {
      return NextResponse.json(
        { error: 'tramiteId y paymentId son requeridos.' },
        { status: 400 }
      );
    }

    const pagoMP = await verificarPago(paymentId);
    const estadoMP = pagoMP.status as string;
    console.log('[VERIFICAR_PAGO] Pago verificado:', estadoMP, 'tramite:', tramiteId);

    console.log('[VERIFICAR_PAGO] Pago verificado:', estadoMP, 'tramite:', tramiteId);

    const pago = await prisma.pago.findFirst({
      where: { tramiteId, estadoPago: 'PENDIENTE' },
    });

    if (!pago) {
      return NextResponse.json(
        { pagado: true, mensaje: 'El pago ya fue procesado anteriormente.' }
      );
    }

    if (estadoMP === 'approved') {
      const appUrl = request.headers.get('origin') || undefined;
      const resultado = await onPagoConfirmado(tramiteId, pago.id, appUrl);

      if (!resultado.exito) {
        await prisma.pago.update({
          where: { id: pago.id },
          data: {
            estadoPago: 'APROBADO',
            referenciaPasarela: String(paymentId),
            fechaPago: new Date(),
          },
        });
        return NextResponse.json(
          { error: resultado.error, pagado: true },
          { status: 200 }
        );
      }

      const asignacion = await asignarInspector(tramiteId);
      if (!asignacion.exito) {
        console.warn('[VERIFICAR_PAGO] Pago OK pero sin inspector:', asignacion.error);
      }

      return NextResponse.json({
        pagado: true,
        nuevoEstado: asignacion.exito ? 'EN_INSPECCION' : 'PAGADO',
        datos: {
          ...resultado.datos,
          ...asignacion.datos,
        },
        mensaje: asignacion.exito
          ? 'Pago confirmado. Inspector asignado, pendiente de programar fecha.'
          : 'Pago confirmado. Comprobante generado.',
      });
    }

    if (estadoMP === 'rejected' || estadoMP === 'cancelled') {
      await prisma.pago.update({
        where: { id: pago.id },
        data: {
          estadoPago: 'RECHAZADO',
          referenciaPasarela: String(paymentId),
        },
      });
      return NextResponse.json(
        { pagado: false, estado: 'RECHAZADO', mensaje: 'El pago fue rechazado.' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      pagado: false,
      estado: estadoMP,
      mensaje: `El pago está en estado: ${estadoMP}`,
    });

  } catch (error) {
    if (error instanceof MercadoPagoError || error instanceof EnvError) {
      console.error('[VERIFICAR_PAGO] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error('[VERIFICAR_PAGO] Error interno:', error);
    return NextResponse.json({ error: 'Error al verificar el pago.' }, { status: 500 });
  }
}
