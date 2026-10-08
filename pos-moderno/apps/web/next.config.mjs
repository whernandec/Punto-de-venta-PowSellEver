/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El paquete @pos/types se consume como TS fuente desde el monorepo.
  transpilePackages: ['@pos/types'],
};

export default nextConfig;
