// What a function of PO may show under its answer besides facts and links
// (docs/ASSISTANT.md § 3 sexies, wave 1 of IA microsoft/ETUDE-USAGES-IA.md):
// a chart or a file. Built by code from the data, never by the model: the
// model only chooses which one. Client-safe: the answer reads it back from
// the function's output, which travels as JSON.

import type { DonutSlice } from "@/components/ui/donut-chart";
import type { RankedBar } from "@/components/ui/ranked-bars";
import type { MonthFlow } from "@/lib/finance/flows";
import type { TreasuryPoint } from "@/lib/finance/treasury";

export type ChartDisplay =
  | {
      kind: "treasury";
      title: string;
      points: TreasuryPoint[];
      reserveCents: number;
      low: { day: string; cents: number };
    }
  | { kind: "flows"; title: string; flows: MonthFlow[] }
  | {
      kind: "donut";
      title: string;
      totalLabel: string;
      empty: string;
      slices: DonutSlice[];
    }
  | {
      kind: "bars";
      title: string;
      empty: string;
      // How a value reads: cents of euros, or hundredths of a percent.
      unit: "money" | "percent";
      items: RankedBar[];
    };

export type FileDisplay = {
  kind: "file";
  format: "csv" | "pdf";
  // « Titres du catalogue », « Brief Mix/Master · Néons »
  label: string;
  // « 42 lignes », « PDF · 2 pages au plus »
  detail: string;
  fileName: string;
  // A GET of the app that makes the file with the viewer's session.
  href: string;
  // A text laid out as a PDF (make_pdf « texte »): sent in the request's
  // body, never in the address.
  text?: { title: string; body: string };
};

export type Display = ChartDisplay | FileDisplay;

const KINDS = new Set(["treasury", "flows", "donut", "bars", "file"]);

/** The display of a function's output, if it has a well-formed one. */
export function displayOf(output: unknown): Display | null {
  if (typeof output !== "object" || output === null) return null;
  const display = (output as { display?: unknown }).display;
  if (typeof display !== "object" || display === null) return null;
  const kind = (display as { kind?: unknown }).kind;
  if (typeof kind !== "string" || !KINDS.has(kind)) return null;
  // Only the app's own addresses: a result never points outside it.
  if (kind === "file") {
    const href = (display as { href?: unknown }).href;
    if (typeof href !== "string" || !href.startsWith("/")) return null;
  }
  return display as Display;
}
