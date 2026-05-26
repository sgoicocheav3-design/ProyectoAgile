import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consultarRucConRucPeru } from '@/lib/sunat';

/**
 * POST /api/solicitud/iniciar
 * Flujo PÚBLICO — no requiere autenticación
 * Solo valida el RUC en SUNAT y crea/recupera el negocio.
 * NO crea el trámite — eso ocurre al hacer clic en "Pagar" (Paso 3).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ruc } = body;

  if (!ruc || !/^\d{11}$/.test(ruc)) {
    return NextResponse.json(
      { error: 'Ingrese un RUC válido de 11 dígitos.' },
      { status: 400 }
    );
  }

  const resultado = await consultarRucConRucPeru(ruc);

  if (!resultado.valido || !resultado.data) {
    return NextResponse.json(
      { error: resultado.error, codigo: resultado.codigo },
      { status: 422 }
    );
  }

  const { data } = resultado;

  let negocio = await prisma.negocio.findUnique({ where: { ruc } });

  if (!negocio) {
    negocio = await prisma.negocio.create({
      data: {
        ruc: data.ruc,
        razonSocial: data.razonSocial,
        domicilioFiscal: data.domicilioFiscal,
        departamento: data.departamento,
        provincia: data.provincia,
        distrito: data.distrito || '',
        activo: data.estado === 'ACTIVO',
        habido: data.condicion === 'HABIDO',
        tipoContribuyente: data.tipoContribuyente,
      },
    });
  } else {
    negocio = await prisma.negocio.update({
      where: { ruc },
      data: {
        razonSocial: data.razonSocial,
        domicilioFiscal: data.domicilioFiscal,
        activo: data.estado === 'ACTIVO',
        habido: data.condicion === 'HABIDO',
      },
    });
  }

  // Verificar (sin crear) si ya hay un trámite activo
  const tramiteActivo = await prisma.tramite.findFirst({
    where: {
      negocioId: negocio.id,
      estado: { notIn: ['APROBADO', 'NEGADO'] },
    },
  });

  if (tramiteActivo) {
    return NextResponse.json({
      tramiteExistente: true,
      tramiteId: tramiteActivo.id,
      estado: tramiteActivo.estado,
      negocio: {
        id: negocio.id,
        ruc: negocio.ruc,
        razonSocial: negocio.razonSocial,
        domicilioFiscal: negocio.domicilioFiscal,
        provincia: negocio.provincia,
      },
      mensaje: 'Ya existe un trámite activo para este RUC.',
    });
  }

  return NextResponse.json({
    tramiteExistente: false,
    negocio: {
      id: negocio.id,
      ruc: negocio.ruc,
      razonSocial: negocio.razonSocial,
      domicilioFiscal: negocio.domicilioFiscal,
      provincia: negocio.provincia,
    },
    sunatData: {
      razonSocial: data.razonSocial,
      domicilioFiscal: data.domicilioFiscal,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito,
    },
  });
}
