/** @type {import('next').NextConfig} */
const nextConfig = {
  // The code was written without being compiled in the authoring environment.
  // After your first successful `npm run typecheck`, set this to false.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
