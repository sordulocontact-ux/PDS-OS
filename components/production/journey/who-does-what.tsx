import { ProviderLinkButton } from "@/components/production/post/provider-link-button";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { ProviderLinkState } from "@/lib/production/post/types";
import type { ProductionSheetData } from "@/lib/production/sheet";

const t = fr.productionOrganization;

type Row = {
  key: string;
  name: string;
  task: string;
  holder: { kind: "person" | "contact"; id: string; name: string } | null;
};

/**
 * « Qui fait quoi » once the organisation is chosen: each role, who holds
 * it, what it does, and for a contact of the Réseau its private link (MVP:
 * no account for providers, Ibé 14/10).
 */
export function WhoDoesWhat({
  projectId,
  data,
  links,
  canOrganize,
}: {
  projectId: string;
  data: ProductionSheetData;
  links: Record<string, ProviderLinkState>;
  canOrganize: boolean;
}) {
  const sheet = data.sheet;
  if (!sheet) return null;
  const org = sheet.organization;
  const person = (p: { personId: string; name: string } | null) =>
    p ? { kind: "person" as const, id: p.personId, name: p.name } : null;
  const owner = data.ownerPersonId
    ? {
        kind: "person" as const,
        id: data.ownerPersonId,
        name: data.ownerName ?? "—",
      }
    : null;
  const all: (Row | null)[] = [
    org.company
      ? {
          key: "company",
          name: org.company.name,
          task: t.tasks.company,
          holder: org.company,
        }
      : null,
    {
      key: "owner",
      name: data.ownerName ?? "—",
      task: t.tasks.owner,
      holder: owner,
    },
    org.lineProducer
      ? {
          key: "producer",
          name: org.lineProducer.name,
          task: t.tasks.lineProducer,
          holder: person(org.lineProducer),
        }
      : null,
    org.quoteValidator
      ? {
          key: "validator",
          name: org.quoteValidator.name,
          task: t.tasks.validator,
          holder: person(org.quoteValidator),
        }
      : null,
    sheet.director
      ? {
          key: "director",
          name: sheet.director.name,
          task: t.tasks.director,
          holder: sheet.director,
        }
      : null,
    org.dop
      ? { key: "dop", name: org.dop.name, task: t.tasks.dop, holder: org.dop }
      : null,
  ];
  const rows = all.filter((r): r is Row => r !== null);

  return (
    <section aria-labelledby="who-does-what" className="flex flex-col gap-3">
      <h3 id="who-does-what" className="text-body-md font-semibold">
        {t.whoDoesWhat}
      </h3>
      <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
        {rows.map((r) => (
          <li
            key={r.key}
            className="flex flex-wrap items-center gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0"
          >
            <Avatar name={r.name} pictureUrl={null} className="size-7" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{r.name}</span>
              <span className="text-sm text-muted-foreground">{r.task}</span>
            </span>
            <StatusBadge size="sm">
              {r.holder?.kind === "contact" ? t.link : t.account}
            </StatusBadge>
            {canOrganize && r.holder?.kind === "contact" && (
              <ProviderLinkButton
                projectId={projectId}
                sheetId={sheet.id}
                holder={r.holder}
                link={links[r.holder.id] ?? null}
              />
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{t.explain}</p>
    </section>
  );
}
