"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AttachCatalogTitleForm } from "@/components/projects/titles/title-forms";
import { StepSection } from "@/components/shell/journey/step-section";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { startTitleWork } from "@/lib/projects/title-actions";

const fr = { legalDemarches, projectTitles };

/**
 * « Rattacher le titre au Catalogue » in a collective's Juridique (§ 3.6 of
 * Ibé's 18/11): a title of the Catalogue taken as it is (the form of
 * « Titres et artistes »), or the title created there under a provisional
 * name to drop its audio (« Déposer un audio », as its « ⋯ » does). Once
 * attached, the page is read again and opens the title's démarches.
 * « Annuler » clears the choice.
 */
export function AttachTitlePanel({
  projectId,
  titleId,
  masterOptions,
}: {
  projectId: string;
  titleId: string;
  masterOptions: Record<string, string>;
}) {
  const t = fr.legalDemarches.attach;
  const router = useRouter();
  const [round, setRound] = useState(0);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <StepSection title={t.inCatalogue}>
        <AttachCatalogTitleForm
          key={round}
          projectId={projectId}
          titleId={titleId}
          masterOptions={masterOptions}
          onDone={() => {
            setRound((n) => n + 1);
            router.refresh();
          }}
        />
      </StepSection>
      <StepSection title={t.audio}>
        <div>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await startTitleWork({ projectId, titleId });
                if (!result.ok) return void toast.error(result.error);
                toast.success(fr.projectTitles.catalogStart.done);
                router.push(routes.masterAudio(result.masterId));
              })
            }
          >
            {fr.projectTitles.catalogStart.action}
          </Button>
        </div>
      </StepSection>
    </>
  );
}
