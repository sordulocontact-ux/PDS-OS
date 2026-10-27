import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { productionPost } from "@/lib/i18n/fr/production-post";
import { formatDate } from "@/lib/release/format";
import type { HandedFiche } from "@/lib/production/fiche";
import type { PostReference, PostScope } from "@/lib/production/post/types";

import { ReferenceAddButton } from "./reference-add-button";
import { ReferenceMenu } from "./reference-menu";

const fr = { productionPost };

const t = fr.productionPost.references;

type Line = {
  key: string;
  label: string;
  href: string | null;
  note: string | null;
  // Where it comes from (PROD-034).
  origin: string;
};

/**
 * References of the edit (parcours 14): those of the Fiche Livrable (Brief
 * créatif), read where they are and never copied, next to those added at
 * this step by the owner.
 */
export function ReferencesSection({
  scope,
  fiche,
  brief,
  references,
  canOrganize,
}: {
  scope: PostScope;
  fiche: HandedFiche | null;
  // The Conception's references of this deliverable (links), not copied.
  brief: { url: string; note: string | null }[];
  references: PostReference[];
  canOrganize: boolean;
}) {
  const fromFiche: Line[] = (fiche?.references ?? []).map((r, index) => ({
    key: `fiche-${index}`,
    label: r.title ?? r.fileName ?? r.url ?? r.note ?? t.untitled,
    href: r.url,
    note: r.title || r.fileName || r.url ? r.note : null,
    origin: t.originFiche(fiche?.version ?? 0),
  }));
  const ficheUrls = new Set(fromFiche.flatMap((l) => (l.href ? [l.href] : [])));
  const fromBrief: Line[] = brief
    .filter((r) => !ficheUrls.has(r.url))
    .map((r, index) => ({
      key: `brief-${index}`,
      label: r.url,
      href: r.url,
      note: r.note,
      origin: t.originBrief,
    }));
  const inherited = [...fromFiche, ...fromBrief];
  const own = references.map((r) => ({
    id: r.id,
    line: {
      key: r.id,
      label:
        r.title ??
        r.file?.fileName ??
        r.url ??
        (r.kind === "note" ? t.kinds.note.label : t.untitled),
      href: r.kind === "link" ? r.url : (r.file?.href ?? null),
      note: r.note,
      origin: r.createdBy
        ? t.originAdded(r.createdBy, formatDate(r.createdAt))
        : t.originAddedUnknown(formatDate(r.createdAt)),
    },
  }));

  return (
    <PageSection
      id="references"
      title={t.title}
      description={t.description}
      card
      action={canOrganize && <ReferenceAddButton scope={scope} />}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm text-muted-foreground">{t.fromFiche}</h3>
          {inherited.length === 0 ? (
            <EmptyNote>{t.noneFromFiche}</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3">
              {inherited.map((line) => (
                <ReferenceLine key={line.key} line={line} />
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm text-muted-foreground">{t.own}</h3>
          {own.length === 0 ? (
            <EmptyNote>{t.none}</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3">
              {own.map(({ id, line }) => (
                <ReferenceLine
                  key={line.key}
                  line={line}
                  menu={
                    canOrganize && (
                      <ReferenceMenu
                        projectId={scope.projectId}
                        referenceId={id}
                        label={line.label}
                      />
                    )
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageSection>
  );
}

function ReferenceLine({ line, menu }: { line: Line; menu?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        {line.href ? (
          <a
            href={line.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all underline underline-offset-4"
          >
            {line.label}
          </a>
        ) : (
          <span className="break-words">{line.label}</span>
        )}
        {line.note && line.note !== line.label && (
          <span className="text-sm break-words whitespace-pre-line text-muted-foreground">
            {line.note}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{line.origin}</span>
      </div>
      {menu}
    </li>
  );
}
