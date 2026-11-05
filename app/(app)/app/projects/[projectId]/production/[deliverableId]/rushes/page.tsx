import { notFound } from "next/navigation";

import { CallFacts, CallSource } from "@/components/calls/call-facts";

import { ProductionStepPanel } from "@/components/production/journey/production-step-panel";
import { RushesButtons } from "@/components/production/shoot/rushes-buttons";
import { ShootFilesSection } from "@/components/production/shoot/shoot-files-section";
import { shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import { stepContext } from "@/lib/production/journey/context";
import { shootReport } from "@/lib/production/shoot/report";
import { shootFor } from "@/lib/production/tab-data";
import { createClient } from "@/lib/supabase/server";

/**
 * Rushes (proto « Projet complet », external production): the rushes'
 * link, their reception and the verified backup, declared apart from the
 * shoot — each a person's word, stamped by the database, never a check of
 * the files.
 */
export default async function ProductionRushesPage({
  params,
}: PageProps<"/app/projects/[projectId]/production/[deliverableId]/rushes">) {
  const { projectId, deliverableId } = await params;
  const { access, data, step, steps } = await stepContext(
    projectId,
    deliverableId,
    "rushes",
  );
  const sheet = data.sheet;
  const shootData = await shootFor(projectId, deliverableId, access);
  if (!sheet || !shootData) notFound();
  const { data: link } = await (
    await createClient()
  )
    .from("production_shoots")
    .select("rushes_url, rushes_url_at")
    .eq("sheet_id", sheet.id)
    .maybeSingle();
  const company = sheet.organization.company?.name ?? "—";
  const x = fr.productionShootExternal;
  const dec = shootData.shoot.declarations;
  const received = dec.video_rushes.done && dec.audio_sources.done;
  const backup = dec.backup_verified.done;
  const said = (
    d: { byName: string | null; at: string | null },
    yes: boolean,
  ) =>
    d.at
      ? (yes ? x.yesBy : x.doneBy)(d.byName ?? "—", shortStamp(d.at))
      : x.notYet;
  const report = shootReport(
    shootData.shoot,
    shootData.incidents,
    shootData.equipment,
  );
  return (
    <ProductionStepPanel
      projectId={projectId}
      deliverableId={deliverableId}
      step={step}
      steps={steps}
      closed={Boolean(sheet.closedAt)}
    >
      {sheet.organization.kind === "external" && (
        <CallFacts
          facts={[
            {
              label: x.rushesLink,
              value: link?.rushes_url ? (
                <>
                  <a
                    href={link.rushes_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {link.rushes_url}
                  </a>
                  {link.rushes_url_at && (
                    <CallSource>
                      {x.sentBy(company, shortStamp(link.rushes_url_at))}
                    </CallSource>
                  )}
                </>
              ) : (
                x.awaited(company)
              ),
            },
            {
              label: x.receivedRow,
              value: received ? said(dec.audio_sources, true) : x.notYet,
            },
            {
              label: x.backupRow,
              value: backup ? said(dec.backup_verified, false) : x.notYet,
            },
          ]}
        />
      )}
      {sheet.organization.kind === "external" &&
        link?.rushes_url &&
        data.canOrganize &&
        !backup && (
          <RushesButtons
            projectId={projectId}
            sheetId={sheet.id}
            step={received ? "backup" : "received"}
          />
        )}
      {sheet.organization.kind === "external" && received && (
        <p className="text-[color:var(--text-secondary)]">
          {x.sameEditor(company)}
        </p>
      )}
      <ShootFilesSection
        projectId={projectId}
        sheetId={sheet.id}
        canOrganize={data.canOrganize}
        shoot={shootData.shoot}
        blockers={report.postBlockers}
        members={data.members}
        contacts={data.contacts}
      />
    </ProductionStepPanel>
  );
}
