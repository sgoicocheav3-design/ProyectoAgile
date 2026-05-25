import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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
