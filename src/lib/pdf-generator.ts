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
  qrData: string;
  numeroExpediente: string;
  // Campos extendidos para el nuevo formato
  dni?: string;
  representanteLegal?: string;
  nombreComercial?: string;
  codigoCatastral?: string;
  giro?: string;
  zonificacion?: string;
  area?: string;
  horarioAtencion?: string;
}

/**
 * Genera el PDF de la licencia como Buffer (para servir desde API route)
 * Usa jsPDF server-side
 */
export async function generarPDFLicencia(datos: DatosLicencia): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const QRCode = await import('qrcode');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 10;
  const CIUDAD = 'TRUJILLO';
  const LEY = 'N° 28976 — Ley Marco de Licencia de Funcionamiento';

  // Colores
  const AZUL_OSCURO = [15, 45, 90] as const;
  const AZUL_MEDIO = [25, 75, 135] as const;
  const AZUL_CLARO = [200, 218, 240] as const;
  const GRIS_CLARO = [230, 230, 230] as const;

  // ============================================================
  // BORDE GENERAL — línea fina gris azulada
  // ============================================================
  doc.setDrawColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
  doc.setLineWidth(0.5);
  doc.rect(4, 4, pw - 8, ph - 8);

  // ============================================================
  // FRANJA CURVA SUPERIOR (simulada con formas)
  // ============================================================
  doc.setFillColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.rect(M, M, pw - 2 * M, 28, 'F');

  // Onda decorativa debajo de la franja superior
  doc.setFillColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
  doc.moveTo(M, M + 28);
  for (let x = 0; x <= pw - 2 * M; x += 2) {
    const onda = Math.sin((x / (pw - 2 * M)) * Math.PI * 2) * 3;
    doc.lineTo(M + x, M + 28 + onda);
  }
  doc.lineTo(pw - M, M + 35);
  doc.lineTo(M, M + 35);
  doc.fill();

  // Segunda onda más clara
  doc.setFillColor(AZUL_CLARO[0], AZUL_CLARO[1], AZUL_CLARO[2]);
  doc.moveTo(M, M + 35);
  for (let x = 0; x <= pw - 2 * M; x += 2) {
    const onda = Math.sin((x / (pw - 2 * M)) * Math.PI * 4 + 1) * 2;
    doc.lineTo(M + x, M + 35 + onda);
  }
  doc.lineTo(pw - M, M + 41);
  doc.lineTo(M, M + 41);
  doc.fill();

  // ============================================================
  // ESCUDO / EMBLEMA GENÉRICO (esquina superior izquierda)
  // ============================================================
  const escudoX = M + 6;
  const escudoY = M + 3;
  const escW = 16;
  const escH = 20;

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.setFillColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);

  // Cuerpo del escudo (semiescudo redondeado)
  const cx = escudoX + escW / 2;
  doc.moveTo(cx - escW / 2, escudoY);
  doc.lineTo(cx + escW / 2, escudoY);
  doc.lineTo(cx + escW / 2, escudoY + escH * 0.6);
  // curva que cierra el escudo y lo rellena
  doc.curveTo(
    cx + escW / 2, escudoY + escH,
    cx - escW / 2, escudoY + escH,
    cx - escW / 2, escudoY + escH * 0.6
  );
  doc.fill();

  // Corona en la parte superior del escudo
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  for (let i = 0; i < 3; i++) {
    const bx = cx - 4 + i * 4;
    doc.moveTo(bx, escudoY);
    doc.lineTo(bx, escudoY - 3);
  }
  doc.stroke();

  // ============================================================
  // TEXTO DEL ENCABEZADO
  // ============================================================
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(`MUNICIPALIDAD PROVINCIAL DE ${CIUDAD}`, pw / 2 + 4, M + 12, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text('Gerencia de Desarrollo Económico', pw / 2 + 4, M + 19, { align: 'center' });
  doc.text('Subgerencia de Licencias y Comercializaciones', pw / 2 + 4, M + 24, { align: 'center' });

  // ============================================================
  // TÍTULO PRINCIPAL
  // ============================================================
  let y = M + 48;
  doc.setTextColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('LICENCIA DE FUNCIONAMIENTO', pw / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`Nro. ${datos.codigoLicencia}`, pw / 2, y, { align: 'center' });
  y += 5;
  doc.text(LEY, pw / 2, y, { align: 'center' });
  y += 8;

  // ============================================================
  // PÁRRAFO ADMINISTRATIVO
  // ============================================================
  doc.setTextColor(60, 60, 60);
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  const parrafo =
    'En uso de las facultades conferidas mediante resolución correspondiente y conforme a la normativa municipal vigente, se otorga la presente autorización de funcionamiento.';
  const parrLines = doc.splitTextToSize(parrafo, pw - 4 * M);
  doc.text(parrLines, M + 12, y);
  y += parrLines.length * 4 + 4;

  // ============================================================
  // CONCEDE A:
  // ============================================================
  doc.setTextColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('CONCEDE A:', M + 12, y);
  y += 7;

  // ============================================================
  // TABLA DE DATOS (dos columnas)
  // ============================================================
  doc.setTextColor(0, 0, 0);
  const col1X = M + 12;
  const col2X = M + 55;
  const anchoValor = pw - col2X - M - 12;

  // Línea separadora debajo de "CONCEDE A:"
  doc.setDrawColor(AZUL_CLARO[0], AZUL_CLARO[1], AZUL_CLARO[2]);
  doc.setLineWidth(0.5);
  doc.line(M + 12, y - 2, pw - M - 12, y - 2);

  const campos: { etiqueta: string; valor: string }[] = [
    { etiqueta: 'Razón Social:', valor: datos.razonSocial },
    { etiqueta: 'Doc. de Identidad / RUC:', valor: datos.ruc },
    { etiqueta: 'Representante Legal:', valor: datos.representanteLegal || datos.razonSocial },
    { etiqueta: 'Doc. de Identidad:', valor: datos.dni || datos.ruc },
    { etiqueta: 'Nombre Comercial:', valor: datos.nombreComercial || datos.razonSocial },
    { etiqueta: 'Dirección:', valor: datos.domicilioFiscal },
    { etiqueta: 'Código Catastral:', valor: datos.codigoCatastral || '—' },
    { etiqueta: 'Giro:', valor: datos.giro || 'Comercio' },
    { etiqueta: 'Zonificación:', valor: datos.zonificacion || 'Comercial' },
    { etiqueta: 'Área:', valor: datos.area || '—' },
    { etiqueta: 'Horario de Atención:', valor: datos.horarioAtencion || 'Lun — Sáb 08:00 — 22:00' },
    { etiqueta: 'Distrito:', valor: `${datos.distrito} — ${datos.provincia} — ${datos.departamento}` },
    {
      etiqueta: 'Fecha de Emisión:',
      valor: datos.fechaEmision.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima' }),
    },
    {
      etiqueta: 'Fecha de Vencimiento:',
      valor: datos.fechaVencimiento.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima' }),
    },
    { etiqueta: 'Visto el Expediente:', valor: `N° ${datos.numeroExpediente}` },
  ];

  const filaH = 4.8;
  for (const campo of campos) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(campo.etiqueta, col1X, y);

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    const valLines = doc.splitTextToSize(campo.valor, anchoValor);
    doc.text(valLines, col2X, y);
    y += valLines.length > 1 ? valLines.length * filaH * 0.7 + 1 : filaH;
  }

  // ============================================================
  // LINEA SEPARADORA
  // ============================================================
  y += 2;
  doc.setDrawColor(AZUL_CLARO[0], AZUL_CLARO[1], AZUL_CLARO[2]);
  doc.setLineWidth(0.3);
  doc.line(M + 12, y, pw - M - 12, y);
  y += 4;

  // ============================================================
  // FECHA Y FIRMA (bloque derecho)
  // ============================================================
  doc.setTextColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  const fechaTexto = `${CIUDAD}, ${datos.fechaEmision.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Lima' })}`;
  doc.text(fechaTexto, pw - M - 12, y, { align: 'right' });
  y += 8;

  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.text(`MUNICIPALIDAD PROVINCIAL DE ${CIUDAD}`, pw - M - 12, y, { align: 'right' });
  y += 4;
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.text('Subgerencia de Licencias y Comercializaciones', pw - M - 12, y, { align: 'right' });
  y += 8;

  // Línea de firma ficticia
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(pw - M - 55, y, pw - M - 12, y);
  y += 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Abog. [Nombre del Funcionario]', pw - M - 12, y, { align: 'right' });
  y += 4;
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  doc.text('Sub Gerente', pw - M - 12, y, { align: 'right' });
  y += 8;

  // ============================================================
  // CÓDIGO QR
  // ============================================================
  const qrDataUrl = await QRCode.toDataURL(datos.qrData, {
    width: 150,
    margin: 1,
    color: { dark: '#0F2D5A', light: '#ffffff' },
  });

  const qrSize = 32;
  const qrX = pw - M - 12 - qrSize;
  doc.addImage(qrDataUrl, 'PNG', qrX, y - 8, qrSize, qrSize);

  // ============================================================
  // PROHIBICIONES (bloque inferior izquierdo)
  // ============================================================
  const prohibY = ph - M - 42;
  doc.setTextColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(8);
  doc.text('PROHIBICIONES AL ESTABLECIMIENTO', M + 12, prohibY);

  doc.setTextColor(80, 80, 80);
  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.text('- Prohibido consumir bebidas alcohólicas dentro y fuera del local.', M + 12, prohibY + 5);
  doc.text('- Prohibido ocupar pasajes de circulación.', M + 12, prohibY + 9);
  doc.text('- Otras restricciones según normativa municipal vigente.', M + 12, prohibY + 13);

  doc.setTextColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(7);
  doc.text('ES OBLIGATORIO QUE SE EXHIBA EN UN LUGAR VISIBLE DEL ESTABLECIMIENTO', M + 12, prohibY + 19);

  // ============================================================
  // MARCA DE AGUA "DOCUMENTO DE MUESTRA"
  // ============================================================
  doc.saveGraphicsState();
  try {
    const GState = (doc as any).GState;
    if (GState) {
      doc.setGState(new GState({ opacity: 0.12 }));
    }
  } catch {
    // fallback si no soporta transparencia
  }
  doc.setTextColor(100, 100, 100);
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  const watermarkText = 'DOCUMENTO DE MUESTRA — SIN VALIDEZ LEGAL';
  doc.text(watermarkText, pw / 2, ph / 2, {
    align: 'center',
    angle: 45,
  } as any);
  doc.restoreGraphicsState();

  // ============================================================
  // FRANJA CURVA INFERIOR
  // ============================================================
  doc.setFillColor(AZUL_CLARO[0], AZUL_CLARO[1], AZUL_CLARO[2]);
  doc.moveTo(M, ph - M - 30);
  for (let x = 0; x <= pw - 2 * M; x += 2) {
    const onda = Math.sin((x / (pw - 2 * M)) * Math.PI * 4) * 2;
    doc.lineTo(M + x, ph - M - 30 + onda);
  }
  doc.lineTo(pw - M, ph - M - 24);
  doc.lineTo(M, ph - M - 24);
  doc.fill();

  // Onda inferior oscura
  doc.setFillColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
  doc.moveTo(M, ph - M - 24);
  for (let x = 0; x <= pw - 2 * M; x += 2) {
    const onda = Math.sin((x / (pw - 2 * M)) * Math.PI * 2) * 2.5;
    doc.lineTo(M + x, ph - M - 24 + onda);
  }
  doc.lineTo(pw - M, ph - M - 18);
  doc.lineTo(M, ph - M - 18);
  doc.fill();

  // Franja sólida oscura inferior
  doc.setFillColor(AZUL_OSCURO[0], AZUL_OSCURO[1], AZUL_OSCURO[2]);
  doc.rect(M, ph - M - 18, pw - 2 * M, 18, 'F');

  // Curva decorativa esquina inferior derecha
  doc.setFillColor(AZUL_MEDIO[0], AZUL_MEDIO[1], AZUL_MEDIO[2]);
  doc.moveTo(pw - M - 35, ph - M);
  doc.curveTo(pw - M - 10, ph - M - 10, pw - M, ph - M - 20, pw - M, ph - M - 18);
  doc.lineTo(pw - M, ph - M);
  doc.fill();

  // ============================================================
  // TEXTO DEL PIE DE PÁGINA
  // ============================================================
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'normal');
  doc.setFontSize(6);
  doc.text(
    'Plantilla referencial generada para fines académicos o de diseño. No constituye documento oficial.',
    pw / 2,
    ph - M - 4,
    { align: 'center' }
  );

  // ============================================================
  // Convertir a Buffer
  // ============================================================
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
