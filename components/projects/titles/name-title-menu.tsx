"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";

import { TitleNameField } from "@/components/projects/titles/title-name-field";
import { RowActions } from "@/components/ui/row-actions";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

const t = fr.projectTitles;

/**
 * « ⋯ » at the end of a row of a title still to be named (Sacha,
 * 27/11/2026: no « Nommer » button beside its name, the gesture in the
 * row's menu): « Nommer le titre » opens its field in a modal, Entrée
 * names it.
 */
export function NameTitleMenu({
  projectId,
  titleId,
  label,
}: {
  projectId: string;
  titleId: string;
  // The row's label (« Titre de Jay (à nommer) »).
  label: string;
}) {
  return (
    <RowActions
      label={t.menu(label)}
      actions={[
        {
          key: "name",
          label: t.naming.todo,
          icon: IconPenWriting2,
          dialog: {
            title: t.recap.name.title(label),
            body: (close) => (
              <TitleNameField
                projectId={projectId}
                titleId={titleId}
                required
                submitLabel={t.naming.submit}
                done={t.naming.named}
                onDone={close}
                autoFocus
              />
            ),
          },
        },
      ]}
    />
  );
}
