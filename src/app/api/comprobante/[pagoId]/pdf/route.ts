import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarPDFComprobante } from '@/lib/pdf-comprobante';

export async function GET(
  _request: NextRequest,
  { params }: { params: { pagoId: string } }
) {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: params.pagoId },
      include: {
        tramite: {
          include: { negocio: true },
        },
      },
    });

    if (!pago) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    if (pago.estadoPago !== 'APROBADO') {
      return NextResponse.json(
        { error: `El pago no está aprobado. Estado: ${pago.estadoPago}` },
        { status: 403 }
      );
    }

    const tramite = pago.tramite;
    const negocio = tramite.negocio;
    const isFactura = tramite.tipoComprobante === 'FACTURA';
    const serie = isFactura ? 'FFF1' : 'BBB1';
    const numero = pago.comprobanteNumero || '000000';

    const monto = Number(pago.monto);
    const valorUnitario = parseFloat((monto / 1.18).toFixed(2));
    const igv = parseFloat((monto - valorUnitario).toFixed(2));

    const pdfBuffer = await generarPDFComprobante({
      tipo: (tramite.tipoComprobante as 'BOLETA' | 'FACTURA') || 'BOLETA',
      serie,
      numero,
      rucEmisor: '20171567890',
      razonSocialEmisor: 'Municipalidad Provincial de Trujillo',
      domicilioFiscalEmisor: 'Jirón Orbegoso 517, Trujillo, La Libertad',
      clienteTipoDoc: isFactura ? 'RUC' : 'DNI',
      clienteNumDoc: isFactura ? negocio.ruc : (tramite.dniSolicitante || negocio.ruc),
      clienteDenominacion: tramite.nombreSolicitante || negocio.razonSocial,
      clienteDireccion: negocio.domicilioFiscal,
      clienteEmail: tramite.emailSolicitante || '',
      monto,
      igv,
      valorUnitario,
      fechaEmision: pago.fechaPago || new Date(),
      tramiteId: tramite.id,
    });

    const tipoLabel = isFactura ? 'factura' : 'boleta';
    const filename = `${tipoLabel}-${serie}-${numero}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('[COMPROBANTE_PDF] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar el comprobante PDF.' },
      { status: 500 }
    );
  }
}
