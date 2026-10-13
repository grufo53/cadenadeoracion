import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite solo se usa como base de datos local de desarrollo
  serverExternalPackages: ['@electric-sql/pglite'],
  experimental: {
    // la foto de la cadena viaja dentro del formulario (ya comprimida en el navegador)
    serverActions: { bodySizeLimit: '4mb' },
  },
};

export default nextConfig;
