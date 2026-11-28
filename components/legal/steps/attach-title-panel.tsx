"use client";

import { IconVolumeUp } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AddFilesDialog } from "@/components/catalog/files/add-files-dialog";
import { AttachCatalogTitleForm } from "@/components/projects/titles/title-forms";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { AUDIO_ACCEPT, AUDIO_FORMAT_LIST } from "@/lib/catalog/file-rules";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { startTitleWork } from "@/lib/projects/title-actions";

const fr = { legalDemarches };

type Way = "catalog" | "audio";

/**
 * « Rattacher au Catalogue » in a collective's Juridique (§ 3.6 of Ibé's
 * 18/11), redone on Sacha's 28/11/2026 (« vraiment moche »: two stacked
 * forms, a « Annuler » with nothing to cancel, the audio sending one out of
 * the project): one question, its two real answers. « Oui, il y est »: the
 * title of the Catalogue chosen as it is. « Non, pas encore »: its audio
 * dropped here; the title is then created in the Catalogue under a
 * provisional name (startTitleWork) and the audio asks its state in the
 * same dialog as on the title's page (AddFilesDialog). Either way the
 * Juridique then opens on the title's next step (its entry with `?titre=`):
 * the attach step leaves its journey, which goes on with what the title
 * needs now (its authors, « Ajouter au plan », its démarches).
 */
export function AttachTitlePanel({
  projectId,
  titleId,
  organizationId,
  masterOptions,
}: {
  projectId: string;
  titleId: string;
  organizationId: string;
  masterOptions: Record<string, string>;
}) {
  const t = fr.legalDemarches.attach;
  const router = useRouter();
  const [way, setWay] = useState<Way | null>(null);
  const [round, setRound] = useState(0);
  // The audio picked and the title created for it: the dialog that asks
  // its state is open.
  const [upload, setUpload] = useState<{
    masterId: string;
    files: File[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const next = () => {
    setUpload(null);
    router.push(`${routes.projectLegal(projectId)}?titre=${titleId}`);
  };
  return (
    <div className="flex flex-col gap-5">
      <ChoiceCards<Way>
        name={`attach-${titleId}`}
        legend={t.question}
        columns={2}
        value={way}
        onChange={setWay}
        choices={[
          { value: "catalog", label: t.inCatalogue, hint: t.inCatalogueHint },
          { value: "audio", label: t.audio, hint: t.audioHint },
        ]}
      />
      {way === "catalog" && (
        <AttachCatalogTitleForm
          key={round}
          projectId={projectId}
          titleId={titleId}
          masterOptions={masterOptions}
          inline
          onDone={() => {
            setRound((n) => n + 1);
            next();
          }}
        />
      )}
      {way === "audio" && (
        <div className="max-w-md">
          <FileDropZone
            label={pending ? t.creating : t.drop}
            hint={AUDIO_FORMAT_LIST}
            accept={AUDIO_ACCEPT}
            icon={IconVolumeUp}
            disabled={pending || upload !== null}
            onFiles={(files) => {
              if (files.length === 0) return;
              startTransition(async () => {
                const result = await startTitleWork({ projectId, titleId });
                if (!result.ok) return void toast.error(result.error);
                setUpload({ masterId: result.masterId, files });
              });
            }}
          />
        </div>
      )}
      <AddFilesDialog
        organizationId={organizationId}
        owner={{ kind: "master", id: upload?.masterId ?? "" }}
        files={upload?.files ?? null}
        mode={{ kind: "audio", defaultState: "demo" }}
        // The title is in the Catalogue now, its audio or not.
        onClose={next}
        onAdded={next}
      />
    </div>
  );
}
