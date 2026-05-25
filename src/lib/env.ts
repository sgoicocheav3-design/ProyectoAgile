export class EnvError extends Error {
  constructor(name: string) {
    super(
      `[ENV] Falta la variable de entorno "${name}".\n\n` +
      `  En desarrollo: agrégala a tu archivo .env.local\n` +
      `  En producción (Vercel): Vercel Dashboard → Project → Settings → Environment Variables\n`
    );
    this.name = 'EnvError';
  }
}

export function envError(name: string): Error {
  return new EnvError(name);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw envError(name);
  return value;
}

export const env = {
  get DATABASE_URL() { return process.env.DATABASE_URL || ''; },
  get DIRECT_URL() { return process.env.DIRECT_URL || ''; },
  get NEXTAUTH_SECRET() { return process.env.NEXTAUTH_SECRET || ''; },
  get MERCADOPAGO_ACCESS_TOKEN() { return process.env.MERCADOPAGO_ACCESS_TOKEN || ''; },
  get APIS_PERU_TOKEN() { return process.env.APIS_PERU_TOKEN || ''; },
  get NEXT_PUBLIC_SUPABASE_URL() { return process.env.NEXT_PUBLIC_SUPABASE_URL || ''; },
  get SUPABASE_SERVICE_ROLE_KEY() { return process.env.SUPABASE_SERVICE_ROLE_KEY || ''; },
  get NEXT_PUBLIC_APP_URL() { return process.env.NEXT_PUBLIC_APP_URL; },
  get NEXTAUTH_URL() { return process.env.NEXTAUTH_URL || ''; },
  get OPENAI_API_KEY() { return process.env.OPENAI_API_KEY || ''; },
  get NEXT_PUBLIC_ROBOFLOW_API_KEY() { return process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY || ''; },

};
