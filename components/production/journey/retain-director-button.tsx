"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { useShowLinks } from "@/components/ui/one-time-links";
import { productionDirector } from "@/lib/i18n/fr/production-director";
import { productionProvider } from "@/lib/i18n/fr/production-provider";
import { retainDirector } from "@/lib/production/director-actions";

const fr = { productionProvider, productionDirector };

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
          const emailed = result.emailed === "sent";
          publish(
            emailed ? { ...result, done: t.email.sent(name) } : result,
            t.done(name),
          );
          if (result.token && !emailed)
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
