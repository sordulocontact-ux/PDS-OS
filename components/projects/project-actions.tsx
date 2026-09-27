"use client";

import dynamic from "next/dynamic";
import { toast } from "sonner";

import { EditPanel } from "@/components/archive/edit-panel";
import { RecordActions } from "@/components/archive/record-actions";
import type { RecordRights } from "@/lib/archive/types";
import { fr } from "@/lib/i18n/fr";
import { loadProjectEdit } from "@/lib/projects/edit-form-actions";

const CreateProjectForm = dynamic(() =>
  import("@/components/projects/create-project-form").then(
    (m) => m.CreateProjectForm,
  ),
);

/**
 * "⋯" of a project. Editable and archivable before launch only: once
 * launched, its content lives in its stages, written by its manager.
 */
export function ProjectActions({
  project,
  rights,
  leaveTo,
  size,
}: {
  project: { id: string; title: string; launched: boolean };
  rights: RecordRights;
  leaveTo?: string;
  size?: "icon-sm" | "icon-lg";
}) {
  return (
    <RecordActions
      kind="project"
      id={project.id}
      name={project.title}
      rights={rights}
      leaveTo={leaveTo}
      size={size}
      blockedReason={
        project.launched
          ? fr.records.archive.blocked.projectLaunched
          : undefined
      }
      edit={
        project.launched
          ? undefined
          : (close) => (
              <EditPanel load={() => loadProjectEdit(project.id)}>
                {(data) => (
                  <CreateProjectForm
                    masters={data.masters}
                    artists={data.artists}
                    contentFormats={data.contentFormats}
                    managers={[]}
                    creatives={[]}
                    defaults={data.defaults}
                    projectId={project.id}
                    onSaved={() => {
                      close();
                      toast.success(fr.records.edit.saved);
                    }}
                    onCancel={close}
                  />
                )}
              </EditPanel>
            )
      }
    />
  );
}
