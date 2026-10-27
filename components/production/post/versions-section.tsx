import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { productionPost } from "@/lib/i18n/fr/production-post";
import type { PostRole } from "@/lib/production/post/rules";
import type {
  PostPeople,
  PostScope,
  PostVersion,
  ProviderLinkState,
  VersionDefaults,
} from "@/lib/production/post/types";

import { VersionCard } from "./version-card";
import { VersionAddButton } from "./version-dialog";

const fr = { productionPost };

const t = fr.productionPost.versions;

/** Every version of the Fiche Livrable (parcours 16): none is ever
 * replaced. The current one first; the earlier ones, with their feedback
 * and decisions, folded underneath so they are never mistaken for the
 * active feedback (PROD-030). */
export function VersionsSection({
  scope,
  people,
  versions,
  role,
  defaults,
  links,
}: {
  scope: PostScope;
  people: PostPeople;
  versions: PostVersion[];
  role: PostRole;
  defaults: VersionDefaults;
  links: Record<string, ProviderLinkState>;
}) {
  const card = (v: PostVersion) => (
    <VersionCard
      key={v.id}
      scope={scope}
      people={people}
      version={v}
      previous={versions.find((p) => p.number === v.previousNumber) ?? null}
      role={role}
      links={links}
    />
  );
  const [current, ...earlier] = versions;
  return (
    <PageSection
      id="versions"
      title={t.title}
      description={t.description}
      action={
        role.canOrganize && (
          <VersionAddButton scope={scope} people={people} defaults={defaults} />
        )
      }
    >
      {!current ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          {card(current)}
          {earlier.length > 0 && (
            <details className="group flex flex-col gap-4">
              <summary className="flex min-h-10 cursor-pointer flex-col justify-center rounded-lg px-1 text-sm font-medium">
                {t.earlier(earlier.length)}
                <span className="text-xs font-normal text-muted-foreground">
                  {t.earlierHint}
                </span>
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                {earlier.map(card)}
              </div>
            </details>
          )}
        </div>
      )}
    </PageSection>
  );
}
