/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@base-org/account'],
  webpack: (config) => {
    config.ignoreWarnings = config.ignoreWarnings ?? []
    config.ignoreWarnings.push({
      module: /storkeep-sdk[\\/]dist[\\/]index\.mjs/,
      message: /Critical dependency: the request of a dependency is an expression/,
    })
    return config
  },
  async redirects() {
    return [
      { source: '/agentvault', destination: '/economy', permanent: true },
      { source: '/agentvault/', destination: '/economy', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy',  value: 'unsafe-none' },
        ],
      },
      {
        source: '/pitch',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
    ]
  },
}

export default nextConfig
