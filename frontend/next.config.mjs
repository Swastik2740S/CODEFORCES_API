const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://52.90.91.250:8080/api/:path*",
      },
    ];
  },
};
export default nextConfig;