import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
    output: 'standalone',
    images: {
        domains: ['images.unsplash.com','i.ytimg.com', 'www.google.com', 'hebbkx1anhila5yf.public.blob.vercel-storage.com','encrypted-tbn0.gstatic.com',"i.imgur.com","img.clerk.com"],
      },
};

export default nextConfig;
