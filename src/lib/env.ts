function missing(name: string): never {
  throw new Error(
    `[ENV] Falta la variable de entorno "${name}".\n\n` +
    `  En desarrollo: agrégala a tu archivo .env.local\n` +
    `  En producción (Vercel): Vercel Dashboard → Project → Settings → Environment Variables\n`
  );
}

function getOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) missing(name);
  return value;
}

function getWithFallback(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  get DATABASE_URL() { return getOrThrow('DATABASE_URL'); },
  get DIRECT_URL() { return getOrThrow('DIRECT_URL'); },
  get NEXTAUTH_SECRET() { return getOrThrow('NEXTAUTH_SECRET'); },
  get MERCADOPAGO_ACCESS_TOKEN() { return getOrThrow('MERCADOPAGO_ACCESS_TOKEN'); },
  get APIS_PERU_TOKEN() { return getOrThrow('APIS_PERU_TOKEN'); },
  get NEXT_PUBLIC_SUPABASE_URL() { return getOrThrow('NEXT_PUBLIC_SUPABASE_URL'); },
  get SUPABASE_SERVICE_ROLE_KEY() { return getOrThrow('SUPABASE_SERVICE_ROLE_KEY'); },
  get NEXT_PUBLIC_APP_URL() { return getWithFallback('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'); },
  get NEXTAUTH_URL() { return process.env.NEXTAUTH_URL || ''; },
};
