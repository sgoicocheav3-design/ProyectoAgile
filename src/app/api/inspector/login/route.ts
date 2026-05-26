import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { codigo } = await request.json();

    if (!codigo || typeof codigo !== 'string') {
      return NextResponse.json(
        { error: 'Código de credencial requerido.' },
        { status: 400 }
      );
    }

    const trimmed = codigo.trim();

    const usuario = await prisma.usuario.findFirst({
      where: {
        activo: true,
        rol: { in: ['INSPECTOR', 'ADMINISTRADOR'] },
        OR: [
          { dni: trimmed.toUpperCase() },
          { email: trimmed.toLowerCase() },
        ],
      },
      select: {
        id: true,
        nombre: true,
        dni: true,
        email: true,
        rol: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Código de inspector no válido o no activo' },
        { status: 404 }
      );
    }

    const inspecciones = await prisma.inspeccion.findMany({
      where: {
        inspectorId: usuario.id,
        completada: false,
        tramite: {
          pagos: { some: { estadoPago: 'APROBADO' } },
          documentos: { some: { tipo: 'PLANO_LOCAL', vigente: true } },
        },
      },
      include: {
        tramite: {
          include: {
            negocio: {
              select: { razonSocial: true, ruc: true, domicilioFiscal: true },
            },
          },
        },
      },
      orderBy: { fechaProgramada: 'asc' },
    });

    return NextResponse.json({
      inspector: {
        id: usuario.id,
        nombre: usuario.nombre,
        dni: usuario.dni,
        email: usuario.email,
        rol: usuario.rol,
      },
      inspecciones: inspecciones.map((i) => ({
        id: i.id,
        idTramite: i.tramite.id,
        contribuyente: i.tramite.negocio.razonSocial,
        direccion: i.tramite.negocio.domicilioFiscal,
        fechaProgramada: i.fechaProgramada.toISOString(),
        hora: i.fechaProgramada.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        numeroVisita: i.numeroVisita,
        resultado: i.resultado,
        ruc: i.tramite.negocio.ruc,
      })),
    });
  } catch (error) {
    console.error('[INSPECTOR LOGIN] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
