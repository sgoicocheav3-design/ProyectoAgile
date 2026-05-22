import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verificarPago } from '@/lib/mercadopago';
import { onPagoConfirmado } from '@/lib/tramite-machine';

/**
 * POST /api/pagos/webhook
 * Recibe notificaciones de MercadoPago y procesa el resultado del pago
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[WEBHOOK MP] Recibido:', JSON.stringify(body));

    // MercadoPago envía diferentes tipos de notificaciones
    const { type, data } = body;

    // Solo procesamos notificaciones de pagos
    if (type !== 'payment') {
      return NextResponse.json({ received: true, processed: false });
    }

    const paymentId = data?.id?.toString();
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID no encontrado' }, { status: 400 });
    }

    // Verificar el pago con la API de MercadoPago (no confiar en el webhook solo)
    const pagoMP = await verificarPago(paymentId);

    console.log('[WEBHOOK MP] Pago verificado:', pagoMP.status, pagoMP.external_reference);

    if (!pagoMP.external_reference) {
      console.error('[WEBHOOK MP] Sin external_reference en el pago');
      return NextResponse.json({ error: 'Sin referencia del trámite' }, { status: 400 });
    }

    const tramiteId = pagoMP.external_reference;

    // Buscar el registro de pago en nuestra BD
    const pago = await prisma.pago.findFirst({
      where: {
        tramiteId,
        estadoPago: 'PENDIENTE',
      },
    });

    if (!pago) {
      // Puede ser un webhook duplicado o ya procesado
      console.log('[WEBHOOK MP] Pago ya procesado o no encontrado para tramite:', tramiteId);
      return NextResponse.json({ received: true, processed: false });
    }

    // ============================================================
    // PROCESAR SEGÚN ESTADO DEL PAGO EN MERCADOPAGO
    // ============================================================
    if (pagoMP.status === 'approved') {
      // ✅ PAGO APROBADO
      const resultado = await onPagoConfirmado(tramiteId, pago.id);

      if (!resultado.exito) {
        console.error('[WEBHOOK MP] Error al procesar pago aprobado:', resultado.error);
        // Guardar el pago como aprobado igual, el error es de lógica del trámite
        await prisma.pago.update({
          where: { id: pago.id },
          data: {
            estadoPago: 'APROBADO',
            referenciaPasarela: paymentId,
            fechaPago: new Date(),
            metadatos: body as object,
          },
        });
        return NextResponse.json({ received: true, error: resultado.error }, { status: 500 });
      }

      console.log('[WEBHOOK MP] ✅ Trámite', tramiteId, 'movido a EN_INSPECCION');
      return NextResponse.json({
        received: true,
        processed: true,
        nuevoEstado: 'EN_INSPECCION',
        datos: resultado.datos,
      });

    } else if (pagoMP.status === 'rejected' || pagoMP.status === 'cancelled') {
      // ❌ PAGO RECHAZADO
      await prisma.pago.update({
        where: { id: pago.id },
        data: {
          estadoPago: 'RECHAZADO',
          referenciaPasarela: paymentId,
          metadatos: body as object,
        },
      });

      console.log('[WEBHOOK MP] ❌ Pago rechazado para tramite:', tramiteId);
      return NextResponse.json({ received: true, processed: true, status: 'rejected' });

    } else if (pagoMP.status === 'pending' || pagoMP.status === 'in_process') {
      // ⏳ PAGO PENDIENTE — actualizar referencia pero no cambiar estado
      await prisma.pago.update({
        where: { id: pago.id },
        data: {
          referenciaPasarela: paymentId,
          metadatos: body as object,
        },
      });

      return NextResponse.json({ received: true, processed: false, status: 'pending' });
    }

    return NextResponse.json({ received: true, processed: false });

  } catch (error) {
    console.error('[WEBHOOK MP] Error crítico:', error);
    // Retornar 200 para evitar que MP reintente (podría generar pagos duplicados)
    return NextResponse.json({ received: true, error: 'Error interno' }, { status: 200 });
  }
}

// MercadoPago también hace GET para verificar el endpoint
export async function GET() {
  return NextResponse.json({ status: 'webhook activo', servicio: 'Sistema Licencias MPT' });
}
