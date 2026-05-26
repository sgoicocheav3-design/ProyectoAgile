import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calcularFechaLimiteSincrona } from '@/lib/dias-habiles';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.rol !== 'INSPECTOR' && session.user.rol !== 'ADMINISTRADOR')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nuevaFecha } = await request.json();
    if (!nuevaFecha) {
      return NextResponse.json({ error: 'Nueva fecha requerida.' }, { status: 400 });
    }

    const inspeccion = await prisma.inspeccion.findUnique({
      where: { id: params.id },
    });

    if (!inspeccion) {
      return NextResponse.json({ error: 'Inspección no encontrada.' }, { status: 404 });
    }

    if (inspeccion.completada) {
      return NextResponse.json({ error: 'No se puede reprogramar una inspección completada.' }, { status: 400 });
    }

    // Validar que la nueva fecha no exceda 30 días hábiles desde la fecha original programada
    const nueva = new Date(nuevaFecha);
    const limiteMaxima = calcularFechaLimiteSincrona(inspeccion.fechaProgramada, 30);
    
    // Setear horas al final del día para comparación justa
    nueva.setHours(23, 59, 59, 999);
    limiteMaxima.setHours(23, 59, 59, 999);

    if (nueva > limiteMaxima) {
      return NextResponse.json({ 
        error: `La nueva fecha excede el límite máximo permitido (30 días hábiles desde la fecha original). Límite: ${limiteMaxima.toLocaleDateString('es-PE')}` 
      }, { status: 400 });
    }

    // Actualizar en base de datos
    await prisma.inspeccion.update({
      where: { id: params.id },
      data: {
        fechaProgramada: new Date(nuevaFecha),
      },
    });

    return NextResponse.json({ mensaje: 'Inspección reprogramada exitosamente.' });
  } catch (error: any) {
    console.error('Error al reprogramar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
