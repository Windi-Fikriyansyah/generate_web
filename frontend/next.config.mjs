/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/storage/**',
            },
            {
                protocol: 'https',
                hostname: 'tupianpipei.online',
                pathname: '/storage/**',
            },
            {
                protocol: 'http',
                hostname: 'tupianpipei.online',
                pathname: '/storage/**',
            },
        ],
    },
};

export default nextConfig;
