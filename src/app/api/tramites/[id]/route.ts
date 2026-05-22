import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { obtenerEstadoTramite } from '@/lib/tramite-machine';
import { iniciarRenovacion } from '@/lib/tramite-machine';

/**
 * GET /api/tramites/[id]
 * Obtiene el estado completo de un trámite
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const tramite = await obtenerEstadoTramite(params.id);

  if (!tramite) {
    return NextResponse.json({ error: 'Trámite no encontrado.' }, { status: 404 });
  }

  // El contribuyente solo puede ver sus propios trámites
  if (
    session.user.rol === 'CONTRIBUYENTE' &&
    tramite.negocio.usuarioId !== session.user.id
  ) {
    return NextResponse.json({ error: 'Sin autorización.' }, { status: 403 });
  }

  return NextResponse.json({ tramite });
}
