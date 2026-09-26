"use client";

import { useState } from "react";

import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmBriefField,
  rejectBriefField,
  saveBriefField,
} from "@/lib/framing/actions/brief";
import type { BriefFieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

/** One Brief field, edited in place. A proposal is confirmed, rejected or rewritten. */
export function BriefFieldCard({
  field,
  projectId,
}: {
  field: BriefFieldState;
  projectId: string;
}) {
  const t = fr.framing;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value ?? "");
  const { pending, run } = useFramingAction();
  const inputId = `brief-${field.key}`;

  return (
    <section className="grid gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{t.fields[field.key]}</h3>
        {field.status === "proposed" && <ProposedBadge />}
      </div>

      {editing ? (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveBriefField(projectId, field.key, draft),
              () => setEditing(false),
            );
          }}
        >
          <Label htmlFor={inputId} className="sr-only">
            {t.fields[field.key]}
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
          <ProvenanceNote provenance={field.provenance} projectId={projectId} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-2">
          {field.status === "proposed" && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => confirmBriefField(projectId, field.key))
                }
              >
                {t.actions.confirm}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() => rejectBriefField(projectId, field.key))
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
        </div>
      )}
    </section>
  );
}
