import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { DeliverableVersions } from "@/components/ui/deliverable-version";
import { productionPost } from "@/lib/i18n/fr/production-post";
import type { PostRole } from "@/lib/production/post/rules";
import type {
  PostPeople,
  PostScope,
  PostVersion,
  ProviderLinkState,
  VersionDefaults,
} from "@/lib/production/post/types";

import { PostVersionCard } from "./post-version-card";
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
  const render = (v: PostVersion) => (
    <PostVersionCard
      scope={scope}
      people={people}
      version={v}
      previous={versions.find((p) => p.number === v.previousNumber) ?? null}
      role={role}
      links={links}
    />
  );
  return (
    <StepSection
      id="versions"
      title={t.title}
      description={t.description}
      aside={
        role.canOrganize && (
          <VersionAddButton scope={scope} people={people} defaults={defaults} />
        )
      }
    >
      {versions.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <DeliverableVersions
          versions={versions}
          isCurrent={(_, i) => i === 0}
          render={render}
          earlierTitle={t.earlier}
        />
      )}
    </StepSection>
  );
}
