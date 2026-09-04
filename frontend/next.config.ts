import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uploads accept files up to 25 MB (spec 028 FR-012); every request passes
  // through the proxy/middleware layer, which defaults to a 10 MB cap
  // independent of any route handler's own logic. Without raising this,
  // requests between ~10 MB and 25 MB would be silently truncated instead of
  // cleanly succeeding or failing with FR-012's size error.
  experimental: {
    proxyClientMaxBodySize: "30mb",
  },
  // @pydantic/monty (spec 037) is a native napi addon — the first one in
  // this project. Without this, Next's bundler/file-tracing can fail to
  // include the right platform binary in the deployed function output.
  serverExternalPackages: ["@pydantic/monty"],
};

export default nextConfig;
