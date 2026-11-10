"use client";

import { useState } from "react";

import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmField,
  rejectField,
  saveField,
} from "@/lib/framing/actions/brief";
import type { FieldState } from "@/lib/framing/brief";
import { framing } from "@/lib/i18n/fr/framing";

const fr = { framing };

/**
 * One deliverable text field (Brief or Strategy), edited in place. A proposal
 * is confirmed, rejected or rewritten. `actions`: more buttons of the
 * caller's after these (« Proposer à nouveau » of a Strategy part).
 */
export function BriefFieldCard({
  field,
  label,
  projectId,
  actions,
}: {
  field: FieldState;
  label: string;
  projectId: string;
  actions?: React.ReactNode;
}) {
  const t = fr.framing;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value ?? "");
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const inputId = `${field.deliverable}-${field.key}`;

  return (
    <section className="grid gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{label}</h3>
        {field.status === "proposed" && <ProposedBadge />}
      </div>

      {editing && canEdit ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveField(projectId, field.deliverable, field.key, draft),
              () => setEditing(false),
            );
          }}
        >
          <Label htmlFor={inputId} className="sr-only">
            {label}
          </Label>
          <Textarea
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={pending || draft.trim() === ""}
            >
              {t.actions.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              {t.actions.cancel}
            </Button>
          </div>
        </form>
      ) : field.value ? (
        <>
          <p className="text-sm whitespace-pre-wrap">{field.value}</p>
          <ProvenanceNote provenance={field.provenance} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}

      {!editing && canEdit && (
        <div className="flex flex-wrap gap-2">
          {field.status === "proposed" && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    confirmField(projectId, field.deliverable, field.key),
                  )
                }
              >
                {t.actions.confirm}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    rejectField(projectId, field.deliverable, field.key),
                  )
                }
              >
                {t.actions.reject}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setDraft(field.value ?? "");
              setEditing(true);
            }}
          >
            {field.value ? t.actions.edit : t.actions.fill}
          </Button>
          {actions}
        </div>
      )}
    </section>
  );
}
