import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
