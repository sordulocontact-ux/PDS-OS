import "server-only";

import { getToolName, isToolUIPart, type UIMessage } from "ai";

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
 * answer only, by code: no function called, or a function that found
 * nothing (`gap: "missing"`) or failed (`gap: "failed"`). The row keeps
 * the part of the app, the page with its ids masked, the functions tried
 * and the time; never the question, the answer or the person.
 */
type Cause = keyof typeof assistantGaps.causes;

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

export function unansweredOf(
  messages: UIMessage[],
): { cause: Cause; tools: string[] } | null {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return null;
  const calls = last.parts.filter(isToolUIPart);
  if (calls.length === 0) return { cause: "none", tools: [] };
  const tools = [...new Set(calls.map(getToolName))];
  const gaps = calls.map((part) =>
    part.state === "output-available" ? gapOf(part.output) : null,
  );
  // Answered when one function found what was asked.
  if (gaps.some((g) => g === null)) return null;
  return { cause: gaps.includes("failed") ? "failed" : "missing", tools };
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
  try {
    await createPoGapRow({
      title: t.title(t.causes[gap.cause], partLabel),
      at: new Date().toISOString(),
      part: partLabel,
      cause: t.causes[gap.cause],
      tools: gap.tools.join(", ") || t.noTool,
      page: pagePath ? pagePath.replace(UUID, "…").slice(0, 200) : null,
      environment: environment(),
    });
  } catch (error) {
    console.error("recordUnanswered:", error);
  }
}
