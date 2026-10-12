"use client";

import { IconLink } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { LinkableProject } from "@/lib/catalog/master/project-link";
import { linkMasterToProject } from "@/lib/catalog/master/project-link-actions";
import { fr } from "@/lib/i18n/fr";
import { isMusicFormat } from "@/lib/projects/types";

/**
 * « Rattacher à un projet existant » (retours Catalogue 16, 64): the title
 * joins an EP or an album already created instead of a duplicate project.
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
  if (projects.length === 0) return <p className="text-sm">{t.none}</p>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const projectId = String(
          new FormData(event.currentTarget).get("projectId") ?? "",
        );
        if (projectId) run(() => linkMasterToProject({ masterId, projectId }));
      }}
    >
      <OptionSelect
        id={`link-project-${masterId}`}
        name="projectId"
        label={t.field}
        required
        items={Object.fromEntries(
          projects.map((p) => [
            p.id,
            p.format && isMusicFormat(p.format)
              ? `${p.title} · ${fr.shell.musicFormats[p.format]}`
              : p.title,
          ]),
        )}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
