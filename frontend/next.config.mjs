/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL;
    return backend ? [{ source: '/api/:path*', destination: `${backend}/api/:path*` }] : [];
  },
};

export default nextConfig;
