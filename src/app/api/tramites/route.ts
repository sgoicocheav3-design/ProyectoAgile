import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tramites
 * Lista los trámites del usuario actual
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tramites = await prisma.tramite.findMany({
    where: {
      negocio: { usuarioId: session.user.id },
    },
    include: {
      negocio: { select: { razonSocial: true, ruc: true, domicilioFiscal: true } },
      pagos: { orderBy: { createdAt: 'desc' }, take: 1 },
      inspecciones: { orderBy: { numeroVisita: 'asc' } },
      documentos: { where: { vigente: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tramites });
}

/**
 * POST /api/tramites
 * Inicia un nuevo trámite de licencia
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { negocioId } = body;

  if (!negocioId) {
    return NextResponse.json({ error: 'negocioId es requerido.' }, { status: 400 });
  }

  // Verificar que el negocio pertenezca al usuario
  const negocio = await prisma.negocio.findUnique({
    where: { id: negocioId },
  });

  if (!negocio || negocio.usuarioId !== session.user.id) {
    return NextResponse.json(
      { error: 'Negocio no encontrado o sin autorización.' },
      { status: 403 }
    );
  }

  // Verificar que no haya un trámite activo para este negocio
  const tramiteActivo = await prisma.tramite.findFirst({
    where: {
      negocioId,
      estado: {
        notIn: ['APROBADO', 'NEGADO'],
      },
    },
  });

  if (tramiteActivo) {
    return NextResponse.json(
      {
        error: `Ya tiene un trámite activo para este negocio (Estado: ${tramiteActivo.estado}).`,
        tramiteId: tramiteActivo.id,
      },
      { status: 409 }
    );
  }

  // Crear el trámite
  const tramite = await prisma.tramite.create({
    data: {
      negocioId,
      estado: 'INICIADO',
    },
  });

  return NextResponse.json({ tramite }, { status: 201 });
}
