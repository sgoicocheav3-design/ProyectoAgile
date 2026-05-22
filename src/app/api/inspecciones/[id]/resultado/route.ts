import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { onResultadoInspeccion } from '@/lib/tramite-machine';
import { z } from 'zod';

const ResultadoSchema = z.object({
  resultado: z.enum(['CONFORME', 'OBSERVADO', 'RECHAZADO']),
  observaciones: z.string().optional(),
  urlActa: z.string().url().optional(),
});

/**
 * POST /api/inspecciones/[id]/resultado
 * Solo accesible para inspectores. Registra el resultado de la visita.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR') {
    return NextResponse.json(
      { error: 'Solo inspectores pueden registrar resultados de inspección.' },
      { status: 403 }
    );
  }

  const inspeccionId = params.id;

  // Verificar que la inspección exista y pertenezca al inspector
  const inspeccion = await prisma.inspeccion.findUnique({
    where: { id: inspeccionId },
  });

  if (!inspeccion) {
    return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
  }

  if (
    session.user.rol === 'INSPECTOR' &&
    inspeccion.inspectorId !== session.user.id
  ) {
    return NextResponse.json(
      { error: 'Esta inspección no está asignada a usted.' },
      { status: 403 }
    );
  }

  // Validar body
  const body = await request.json();
  const parseResult = ResultadoSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', detalle: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { resultado, observaciones, urlActa } = parseResult.data;

  // Validación de negocio: observaciones obligatorias si no es CONFORME
  if (resultado !== 'CONFORME' && (!observaciones || observaciones.trim().length < 10)) {
    return NextResponse.json(
      {
        error: 'Las observaciones son obligatorias cuando el resultado no es CONFORME (mínimo 10 caracteres).',
      },
      { status: 422 }
    );
  }

  // Procesar resultado en la máquina de estados
  const maquinaResultado = await onResultadoInspeccion(
    inspeccionId,
    resultado,
    observaciones,
    urlActa
  );

  if (!maquinaResultado.exito) {
    return NextResponse.json(
      { error: maquinaResultado.error },
      { status: 422 }
    );
  }

  return NextResponse.json({
    exito: true,
    nuevoEstado: maquinaResultado.nuevoEstado,
    datos: maquinaResultado.datos,
    mensaje: maquinaResultado.datos?.mensaje || 'Resultado registrado correctamente.',
  });
}

/**
 * GET /api/inspecciones/[id]/resultado
 * Obtiene el detalle de una inspección
 */
export async function GET(
  request: NextRequest,
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
          negocio: { select: { razonSocial: true, ruc: true, domicilioFiscal: true } },
        },
      },
      inspector: { select: { nombre: true, email: true } },
    },
  });

  if (!inspeccion) {
    return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ inspeccion });
}
