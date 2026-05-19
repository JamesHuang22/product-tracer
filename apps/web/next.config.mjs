/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@product-tracer/types', '@product-tracer/db'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
