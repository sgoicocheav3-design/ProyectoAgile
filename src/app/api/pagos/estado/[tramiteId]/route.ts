import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { tramiteId: string } }
) {
  try {
    const { tramiteId } = params;

    const pago = await prisma.pago.findFirst({
      where: { tramiteId },
      orderBy: { createdAt: 'desc' },
    });

    if (!pago) {
      return NextResponse.json({ pagado: false, estado: 'SIN_PAGO' });
    }

    const pagado = pago.estadoPago === 'APROBADO';

    return NextResponse.json({
      pagado,
      estado: pago.estadoPago,
      monto: Number(pago.monto),
      referenciaPasarela: pago.referenciaPasarela,
      fechaPago: pago.fechaPago,
    });
  } catch (error) {
    console.error('[ESTADO_PAGO] Error:', error);
    return NextResponse.json({ error: 'Error al consultar estado del pago.' }, { status: 500 });
  }
}
