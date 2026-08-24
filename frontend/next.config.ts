import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // "standalone" output is only for the Docker image (docker-compose /
  // backend/Dockerfile-style deploys). Netlify's own Next.js runtime
  // expects the normal build output and breaks under standalone mode,
  // so this is opt-in via a build-time flag set only in the Dockerfile.
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
