/**
 * Generador de PDF de Licencia Municipal
 * Genera un PDF con código QR único verificable
 */

import { v4 as uuidv4 } from 'uuid';

export function generarCodigoLicencia(): string {
  // Formato: LIC-TRU-YYYYMMDD-XXXX
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '');
  const aleatorio = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `LIC-TRU-${fecha}-${aleatorio}`;
}

export interface DatosLicencia {
  codigoLicencia: string;
  razonSocial: string;
  ruc: string;
  domicilioFiscal: string;
  distrito: string;
  provincia: string;
  departamento: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
  qrData: string; // URL de verificación
  numeroExpediente: string;
}

/**
 * Genera el PDF de la licencia como Buffer (para servir desde API route)
 * Usa jsPDF server-side
 */
export async function generarPDFLicencia(datos: DatosLicencia): Promise<Buffer> {
  // jsPDF funciona en Node.js con el constructor
  const { jsPDF } = await import('jspdf');
  const QRCode = await import('qrcode');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ============================================================
  // ENCABEZADO — MUNICIPALIDAD
  // ============================================================
  // Borde decorativo exterior
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(3);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
  doc.setLineWidth(1);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Fondo del encabezado
  doc.setFillColor(0, 51, 102);
  doc.rect(8, 8, pageWidth - 16, 35, 'F');

  // Texto del encabezado
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICIPALIDAD PROVINCIAL DE TRUJILLO', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Gerencia de Desarrollo Económico', pageWidth / 2, 24, { align: 'center' });
  doc.text('Sub Gerencia de Licencias de Funcionamiento', pageWidth / 2, 29, { align: 'center' });

  // ============================================================
  // TÍTULO DEL DOCUMENTO
  // ============================================================
  doc.setFillColor(255, 204, 0); // Amarillo municipal
  doc.rect(8, 43, pageWidth - 16, 14, 'F');
  doc.setTextColor(0, 51, 102);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LICENCIA DE FUNCIONAMIENTO', pageWidth / 2, 53, { align: 'center' });

  // ============================================================
  // DATOS DEL NEGOCIO
  // ============================================================
  doc.setTextColor(0, 0, 0);
  const inicioContenido = 68;
  const margenIzq = 20;
  const anchoEtiqueta = 55;

  const campos = [
    { etiqueta: 'N° de Licencia:', valor: datos.codigoLicencia },
    { etiqueta: 'N° Expediente:', valor: datos.numeroExpediente },
    { etiqueta: 'Razón Social / Nombre:', valor: datos.razonSocial },
    { etiqueta: 'RUC:', valor: datos.ruc },
    { etiqueta: 'Dirección del Local:', valor: datos.domicilioFiscal },
    { etiqueta: 'Distrito:', valor: `${datos.distrito} — ${datos.provincia} — ${datos.departamento}` },
    {
      etiqueta: 'Fecha de Emisión:',
      valor: datos.fechaEmision.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Lima',
      }),
    },
    {
      etiqueta: 'Fecha de Vencimiento:',
      valor: datos.fechaVencimiento.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Lima',
      }),
    },
  ];

  let y = inicioContenido;
  for (const campo of campos) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(campo.etiqueta, margenIzq, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    // Manejar texto largo con wrap
    const lineas = doc.splitTextToSize(campo.valor, pageWidth - margenIzq - anchoEtiqueta - 45);
    doc.text(lineas, margenIzq + anchoEtiqueta, y);
    y += lineas.length > 1 ? lineas.length * 5 + 3 : 9;
  }

  // ============================================================
  // SELLO DE APROBACIÓN
  // ============================================================
  doc.setDrawColor(0, 128, 0);
  doc.setFillColor(240, 255, 240);
  doc.setLineWidth(2);
  const selloX = pageWidth - 70;
  const selloY = inicioContenido;
  doc.roundedRect(selloX, selloY, 55, 30, 3, 3, 'FD');
  doc.setTextColor(0, 100, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ APROBADO', selloX + 27.5, selloY + 10, { align: 'center' });
  doc.setFontSize(7);
  doc.text('Sistema Automatizado de', selloX + 27.5, selloY + 17, { align: 'center' });
  doc.text('Licencias Municipales', selloX + 27.5, selloY + 22, { align: 'center' });
  doc.text('MPT - 2025', selloX + 27.5, selloY + 27, { align: 'center' });

  // ============================================================
  // CÓDIGO QR
  // ============================================================
  const qrDataUrl = await QRCode.toDataURL(datos.qrData, {
    width: 150,
    margin: 1,
    color: { dark: '#003366', light: '#ffffff' },
  });

  const qrSize = 45;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = y + 10;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Escanee el código QR para verificar la autenticidad de esta licencia', pageWidth / 2, qrY + qrSize + 5, {
    align: 'center',
  });
  doc.text(datos.qrData, pageWidth / 2, qrY + qrSize + 10, {
    align: 'center',
  });

  // ============================================================
  // PIE DE PÁGINA
  // ============================================================
  const pieY = pageHeight - 30;
  doc.setFillColor(0, 51, 102);
  doc.rect(8, pieY, pageWidth - 16, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(
    'Este documento tiene validez legal. La falsificación o alteración de esta licencia constituye delito según el Código Penal Peruano.',
    pageWidth / 2,
    pieY + 7,
    { align: 'center', maxWidth: pageWidth - 30 }
  );
  doc.text(
    `Emitida digitalmente por el Sistema de Licencias Municipales — Municipalidad Provincial de Trujillo`,
    pageWidth / 2,
    pieY + 13,
    { align: 'center' }
  );

  // Convertir a Buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
