// The points of the technical check, by kind of file (PROD-037). The same
// list as production_export_points() in the database, which refuses any
// other key. Client-safe.

import type { ExportCheckKind } from "@/lib/production/delivery/rules";

export const EXPORT_POINTS: Record<ExportCheckKind, readonly string[]> = {
  export: ["format", "codec", "ratio", "resolution", "duration", "audio"],
  subtitles: ["sync", "spelling", "language"],
  qc: ["image", "sound", "credits"],
  other: ["conformity"],
};
