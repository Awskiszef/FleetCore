import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // @ts-ignore - this is a new option for Next.js 16.x not yet in types
  allowedDevOrigins: ['192.168.1.52', '127.0.0.1'],
};

export default nextConfig;
