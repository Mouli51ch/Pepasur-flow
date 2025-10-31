/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.RPC_URL,
    NEXT_PUBLIC_UNIVERSAL_RESOLVER: process.env.UNIVERSAL_RESOLVER,
    NEXT_PUBLIC_PUBLIC_RESOLVER: process.env.PUBLIC_RESOLVER,
  },
}

module.exports = nextConfig
