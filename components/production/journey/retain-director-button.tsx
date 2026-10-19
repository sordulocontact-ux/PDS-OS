"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { useShowLinks } from "@/components/ui/one-time-links";
import { fr } from "@/lib/i18n/fr";
import { retainDirector } from "@/lib/production/director-actions";

const t = fr.productionDirector;

/** « Retenir »: the director holds « Réalisation »; his private link is
 * shown once, to copy and send. */
export function RetainDirectorButton({
  projectId,
  proposalId,
  name,
}: {
  projectId: string;
  proposalId: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  const publish = usePublishResult();
  const showLinks = useShowLinks();
  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={t.retainLabel(name)}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        start(async () => {
          const result = await retainDirector({ projectId, proposalId, name });
          if (!result.ok) return void toast.error(result.error);
          publish(result, t.done(name));
          if (result.token)
            showLinks({
              title: t.linkTitle(name),
              description: t.linkDescription,
              links: [
                {
                  key: proposalId,
                  label: t.linkTitle(name),
                  url: `${window.location.origin}/p/${result.token}`,
                },
              ],
              copyLabel: fr.productionProvider.copy,
              copiedLabel: fr.productionProvider.copied,
              closeLabel: fr.productionProvider.close,
            });
        })
      }
    >
      {t.retain}
    </Button>
  );
}
