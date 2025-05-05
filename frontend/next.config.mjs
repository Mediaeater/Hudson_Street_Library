/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8055',
        pathname: '/assets/**',
      },
      {
        // Production Directus URL (update when deploying)
        protocol: 'https',
        hostname: 'your-directus-instance.com',
        port: '',
        pathname: '/assets/**',
      },
    ],
  },
  // Enable static exports if needed
  // output: 'export',
  
  // Add rewrites or redirects if needed
  // async rewrites() {
  //   return [];
  // },
};

export default nextConfig;