import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import type { PostBlocker } from "@/lib/production/shoot/blockers";
import { DECLARATIONS, type ShootRecord } from "@/lib/production/shoot/rules";
import { shootDeclarationTone } from "@/lib/ui/state-tones";

import { DeclarationsDialog } from "./declarations-dialog";
import type { Member } from "@/lib/framing/related";
import type { NetworkOption } from "@/lib/production/sheet";
import { PostBlockersCallout } from "./post-blockers-callout";

const t = fr.productionShoot.files;

/** Parcours 11: video rushes, audio sources and backup, each declared
 * separately with who and when, and where the files are. Never presented
 * as a check of the files. Once the shoot ended, what the postproduction's
 * preparation waits for. */
export function ShootFilesSection({
  projectId,
  sheetId,
  shoot,
  blockers,
  canOrganize,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
  blockers: PostBlocker[];
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  return (
    <PageSection
      id="shoot-files"
      title={t.title}
      description={t.description}
      action={
        canOrganize && (
          <DeclarationsDialog
            projectId={projectId}
            sheetId={sheetId}
            shoot={shoot}
            members={members}
            contacts={contacts}
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        <PostBlockersCallout blockers={blockers} />
        <ul className="flex flex-col gap-3">
          {DECLARATIONS.map((key) => {
            const d = shoot.declarations[key];
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    {t.declarations[key]}
                  </span>
                  {d.done && d.at && (
                    <span className="text-xs text-muted-foreground">
                      {t.declaredBy(d.byName ?? "—", formatDateTime(d.at))}
                      {" · "}
                      {t.notChecked}
                    </span>
                  )}
                </div>
                <StatusBadge size="sm" tone={shootDeclarationTone(d.done)}>
                  {d.done ? t.declared : t.notDeclared}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
        <FactList
          emptyLabel={fr.productionShoot.state.notFilled}
          facts={[
            {
              label: t.location,
              value: shoot.filesLocation,
              valueClassName: "break-all",
            },
            {
              label: t.backupLocation,
              value: shoot.backupLocation,
              valueClassName: "break-all",
            },
            { label: t.rushesHolder, value: shoot.rushesHolder?.name ?? null },
            { label: t.backupHolder, value: shoot.backupHolder?.name ?? null },
            {
              label: t.otherMedia,
              value:
                shoot.otherMedia.done && shoot.otherMedia.at
                  ? t.declaredBy(
                      shoot.otherMedia.byName ?? "—",
                      formatDateTime(shoot.otherMedia.at),
                    )
                  : null,
            },
          ]}
        />
      </div>
    </PageSection>
  );
}
