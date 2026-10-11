import { EmptyNote } from "@/components/shell/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { isDivergent } from "@/lib/activations/agency/divergence";
import { URL_FIELDS } from "@/lib/activations/agency/fields";
import type {
  AgencyRowRecord,
  AgencySourceRecord,
} from "@/lib/activations/agency/queries";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";

import { RowButtons } from "./row-buttons";

const t = fr.activationAgency.gallery;
const decisionTone = {
  to_review: "action",
  validated: "success",
  refused: "neutral",
  to_discuss: "warning",
  waiting_info: "warning",
  to_fix: "warning",
} as const;
const numbers = new Intl.NumberFormat("fr-FR");

/**
 * The agency's rows as cards (ticket Influence § B.4) : a neutral avatar
 * (never a picture fetched by detour), handle, platform, audience, category,
 * links, the agency's status as written, the PDS decision and note beside
 * it, the source and date of the data ; absent rows stay, marked.
 */
export function AgencyGallery({
  projectId,
  rows,
  sources,
  press,
  canWrite,
}: {
  projectId: string;
  rows: AgencyRowRecord[];
  sources: AgencySourceRecord[];
  press: boolean;
  canWrite: boolean;
}) {
  if (rows.length === 0) return <EmptyNote>{t.emptyView}</EmptyNote>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const c = r.current;
        const name = String(
          c.name ??
            c.media ??
            (c.handle ? `@${String(c.handle).replace(/^@/, "")}` : r.rowKey),
        );
        const source = sources.find((s) => s.id === r.sourceId);
        const divergent = isDivergent({
          absent_since: r.absentSince,
          agency_status: r.agencyStatus,
          pds_decision: r.pdsDecision,
        });
        return (
          <li
            key={r.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <Avatar name={name} pictureUrl={null} className="size-10" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium break-words">{name}</span>
                <span className="text-sm break-words text-muted-foreground">
                  {[
                    c.handle && !c.name
                      ? null
                      : c.handle && `@${String(c.handle).replace(/^@/, "")}`,
                    c.platform,
                    c.category,
                    c.journalist,
                    c.action_type,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </div>
            {typeof c.followers === "number" && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t.followers} · </span>
                <span className="font-medium tabular-nums">
                  {numbers.format(c.followers)}
                </span>
              </p>
            )}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t.agencyStatus}
                </dt>
                <dd className="break-words">{r.agencyStatus ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t.pdsDecision}
                </dt>
                <dd>
                  <StatusBadge
                    size="sm"
                    tone={
                      decisionTone[r.pdsDecision as keyof typeof decisionTone]
                    }
                  >
                    {t.decisions[r.pdsDecision as keyof typeof t.decisions]}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
            {r.pdsNote && (
              <p className="text-sm break-words">
                {t.note} : {r.pdsNote}
              </p>
            )}
            <p className="flex flex-wrap gap-x-3 text-sm">
              {URL_FIELDS.flatMap((f) =>
                typeof c[f] === "string" && /^https?:\/\//.test(String(c[f]))
                  ? [
                      <a
                        key={f}
                        href={String(c[f])}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.links[f as keyof typeof t.links]}
                      </a>,
                    ]
                  : [],
              )}
              {r.contactId && (
                <ViewLink
                  href={routes.networkContact(r.contactId)}
                  className="underline underline-offset-4"
                >
                  {t.inNetwork}
                </ViewLink>
              )}
            </p>
            {(r.absentSince || divergent) && (
              <div className="flex flex-wrap gap-2">
                {r.absentSince && (
                  <StatusBadge size="sm" tone="neutral">
                    {t.absent}
                  </StatusBadge>
                )}
                {divergent && (
                  <StatusBadge size="sm" tone="warning">
                    {t.divergence}
                  </StatusBadge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {fr.activationAgency.agencyData} ·{" "}
              {t.source(source?.label ?? "—", formatDate(r.updatedAt))}
            </p>
            {canWrite && (
              <RowButtons
                projectId={projectId}
                rowId={r.id}
                press={press}
                decision={r.pdsDecision}
                note={r.pdsNote}
                name={name}
                linked={Boolean(r.contactId)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
