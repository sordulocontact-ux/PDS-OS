import { BriefChangeList } from "@/components/framing/intel/brief-change-list";
import { PageSection } from "@/components/shell/page-section";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { briefChanges, snapshotOf } from "@/lib/framing/brief-snapshot";
import { briefRequests } from "@/lib/i18n/fr/brief-requests";

const fr = { briefRequests };

type Version = { version: number; content: unknown; sent_at: string | null };

/**
 * The version a Brief is compared with by default: the last one sent before
 * it (what the validator read), otherwise the one just before.
 */
export function defaultComparison(
  versions: Version[],
  shown: Version,
): number | null {
  const before = versions.filter((v) => v.version < shown.version);
  return (before.find((v) => v.sent_at) ?? before[0])?.version ?? null;
}

/**
 * « Comparer les versions » (PROJ-UX-06, PROJ-BUG-05): what really changed
 * between the version shown and another one, question by question, so the
 * validator compares before deciding. The other version is in the URL.
 */
export function BriefCompare({
  versions,
  shown,
  against,
  hrefOf,
}: {
  // Newest first.
  versions: Version[];
  shown: Version;
  against: number | null;
  hrefOf: (version: number) => string;
}) {
  const t = fr.briefRequests.compare;
  const others = versions.filter((v) => v.version < shown.version);
  const other = others.find((v) => v.version === against);
  if (others.length === 0 || !other) return null;
  const now = snapshotOf(shown.content);
  const before = snapshotOf(other.content);
  if (!now || !before) return null;
  return (
    <PageSection id="comparer" title={t.title} description={t.body}>
      <div className="flex flex-col gap-4">
        {others.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {others.map((v) => (
              <FilterChipLink
                key={v.version}
                href={hrefOf(v.version)}
                current={v.version === other.version}
              >
                {t.with(v.version)}
              </FilterChipLink>
            ))}
          </div>
        )}
        <p className="text-caption text-muted-foreground">
          {t.changes(other.version, shown.version)}
        </p>
        <BriefChangeList changes={briefChanges(before, now)} />
      </div>
    </PageSection>
  );
}
