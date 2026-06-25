/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ws must stay external — webpack-bundling it breaks frame masking
    // ("t.mask is not a function") and kills Neon WebSocket connections.
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'ws', '@neondatabase/serverless'],
  },
}

export default nextConfig
