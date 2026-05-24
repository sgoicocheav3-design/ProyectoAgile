import { NextRequest, NextResponse } from 'next/server';
import { consultarRucConRucPeru } from '@/lib/sunat';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/sunat/ruc?ruc=20600000000
 * Consulta el RUC via rucperu.com y valida las reglas de negocio
 * Si ya existe en BD, retorna los datos cacheados
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ruc = searchParams.get('ruc')?.trim();

  if (!ruc) {
    return NextResponse.json(
      { error: 'Parámetro "ruc" es requerido.' },
      { status: 400 }
    );
  }

  // Verificar si ya existe en BD (cache)
  const negocioExistente = await prisma.negocio.findUnique({
    where: { ruc },
    include: {
      usuario: { select: { id: true, nombre: true, email: true } },
    },
  });

  if (negocioExistente) {
    return NextResponse.json({
      fromCache: true,
      valido: negocioExistente.activo && negocioExistente.habido,
      data: {
        ruc: negocioExistente.ruc,
        razonSocial: negocioExistente.razonSocial,
        domicilioFiscal: negocioExistente.domicilioFiscal,
        departamento: negocioExistente.departamento,
        provincia: negocioExistente.provincia,
        distrito: negocioExistente.distrito,
        activo: negocioExistente.activo,
        habido: negocioExistente.habido,
      },
      propietario: negocioExistente.usuario,
    });
  }

  // Consultar via rucperu.com (única fuente, no usa APIs externas)
  const resultado = await consultarRucConRucPeru(ruc);

  if (!resultado.valido) {
    return NextResponse.json(
      {
        valido: false,
        error: resultado.error,
        codigo: resultado.codigo,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    fromCache: false,
    valido: true,
    data: resultado.data,
  });
}

/**
 * POST /api/sunat/ruc
 * Registra el negocio en BD después de validación exitosa
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { ruc } = body;

  if (!ruc) {
    return NextResponse.json({ error: 'RUC es requerido.' }, { status: 400 });
  }

  // Re-validar con rucperu.com (no confiar en datos del cliente)
  const resultado = await consultarRucConRucPeru(ruc);

  if (!resultado.valido || !resultado.data) {
    return NextResponse.json(
      { error: resultado.error, codigo: resultado.codigo },
      { status: 422 }
    );
  }

  const { data } = resultado;

  // Verificar si el RUC ya pertenece a otro usuario
  const negocioExistente = await prisma.negocio.findUnique({
    where: { ruc },
    include: { usuario: true },
  });

  if (negocioExistente && negocioExistente.usuarioId !== session.user.id) {
    return NextResponse.json(
      {
        error: 'Este RUC ya está registrado por otro contribuyente. Si cree que es un error, contacte a administración.',
      },
      { status: 409 }
    );
  }

  // Crear o actualizar el negocio
  const negocio = await prisma.negocio.upsert({
    where: { ruc },
    create: {
      ruc: data.ruc,
      razonSocial: data.razonSocial,
      domicilioFiscal: data.domicilioFiscal,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito || '',
      activo: data.estado === 'ACTIVO',
      habido: data.condicion === 'HABIDO',
      tipoContribuyente: data.tipoContribuyente,
      usuarioId: session.user.id,
    },
    update: {
      razonSocial: data.razonSocial,
      domicilioFiscal: data.domicilioFiscal,
      activo: data.estado === 'ACTIVO',
      habido: data.condicion === 'HABIDO',
    },
  });

  return NextResponse.json({ negocio }, { status: 201 });
}
