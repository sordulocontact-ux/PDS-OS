"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconLink,
  IconMicrophone,
  IconPenWriting2,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { IconArrowUpRight, IconUserPlus } from "@/components/icons";
import type { TitleDialog } from "@/components/projects/titles/title-dialogs";
import type { RowAction } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { RecapTitle } from "@/lib/projects/recap-rules";
import {
  reactivateProjectTitle,
  startTitleWork,
} from "@/lib/projects/title-actions";

const fr = { projectTitles };

/** The title's gestures, for each of its rows' « ⋯ »: add an artist,
 * rename and abandon in a modal (a gesture that asks a saisie opens one,
 * TitleDialogs), reactivate at once (nothing to ask); its page in the
 * Catalogue once it has a master. Lot 7: a title not in the Catalogue yet
 * gets its title there, provisional, at its first audio; or takes one the
 * Catalogue has. Their words say they are the title's. */
export function useTitleActions({
  projectId,
  title,
  canManage,
  onDialog,
}: {
  projectId: string;
  title: RecapTitle;
  canManage: boolean;
  onDialog: (dialog: TitleDialog) => void;
}): RowAction[] {
  const t = fr.projectTitles;
  const a = t.recap.titleActions;
  const router = useRouter();
  const [, startTransition] = useTransition();
  if (!canManage) return [];
  const catalog: RowAction[] = title.master
    ? [
        {
          key: "catalog",
          label: t.openCatalog,
          icon: IconArrowUpRight,
          onSelect: () => router.push(routes.master(title.master!.id)),
        },
      ]
    : [];
  if (title.status === "abandoned")
    return [
      {
        key: "reactivate",
        label: a.reactivate,
        icon: IconArrowDottedRotateAnticlockwise,
        onSelect: () =>
          startTransition(async () => {
            const result = await reactivateProjectTitle({
              projectId,
              titleId: title.id,
            });
            if (!result.ok) return void toast.error(result.error);
            toast.success(t.reactivate.done);
          }),
      },
      ...catalog,
    ];
  const start: RowAction[] = title.master
    ? []
    : [
        {
          key: "audio",
          label: t.catalogStart.action,
          icon: IconMicrophone,
          onSelect: () =>
            startTransition(async () => {
              const result = await startTitleWork({
                projectId,
                titleId: title.id,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success(t.catalogStart.done);
              router.push(routes.masterAudio(result.masterId));
            }),
        },
        {
          key: "attach",
          label: t.catalogAttach.action,
          icon: IconLink,
          onSelect: () => onDialog("attach"),
        },
      ];
  return [
    {
      key: "artist",
      label: a.add,
      icon: IconUserPlus,
      onSelect: () => onDialog("add"),
    },
    {
      key: "rename",
      label: a.rename,
      icon: IconPenWriting2,
      onSelect: () => onDialog("rename"),
    },
    ...start,
    ...catalog,
    {
      key: "abandon",
      label: a.abandon,
      icon: IconBoxArchive,
      onSelect: () => onDialog("abandon"),
    },
  ];
}
