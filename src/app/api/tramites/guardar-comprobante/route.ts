import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const GuardarComprobanteSchema = z.object({
  tramiteId: z.string().min(1, 'tramiteId es requerido.'),
  nombre: z.string().min(2, 'Ingrese su nombre completo.'),
  email: z.string().email('Ingrese un email válido.'),
  tipoComprobante: z.enum(['BOLETA', 'FACTURA'], {
    errorMap: () => ({ message: 'Tipo de comprobante inválido. Debe ser BOLETA o FACTURA.' }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = GuardarComprobanteSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Datos inválidos.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { tramiteId, nombre, email, tipoComprobante } = parseResult.data;

    const tramite = await prisma.tramite.findUnique({
      where: { id: tramiteId },
    });

    if (!tramite) {
      return NextResponse.json({ error: 'Trámite no encontrado.' }, { status: 404 });
    }

    if (tramite.estado !== 'INICIADO' && tramite.estado !== 'DOCUMENTOS_PENDIENTES') {
      return NextResponse.json(
        { error: `No se puede modificar el comprobante en estado: ${tramite.estado}.` },
        { status: 422 }
      );
    }

    await prisma.tramite.update({
      where: { id: tramiteId },
      data: {
        emailSolicitante: email.toLowerCase().trim(),
        nombreSolicitante: nombre,
        tipoComprobante,
      },
    });

    return NextResponse.json({
      mensaje: `Datos de ${tipoComprobante === 'BOLETA' ? 'boleta' : 'factura'} guardados correctamente.`,
      tramiteId,
      tipoComprobante,
    });

  } catch (error) {
    console.error('[GUARDAR-COMPROBANTE] Error:', error);
    return NextResponse.json(
      { error: 'Error interno al guardar los datos del comprobante.' },
      { status: 500 }
    );
  }
}
