import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CollaborationRow } from "@/lib/activations/influence/collaborations";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { collaborationStageTone, proofTone } from "@/lib/ui/state-tones";

const t = fr.activationInfluence;
const publicationState = {
  none: "to_provide",
  declared: "provided_unverified",
  verified: "verified",
} as const;

/** One row per influencer of the campaign : accounts, the step its objects
 * prove, the publication (declared ≠ verified). The row opens the fiche. */
export function CollaborationsTable({
  projectId,
  activationId,
  rows,
}: {
  projectId: string;
  activationId: string;
  rows: CollaborationRow[];
}) {
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.list.profile}</DataTableHead>
        <DataTableHead>{t.list.stage}</DataTableHead>
        <DataTableHead fill hideBelow="sm">
          {t.list.publication}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((r) => (
          <DataTableRow key={r.id}>
            <DataTableCell>
              <DataTableMedia
                visual={<Avatar name={r.contactName} pictureUrl={null} />}
                title={
                  <DataTableLink
                    href={routes.projectActivationTarget(
                      projectId,
                      activationId,
                      r.id,
                    )}
                  >
                    {r.contactName}
                  </DataTableLink>
                }
                subtitle={
                  [
                    r.tiktok && `@${r.tiktok} (TikTok)`,
                    r.instagram && `@${r.instagram} (Instagram)`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || EMPTY_CELL
                }
              />
            </DataTableCell>
            <DataTableCell>
              <StatusBadge size="sm" tone={collaborationStageTone[r.stage]}>
                {t.stages[r.stage]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell fill hideBelow="sm">
              <StatusBadge
                size="sm"
                tone={proofTone[publicationState[r.publication]]}
              >
                {fr.activations.proof.states[publicationState[r.publication]]}
              </StatusBadge>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
