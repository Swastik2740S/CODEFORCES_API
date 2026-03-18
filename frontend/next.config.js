/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",   // 🔥 CHANGE THIS
        destination: "http://3.87.22.254:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;