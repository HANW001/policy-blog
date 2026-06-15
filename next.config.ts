import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb"],
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
