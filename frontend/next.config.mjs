/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL;
    const aiService = process.env.AI_SERVICE_INTERNAL_URL || 'http://ai-service:8000';
    return [
      ...(backend ? [{ source: '/api/:path*', destination: `${backend}/api/:path*` }] : []),
      { source: '/rag-lite/:path*', destination: `${aiService}/rag-lite/:path*` },
    ];
  },
};

export default nextConfig;
