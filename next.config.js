/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

module.exports = nextConfig;
