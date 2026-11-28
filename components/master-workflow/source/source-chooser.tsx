"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { masterSource } from "@/lib/i18n/fr/master-source";
import type { SourceTitle } from "@/lib/master-workflow/source-step";

import { ExistingMixForm } from "./existing-mix-form";
import { SourceForm } from "./source-form";

const fr = { masterSource };

/**
 * The owner's gesture on a title's source: the form when nothing is
 * confirmed yet (after « Un mix existe déjà » when one is found), else
 * « Changer la source », which reopens it.
 */
export function SourceChooser({
  projectId,
  title,
  mixV1Due,
  imports,
}: {
  projectId: string;
  title: SourceTitle;
  mixV1Due: string | null;
  // « Importer une version », from the server.
  imports?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [redo, setRedo] = useState(false);
  const confirmed = title.current !== null;
  if (confirmed && !editing)
    return (
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setEditing(true)}
      >
        {fr.masterSource.current.change}
      </Button>
    );
  const existing = !confirmed && title.existingMix;
  return (
    <div className="flex flex-col gap-4">
      {existing && (
        <ExistingMixForm
          projectId={projectId}
          masterId={title.id}
          fileId={existing.id}
          onRedo={setRedo}
        />
      )}
      {(!existing || redo) && (
        <>
          {title.candidates.length > 0 && (
            <SourceForm
              projectId={projectId}
              title={title}
              mixV1Due={mixV1Due}
              imports={imports}
              onCancel={confirmed ? () => setEditing(false) : undefined}
            />
          )}
          {/* With versions, the import sits under the chosen one. */}
          {title.candidates.length === 0 && imports}
        </>
      )}
    </div>
  );
}
