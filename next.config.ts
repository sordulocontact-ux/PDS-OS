import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF export (lib/pdf/render.ts): loaded from node_modules at run time,
  // never bundled; Chromium's compressed binary is read from its bin folder,
  // which file tracing cannot see on its own.
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/projects/[projectId]/framing-brief": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    // The official SACEM 725 bulletin the formality fills, read at run time.
    "/api/legal/formalities/[formalityId]/document": [
      "./lib/legal/formalities/assets/**",
    ],
  },
  experimental: {
    // Client cache of rendered pages (docs/ARCHITECTURE.md § 3 bis). A page
    // visited less than 30 s ago shows again at once; a view prefetched in
    // full (ViewLink: project sections, artist tabs, list filters) stays
    // usable for 60 s, then is prefetched again on hover. Never stale after
    // a write: every Server Action that calls revalidatePath empties this
    // cache, and Realtime notifications call router.refresh().
    staleTimes: { dynamic: 30, static: 60 },
  },
};

export default nextConfig;
