/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server build for the container image (App Runner).
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    // Server Actions receive multipart uploads for documents.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
