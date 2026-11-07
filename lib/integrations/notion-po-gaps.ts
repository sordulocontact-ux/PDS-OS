import "server-only";

import { getServerEnv } from "@/lib/env";
import { call, NotionError } from "@/lib/integrations/notion";

/**
 * One unanswered question of PO, as a row of its Notion database
 * (docs/ASSISTANT.md § 4 bis). Anonymous by construction: neither the
 * question's text nor the person is ever passed here.
 */
export type PoGapRow = {
  title: string;
  /** ISO instant. */
  at: string;
  part: string | null;
  cause: string;
  tools: string;
  page: string | null;
  environment: string;
};

export function poGapsConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.NOTION_TOKEN && env.NOTION_PO_GAPS_DATABASE_ID);
}

const text = (content: string) => [
  { type: "text", text: { content: content.slice(0, 2000) } },
];

export async function createPoGapRow(row: PoGapRow): Promise<void> {
  const { NOTION_PO_GAPS_DATABASE_ID } = getServerEnv();
  if (!NOTION_PO_GAPS_DATABASE_ID) throw new NotionError("not_configured");
  await call("POST", "/pages", {
    parent: { database_id: NOTION_PO_GAPS_DATABASE_ID },
    properties: {
      Événement: { title: text(row.title) },
      Date: { date: { start: row.at } },
      ...(row.part && { Partie: { select: { name: row.part } } }),
      Cause: { select: { name: row.cause } },
      "Fonctions tentées": { rich_text: text(row.tools) },
      ...(row.page && { Page: { rich_text: text(row.page) } }),
      Environnement: { select: { name: row.environment } },
    },
  });
}
