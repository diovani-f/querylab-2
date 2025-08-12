/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */

  // Configurações para melhorar hidratação
  reactStrictMode: true,
  swcMinify: true,

  // Debug: Log environment variables during build
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://querylab-backend-production.up.railway.app/api',
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'https://querylab-backend-production.up.railway.app',
  },

  // Configurações experimentais para melhorar hidratação
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-alert-dialog'],
  },

  // Log variables during build
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      console.log('🔍 Build Environment Variables:')
      console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
      console.log('NEXT_PUBLIC_WEBSOCKET_URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL)
    }
    return config
  }
};

module.exports = nextConfig;
