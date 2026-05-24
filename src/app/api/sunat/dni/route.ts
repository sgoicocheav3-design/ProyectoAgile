import { NextRequest, NextResponse } from 'next/server';
import { consultarRucPorDni } from '@/lib/rucperu-scraper';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/sunat/dni
 * Busca RUC usando el DNI del representante/propietario
 * Utiliza rucperu.com como fuente de datos
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { dni } = body;

    if (!dni) {
      return NextResponse.json(
        { error: 'El DNI es requerido.' },
        { status: 400 }
      );
    }

    // Validar formato del DNI (8 dígitos)
    if (!/^\d{8}$/.test(dni.toString())) {
      return NextResponse.json(
        { 
          error: 'El DNI debe tener exactamente 8 dígitos.',
          codigo: 'DNI_INVALIDO'
        },
        { status: 400 }
      );
    }

    // Consultar RUC en rucperu.com usando el DNI
    const rucData = await consultarRucPorDni(dni);

    if (!rucData) {
      return NextResponse.json(
        { 
          error: 'No se encontró RUC asociado a este DNI en los registros.',
          codigo: 'RUC_NO_ENCONTRADO'
        },
        { status: 422 }
      );
    }

    // Validaciones de negocio
    const estado = (rucData.estado || '').toUpperCase().trim();
    const condicion = (rucData.condicion || '').toUpperCase().trim();
    const departamento = (rucData.departamento || '').toUpperCase().trim();
    const provincia = (rucData.provincia || '').toUpperCase().trim();

    // Regla 1: Debe estar ACTIVO
    if (estado !== 'ACTIVO') {
      return NextResponse.json(
        { 
          error: `El RUC tiene estado "${estado}". Solo se aceptan contribuyentes con estado ACTIVO.`,
          codigo: 'NO_ACTIVO',
          data: rucData
        },
        { status: 422 }
      );
    }

    // Regla 2: Debe estar HABIDO
    if (condicion !== 'HABIDO') {
      return NextResponse.json(
        { 
          error: `El RUC tiene condición "${condicion}". Solo se aceptan contribuyentes con condición HABIDO.`,
          codigo: 'NO_HABIDO',
          data: rucData
        },
        { status: 422 }
      );
    }

    // Regla 3: Ámbito geográfico — Solo Provincia de Trujillo, Departamento La Libertad
    const esDepartamentoValido =
      departamento === 'LA LIBERTAD' ||
      departamento.includes('LIBERTAD');

    const esProvinciaValida = provincia === 'TRUJILLO';

    if (!esDepartamentoValido || !esProvinciaValida) {
      return NextResponse.json(
        { 
          error: `El domicilio fiscal del RUC se encuentra en ${provincia}, ${departamento}. Este servicio es exclusivo para negocios con domicilio fiscal en la Provincia de Trujillo, Departamento La Libertad.`,
          codigo: 'FUERA_DE_TRUJILLO',
          data: rucData
        },
        { status: 422 }
      );
    }

    // Verificar si el negocio ya existe
    const negocioExistente = await prisma.negocio.findUnique({
      where: { ruc: rucData.ruc },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });

    if (negocioExistente) {
      return NextResponse.json(
        {
          valido: true,
          fromCache: true,
          ruc: rucData.ruc,
          razonSocial: rucData.razon_social,
          domicilioFiscal: rucData.direccion,
          provincia: rucData.provincia,
          departamento: rucData.departamento,
          distrito: rucData.distrito,
          propietario: negocioExistente.usuario,
          negocioId: negocioExistente.id,
        },
        { status: 200 }
      );
    }

    // Registrar el negocio en BD
    const nuevoNegocio = await prisma.negocio.create({
      data: {
        ruc: rucData.ruc,
        razonSocial: rucData.razon_social,
        domicilioFiscal: rucData.direccion,
        departamento: rucData.departamento,
        provincia: rucData.provincia,
        distrito: rucData.distrito,
        activo: estado === 'ACTIVO',
        habido: condicion === 'HABIDO',
        usuarioId: (session.user as { id: string }).id,
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });

    return NextResponse.json(
      {
        valido: true,
        fromCache: false,
        ruc: rucData.ruc,
        razonSocial: rucData.razon_social,
        domicilioFiscal: rucData.direccion,
        provincia: rucData.provincia,
        departamento: rucData.departamento,
        distrito: rucData.distrito,
        negocioId: nuevoNegocio.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[/api/sunat/dni] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
