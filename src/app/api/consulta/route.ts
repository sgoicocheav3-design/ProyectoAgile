import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/consulta?ruc=20XXXXXXXXX
 * Consulta PÚBLICA — devuelve solo datos generales del trámite
 * NO devuelve: dirección, comentarios, datos de pago, detalles de inspección
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ruc = searchParams.get('ruc')?.trim();

  if (!ruc || !/^\d{11}$/.test(ruc)) {
    return NextResponse.json(
      { error: 'Ingrese un RUC válido de 11 dígitos.' },
      { status: 400 }
    );
  }

  // Buscar negocio por RUC
  const negocio = await prisma.negocio.findUnique({
    where: { ruc },
    include: {
      tramites: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          estado: true,
          codigoLicencia: true,
          licenciaVigenteHasta: true,
          fechaInicio: true,
          createdAt: true,
          // NO incluir: pagos, inspecciones, documentos, motivoNegado detallado
        },
      },
    },
  });

  if (!negocio || negocio.tramites.length === 0) {
    return NextResponse.json({ tramites: [] });
  }

  // Mapear solo datos públicos (sin dirección ni datos sensibles)
  const tramitesPublicos = negocio.tramites.map((t) => ({
    id: t.id,
    estado: t.estado,
    razonSocial: negocio.razonSocial,
    ruc: negocio.ruc,
    fechaInicio: t.fechaInicio.toISOString(),
    codigoLicencia: t.codigoLicencia || undefined,
    licenciaVigenteHasta: t.licenciaVigenteHasta?.toISOString() || undefined,
  }));

  return NextResponse.json({ tramites: tramitesPublicos });
}
