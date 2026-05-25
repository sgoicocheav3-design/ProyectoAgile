/**
 * Cliente MercadoPago para producción peruana
 * Usa credenciales APP_USR- (no TEST-)
 */

export interface PreferenciaPagoInput {
  tramiteId: string;
  negocioRazonSocial: string;
  ruc: string;
  esRenovacion?: boolean;
}

export interface PreferenciaPagoOutput {
  preferenceId: string;
  initPoint: string;
}

export interface YapePaymentData {
  paymentId: number;
  qrCodeBase64: string;
  qrCodeText: string;
  ticketUrl: string;
  monto: number;
  estado: string;
}

const MONTO_LICENCIA = 1.80; // Monto fijo bloqueado del lado servidor (real: 180.00)

export async function crearPreferenciaPago(
  input: PreferenciaPagoInput
): Promise<PreferenciaPagoOutput> {
  const { MercadoPagoConfig, Preference } = await import('mercadopago');

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });

  const preference = new Preference(client);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const result = await preference.create({
    body: {
      items: [
        {
          id: `licencia-${input.tramiteId}`,
          title: input.esRenovacion
            ? `Renovación Licencia Municipal — ${input.negocioRazonSocial}`
            : `Licencia Municipal de Funcionamiento — ${input.negocioRazonSocial}`,
          description: `RUC: ${input.ruc} | Municipalidad Provincial de Trujillo`,
          quantity: 1,
          unit_price: MONTO_LICENCIA,
          currency_id: 'PEN',
        },
      ],
      payer: {
        name: input.negocioRazonSocial,
      },
      external_reference: input.tramiteId,
      back_urls: {
        success: `${appUrl}/contribuyente/tramite/${input.tramiteId}?pago=success`,
        failure: `${appUrl}/contribuyente/tramite/${input.tramiteId}?pago=failure`,
        pending: `${appUrl}/contribuyente/tramite/${input.tramiteId}?pago=pending`,
      },
      notification_url: `${appUrl}/api/pagos/webhook`,
      statement_descriptor: 'MPT LICENCIAS',
    },
  });

  return {
    preferenceId: result.id!,
    initPoint: result.init_point!,
  };
}

/**
 * Crea un pago Yape con QR dinámico.
 * El monto se fija en el servidor (1.80 PEN) y no puede modificarse desde el cliente.
 * Retorna la imagen QR en Base64 para mostrar al usuario.
 */
export async function crearPagoYapeQR(input: {
  tramiteId: string;
  negocioRazonSocial: string;
  ruc: string;
  emailContacto?: string;
}): Promise<YapePaymentData> {
  const { MercadoPagoConfig, Payment } = await import('mercadopago');

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });

  const payment = new Payment(client);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const result = await payment.create({
    body: {
      transaction_amount: MONTO_LICENCIA,
      description: `Licencia Municipal — ${input.negocioRazonSocial} (RUC: ${input.ruc})`,
      payment_method_id: 'yape',
      payer: {
        email: input.emailContacto || 'pago@licencias.munitujillo.pe',
      },
      external_reference: input.tramiteId,
      notification_url: `${appUrl}/api/pagos/webhook`,
    },
  });

  const txnData = (result as any).point_of_interaction?.transaction_data;

  return {
    paymentId: result.id!,
    qrCodeBase64: txnData?.qr_code_base64 || '',
    qrCodeText: txnData?.qr_code || '',
    ticketUrl: txnData?.ticket_url || '',
    monto: MONTO_LICENCIA,
    estado: result.status!,
  };
}

export async function verificarPago(paymentId: string) {
  const { MercadoPagoConfig, Payment } = await import('mercadopago');

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  });

  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
