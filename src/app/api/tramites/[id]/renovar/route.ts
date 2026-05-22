import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { iniciarRenovacion } from '@/lib/tramite-machine';
import { z } from 'zod';

const RenovacionSchema = z.object({
  tieneCambiosInfraestructura: z.boolean(),
  descripcionCambios: z.string().optional(),
});

/**
 * POST /api/tramites/[id]/renovar
 * Inicia el proceso de renovación de una licencia aprobada
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = RenovacionSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { tieneCambiosInfraestructura, descripcionCambios } = parseResult.data;

  const resultado = await iniciarRenovacion(
    params.id,
    tieneCambiosInfraestructura,
    descripcionCambios,
    session.user.id
  );

  if (!resultado.exito) {
    return NextResponse.json(
      { error: resultado.error, datos: resultado.datos },
      { status: 422 }
    );
  }

  return NextResponse.json({
    exito: true,
    datos: resultado.datos,
    mensaje: resultado.datos?.mensaje,
  });
}
