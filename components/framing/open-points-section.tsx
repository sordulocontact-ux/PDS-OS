"use client";

import { useState } from "react";

import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addOpenPoint,
  resolveOpenPoint,
} from "@/lib/framing/actions/points-tasks";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

export function OpenPointsSection({
  points,
  projectId,
}: {
  points: FramingData["openPoints"];
  projectId: string;
}) {
  const t = fr.framing.openPoints;
  const a = fr.framing.actions;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [question, setQuestion] = useState("");
  const open = points.filter((p) => p.status === "open");
  const resolved = points.filter((p) => p.status === "resolved");

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">{t.hint}</p>
      {open.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      <ul className="grid gap-3">
        {open.map((point) => (
          <li key={point.id} className="grid gap-1.5">
            <p className="text-sm">{point.question}</p>
            {point.provenance && (
              <ProvenanceNote provenance={point.provenance} />
            )}
            {!canEdit ? null : resolving === point.id ? (
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(
                    () => resolveOpenPoint(projectId, point.id, resolution),
                    () => {
                      setResolving(null);
                      setResolution("");
                    },
                  );
                }}
              >
                <Label htmlFor={`res-${point.id}`}>{t.resolution}</Label>
                <Input
                  id={`res-${point.id}`}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending || resolution.trim() === ""}
                  >
                    {a.save}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setResolving(null)}
                  >
                    {a.cancel}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="justify-self-start"
                onClick={() => {
                  setResolving(point.id);
                  setResolution("");
                }}
              >
                {t.resolve}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => addOpenPoint(projectId, question),
              () => setQuestion(""),
            );
          }}
        >
          <div className="grid flex-1 gap-1">
            <Label htmlFor="new-point">{t.question}</Label>
            <Input
              id="new-point"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={pending || question.trim() === ""}
          >
            {a.add}
          </Button>
        </form>
      )}
      {resolved.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {t.resolved} ({resolved.length})
          </summary>
          <ul className="mt-2 grid gap-2">
            {resolved.map((p) => (
              <li key={p.id}>
                <span className="text-muted-foreground line-through">
                  {p.question}
                </span>{" "}
                → {p.resolution}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
