"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { sourceLabel } from "@/components/framing/guide/source-quote";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addDeadline,
  confirmQuestion,
  removeDeadline,
  updateDeadline,
} from "@/lib/framing/actions/questions";
import { formatBriefDate } from "@/lib/framing/assess";
import type { FramingKnowledge } from "@/lib/framing/knowledge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

type Deadline = FramingKnowledge["deadlines"][number];

/**
 * « Échéances imposées » (dimension Temporalité): one dated line each. A
 * deadline heard in a call without its full date waits for a person to pick
 * it (never completed by PO).
 */
export function DeadlineLines({
  deadlines,
  projectId,
  editable,
  nextHref,
}: {
  deadlines: Deadline[];
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingIntel.guide.deadlines;
  const kinds = fr.framingIntel.deadlineKinds;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [editing, setEditing] = useState<Deadline | null | undefined>();
  const proposed = deadlines.some((d) => d.review_status === "proposed");

  return (
    <div className="flex flex-col gap-4">
      {deadlines.length > 0 && (
        <ul className="flex flex-col gap-1">
          {deadlines.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                disabled={!editable}
                onClick={() => setEditing(d)}
                className={cn(
                  "-mx-3 grid w-[calc(100%+1.5rem)] gap-1 rounded-lg px-3 py-2.5 text-left sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4",
                  editable &&
                    "hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                <span className="text-body-md font-semibold">
                  {d.kind === "other" && d.label
                    ? d.label
                    : kinds[d.kind as keyof typeof kinds]}
                </span>
                <span className="flex min-w-0 flex-col items-start gap-1">
                  <span className="text-body-md">
                    {d.due_date ? formatBriefDate(d.due_date) : t.noDate}
                  </span>
                  {d.provenance && (
                    <span className="text-caption text-muted-foreground">
                      {sourceLabel(d.provenance)}
                      {d.provenance.quote ? ` · « ${d.provenance.quote} »` : ""}
                    </span>
                  )}
                  {d.review_status === "proposed" && (
                    <ProposedBadge provenance={d.provenance} />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {deadlines.length > 0 && (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                proposed
                  ? run(
                      () => confirmQuestion(projectId, "deadlines"),
                      () => router.push(nextHref),
                    )
                  : router.push(nextHref)
              }
            >
              {proposed
                ? fr.framingIntel.guide.confirm
                : fr.framingIntel.guide.next}
            </Button>
          )}
          <Button
            size="lg"
            variant={deadlines.length > 0 ? "outline" : "default"}
            disabled={pending}
            onClick={() => setEditing(null)}
          >
            {t.add}
          </Button>
        </div>
      )}
      <FormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        title={
          editing
            ? (kinds[editing.kind as keyof typeof kinds] ?? t.kind)
            : t.add
        }
        description={fr.framingIntel.questions.deadlines.why}
        closeLabel={fr.framingGuide.close}
      >
        <DeadlineForm
          projectId={projectId}
          deadline={editing ?? null}
          onDone={() => setEditing(undefined)}
        />
      </FormDialog>
    </div>
  );
}

function DeadlineForm({
  projectId,
  deadline,
  onDone,
}: {
  projectId: string;
  deadline: Deadline | null;
  onDone: () => void;
}) {
  const t = fr.framingIntel.guide.deadlines;
  const { pending, run, error } = useFramingAction({ inline: true });
  const [kind, setKind] = useState(deadline?.kind ?? "master_final");
  const [label, setLabel] = useState(deadline?.label ?? "");
  const [date, setDate] = useState(deadline?.due_date ?? "");
  const input = { kind: kind as "other", label, dueDate: date };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            deadline
              ? updateDeadline(projectId, deadline.id, input)
              : addDeadline(projectId, input),
          onDone,
        );
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="deadline-kind" required>
          {t.kind}
        </Label>
        <OptionSelect
          id="deadline-kind"
          required
          label={t.kind}
          options={fr.framingIntel.deadlineKinds}
          value={kind}
          onChange={setKind}
        />
      </div>
      {kind === "other" && (
        <div className="grid gap-1.5">
          <Label htmlFor="deadline-label" required>
            {t.label}
          </Label>
          <Input
            id="deadline-label"
            value={label}
            maxLength={200}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="deadline-date" required>
          {t.date}
        </Label>
        <Input
          id="deadline-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 w-fit"
          autoFocus
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || !date || (kind === "other" && !label.trim())}
        >
          {fr.framingIntel.guide.save}
        </Button>
        {deadline && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => removeDeadline(projectId, deadline.id), onDone)
            }
          >
            {t.remove}
          </Button>
        )}
      </div>
    </form>
  );
}
