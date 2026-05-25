import { env, requireEnv } from '@/lib/env';

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public kind: 'auth' | 'api' | 'network',
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'MercadoPagoError';
  }
}

export interface PreferenciaPagoInput {
  tramiteId: string;
  negocioRazonSocial: string;
  ruc: string;
  esRenovacion?: boolean;
  backUrlBase?: string;
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

export const MONTO_LICENCIA = 1.80;

function validateCredentials(): void {
  const token = requireEnv('MERCADOPAGO_ACCESS_TOKEN');
  if (!token.startsWith('APP_USR-')) {
    throw new MercadoPagoError(
      'El token de MercadoPago no es de producción. Debe comenzar con APP_USR-. Verifica MERCADOPAGO_ACCESS_TOKEN.',
      'auth'
    );
  }
}

async function createClient() {
  validateCredentials();
  const { MercadoPagoConfig } = await import('mercadopago');
  return new MercadoPagoConfig({
    accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
  });
}

async function handleSDKError(error: unknown): Promise<never> {
  if (error instanceof MercadoPagoError) throw error;

  const err = error as Record<string, unknown>;
  const status = typeof err.status === 'number' ? err.status : undefined;

  if (status === 401 || status === 403) {
    throw new MercadoPagoError(
      `Credenciales de MercadoPago inválidas o sin permisos (HTTP ${status}). Verifica MERCADOPAGO_ACCESS_TOKEN.`,
      'auth',
      status,
      error
    );
  }

  if (status && status >= 400 && status < 500) {
    throw new MercadoPagoError(
      `MercadoPago rechazó la solicitud (HTTP ${status}): ${err.message || err.error || 'sin detalle'}`,
      'api',
      status,
      error
    );
  }

  if (status && status >= 500) {
    throw new MercadoPagoError(
      'MercadoPago respondió con un error interno. Intenta nuevamente.',
      'api',
      status,
      error
    );
  }

  throw new MercadoPagoError(
    'Error de conexión con MercadoPago. Verifica la conectividad de red.',
    'network',
    undefined,
    error
  );
}

export async function crearPreferenciaPago(
  input: PreferenciaPagoInput
): Promise<PreferenciaPagoOutput> {
  const client = await createClient();
  const { Preference } = await import('mercadopago');
  const preference = new Preference(client);
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const backUrlBase = input.backUrlBase || `${appUrl}/contribuyente/tramite/${input.tramiteId}`;

  let result;
  try {
    result = await preference.create({
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
          success: `${backUrlBase}?pago=success`,
          failure: `${backUrlBase}?pago=failure`,
          pending: `${backUrlBase}?pago=pending`,
        },
        notification_url: `${appUrl}/api/pagos/webhook`,
        statement_descriptor: 'MPT LICENCIAS',
      },
    });
  } catch (error) {
    await handleSDKError(error);
  }

  return {
    preferenceId: result!.id!,
    initPoint: result!.init_point!,
  };
}

export async function crearPagoYapeQR(input: {
  tramiteId: string;
  negocioRazonSocial: string;
  ruc: string;
  emailContacto?: string;
}): Promise<YapePaymentData> {
  const client = await createClient();
  const { Payment } = await import('mercadopago');
  const payment = new Payment(client);
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  let result;
  try {
    result = await payment.create({
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
  } catch (error) {
    await handleSDKError(error);
  }

  const txnData = (result as any).point_of_interaction?.transaction_data;

  return {
    paymentId: result!.id!,
    qrCodeBase64: txnData?.qr_code_base64 || '',
    qrCodeText: txnData?.qr_code || '',
    ticketUrl: txnData?.ticket_url || '',
    monto: MONTO_LICENCIA,
    estado: result!.status!,
  };
}

export async function verificarPago(paymentId: string) {
  const client = await createClient();
  const { Payment } = await import('mercadopago');
  const payment = new Payment(client);
  return payment.get({ id: paymentId }) as Promise<any>;
}
