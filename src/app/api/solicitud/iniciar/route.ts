import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consultarRucConRucPeru } from '@/lib/sunat';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/solicitud/iniciar
 * Flujo PÚBLICO — no requiere autenticación
 * 1. Valida RUC en SUNAT
 * 2. Crea o recupera el negocio en BD
 * 3. Crea un trámite nuevo
 * 4. Devuelve un token temporal para subida de documentos y pago
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

  // 1. Validar RUC via rucperu.com (única fuente)
  const resultado = await consultarRucConRucPeru(ruc);

  if (!resultado.valido || !resultado.data) {
    return NextResponse.json(
      { error: resultado.error, codigo: resultado.codigo },
      { status: 422 }
    );
  }

  const { data } = resultado;

  // 2. Crear o recuperar negocio
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
        // usuarioId se asigna después del pago cuando creen cuenta
      },
    });
  } else {
    // Actualizar datos SUNAT
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

  // 3. Verificar si ya hay un trámite activo para este negocio
  const tramiteActivo = await prisma.tramite.findFirst({
    where: {
      negocioId: negocio.id,
      estado: {
        notIn: ['APROBADO', 'NEGADO'],
      },
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

  // 4. Crear trámite nuevo
  const tokenTemporal = uuidv4(); // Token para autenticar operaciones sin cuenta

  const tramite = await prisma.tramite.create({
    data: {
      negocioId: negocio.id,
      estado: 'INICIADO',
    },
  });

  return NextResponse.json({
    tramiteExistente: false,
    tramiteId: tramite.id,
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
  }, { status: 201 });
}
