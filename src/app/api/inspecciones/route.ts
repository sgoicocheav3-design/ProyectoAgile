import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/inspecciones
 * Lista las inspecciones del inspector autenticado
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Sin autorización.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const soloInspectorId = session.user.rol === 'INSPECTOR'
    ? session.user.id
    : searchParams.get('inspectorId') || undefined;

  const inspecciones = await prisma.inspeccion.findMany({
    where: soloInspectorId ? { inspectorId: soloInspectorId } : {},
    include: {
      tramite: {
        include: {
          negocio: { select: { razonSocial: true, ruc: true, domicilioFiscal: true } },
        },
      },
      inspector: { select: { nombre: true, email: true } },
    },
    orderBy: { fechaProgramada: 'asc' },
  });

  return NextResponse.json({ inspecciones });
}
