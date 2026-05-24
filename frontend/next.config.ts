import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ["placehold.co", "storage.googleapis.com"], // Thêm domain này vào danh sách
  },
};

export default nextConfig;
