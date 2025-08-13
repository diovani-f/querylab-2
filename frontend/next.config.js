/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  // Configurações para melhorar hidratação
  reactStrictMode: true,

  // Debug: Log environment variables during build
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://querylab-backend-production.up.railway.app/api',
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'https://querylab-backend-production.up.railway.app',
  },

  // Configurações experimentais para melhorar hidratação
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-alert-dialog'],
  },

  // Configuração do Turbopack (agora estável)
  turbopack: {}
};

module.exports = nextConfig;
