/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['jspdf', 'qrcode'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https://*.mercadopago.com https://*.mercadopago.com.pe; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.mercadopago.com https://*.mercadopago.com.pe; connect-src 'self' https://*.mercadopago.com https://*.mercadopago.com.pe; img-src 'self' data: blob: https://*.mercadopago.com https://*.mercadopago.com.pe; frame-src 'self' https://*.mercadopago.com https://*.mercadopago.com.pe; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
