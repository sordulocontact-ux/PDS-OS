"use client";

import { FieldError } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { establishCreativeBrief } from "@/lib/design/actions/brief";

/** « Établir le Brief créatif Vn » (proto deB): stored as built by code. */
export function EstablishBriefButton({
  projectId,
  label,
  done,
}: {
  projectId: string;
  label: string;
  done: string;
}) {
  const { pending, error, run } = useWriteSubmit(() => undefined, done);
  return (
    <div className="flex flex-col gap-2">
      <FieldError id="establish-brief-error">{error ?? undefined}</FieldError>
      <Button
        className="self-start"
        disabled={pending}
        aria-busy={pending}
        onClick={() => run(() => establishCreativeBrief(projectId, done))}
      >
        {label}
      </Button>
    </div>
  );
}
