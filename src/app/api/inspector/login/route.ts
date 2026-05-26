import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type InspeccionFallback = {
  idTramite: string;
  contribuyente: string;
  direccion: string;
  hora: string;
};

type InspectorFallback = {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  rol: string;
};

const FALLBACK_INSPECTORES: Record<string, { inspector: InspectorFallback; inspecciones: InspeccionFallback[] }> = {
  'INS-001': {
    inspector: {
      id: 'demo-ins-001',
      nombre: 'Carlos Mendoza García',
      dni: 'INS-001',
      email: 'carlos.mendoza@mpt.gob.pe',
      rol: 'INSPECTOR',
    },
    inspecciones: [
      {
        idTramite: 'TRAM-2025-001',
        contribuyente: 'María García Torres',
        direccion: 'Av. España 1234, Trujillo',
        hora: '09:00',
      },
      {
        idTramite: 'TRAM-2025-003',
        contribuyente: 'Juan Pérez Ríos',
        direccion: 'Jr. Independencia 567, Trujillo',
        hora: '11:30',
      },
      {
        idTramite: 'TRAM-2025-005',
        contribuyente: 'Ana María Castillo',
        direccion: 'Calle Los Olivos 890, Trujillo',
        hora: '15:00',
      },
    ],
  },
  'INS-002': {
    inspector: {
      id: 'demo-ins-002',
      nombre: 'Rosa Huamán Vargas',
      dni: 'INS-002',
      email: 'rosa.huaman@mpt.gob.pe',
      rol: 'INSPECTOR',
    },
    inspecciones: [
      {
        idTramite: 'TRAM-2025-002',
        contribuyente: 'Pedro Sánchez Luján',
        direccion: 'Av. América Norte 456, Trujillo',
        hora: '08:30',
      },
      {
        idTramite: 'TRAM-2025-004',
        contribuyente: 'Luisa Fernández Paz',
        direccion: 'Calle Real 789, Trujillo',
        hora: '10:00',
      },
      {
        idTramite: 'TRAM-2025-006',
        contribuyente: 'Jorge Alvarado Díaz',
        direccion: 'Av. Larco 234, Trujillo',
        hora: '14:00',
      },
    ],
  },
  'INS-003': {
    inspector: {
      id: 'demo-ins-003',
      nombre: 'Miguel Ángel Ruiz Paredes',
      dni: 'INS-003',
      email: 'miguel.ruiz@mpt.gob.pe',
      rol: 'INSPECTOR',
    },
    inspecciones: [
      {
        idTramite: 'TRAM-2025-007',
        contribuyente: 'Carmen Torres Silva',
        direccion: 'Jr. San Martín 321, Trujillo',
        hora: '09:30',
      },
      {
        idTramite: 'TRAM-2025-008',
        contribuyente: 'Diego Ramírez Cueva',
        direccion: 'Av. Los Laureles 555, Trujillo',
        hora: '13:00',
      },
    ],
  },
};

function servirFallback(codigo: string) {
  const fallback = FALLBACK_INSPECTORES[codigo];
  if (!fallback) return null;

  return NextResponse.json({
    inspector: fallback.inspector,
    inspecciones: fallback.inspecciones.map((i) => ({
      id: `${i.idTramite}-demo`,
      idTramite: i.idTramite,
      contribuyente: i.contribuyente,
      direccion: i.direccion,
      fechaProgramada: new Date().toISOString(),
      hora: i.hora,
      numeroVisita: 1,
      resultado: null,
      ruc: '20481196515',
    })),
    modo: 'demo',
  });
}

export async function POST(request: NextRequest) {
  try {
    const { codigo } = await request.json();

    if (!codigo || typeof codigo !== 'string') {
      return NextResponse.json(
        { error: 'Código de credencial requerido.' },
        { status: 400 }
      );
    }

    const trimmed = codigo.trim().toUpperCase();

    // Intentar buscar en base de datos por DNI
    try {
      const usuario = await prisma.usuario.findFirst({
        where: {
          dni: trimmed,
          rol: { in: ['INSPECTOR', 'ADMINISTRADOR'] },
          activo: true,
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
      console.warn('[INSPECTOR LOGIN] DB error, usando fallback:', dbError);
    }

    // Fallback: si no se encontró en BD o hubo error, usar datos estáticos
    const fallback = servirFallback(trimmed);
    if (fallback) return fallback;

    return NextResponse.json(
      { error: 'Código de inspector no válido o no activo' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[INSPECTOR LOGIN] Error:', error);

    // Último recurso: intentar fallback incluso ante error catastrófico
    try {
      const body = await request.clone().json();
      const codigo = body?.codigo?.toString().trim().toUpperCase();
      const fallback = codigo ? servirFallback(codigo) : null;
      if (fallback) return fallback;
    } catch {}

    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
