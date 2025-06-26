/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'passiv-brokerage-logos.s3.ca-central-1.amazonaws.com',
        pathname: '**', // Allow all paths
      },
    ],
  },
};

module.exports = nextConfig;
