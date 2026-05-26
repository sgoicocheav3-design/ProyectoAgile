import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verificarPago } from '@/lib/mercadopago';
import { onPagoConfirmado, asignarInspector } from '@/lib/tramite-machine';

function verifySignature(
  bodyText: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(',');
  let ts = '';
  let v1 = '';
  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }

  if (!ts || !v1) return false;

  let body: Record<string, unknown>;
  try { body = JSON.parse(bodyText); } catch { return false; }

  const data = body.data as Record<string, unknown> | undefined;
  const manifest = `id:${data?.id ?? ''};request-id:${(body['request-id'] as string) || ''};ts:${ts};`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return expected === v1;
}

const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.clone().text();
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-signature');
      if (!signature || !verifySignature(bodyText, signature, WEBHOOK_SECRET)) {
        console.error('[WEBHOOK MP] Firma inválida — posible intento fraudulento');
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }
    }

    const body = JSON.parse(bodyText);

    console.log('[WEBHOOK MP] Recibido:', JSON.stringify(body));

    const { type, data } = body;

    if (type !== 'payment') {
      return NextResponse.json({ received: true, processed: false });
    }

    const paymentId = data?.id?.toString();
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID no encontrado' }, { status: 400 });
    }

    const pagoMP = await verificarPago(paymentId);

    console.log('[WEBHOOK MP] Pago verificado:', pagoMP.status, pagoMP.external_reference);

    if (!pagoMP.external_reference) {
      console.error('[WEBHOOK MP] Sin external_reference en el pago');
      return NextResponse.json({ error: 'Sin referencia del trámite' }, { status: 400 });
    }

    const tramiteId = pagoMP.external_reference;

    const pago = await prisma.pago.findFirst({
      where: {
        tramiteId,
        estadoPago: 'PENDIENTE',
      },
    });

    if (!pago) {
      console.log('[WEBHOOK MP] Pago ya procesado o no encontrado para tramite:', tramiteId);
      return NextResponse.json({ received: true, processed: false });
    }

    if (pagoMP.status === 'approved') {
      const resultado = await onPagoConfirmado(tramiteId, pago.id);

      if (!resultado.exito) {
        console.error('[WEBHOOK MP] Error al procesar pago aprobado:', resultado.error);
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

      // Asignar inspector automáticamente
      const asignacion = await asignarInspector(tramiteId);

      if (!asignacion.exito) {
        console.warn('[WEBHOOK MP] Pago OK pero no se pudo asignar inspector:', asignacion.error);
      }

      console.log('[WEBHOOK MP] Tramite', tramiteId, 'movido a', asignacion.exito ? 'EN_INSPECCION' : 'PAGADO');
      return NextResponse.json({
        received: true,
        processed: true,
        nuevoEstado: asignacion.exito ? 'EN_INSPECCION' : 'PAGADO',
        datos: asignacion.exito ? asignacion.datos : resultado.datos,
      });

    } else if (pagoMP.status === 'rejected' || pagoMP.status === 'cancelled') {
      await prisma.pago.update({
        where: { id: pago.id },
        data: {
          estadoPago: 'RECHAZADO',
          referenciaPasarela: paymentId,
          metadatos: body as object,
        },
      });

      console.log('[WEBHOOK MP] Pago rechazado para tramite:', tramiteId);
      return NextResponse.json({ received: true, processed: true, status: 'rejected' });

    } else if (pagoMP.status === 'pending' || pagoMP.status === 'in_process') {
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
    return NextResponse.json({ received: true, error: 'Error interno' }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'webhook activo', servicio: 'Sistema Licencias MPT' });
}
