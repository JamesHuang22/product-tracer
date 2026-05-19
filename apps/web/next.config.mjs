/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@product-tracer/types', '@product-tracer/db'],
  typedRoutes: true,
};

export default nextConfig;
