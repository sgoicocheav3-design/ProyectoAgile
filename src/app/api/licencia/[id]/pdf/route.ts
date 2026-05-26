import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarPDFLicencia } from '@/lib/pdf-generator';

/**
 * GET /api/licencia/[id]/pdf
 * Genera y sirve el PDF de la licencia si el trámite está APROBADO
 * Acceso público para permitir verificación por QR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tramiteId = params.id;

  const tramite = await prisma.tramite.findUnique({
    where: { id: tramiteId },
    include: {
      negocio: true,
    },
  });

  if (!tramite) {
    return NextResponse.json({ error: 'Trámite no encontrado.' }, { status: 404 });
  }

  if (tramite.estado !== 'APROBADO') {
    return NextResponse.json(
      {
        error: `La licencia no puede ser descargada. Estado actual: ${tramite.estado}. Solo los trámites APROBADOS tienen licencia disponible.`,
      },
      { status: 403 }
    );
  }

  if (!tramite.codigoLicencia || !tramite.licenciaVigenteDesde || !tramite.licenciaVigenteHasta) {
    return NextResponse.json(
      { error: 'Datos de licencia incompletos. Contacte a administración.' },
      { status: 500 }
    );
  }

  const pdfBuffer = await generarPDFLicencia({
    codigoLicencia: tramite.codigoLicencia,
    razonSocial: tramite.negocio.razonSocial,
    ruc: tramite.negocio.ruc,
    domicilioFiscal: tramite.negocio.domicilioFiscal,
    distrito: tramite.negocio.distrito || '',
    provincia: tramite.negocio.provincia,
    departamento: tramite.negocio.departamento,
    fechaEmision: tramite.licenciaVigenteDesde,
    fechaVencimiento: tramite.licenciaVigenteHasta,
    qrData: tramite.qrData || `${process.env.NEXT_PUBLIC_APP_URL}/verificar/${tramite.codigoLicencia}`,
    numeroExpediente: tramite.id.slice(0, 12).toUpperCase(),
    dni: tramite.negocio.tipoContribuyente || undefined,
    representanteLegal: tramite.nombreSolicitante || tramite.negocio.razonSocial,
    nombreComercial: tramite.negocio.razonSocial,
    codigoCatastral: `${tramite.negocio.departamento.slice(0, 3)}-${tramite.negocio.provincia.slice(0, 3)}-${tramite.id.slice(0, 6).toUpperCase()}`,
    giro: 'Comercio / Servicios',
    zonificacion: 'Comercial',
    area: '—',
    horarioAtencion: 'Lun — Sáb 08:00 — 22:00',
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="licencia-${tramite.codigoLicencia}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-cache',
    },
  });
}
