import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { fr } from "@/lib/i18n/fr";
import type { PostRole } from "@/lib/production/post/rules";
import type {
  PostPeople,
  PostScope,
  PostVersion,
} from "@/lib/production/post/types";

import { VersionCard } from "./version-card";
import { VersionAddButton } from "./version-dialog";

const t = fr.productionPost.versions;

/** Every version of the Fiche Livrable, the newest first (parcours 16):
 * none is ever replaced, with its feedback and decisions. */
export function VersionsSection({
  scope,
  people,
  versions,
  role,
}: {
  scope: PostScope;
  people: PostPeople;
  versions: PostVersion[];
  role: PostRole;
}) {
  return (
    <PageSection
      id="versions"
      title={t.title}
      description={t.description}
      action={
        role.canOrganize && <VersionAddButton scope={scope} people={people} />
      }
    >
      {versions.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <div className="flex flex-col gap-4">
          {versions.map((v) => (
            <VersionCard
              key={v.id}
              scope={scope}
              people={people}
              version={v}
              role={role}
            />
          ))}
        </div>
      )}
    </PageSection>
  );
}
