"use client";

import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { useShowSplitLinks } from "@/components/legal/splits/split-actions";
import { PrivateLinkCard } from "@/components/legal/private-link-card";
import { StepSection } from "@/components/shell/journey/step-section";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { newSplitLink } from "@/lib/legal/splits/actions";
import {
  markSplitLinkSent,
  revokeSplitLink,
} from "@/lib/legal/splits/link-actions";
import { roleOfLine } from "@/lib/legal/splits/draft";
import type { SplitLine } from "@/lib/legal/splits/queries";
import { mailtoHref } from "@/lib/utils/mailto";

const fr = { legalDocuments, legalSplits };

const s = fr.legalDocuments.split;

/**
 * The private links of a split's confirmations, kept visible in its step
 * (proto « Projet complet », rule 19): per person who has not answered,
 * the link, « Copier le lien », « Marquer comme envoyé », « Relancer »,
 * « Nouveau lien », « Révoquer l'accès » with why, and when it was created
 * and sent. The same link opens on the person's page (/c/).
 */
export function SplitLinks({
  projectId,
  title,
  lines,
}: {
  projectId: string;
  title: string;
  lines: SplitLine[];
}) {
  const [pending, startTransition] = useTransition();
  const showLinks = useShowSplitLinks();
  const waiting = lines.filter((l) => l.id && l.confirmation.link);
  if (waiting.length === 0) return null;

  const run = (task: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return void toast.error(result.error);
    });

  return (
    <StepSection title={s.confirmations}>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {s.confirmationsBody}
      </p>
      <ul className="flex flex-col gap-3">
        {waiting.map((line) => {
          const link = line.confirmation.link!;
          return (
            <li key={line.id} className="flex flex-col gap-1.5">
              <PrivateLinkCard
                name={`${line.name} · ${roleOfLine(line, lines)}`}
                state={link.sentAt ? "sent" : "unsent"}
                url={link.url}
                remindHref={
                  link.url && link.sentAt
                    ? mailtoHref(
                        "",
                        s.emailSubject(title),
                        fr.legalSplits.links.emailBody(
                          line.name,
                          title,
                          link.url,
                        ),
                      )
                    : null
                }
                pending={pending}
                onMarkSent={
                  link.sentAt
                    ? undefined
                    : () =>
                        run(() =>
                          markSplitLinkSent(projectId, link.confirmationId),
                        )
                }
                markSentLabel={s.markSent}
                onRenew={() =>
                  startTransition(async () => {
                    const result = await newSplitLink(projectId, line.id!);
                    if (!result.ok) return void toast.error(result.error);
                    showLinks(
                      title,
                      [{ entryId: line.id!, name: line.name, ...result.data }],
                      "",
                    );
                  })
                }
                revoke={(reason) =>
                  revokeSplitLink(projectId, link.confirmationId, reason)
                }
              />
            </li>
          );
        })}
      </ul>
    </StepSection>
  );
}
