"use client";

import { useId, useState } from "react";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decideDesignDirection } from "@/lib/design/actions/direction";
import { fr } from "@/lib/i18n/fr";

type Decision = "approved" | "changes_requested" | "rejected";
const DECISIONS: Decision[] = ["approved", "changes_requested", "rejected"];

/**
 * A validator's decision on one section of a version ('' = the whole
 * version in global mode): Valider, Valider avec réserves (MKT-C2-11: the
 * reserves written), Demander des modifications or Refuser, a comment being
 * required for the last two. Never decided by silence.
 */
export function DecisionControls({
  projectId,
  submissionId,
  section,
}: {
  projectId: string;
  submissionId: string;
  section: string;
}) {
  const t = fr.conceptionDirection.versions;
  const id = useId();
  const [comment, setComment] = useState("");
  const [reserving, setReserving] = useState(false);
  const [reserves, setReserves] = useState("");
  const { pending, run } = useDesignAction();
  const needsComment = comment.trim() === "";

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{t.decide}</Label>
        <Textarea
          id={id}
          rows={2}
          maxLength={2000}
          value={comment}
          disabled={pending}
          placeholder={t.commentLabel}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setComment(e.target.value)}
        />
        <p id={`${id}-hint`} className="text-caption text-muted-foreground">
          {t.commentHint}
        </p>
      </div>
      {reserving && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-reserves`} required>
            {t.reservesLabel}
          </Label>
          <Textarea
            id={`${id}-reserves`}
            rows={2}
            maxLength={2000}
            value={reserves}
            disabled={pending}
            placeholder={t.reservesPlaceholder}
            onChange={(e) => setReserves(e.target.value)}
          />
          <Button
            size="sm"
            className="self-start"
            disabled={pending || reserves.trim() === ""}
            onClick={() =>
              run(
                () =>
                  decideDesignDirection(
                    projectId,
                    submissionId,
                    section,
                    "approved",
                    comment,
                    reserves,
                  ),
                { success: t.decidedToast },
              )
            }
          >
            {t.approveWithReserves}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!reserving && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setReserving(true)}
          >
            {t.withReserves}
          </Button>
        )}
        {DECISIONS.map((decision) => (
          <Button
            key={decision}
            size="sm"
            variant={decision === "approved" ? "default" : "outline"}
            disabled={pending || (decision !== "approved" && needsComment)}
            onClick={() =>
              run(
                () =>
                  decideDesignDirection(
                    projectId,
                    submissionId,
                    section,
                    decision,
                    comment,
                  ),
                { success: t.decidedToast, onSuccess: () => setComment("") },
              )
            }
          >
            {fr.conception.decisions[decision]}
          </Button>
        ))}
      </div>
    </div>
  );
}
