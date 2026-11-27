"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { TitleNameField } from "@/components/projects/titles/title-name-field";
import { moduleTitleClass } from "@/components/shell/module/module-header";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

const t = fr.projectTitles.naming;

/**
 * A collective's title as its page's h1, named or renamed in place by who
 * writes the project (Sacha, 27/11/2026: « je ne peux pas le nommer ici ? »),
 * as a note's title: a click on it turns it into its field, the pencil says
 * so on hover and to the keyboard. Anyone else reads it.
 */
export function TitleHeading({
  projectId,
  titleId,
  label,
  workingTitle,
  masterName,
  canEdit,
}: {
  projectId: string;
  titleId: string;
  label: string;
  workingTitle: string | null;
  // Its master's name, taken back when the field is left empty.
  masterName: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  if (!canEdit) return <h1 className={moduleTitleClass}>{label}</h1>;
  const unnamed = !workingTitle && !masterName;
  if (editing)
    return (
      <TitleNameField
        projectId={projectId}
        titleId={titleId}
        defaultValue={workingTitle ?? ""}
        placeholder={masterName ?? undefined}
        required={unnamed}
        submitLabel={unnamed ? t.submit : t.save}
        done={unnamed ? t.named : t.renamed}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
        autoFocus
        className="min-w-0 flex-1"
      />
    );
  return (
    <h1 className={moduleTitleClass}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        // The heading keeps the title's words; the verb is said beside.
        title={t.edit}
        className="group/name inline-flex max-w-full cursor-text items-center gap-2 rounded-[var(--radius-md)] text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
      >
        <span className="min-w-0 break-words">{label}</span>
        <span className="sr-only">{t.edit}</span>
        <IconPenWriting2
          aria-hidden
          className="size-5 shrink-0 text-[color:var(--text-tertiary)] opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover/name:opacity-100 group-focus-visible/name:opacity-100 motion-reduce:transition-none"
        />
      </button>
    </h1>
  );
}
