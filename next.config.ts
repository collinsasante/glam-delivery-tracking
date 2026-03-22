import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0, // never cache dynamic routes client-side
    },
  },
};

export default nextConfig;
