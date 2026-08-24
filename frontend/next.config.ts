import type { NextConfig } from "next";
import path from "node:path";

// Every page in this app is a client component with no server rendering,
// dynamic routes, or Next-specific server features (no middleware, no
// ISR, no Image Optimization API) — it's a pure client-side SPA that
// happens to be built with Next's App Router. That means the build
// output mode can vary per target without losing anything:
//
// - Docker (docker-compose): "standalone" — a minimal Node server image.
// - Netlify: "export" — a plain static `out/` directory. Netlify's own
//   Next.js Runtime plugin didn't activate for this app (it published
//   raw files with no routing, producing 404s on every route), so a
//   static export sidesteps that entirely and is simpler for a site
//   that needs no server anyway.
// - Local dev / default build: neither — normal Next output.
const isDocker = process.env.DOCKER_BUILD === "true";
const isNetlify = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  output: isDocker ? "standalone" : isNetlify ? "export" : undefined,
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
