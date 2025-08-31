/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  output: 'export',

  // Configurações para melhorar hidratação
  reactStrictMode: true,

  // Debug: Log environment variables during build
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://querylab-backend.onrender.com/api',
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'https://querylab-backend.onrender.com',
  },

  // Configurações experimentais para melhorar hidratação
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-alert-dialog'],
  },
};

module.exports = nextConfig;
