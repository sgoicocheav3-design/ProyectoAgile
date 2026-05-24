import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * GET /api/comentarios?inspeccionId=xxx
 * Lista los comentarios de una inspección (solo inspector/admin)
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const inspeccionId = request.nextUrl.searchParams.get('inspeccionId');
  if (!inspeccionId) {
    return NextResponse.json(
      { error: 'El parámetro inspeccionId es requerido.' },
      { status: 400 }
    );
  }

  // Verify the inspection exists
  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: inspeccionId },
  });

  if (!inspeccion) {
    return NextResponse.json(
      { error: 'Inspección no encontrada.' },
      { status: 404 }
    );
  }

  const comentarios = await prisma.comentario.findMany({
    where: { inspeccionId },
    include: {
      autor: {
        select: { id: true, nombre: true, rol: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ comentarios });
}

const CrearComentarioSchema = z.object({
  inspeccionId: z.string().min(1, 'inspeccionId es requerido'),
  contenido: z.string().min(1, 'El contenido no puede estar vacío').max(2000),
});

/**
 * POST /api/comentarios
 * Crea un comentario en una inspección (solo inspector/admin)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const body = await request.json();
  const parseResult = CrearComentarioSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', detalle: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { inspeccionId, contenido } = parseResult.data;

  // Verify the inspection exists
  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: inspeccionId },
  });

  if (!inspeccion) {
    return NextResponse.json(
      { error: 'Inspección no encontrada.' },
      { status: 404 }
    );
  }

  const comentario = await prisma.comentario.create({
    data: {
      inspeccionId,
      autorId: session.user.id,
      contenido: contenido.trim(),
    },
    include: {
      autor: {
        select: { id: true, nombre: true, rol: true },
      },
    },
  });

  return NextResponse.json({ comentario }, { status: 201 });
}
