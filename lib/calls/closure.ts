// A call's report as it is closed and shared (PROJ-AMEL-01,
// docs/ARCHITECTURE.md § 4, « Clôture et partage d'un call »): what the
// report keeps, what was still to review, what a recipient reads (the whole
// report or its summary, never the raw transcription), all written by the
// code from the report and its outcomes. Pure, client-safe.

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";

const decision = z.object({
  what: z.string(),
  who: z.string().nullable(),
  why: z.string().nullable(),
});
const action = z.object({
  what: z.string(),
  who: z.string().nullable(),
  // The task it became: who does it, by when.
  assigneeName: z.string().nullable(),
  dueDate: z.string().nullable(),
});
const contentSchema = z.object({
  // The call as it was when closed: a recipient may not see the call itself.
  call: z.object({ title: z.string(), occurredAt: z.string() }).optional(),
  summary: z.string(),
  decisions: z.array(decision).default([]),
  actions: z.array(action).default([]),
  open: z.array(z.object({ what: z.string() })).default([]),
});
export type ReportContent = z.infer<typeof contentSchema>;

/** A stored content read back; null if it is not one. */
export const reportContentOf = (value: unknown): ReportContent | null => {
  const parsed = contentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export type ReportScope = "full" | "summary";
export const REPORT_SCOPES = ["full", "summary"] as const;

export type Unreviewed = {
  // Actions not turned into a task yet.
  actions: number;
  // Framing proposals of the call still waiting for a person.
  proposals: number;
};

/** The report to freeze, from the call's report and its outcomes. */
export function buildReportContent(input: {
  call: { title: string; occurredAt: string };
  summary: string;
  decisions: Array<{ what: string; who: string | null; why: string | null }>;
  actions: Array<{
    what: string;
    who: string | null;
    task: { assigneeName: string; dueDate: string } | null;
  }>;
  open: Array<{ what: string }>;
}): ReportContent {
  return {
    call: input.call,
    summary: input.summary,
    decisions: input.decisions.map((d) => ({
      what: d.what,
      who: d.who,
      why: d.why,
    })),
    actions: input.actions.map((a) => ({
      what: a.what,
      who: a.who,
      assigneeName: a.task?.assigneeName || null,
      dueDate: a.task?.dueDate ?? null,
    })),
    open: input.open.map((o) => ({ what: o.what })),
  };
}

/** What a recipient reads: the summary scope keeps the summary and the
 * decisions only. */
export function scopedReport(
  content: ReportContent,
  scope: ReportScope,
): ReportContent {
  return scope === "full"
    ? content
    : {
        call: content.call,
        summary: content.summary,
        decisions: content.decisions,
        actions: [],
        open: [],
      };
}

const day = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Europe/Paris",
  }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));

/** The report as plain text, for the e-mail written from the user's mailbox. */
export function reportText(
  content: ReportContent,
  call: { title: string; occurredAt: string },
): string {
  const t = fr.calls.closure.report;
  const lines = [
    t.heading(call.title, day(call.occurredAt)),
    "",
    t.summary,
    content.summary,
  ];
  if (content.decisions.length) {
    lines.push("", t.decisions);
    for (const d of content.decisions)
      lines.push(`- ${d.what}${d.who ? ` (${d.who})` : ""}`);
  }
  if (content.actions.length) {
    lines.push("", t.actions);
    for (const a of content.actions)
      lines.push(
        `- ${a.what}${
          a.assigneeName
            ? ` — ${a.assigneeName}${a.dueDate ? `, ${t.due(day(a.dueDate))}` : ""}`
            : a.who
              ? ` — ${a.who}`
              : ""
        }`,
      );
  }
  if (content.open.length) {
    lines.push("", t.open);
    for (const o of content.open) lines.push(`- ${o.what}`);
  }
  return lines.join("\n");
}

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** The report as a page to print in PDF (lib/pdf/render.ts). */
export function reportHtml(
  content: ReportContent,
  call: { title: string; occurredAt: string },
  version: number,
): string {
  const t = fr.calls.closure.report;
  const list = (title: string, items: string[]) =>
    items.length
      ? `<h2>${escape(title)}</h2><ul>${items.map((i) => `<li>${escape(i)}</li>`).join("")}</ul>`
      : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escape(call.title)}</title>
<style>body{font-family:system-ui,sans-serif;font-size:12pt;line-height:1.5;margin:2cm;color:#111}
h1{font-size:18pt;margin:0 0 4pt}h2{font-size:13pt;margin:18pt 0 6pt}p.meta{color:#555;margin:0 0 12pt}
li{margin:0 0 4pt}</style></head><body>
<h1>${escape(call.title)}</h1>
<p class="meta">${escape(t.meta(day(call.occurredAt), version))}</p>
<h2>${escape(t.summary)}</h2><p>${escape(content.summary).replace(/\n/g, "<br>")}</p>
${list(
  t.decisions,
  content.decisions.map((d) => `${d.what}${d.who ? ` (${d.who})` : ""}`),
)}
${list(
  t.actions,
  content.actions.map(
    (a) =>
      `${a.what}${a.assigneeName ? ` — ${a.assigneeName}${a.dueDate ? `, ${t.due(day(a.dueDate))}` : ""}` : ""}`,
  ),
)}
${list(
  t.open,
  content.open.map((o) => o.what),
)}
</body></html>`;
}
