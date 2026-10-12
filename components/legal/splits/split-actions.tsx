"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SplitEditor } from "@/components/legal/splits/split-editor";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { useShowLinks } from "@/components/ui/one-time-links";
import { fr } from "@/lib/i18n/fr";
import { mailtoHref } from "@/lib/utils/mailto";
import {
  newSplitLink,
  proposeSplit,
  proposeTitleSplit,
  type SplitLink,
} from "@/lib/legal/splits/actions";
import type { SplitLine } from "@/lib/legal/splits/queries";

/** « Préparer », « Reprendre le brouillon » or « Modifier la répartition »:
 * the editor in the wide modal. */
export function SplitEditorButton({
  projectId,
  masterId,
  title,
  label,
  initial,
  withNote,
  primary,
}: {
  projectId: string;
  masterId: string;
  title: string;
  label: string;
  initial: SplitLine[];
  withNote: boolean;
  primary?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const t = fr.legalSplits.editor;
  return (
    <>
      <Button
        size="sm"
        variant={primary ? "default" : "outline"}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(title)}
        description={t.description}
        closeLabel={fr.legalSplits.links.close}
        size="wide"
      >
        <SplitEditor
          projectId={projectId}
          masterId={masterId}
          initial={initial}
          withNote={withNote}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </FormDialog>
    </>
  );
}

/** Shows the split's links once, in the dialog that outlives the page's
 * refresh (the button that asked for them moves to « En attente »). */
/** The confirmation links of a split, shown once above the page (they
 * survive its refresh). */
export function useShowSplitLinks() {
  const router = useRouter();
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
      onClose: () => router.refresh(),
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
  const setLinks = (links: SplitLink[]) => showLinks(title, links);
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
  const setLinks = (links: SplitLink[]) => showLinks(title, links);
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
