import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function enviarComprobanteEmail(params: {
  email: string;
  nombre: string;
  tipoComprobante: 'BOLETA' | 'FACTURA';
  serieCorrelativo: string;
  pdfUrl: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[EMAIL] SMTP no configurado. Omitiendo envío a', params.email);
    return;
  }

  const tipo = params.tipoComprobante === 'BOLETA' ? 'Boleta de Venta' : 'Factura';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@munitujillo.pe';

  try {
    await transporter.sendMail({
      from: `"Municipalidad de Trujillo" <${from}>`,
      to: params.email,
      subject: `Su ${tipo} Electrónica — ${params.serieCorrelativo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #003366; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Municipalidad Provincial de Trujillo</h1>
            <p style="margin: 4px 0 0;">Sistema de Licencias de Funcionamiento</p>
          </div>
          <div style="padding: 24px; border: 1px solid #ddd;">
            <p>Hola, <strong>${params.nombre}</strong></p>
            <p>Su pago ha sido procesado exitosamente. Adjuntamos su comprobante electrónico:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; background: #f3f4f6;"><strong>Tipo:</strong></td><td style="padding: 8px;">${tipo}</td></tr>
              <tr><td style="padding: 8px; background: #f3f4f6;"><strong>Serie-Número:</strong></td><td style="padding: 8px;">${params.serieCorrelativo}</td></tr>
              <tr><td style="padding: 8px; background: #f3f4f6;"><strong>Destinatario:</strong></td><td style="padding: 8px;">${params.nombre}</td></tr>
            </table>
            <a href="${params.pdfUrl}" style="display: inline-block; background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">
              Descargar Comprobante
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Puede consultar el estado de su trámite en: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consulta">nuestro portal</a>
            </p>
          </div>
          <div style="background: #f3f4f6; padding: 12px; text-align: center; font-size: 11px; color: #666;">
            Este correo fue generado automáticamente. Por favor no responda a este mensaje.
          </div>
        </div>
      `,
    });
    console.log('[EMAIL] Comprobante enviado a:', params.email);
  } catch (error) {
    console.error('[EMAIL] Error al enviar:', error);
  }
}
