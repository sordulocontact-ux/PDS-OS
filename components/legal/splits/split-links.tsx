"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { useShowSplitLinks } from "@/components/legal/splits/split-actions";
import { PrivateLinkCard } from "@/components/legal/private-link-card";
import { fr } from "@/lib/i18n/fr";
import { newSplitLink } from "@/lib/legal/splits/actions";
import {
  markSplitLinkSent,
  revokeSplitLink,
} from "@/lib/legal/splits/link-actions";
import type { SplitLine } from "@/lib/legal/splits/queries";
import { formatDay, formatShortInstant } from "@/lib/utils/day";
import { mailtoHref } from "@/lib/utils/mailto";

const t = fr.legalForms.page;
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const showLinks = useShowSplitLinks();
  const waiting = lines.filter((l) => l.id && l.confirmation.link);
  if (waiting.length === 0) return null;

  const run = (task: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await task();
      if (!result.ok) return void toast.error(result.error);
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-semibold">{s.confirmations}</h3>
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {s.confirmationsBody}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {waiting.map((line) => {
          const link = line.confirmation.link!;
          const meta = [
            t.validUntil(formatDay(link.expiresAt)),
            t.createdOn(formatShortInstant(link.createdAt)),
            link.sentAt
              ? t.sentBy(link.sentBy, formatShortInstant(link.sentAt))
              : null,
          ].filter((part): part is string => Boolean(part));
          return (
            <li key={line.id} className="flex flex-col gap-1.5">
              <span className="font-medium">
                {line.name}
                <span className="font-normal text-[color:var(--text-secondary)]">
                  {" "}
                  · {fr.legalSplits.roles[line.role]}
                </span>
              </span>
              <PrivateLinkCard
                url={link.url}
                meta={meta}
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
                    if (result.data.sealed) return router.refresh();
                    showLinks(title, [
                      {
                        entryId: line.id!,
                        name: line.name,
                        ...result.data,
                      },
                    ]);
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
    </section>
  );
}
