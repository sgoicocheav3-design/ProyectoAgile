export interface ComprobanteDatos {
  ruc: string;
  razonSocial: string;
  domicilioFiscal: string;
  monto: number;
  tipoComprobante: 'BOLETA' | 'FACTURA';
  nombreSolicitante?: string;
  emailSolicitante?: string;
  dniSolicitante?: string;
}

export interface ComprobanteResultado {
  serie_correlativo: string;
  url_pdf: string;
  url_xml: string;
}

/**
 * Servicio de Facturación Electrónica (Mock/API Ready)
 * Genera la estructura de datos requerida por un OSE/PSE en Perú
 * para emitir Boletas y Facturas Electrónicas según normativa SUNAT.
 * El PDF real se genera on-demand en /api/comprobante/[pagoId]/pdf
 */
export async function generarComprobante(
  datos: ComprobanteDatos,
  pagoId?: string
): Promise<ComprobanteResultado> {
  const isFactura = datos.tipoComprobante === 'FACTURA';
  const tipo_de_comprobante = isFactura ? 1 : 2; // SUNAT: 1=Factura, 2=Boleta
  const serie = isFactura ? 'FFF1' : 'BBB1';

  // Generar correlativo aleatorio para simulación
  const numero = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
  const correlativo = `${serie}-${numero}`;

  // Cálculo de IGV (18%)
  const valor_unitario = parseFloat((datos.monto / 1.18).toFixed(2));
  const igv = parseFloat((datos.monto - valor_unitario).toFixed(2));

  // Para Factura: usar datos del negocio (RUC). Para Boleta: usar datos del solicitante (DNI si está disponible)
  const clienteTipoDoc = isFactura ? 6 : 1; // 6=RUC, 1=DNI
  const clienteNumDoc = isFactura ? datos.ruc : (datos.dniSolicitante || datos.ruc);
  const clienteDenominacion = datos.nombreSolicitante || datos.razonSocial;

  // JSON Estandarizado para envío a OSE/PSE (Ej. Nubefact, ApisPeru, etc)
  const payload = {
    operacion: "generar_comprobante",
    tipo_de_comprobante: tipo_de_comprobante,
    serie: serie,
    numero: parseInt(numero, 10),
    sunat_transaction: 1, // Venta Interna
    cliente_tipo_de_documento: clienteTipoDoc,
    cliente_numero_de_documento: clienteNumDoc,
    cliente_denominacion: clienteDenominacion,
    cliente_direccion: datos.domicilioFiscal,
    cliente_email: datos.emailSolicitante || "",
    fecha_de_emision: new Date().toISOString().split('T')[0],
    moneda: 1, // 1 = PEN (Soles)
    porcentaje_de_igv: 18.00,
    total_gravada: valor_unitario,
    total_igv: igv,
    total: datos.monto,
    items: [
      {
        unidad_de_medida: "NIU", // Código SUNAT para "Unidades"
        codigo: "LIC-001",
        descripcion: "Derecho de Licencia Municipal de Funcionamiento",
        cantidad: 1,
        valor_unitario: valor_unitario,
        precio_unitario: datos.monto,
        subtotal: valor_unitario,
        tipo_de_igv: 1, // Gravado - Operación Onerosa
        igv: igv,
        total: datos.monto,
      }
    ]
  };

  console.log('[Facturación] Solicitud preparada para OSE:', JSON.stringify(payload, null, 2));

  // Simular llamada de red a la API del proveedor de facturación
  await new Promise(resolve => setTimeout(resolve, 800));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const pdfUrl = pagoId
    ? `${appUrl}/api/comprobante/${pagoId}/pdf`
    : `${appUrl}/api/comprobante/unknown/pdf`;

  // Devolver el resultado con URL real hacia nuestra API de generación de PDF
  return {
    serie_correlativo: correlativo,
    url_pdf: pdfUrl,
    url_xml: pdfUrl.replace('/pdf', '/xml')
  };
}
