import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verificarPago } from '@/lib/mercadopago';
import { onPagoConfirmado, asignarInspector } from '@/lib/tramite-machine';

/**
 * POST /api/pagos/verificar-retorno
 *
 * Se llama desde el frontend cuando MercadoPago redirige al usuario
 * de vuelta a la app (back_url con ?pago=success&payment_id=XXX).
 *
 * Consulta directamente la API de MercadoPago para obtener el estado
 * real del pago y actualiza Supabase si corresponde.
 * 
 * Esto resuelve el problema de que el webhook no llega en desarrollo
 * (localhost no es accesible desde Internet) ni cuando hay retrasos.
 */
export async function POST(request: NextRequest) {
  try {
    const appUrl = request.headers.get('origin') || undefined;
    const body = await request.json();
    const { tramiteId, paymentId, preferenceId } = body as {
      tramiteId?: string;
      paymentId?: string;
      preferenceId?: string;
    };

    if (!tramiteId) {
      return NextResponse.json({ error: 'tramiteId es requerido.' }, { status: 400 });
    }

    // Buscar el pago pendiente en la base de datos
    const pago = await prisma.pago.findFirst({
      where: { tramiteId, estadoPago: 'PENDIENTE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!pago) {
      // Puede que ya haya sido procesado por el webhook
      const pagoExistente = await prisma.pago.findFirst({
        where: { tramiteId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({
        procesado: true,
        estadoPago: pagoExistente?.estadoPago ?? 'SIN_PAGO',
        mensaje: 'El pago ya fue procesado anteriormente.',
      });
    }

    // Determinar qué ID usar para consultar la API de MercadoPago
    // MercadoPago puede enviar payment_id en la URL de retorno
    const mpPaymentId = paymentId ?? pago.referenciaPasarela;
    const mpPreferenceId = preferenceId ?? pago.preferenceId;

    // --- Estrategia 1: Verificar por payment_id (más directo) ---
    if (mpPaymentId) {
      const pagoMP = await verificarPago(mpPaymentId);
      console.log('[VERIFICAR-RETORNO] Estado MP por payment_id:', pagoMP.status, '| tramite:', tramiteId);

      return await procesarEstadoMP(pagoMP.status, tramiteId, pago.id, mpPaymentId, pagoMP, appUrl);
    }

    // --- Estrategia 2: Buscar pagos por preference_id via API de MP ---
    if (mpPreferenceId) {
      const resultado = await buscarPagoPorPreferencia(mpPreferenceId);
      if (resultado) {
        console.log('[VERIFICAR-RETORNO] Estado MP por preference_id:', resultado.status, '| tramite:', tramiteId);
        return await procesarEstadoMP(resultado.status as string, tramiteId, pago.id, resultado.id?.toString() ?? null, resultado, appUrl);
      }
    }

    // Sin información suficiente para verificar
    return NextResponse.json({
      procesado: false,
      estadoPago: 'PENDIENTE',
      mensaje: 'No se pudo verificar el pago. Se actualizará automáticamente cuando llegue la notificación de MercadoPago.',
    });

  } catch (error) {
    console.error('[VERIFICAR-RETORNO] Error:', error);
    return NextResponse.json(
      { error: 'Error al verificar el estado del pago.' },
      { status: 500 }
    );
  }
}

async function procesarEstadoMP(
  status: string,
  tramiteId: string,
  pagoId: string,
  paymentId: string | null,
  rawData: Record<string, unknown>,
  appUrl?: string
) {
  if (status === 'approved') {
    // Actualizar en BD y avanzar el trámite
    const resultado = await onPagoConfirmado(tramiteId, pagoId, appUrl);

    if (!resultado.exito) {
      // El trámite puede ya estar en un estado avanzado (race condition con webhook)
      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          estadoPago: 'APROBADO',
          referenciaPasarela: paymentId,
          fechaPago: new Date(),
          metadatos: rawData as object,
        },
      });
      console.warn('[VERIFICAR-RETORNO] onPagoConfirmado falló (posible race condition):', resultado.error);
      return NextResponse.json({
        procesado: true,
        estadoPago: 'APROBADO',
        mensaje: 'Pago registrado. El trámite será actualizado en breve.',
      });
    }

    // Asignar inspector automáticamente
    const asignacion = await asignarInspector(tramiteId);
    if (!asignacion.exito) {
      console.warn('[VERIFICAR-RETORNO] Pago OK pero sin inspector:', asignacion.error);
    }

    return NextResponse.json({
      procesado: true,
      estadoPago: 'APROBADO',
      nuevoEstadoTramite: asignacion.exito ? 'EN_INSPECCION' : 'PAGADO',
      mensaje: asignacion.exito
        ? 'Pago confirmado. Su inspección ha sido agendada.'
        : 'Pago confirmado. Se asignará un inspector en breve.',
    });

  } else if (status === 'rejected' || status === 'cancelled') {
    await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estadoPago: 'RECHAZADO',
        referenciaPasarela: paymentId,
        metadatos: rawData as object,
      },
    });

    return NextResponse.json({
      procesado: true,
      estadoPago: 'RECHAZADO',
      mensaje: 'El pago fue rechazado o cancelado. Puede intentar nuevamente.',
    });

  } else {
    // pending, in_process, etc.
    if (paymentId) {
      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          referenciaPasarela: paymentId,
          metadatos: rawData as object,
        },
      });
    }

    return NextResponse.json({
      procesado: false,
      estadoPago: 'PENDIENTE',
      mensaje: 'El pago aún está siendo procesado. Se actualizará automáticamente.',
    });
  }
}

async function buscarPagoPorPreferencia(preferenceId: string): Promise<Record<string, unknown> | null> {
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return null;

    const url = `https://api.mercadopago.com/v1/payments/search?preference_id=${encodeURIComponent(preferenceId)}&sort=date_created&criteria=desc&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as { results?: Record<string, unknown>[] };
    const results = data?.results;
    if (!results || results.length === 0) return null;

    return results[0];
  } catch {
    return null;
  }
}
