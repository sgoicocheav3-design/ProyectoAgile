import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/tramites/crear
 * Crea un trámite para un negocio.
 * Solo se llama cuando el usuario hace clic en "Pagar" (Paso 3),
 * garantizando que el RUC permanezca libre hasta el momento del pago.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { negocioId } = body;

  if (!negocioId) {
    return NextResponse.json(
      { error: 'negocioId es requerido.' },
      { status: 400 }
    );
  }

  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId } });

  if (!negocio) {
    return NextResponse.json(
      { error: 'Negocio no encontrado.' },
      { status: 404 }
    );
  }

  const tramiteActivo = await prisma.tramite.findFirst({
    where: {
      negocioId,
      estado: { notIn: ['APROBADO', 'NEGADO'] },
    },
  });

  if (tramiteActivo) {
    return NextResponse.json(
      { error: 'Ya existe un trámite activo para este RUC.', tramiteId: tramiteActivo.id },
      { status: 409 }
    );
  }

  const tramite = await prisma.tramite.create({
    data: {
      negocioId,
      estado: 'INICIADO',
    },
  });

  return NextResponse.json({ tramiteId: tramite.id }, { status: 201 });
}
