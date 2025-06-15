/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Enable static export for client-side only app
  distDir: 'out',
  // Disable server-side features since we're going full client-side
  experimental: {
    runtime: 'nodejs'
  }
}

module.exports = nextConfig
