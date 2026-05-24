/**
 * Cliente MercadoPago para sandbox peruano
 */

export interface PreferenciaPagoInput {
  tramiteId: string;
  negocioRazonSocial: string;
  ruc: string;
  esRenovacion?: boolean;
}

export interface PreferenciaPagoOutput {
  preferenceId: string;
  initPoint: string;      // URL del checkout MP (sandbox)
  sandboxInitPoint: string;
}

const MONTO_LICENCIA = 180.00;

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
    sandboxInitPoint: result.sandbox_init_point!,
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
