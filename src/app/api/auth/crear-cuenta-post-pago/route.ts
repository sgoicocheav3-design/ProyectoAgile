import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const SolicitarBraletaSchema = z.object({
  email: z.string().email('Ingrese un email válido.'),
  nombre: z.string().min(2, 'Ingrese su nombre completo.'),
  tipoComprobante: z.enum(['BOLETA', 'FACTURA'], {
    errorMap: () => ({ message: 'Tipo de comprobante inválido. Debe ser BOLETA o FACTURA.' }),
  }),
  tramiteId: z.string().min(1, 'tramiteId es requerido.'),
});

/**
 * POST /api/auth/crear-cuenta-post-pago
 * Solicita boleta/factura DESPUÉS del pago
 * Almacena los datos del solicitante en el trámite
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parseResult = SolicitarBraletaSchema.safeParse(body);

  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0]?.message || 'Datos inválidos.';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { email, nombre, tipoComprobante, tramiteId } = parseResult.data;

  // Verificar que el trámite exista
  const tramite = await prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: { negocio: true },
  });

  if (!tramite) {
    return NextResponse.json({ error: 'Trámite no encontrado.' }, { status: 404 });
  }

  // Actualizar el trámite con los datos de la boleta/factura solicitada
  const tramiteActualizado = await prisma.tramite.update({
    where: { id: tramiteId },
    data: {
      emailSolicitante: email.toLowerCase().trim(),
      nombreSolicitante: nombre,
      tipoComprobante,
    },
    include: { negocio: true },
  });

  return NextResponse.json({
    mensaje: `Solicitud de ${tipoComprobante === 'BOLETA' ? 'boleta' : 'factura'} registrada exitosamente. Se enviará a ${email}.`,
    tramiteId: tramiteActualizado.id,
    tipoComprobante: tramiteActualizado.tipoComprobante,
  }, { status: 200 });
}
