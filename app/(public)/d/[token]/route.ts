import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { pressKitHtml } from "@/lib/strategy/documents/press-kit-html";
import { pressKitOf } from "@/lib/strategy/documents/press-kit-model";
import { releasePlanOf } from "@/lib/strategy/documents/release-plan-model";
import {
  escapeHtml,
  releasePlanHtml,
} from "@/lib/strategy/documents/release-plan-html";
import { createClient } from "@/lib/supabase/server";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  // Never indexed, never kept by a shared cache, no referrer: the token is
  // the key and the link can be revoked.
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  // The document is static HTML: no script runs in it.
  "Content-Security-Policy":
    "default-src 'none'; img-src https: http:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

/**
 * A shared external document — Plan de sortie (ticket Stratégie § 11) or
 * Dossier de presse (§ 12) —, read without an account through
 * get_shared_strategy_document: the database checks the
 * token, its expiry and its revocation. The Brief de sortie (internal, with
 * the budget) is never readable this way.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/d/[token]">,
) {
  const { token } = await params;
  const parsed = z.uuid().safeParse(token);
  const supabase = await createClient();
  const { data, error } = parsed.success
    ? await supabase.rpc("get_shared_strategy_document", {
        p_token: parsed.data,
      })
    : { data: null, error: null };
  if (error) console.error("[shared-document]:", error.message);
  const content = (data as { content?: unknown } | null)?.content;
  const plan = releasePlanOf(content);
  const press = plan ? null : pressKitOf(content);
  const html = plan
    ? releasePlanHtml(plan)
    : press
      ? pressKitHtml(press)
      : null;
  if (!html)
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(fr.app.name)}</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0"><p>${escapeHtml(fr.strategyReleasePlan.share.unavailable)}</p></body></html>`,
      { status: 404, headers: HEADERS },
    );
  return new Response(html, { headers: HEADERS });
}
