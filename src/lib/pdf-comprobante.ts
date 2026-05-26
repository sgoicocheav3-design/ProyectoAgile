export interface DatosComprobante {
  tipo: 'BOLETA' | 'FACTURA';
  serie: string;
  numero: string;
  rucEmisor: string;
  razonSocialEmisor: string;
  domicilioFiscalEmisor: string;
  clienteTipoDoc: string;
  clienteNumDoc: string;
  clienteDenominacion: string;
  clienteDireccion: string;
  clienteEmail: string;
  monto: number;
  igv: number;
  valorUnitario: number;
  fechaEmision: Date;
  tramiteId: string;
}

export async function generarPDFComprobante(datos: DatosComprobante): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const tipoLabel = datos.tipo === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';

  // ============================================================
  // ENCABEZADO
  // ============================================================
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(2);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setFillColor(0, 51, 102);
  doc.rect(8, 8, pageWidth - 16, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICIPALIDAD PROVINCIAL DE TRUJILLO', pageWidth / 2, 17, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Licencias de Funcionamiento', pageWidth / 2, 23, { align: 'center' });
  doc.text('RUC: 20171567890', pageWidth / 2, 28, { align: 'center' });

  // ============================================================
  // TÍTULO — TIPO DE COMPROBANTE
  // ============================================================
  doc.setFillColor(255, 204, 0);
  doc.rect(8, 38, pageWidth - 16, 10, 'F');
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tipoLabel, pageWidth / 2, 45.5, { align: 'center' });

  // ============================================================
  // SERIE Y NÚMERO
  // ============================================================
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const serieNumero = `${datos.serie}-${datos.numero}`;
  doc.text(serieNumero, pageWidth / 2, 57, { align: 'center' });

  // ============================================================
  // DATOS DEL EMISOR
  // ============================================================
  const margenIzq = 15;
  let y = 68;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL EMISOR:', margenIzq, y);
  y += 5;
  doc.setFont('helvetica', 'normal');

  const emisorCampos = [
    { label: 'Razón Social:', value: datos.razonSocialEmisor },
    { label: 'RUC:', value: datos.rucEmisor },
    { label: 'Dirección:', value: datos.domicilioFiscalEmisor },
  ];

  for (const campo of emisorCampos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(campo.label, margenIzq, y);
    doc.setFont('helvetica', 'normal');
    doc.text(campo.value, margenIzq + 25, y);
    y += 5;
  }

  // ============================================================
  // DATOS DEL CLIENTE
  // ============================================================
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATOS DEL CLIENTE:', margenIzq, y);
  y += 5;
  doc.setFont('helvetica', 'normal');

  const clienteCampos = [
    { label: 'Documento:', value: `${datos.clienteTipoDoc}: ${datos.clienteNumDoc}` },
    { label: 'Nombre:', value: datos.clienteDenominacion },
    { label: 'Dirección:', value: datos.clienteDireccion },
    { label: 'Email:', value: datos.clienteEmail || '—' },
  ];

  for (const campo of clienteCampos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(campo.label, margenIzq, y);
    doc.setFont('helvetica', 'normal');
    doc.text(campo.value, margenIzq + 20, y);
    y += 5;
  }

  // Fecha de emisión
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Fecha Emisión:', margenIzq, y);
  doc.setFont('helvetica', 'normal');
  doc.text(
    datos.fechaEmision.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima',
    }),
    margenIzq + 22,
    y
  );
  y += 8;

  // ============================================================
  // TABLA DE ITEMS
  // ============================================================
  const tableTop = y;
  const colX = [margenIzq, 90, 130, 155, 175];
  const colWidths = [75, 40, 25, 20, 25];
  const headers = ['Descripción', 'Cantidad', 'V. Unitario', 'IGV', 'Total'];

  // Header row
  doc.setFillColor(0, 51, 102);
  doc.rect(colX[0] - 2, tableTop, pageWidth - colX[0] - 9, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');

  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], colX[i], tableTop + 4);
  }

  // Item row
  y = tableTop + 10;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.text('Derecho de Licencia Municipal de Funcionamiento', colX[0], y);
  doc.text('1.00', colX[1], y);
  doc.text(`S/. ${datos.valorUnitario.toFixed(2)}`, colX[2], y);
  doc.text(`S/. ${datos.igv.toFixed(2)}`, colX[3], y);
  doc.text(`S/. ${datos.monto.toFixed(2)}`, colX[4], y);

  // Separator line
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.line(colX[0] - 2, y, pageWidth - 11, y);

  // ============================================================
  // TOTALES
  // ============================================================
  y += 4;
  const totalX = colX[3];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Sub Total:', totalX, y);
  doc.text(`S/. ${(datos.monto - datos.igv).toFixed(2)}`, totalX + 25, y, { align: 'right' });
  y += 5;
  doc.text(`IGV (18%):`, totalX, y);
  doc.text(`S/. ${datos.igv.toFixed(2)}`, totalX + 25, y, { align: 'right' });
  y += 5;

  // Total highlight
  doc.setFillColor(0, 51, 102);
  doc.rect(totalX - 3, y - 1, 55, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', totalX, y + 4.5);
  doc.text(`S/. ${datos.monto.toFixed(2)}`, totalX + 25, y + 4.5, { align: 'right' });

  // ============================================================
  // SON (letras)
  // ============================================================
  y += 14;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const montoLetras = numeroALetras(datos.monto);
  doc.text(`Son: ${montoLetras} soles`, margenIzq, y);

  // ============================================================
  // QR
  // ============================================================
  y += 8;
  const QRCode = await import('qrcode');
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consulta?tramite=${datos.tramiteId}`;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: '#003366', light: '#ffffff' },
  });

  const qrSize = 35;
  const qrX = (pageWidth - qrSize) / 2;
  doc.addImage(qrDataUrl, 'PNG', qrX, y, qrSize, qrSize);

  y += qrSize + 5;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Escanee el código QR para verificar la autenticidad del comprobante', pageWidth / 2, y, { align: 'center' });

  // ============================================================
  // PIE DE PÁGINA
  // ============================================================
  const pieY = pageHeight - 28;
  doc.setFillColor(0, 51, 102);
  doc.rect(8, pieY, pageWidth - 16, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Este comprobante fue generado electrónicamente por el Sistema de Licencias Municipales — Municipalidad Provincial de Trujillo.',
    pageWidth / 2,
    pieY + 5,
    { align: 'center', maxWidth: pageWidth - 30 }
  );
  doc.text(
    `Comprobante: ${serieNumero} | Trámite: ${datos.tramiteId.slice(0, 12).toUpperCase()} | ${datos.fechaEmision.toLocaleDateString('es-PE')}`,
    pageWidth / 2,
    pieY + 11,
    { align: 'center' }
  );

  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

function numeroALetras(monto: number): string {
  const entero = Math.floor(monto);
  const decimal = Math.round((monto - entero) * 100);

  const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const especiales = ['once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  function convertir(n: number): string {
    if (n === 0) return 'cero';
    if (n === 100) return 'cien';

    let result = '';

    if (n >= 1000) {
      const miles = Math.floor(n / 1000);
      if (miles === 1) result += 'mil ';
      else result += convertir(miles) + ' mil ';
      n %= 1000;
    }

    if (n >= 100) {
      result += centenas[Math.floor(n / 100)] + ' ';
      n %= 100;
    }

    if (n >= 10 && n <= 19) {
      result += especiales[n - 10] + ' ';
      return result.trim();
    }

    if (n >= 10) {
      result += decenas[Math.floor(n / 10)] + ' ';
      n %= 10;
      if (n > 0) result += 'y ';
    }

    if (n > 0) {
      result += unidades[n] + ' ';
    }

    return result.trim();
  }

  if (entero === 0) {
    return `cero con ${decimal.toString().padStart(2, '0')}/100`;
  }

  return `${convertir(entero)} con ${decimal.toString().padStart(2, '0')}/100`;
}
