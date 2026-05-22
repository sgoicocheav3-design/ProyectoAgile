import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mpt: {
          azul: '#003366',
          'azul-claro': '#0055a4',
          amarillo: '#ffcc00',
        },
      },
    },
  },
  plugins: [],
};

export default config;
