import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { titlePlanHtml } from "@/lib/projects/title-plan/html";
import { titlePlanOf } from "@/lib/projects/title-plan/model";
import { escapeHtml } from "@/lib/strategy/documents/editorial-html";
import { createClient } from "@/lib/supabase/server";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Never indexed, never kept by a shared cache, no referrer: the token is
  // the key and the link can be withdrawn.
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  // The document is static HTML: no script runs in it.
  "Content-Security-Policy":
    "default-src 'none'; img-src https: http:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

/**
 * A title's Plan de sortie shared with the artist's team (lot 14): one
 * version, read without an account through get_shared_title_release_plan —
 * the database checks the token, its expiry and its withdrawal, and gives
 * the version's document only (never the draft, its priority, people in
 * charge, validations or working links).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/t/[token]">,
) {
  const { token } = await params;
  const parsed = z.uuid().safeParse(token);
  const supabase = await createClient();
  const { data, error } = parsed.success
    ? await supabase.rpc("get_shared_title_release_plan", {
        p_token: parsed.data,
      })
    : { data: null, error: null };
  if (error) console.error("[shared-title-plan]:", error.message);
  const content = titlePlanOf((data as { content?: unknown } | null)?.content);
  if (!content)
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(fr.app.name)}</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#000;color:#fff"><p>${escapeHtml(fr.titleReleasePlans.doc.unavailable)}</p></body></html>`,
      { status: 404, headers: HEADERS },
    );
  return new Response(titlePlanHtml(content), { headers: HEADERS });
}
