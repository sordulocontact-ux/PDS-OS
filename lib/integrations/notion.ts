import "server-only";

import { getServerEnv } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/http";

/**
 * Single entry point to Notion (CLAUDE.md, rule 2): the director's sent
 * feedback becomes a page of one database. Server-side only, with the app's
 * internal integration token (NOTION_TOKEN), never exposed to the browser.
 * The database must have these properties, by name and type:
 *   Titre (title) · Résumé (text) · Type (select) · Priorité (select) ·
 *   Retours (number) · Transmis par (text) · Transmis le (date) · Lien (URL)
 */

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";
// Notion's limits: 2,000 characters per text object, 100 blocks per request.
const TEXT_MAX = 2000;
const BLOCKS_MAX = 90;

export function notionConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.NOTION_TOKEN && env.NOTION_FEEDBACK_DATABASE_ID);
}

async function call(
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const { NOTION_TOKEN } = getServerEnv();
  if (!NOTION_TOKEN) throw new IntegrationError("notion", "not_configured");
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      cache: "no-store",
      headers: {
        authorization: `Bearer ${NOTION_TOKEN}`,
        "notion-version": VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new IntegrationError("notion", "unreachable");
  }
  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new IntegrationError(
      "notion",
      `http_${response.status}${typeof json.code === "string" ? `_${json.code}` : ""}`,
    );
  return json;
}

const text = (content: string) =>
  content
    .match(new RegExp(`[\\s\\S]{1,${TEXT_MAX}}`, "g"))
    ?.map((chunk) => ({ type: "text", text: { content: chunk } })) ?? [];

export type FeedbackOriginal = {
  message: string;
  pagePath: string | null;
  // "27 septembre 2026, 12:36", written by the app.
  when: string;
};

export type FeedbackPageInput = {
  title: string;
  summary: string;
  kind: string;
  priority: string;
  count: number;
  sentBy: string;
  sentOn: string; // "2026-09-27"
  link: string;
};

function properties(page: Partial<FeedbackPageInput>) {
  return {
    ...(page.title !== undefined && { Titre: { title: text(page.title) } }),
    ...(page.summary !== undefined && {
      Résumé: { rich_text: text(page.summary) },
    }),
    ...(page.kind !== undefined && { Type: { select: { name: page.kind } } }),
    ...(page.priority !== undefined && {
      Priorité: { select: { name: page.priority } },
    }),
    ...(page.count !== undefined && { Retours: { number: page.count } }),
    ...(page.sentBy !== undefined && {
      "Transmis par": { rich_text: text(page.sentBy) },
    }),
    ...(page.sentOn !== undefined && {
      "Transmis le": { date: { start: page.sentOn } },
    }),
    ...(page.link !== undefined && { Lien: { url: page.link } }),
  };
}

const originalBlocks = (originals: FeedbackOriginal[]) =>
  originals.slice(0, BLOCKS_MAX).map((o) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: text(
        `${o.when}${o.pagePath ? ` · ${o.pagePath}` : ""} — ${o.message}`,
      ),
    },
  }));

/** A new page for a sent topic, its original feedback in the body. */
export async function createFeedbackPage(
  page: FeedbackPageInput,
  originals: FeedbackOriginal[],
  heading: string,
): Promise<{ id: string; url: string | null }> {
  const { NOTION_FEEDBACK_DATABASE_ID } = getServerEnv();
  if (!NOTION_FEEDBACK_DATABASE_ID)
    throw new IntegrationError("notion", "not_configured");
  const created = await call("POST", "/pages", {
    parent: { database_id: NOTION_FEEDBACK_DATABASE_ID },
    properties: properties(page),
    children: [
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: text(heading) },
      },
      ...originalBlocks(originals),
    ],
  });
  if (typeof created.id !== "string")
    throw new IntegrationError("notion", "no_page_id");
  return {
    id: created.id,
    url: typeof created.url === "string" ? created.url : null,
  };
}

/** Updates a page: changed properties, and feedback that joined since. */
export async function updateFeedbackPage(
  pageId: string,
  page: Partial<FeedbackPageInput>,
  newOriginals: FeedbackOriginal[],
): Promise<void> {
  await call("PATCH", `/pages/${pageId}`, { properties: properties(page) });
  if (newOriginals.length > 0)
    await call("PATCH", `/blocks/${pageId}/children`, {
      children: originalBlocks(newOriginals),
    });
}
