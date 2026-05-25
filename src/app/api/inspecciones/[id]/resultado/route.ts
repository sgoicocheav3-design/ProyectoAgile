import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { onResultadoInspeccion } from '@/lib/tramite-machine';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json({ error: 'Solo inspectores pueden registrar resultados.' }, { status: 403 });
  }

  try {
    const inspeccionId = params.id;

    const inspeccion = await prisma.inspeccion.findUnique({
      where: { id: inspeccionId },
    });

    if (!inspeccion) {
      return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
    }

    if (inspeccion.inspectorId !== session.user.id && session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Esta inspección no le fue asignada.' }, { status: 403 });
    }

    if (inspeccion.completada) {
      return NextResponse.json({ error: 'Esta inspección ya fue completada.' }, { status: 422 });
    }

    const body = await request.json();
    const { resultado, observaciones } = body;

    if (!resultado || !['CONFORME', 'OBSERVADO', 'RECHAZADO'].includes(resultado)) {
      return NextResponse.json({ error: 'Resultado inválido. Use CONFORME, OBSERVADO o RECHAZADO.' }, { status: 400 });
    }

    const result = await onResultadoInspeccion(inspeccionId, resultado, observaciones);

    if (!result.exito) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      mensaje: result.datos?.mensaje || 'Resultado registrado exitosamente.',
      nuevoEstado: result.nuevoEstado,
      datos: result.datos,
    });

  } catch (error) {
    console.error('[RESULTADO_INSPECCION] Error:', error);
    return NextResponse.json({ error: 'Error al registrar resultado de inspección.' }, { status: 500 });
  }
}
