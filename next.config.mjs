/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Necesario para la imagen de Docker: genera .next/standalone con solo lo que usa.
  output: 'standalone',
};

export default nextConfig;
