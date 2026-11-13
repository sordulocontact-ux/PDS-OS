"use client";

import { IconLink } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { LinkableProject } from "@/lib/catalog/master/project-link";
import { linkMasterToProject } from "@/lib/catalog/master/project-link-actions";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { shell } from "@/lib/i18n/fr/shell";
import { isMusicFormat } from "@/lib/projects/types";

const fr = { shell, masterPage };

const NEW_TITLE = "new";

/**
 * « Rattacher à un projet existant » (retours Catalogue 16, 64): the title
 * joins an EP or an album already created instead of a duplicate project;
 * or a collective (lot 7), as a new title or as one of its titles not in
 * the Catalogue yet.
 */
export function ProjectLinkButton({
  masterId,
  projects,
}: {
  masterId: string;
  projects: LinkableProject[];
}) {
  const t = fr.masterPage.projects.link;
  return (
    <DialogButton
      label={t.button}
      icon={IconLink}
      title={t.title}
      description={t.description}
    >
      {(close) => (
        <LinkForm masterId={masterId} projects={projects} onDone={close} />
      )}
    </DialogButton>
  );
}

function LinkForm({
  masterId,
  projects,
  onDone,
}: {
  masterId: string;
  projects: LinkableProject[];
  onDone: () => void;
}) {
  const t = fr.masterPage.projects.link;
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const [projectId, setProjectId] = useState("");
  const project = projects.find((p) => p.id === projectId) ?? null;
  if (projects.length === 0) return <p className="text-sm">{t.none}</p>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const chosen = String(form.get("projectId") ?? "");
        const titleId = String(form.get("projectTitleId") ?? NEW_TITLE);
        const target = projects.find((p) => p.id === chosen);
        if (!target) return;
        run(() =>
          linkMasterToProject({
            masterId,
            projectId: target.id,
            collective: target.collective,
            projectTitleId:
              target.collective && titleId !== NEW_TITLE ? titleId : null,
          }),
        );
      }}
    >
      <OptionSelect
        id={`link-project-${masterId}`}
        name="projectId"
        label={t.field}
        required
        onValueChange={setProjectId}
        items={Object.fromEntries(
          projects.map((p) => [
            p.id,
            p.collective
              ? t.collective(p.title)
              : p.format && isMusicFormat(p.format)
                ? `${p.title} · ${fr.shell.musicFormats[p.format]}`
                : p.title,
          ]),
        )}
      />
      {/* A collective: a new title, or one waiting for its title (lot 7). */}
      {project?.collective && project.waitingTitles.length > 0 && (
        <OptionSelect
          key={project.id}
          id={`link-title-${masterId}`}
          name="projectTitleId"
          label={t.projectTitle}
          hint={t.projectTitleHint}
          defaultValue={NEW_TITLE}
          items={{
            [NEW_TITLE]: t.newTitle,
            ...Object.fromEntries(
              project.waitingTitles.map((title) => [title.id, title.label]),
            ),
          }}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
