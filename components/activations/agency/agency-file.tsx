import { AgencyGallery } from "@/components/activations/agency/agency-gallery";
import { PreviewPanel } from "@/components/activations/agency/preview-panel";
import { RecapForm } from "@/components/activations/agency/recap-form";
import { SourcesSection } from "@/components/activations/agency/sources-section";
import { ActivationSection } from "@/components/activations/activation-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { loadAgency } from "@/lib/activations/agency/queries";
import {
  agencyRecapText,
  lastRecapAt,
  recapPending,
} from "@/lib/activations/agency/recap";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadMessages } from "@/lib/activations/messages/queries";
import type { Access } from "@/lib/auth/access";
import { emailEnabled } from "@/lib/email/send";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activationBrief } from "@/lib/i18n/fr/activation-brief";
import { createClient } from "@/lib/supabase/server";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { activationBrief, activationAgency };

/**
 * Agency mode in the activation's page (tickets Influence parcours B, RP
 * § 6): the agency's sources read only, the read waiting for confirmation,
 * the rows with the agency's status and the PDS decision side by side, the
 * recap written by code and marked sent in one gesture (proto agsent).
 */
export async function AgencyFile({
  fiche,
  access,
}: {
  fiche: ActivationFiche;
  access: Access;
}) {
  const { activation: a, members, canWrite, project } = fiche;
  const projectId = project.id;
  const [agency, messages] = await Promise.all([
    loadAgency(a.id),
    loadMessages(a.id),
  ]);
  const press = a.kind === "press";
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId,
    activationId: a.id,
  };
  const rows = agency.rows;
  const t = fr.activationAgency;
  const previewSource =
    agency.preview &&
    agency.sources.find((s) => s.id === agency.preview?.sourceId);
  const recaps = messages.filter(
    (m) => m.kind === "agency_recap" && m.sentDeclaredAt,
  );
  const pending =
    canWrite &&
    a.status !== "closed" &&
    a.status !== "cancelled" &&
    recapPending(rows, lastRecapAt(recaps.map((m) => m.sentDeclaredAt)));
  const source = agency.sources.find(
    (s) => s.agencyContactId || s.agencyPerson,
  );
  const agencyContact = pending
    ? await agencyContactOf(source?.agencyContactId ?? null)
    : null;
  const agencyName = agencyContact?.name ?? null;
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? "—";

  return (
    <div id="agency" className="grid scroll-mt-5 gap-8">
      <SourcesSection
        scope={scope}
        sources={agency.sources}
        press={press}
        canWrite={canWrite}
      />
      {agency.preview && (
        <PreviewPanel
          key={agency.preview.id}
          projectId={projectId}
          snapshotId={agency.preview.id}
          sourceLabel={previewSource?.label ?? ""}
          rows={agency.preview.rows}
          fileErrors={agency.preview.errors}
          canWrite={canWrite}
        />
      )}
      <ActivationSection
        id="rows"
        title={press ? t.gallery.titlePress : t.gallery.title}
        description={t.gallery.description}
      >
        <div className="flex flex-col gap-4">
          {agency.rows.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              {t.gallery.empty}
            </p>
          ) : (
            <AgencyGallery
              projectId={projectId}
              rows={rows}
              sources={agency.sources}
              press={press}
              canWrite={canWrite}
            />
          )}
        </div>
      </ActivationSection>
      {recaps.length > 0 && (
        <FactRows>
          <FactRow
            label={fr.activationBrief.recap.sent}
            value={recaps
              .map((m) =>
                fr.activationBrief.recap.sentLine(
                  formatShortInstant(m.sentDeclaredAt ?? m.createdAt),
                  nameOf(m.sentDeclaredBy),
                ),
              )
              .join(" · ")}
          />
        </FactRows>
      )}
      {pending && (
        <RecapForm
          projectId={projectId}
          activationId={a.id}
          agency={
            agencyName ??
            source?.agencyPerson ??
            fr.activationBrief.recap.agency
          }
          canEmail={emailEnabled() && Boolean(agencyContact?.email)}
          subject={t.recap.subject(a.title)}
          body={agencyRecapText({
            rows,
            contact: source?.agencyPerson ?? null,
            press,
            title: project.title,
            artist: project.artistName,
            owner: nameOf(a.ownerPersonId ?? project.ownerPersonId),
          })}
        />
      )}
    </div>
  );
}

/** The agency's name (« Agence Halo ») and address in the Réseau, if linked. */
async function agencyContactOf(
  contactId: string | null,
): Promise<{ name: string; email: string | null } | null> {
  if (!contactId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("network_contacts")
    .select("name, email")
    .eq("id", contactId)
    .maybeSingle();
  return data;
}
