import type { NextConfig } from "next";

// Chromium for serverless functions, as pnpm installs it.
const CHROMIUM_BIN =
  "./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**";

// Read by playwright-core when it loads (require of a computed path): file
// tracing misses it, and every route that loaded Playwright then failed on
// Vercel (« Cannot find module …/browsers.json », 01/11/2026).
const PLAYWRIGHT_BROWSERS =
  "./node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/browsers.json";

// A route path as the picomatch glob `outputFileTracingIncludes` expects.
const routeGlob = (route: string) => route.replace(/[[\]]/g, "\\$&");

const nextConfig: NextConfig = {
  // PDF export (lib/pdf/render.ts): loaded from node_modules at run time,
  // never bundled; Chromium's compressed binary is read from its bin folder,
  // which file tracing cannot see on its own.
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    // Every route: a few bytes, and a Server Action may print after its
    // response (the Brief sent, kept as a PDF).
    "/**": [PLAYWRIGHT_BROWSERS],
    // Every route that prints a PDF (PROJ-BUG-05, export failed on Vercel).
    // The keys are picomatch globs: `[projectId]` unescaped is a character
    // class and matched no route, so nothing was ever included. The files:
    // the real folder, not the pnpm symlink `node_modules/@sparticuz/…`.
    ...Object.fromEntries(
      [
        "/api/projects/[projectId]/framing-brief",
        "/api/projects/[projectId]/strategy-documents/[documentId]",
        "/api/projects/[projectId]/marketing-reports/[reportId]",
        "/api/contracts/[contractId]/document",
        // The contract a person downloads from their page (/c/).
        "/c/[token]/contrat/[contractId]",
      ].map((route) => [routeGlob(route), [CHROMIUM_BIN]]),
    ),
    // The official SACEM 725 bulletin the formality fills, read at run time.
    [routeGlob("/api/legal/formalities/[formalityId]/document")]: [
      "./lib/legal/formalities/assets/**",
    ],
    [routeGlob("/c/[token]/bulletin/[signatureId]")]: [
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
