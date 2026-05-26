import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: params.id },
    include: {
      tramite: {
        include: {
          negocio: true,
          documentos: {
            where: { tipo: 'PLANO_LOCAL', vigente: true },
            select: { url: true, nombre: true },
          },
        },
      },
      inspector: {
        select: { id: true, nombre: true, email: true },
      },
      comentarios: {
        include: { autor: { select: { nombre: true, rol: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!inspeccion) {
    return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
  }

  if (
    session.user.rol !== 'ADMINISTRADOR' &&
    inspeccion.inspectorId !== session.user.id
  ) {
    return NextResponse.json({ error: 'No tiene acceso a esta inspección.' }, { status: 403 });
  }

  return NextResponse.json({ inspeccion });
}

const ReprogramarSchema = z.object({
  fechaProgramada: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Fecha inválida',
  }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: params.id },
  });

  if (!inspeccion) {
    return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
  }

  if (inspeccion.inspectorId !== session.user.id && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'No tiene acceso a esta inspección.' }, { status: 403 });
  }

  if (inspeccion.completada) {
    return NextResponse.json({ error: 'No se puede reprogramar una inspección ya completada.' }, { status: 422 });
  }

  const body = await request.json();
  const parseResult = ReprogramarSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Fecha inválida.' }, { status: 400 });
  }

  const nuevaFecha = new Date(parseResult.data.fechaProgramada);

  await prisma.inspeccion.update({
    where: { id: params.id },
    data: { fechaProgramada: nuevaFecha },
  });

  return NextResponse.json({
    mensaje: 'Visita reprogramada exitosamente.',
    fechaProgramada: nuevaFecha.toISOString(),
  });
}
