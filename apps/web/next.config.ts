import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Static files for the Android APK (Capacitor bundles `out/`)
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
