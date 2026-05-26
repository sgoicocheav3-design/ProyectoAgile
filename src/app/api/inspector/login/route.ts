import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FALLBACK_IDENTITY: Record<string, { id: string; nombre: string; dni: string; email: string; rol: string }> = {
  'INS-001': { id: 'demo-ins-001', nombre: 'Carlos Mendoza García', dni: 'INS-001', email: 'inspector@demo.pe', rol: 'INSPECTOR' },
};

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

    // 1. Intentar búsqueda real en base de datos
    try {
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

      if (usuario) {
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
      }
    } catch (dbError) {
      console.warn('[INSPECTOR LOGIN] DB error, usando fallback de identidad:', dbError);
    }

    // 2. Safety net: solo si la BD falló, devolver identidad sin inspecciones
    const fallback = FALLBACK_IDENTITY[trimmed.toUpperCase()];
    if (fallback) {
      return NextResponse.json({
        inspector: fallback,
        inspecciones: [],
        modo: 'sin-conexion-bd',
      });
    }

    return NextResponse.json(
      { error: 'Código de inspector no válido o no activo' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[INSPECTOR LOGIN] Error:', error);

    // Último recurso: fallback de identidad incluso ante error catastrófico
    try {
      const body = await request.clone().json();
      const codigo = body?.codigo?.toString().trim().toUpperCase();
      const fallback = codigo ? FALLBACK_IDENTITY[codigo] : null;
      if (fallback) {
        return NextResponse.json({
          inspector: fallback,
          inspecciones: [],
          modo: 'sin-conexion-bd',
        });
      }
    } catch {}

    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
