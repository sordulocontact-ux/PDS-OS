import "server-only";

import { getToolName, isToolUIPart, type UIMessage } from "ai";

import { GAP_KINDS, type GapKind } from "@/lib/assistant/gap-tool";
import { getServerEnv } from "@/lib/env";
import { appPartOf } from "@/lib/feedback/app-part";
import { assistant } from "@/lib/i18n/fr/assistant";
import { assistantGaps } from "@/lib/i18n/fr/assistant-gaps";
import { feedback } from "@/lib/i18n/fr/feedback";
import {
  createPoGapRow,
  poGapsConfigured,
} from "@/lib/integrations/notion-po-gaps";

const fr = { assistant, assistantGaps, feedback };

/**
 * PO's unanswered questions, counted without reading the conversations
 * (audit of PO § 4.1, Sacha 07/11/2026: stored in Notion). From the last
 * answer only, by code: PO said it cannot do it yet (report_gap, with the
 * kind of request), or every function it called found nothing (`gap:
 * "missing"`) or failed (`gap: "failed"`). An answer without any function
 * is no longer counted (18/11/2026): writing, translating or explaining
 * need none. The row keeps the part of the app, the page with its ids
 * masked, the functions tried and the time; never the question, the
 * answer or the person.
 */
type Cause = keyof typeof assistantGaps.causes;
type Gap = { cause: Cause; kind: GapKind | null; tools: string[] };

const REPORT = "report_gap";

function gapOf(output: unknown): "missing" | "failed" | null {
  if (typeof output !== "object" || output === null) return null;
  const value = output as { gap?: unknown; facts?: unknown };
  if (value.gap === "missing" || value.gap === "failed") return value.gap;
  // Older functions say a failed read only in words.
  return Array.isArray(value.facts) &&
    value.facts.includes(fr.assistant.readFailed)
    ? "failed"
    : null;
}

function kindOf(output: unknown): GapKind {
  const kind = (output as { kind?: unknown } | null)?.kind;
  return GAP_KINDS.includes(kind as GapKind) ? (kind as GapKind) : "autre";
}

export function unansweredOf(messages: UIMessage[]): Gap | null {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return null;
  const calls = last.parts.filter(isToolUIPart);
  const reported = calls.find(
    (p) => getToolName(p) === REPORT && p.state === "output-available",
  );
  const reads = calls.filter((p) => getToolName(p) !== REPORT);
  const tools = [...new Set(reads.map(getToolName))];
  if (reported)
    return { cause: "cannot", kind: kindOf(reported.output), tools };
  if (reads.length === 0) return null;
  const gaps = reads.map((part) =>
    part.state === "output-available" ? gapOf(part.output) : null,
  );
  // Answered when one function found what was asked.
  if (gaps.some((g) => g === null)) return null;
  return {
    cause: gaps.includes("failed") ? "failed" : "missing",
    kind: null,
    tools,
  };
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function environment(): string {
  const t = fr.assistantGaps.environments;
  if (getServerEnv().PREPROD_TOOLS === "1") return t.preprod;
  return process.env.VERCEL_ENV === "production" ? t.production : t.local;
}

/** Writes the row; a failure is logged, never shown (the answer is given). */
export async function recordUnanswered(
  messages: UIMessage[],
  pagePath: string | null,
): Promise<void> {
  if (!poGapsConfigured()) return;
  const gap = unansweredOf(messages);
  if (!gap) return;
  const t = fr.assistantGaps;
  const part = appPartOf(pagePath);
  const partLabel = part ? fr.feedback.notion.parts[part] : null;
  const kind = gap.kind ? t.kinds[gap.kind] : null;
  try {
    await createPoGapRow({
      title: t.title(kind ?? t.causes[gap.cause], partLabel),
      at: new Date().toISOString(),
      part: partLabel,
      cause: t.causes[gap.cause],
      kind,
      tools: gap.tools.join(", ") || t.noTool,
      page: pagePath ? pagePath.replace(UUID, "…").slice(0, 200) : null,
      environment: environment(),
    });
  } catch (error) {
    console.error("recordUnanswered:", error);
  }
}
