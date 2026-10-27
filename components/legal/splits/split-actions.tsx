"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useShowLinks } from "@/components/ui/one-time-links";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { mailtoHref } from "@/lib/utils/mailto";
import {
  newSplitLink,
  proposeSplit,
  proposeTitleSplit,
  type SplitLink,
} from "@/lib/legal/splits/actions";

const fr = { legalDocuments, legalSplits };

/** The confirmation links of a split, shown once above the page (they
 * survive its refresh). */
export function useShowSplitLinks() {
  const show = useShowLinks();
  const t = fr.legalSplits.links;
  return (title: string, links: SplitLink[]) =>
    show({
      title: t.title(title),
      description: t.body,
      links: links.map((l) => ({
        key: l.entryId,
        label: l.name,
        url: l.url,
        note: t.kept,
        email:
          l.email && l.url
            ? {
                href: mailtoHref(
                  l.email,
                  t.emailSubject(title),
                  t.emailBody(l.name, title, l.url),
                ),
                label: t.email,
              }
            : undefined,
      })),
      copyLabel: t.copy,
      copiedLabel: t.copied,
      closeLabel: t.close,
    });
}

/** « Envoyer pour confirmation »: the draft (or the split of the title's
 * page, `masterId`) becomes the active version, a link per person, shown
 * once. */
export function ProposeSplitButton({
  projectId,
  target,
  title,
}: {
  projectId: string;
  target: { versionId: string } | { masterId: string };
  title: string;
}) {
  const t = fr.legalSplits.page;
  const [pending, startTransition] = useTransition();
  const showLinks = useShowSplitLinks();
  // Sealed, the links stay in the step (rule 19): nothing to show once.
  const setLinks = (links: SplitLink[]) => {
    if (links.every((l) => l.sealed)) {
      toast.success(`${fr.legalDocuments.split.proposed}.`);
      return;
    }
    showLinks(title, links);
  };
  return (
    <Button
      size="sm"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          const result =
            "versionId" in target
              ? await proposeSplit(projectId, target.versionId)
              : await proposeTitleSplit(projectId, target.masterId);
          if (result.ok) setLinks(result.data);
          else toast.error(result.error);
        })
      }
    >
      {pending ? t.proposing : t.propose}
    </Button>
  );
}

/** « Nouveau lien » for one person (the previous one stops working). */
export function NewSplitLinkButton({
  projectId,
  entryId,
  name,
  title,
}: {
  projectId: string;
  entryId: string;
  name: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const showLinks = useShowSplitLinks();
  const setLinks = (links: SplitLink[]) => {
    if (links.every((l) => l.sealed)) {
      toast.success(`${fr.legalDocuments.split.renewed}.`);
      return;
    }
    showLinks(title, links);
  };
  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      className="relative z-10"
      onClick={() =>
        startTransition(async () => {
          const result = await newSplitLink(projectId, entryId);
          if (result.ok) setLinks([{ entryId, name, ...result.data }]);
          else toast.error(result.error);
        })
      }
    >
      {fr.legalSplits.page.newLink}
    </Button>
  );
}
