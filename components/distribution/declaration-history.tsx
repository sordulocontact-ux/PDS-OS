import { ProofLinks } from "@/components/distribution/tracking-cycle";
import { PageSection } from "@/components/shell/page-section";
import { cycles, type Declaration } from "@/lib/distribution/tracking";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";

const t = fr.distribution.tracking;

/**
 * Every declaration, cycle by cycle, newest first (§ 10, CA17): who
 * declared what, when, with which proof; a withdrawn one stays, struck
 * through, with its reason.
 */
export function DeclarationHistory({
  declarations,
}: {
  declarations: Declaration[];
}) {
  const groups = cycles(declarations);
  return (
    <PageSection id="tracking-history" title={t.history} card>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.historyEmpty}</p>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <div key={group.version} className="grid gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t.cycle(group.version)}
              </h3>
              <ol className="grid gap-3">
                {group.declarations.map((declaration) => (
                  <li key={declaration.id} className="grid gap-0.5">
                    <p
                      className={
                        declaration.withdrawn
                          ? "font-medium text-muted-foreground line-through"
                          : "font-medium"
                      }
                    >
                      {t.kindTitles[declaration.kind]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.by(
                        declaration.declaredBy,
                        formatShortDate(declaration.declaredAt),
                      )}
                      {declaration.declaredOn &&
                        ` · ${t.on(formatShortDate(declaration.declaredOn))}`}
                    </p>
                    {!declaration.withdrawn && (
                      <ProofLinks declaration={declaration} />
                    )}
                    {declaration.withdrawn && (
                      <p className="text-sm text-muted-foreground">
                        {t.withdrawnLine(
                          declaration.withdrawn.by,
                          formatShortDate(declaration.withdrawn.at),
                          declaration.withdrawn.note,
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </PageSection>
  );
}
