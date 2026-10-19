"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  MemberSelect,
  memberValue,
} from "@/components/activations/member-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  designateOwner,
  fixDue,
  moveActivation,
  setActivationLife,
} from "@/lib/activations/journey-actions";
import { closeNow } from "@/lib/activations/trunk-actions";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationJourney.gesture;

type Ids = { projectId: string; activationId: string };

/** « Désigner un responsable » (proto): the project's owner preselected. */
export function DesignateForm({
  ids,
  members,
  defaultPersonId,
}: {
  ids: Ids;
  members: Member[];
  defaultPersonId: string | null;
}) {
  const router = useRouter();
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => router.refresh(), "");
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const personId = memberValue(
          new FormData(event.currentTarget),
          "owner",
        );
        setMissing(!personId);
        if (personId) run(() => designateOwner({ ...ids, personId }));
      }}
    >
      <MemberSelect
        name="owner"
        label={t.owner}
        members={members}
        defaultValue={defaultPersonId}
        required
        error={missing ? fr.activationJourney.errors.owner : undefined}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {t.designate}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}

/** « Fixer l'échéance », the date of the launch calendar proposed. */
export function DueForm({
  ids,
  proposed,
  hint,
}: {
  ids: Ids;
  proposed: string | null;
  hint: string | null;
}) {
  const router = useRouter();
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => router.refresh(), "");
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const dueOn = String(
          new FormData(event.currentTarget).get("due") ?? "",
        );
        setMissing(!dueOn);
        if (dueOn) run(() => fixDue({ ...ids, dueOn }));
      }}
    >
      <Field
        name="due"
        type="date"
        label={fr.activationJourney.infos.due}
        required
        defaultValue={proposed ?? ""}
        hint={hint ?? undefined}
        error={missing ? fr.activationJourney.errors.dueRequired : undefined}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {t.fixDue}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </form>
  );
}

const GESTURES: Record<
  "launch" | "declare_done" | "close" | "resume",
  { label: string; run: (ids: Ids) => Promise<WriteResult> }
> = {
  launch: {
    label: t.launch,
    run: (ids) => moveActivation({ ...ids, to: "in_progress" }),
  },
  declare_done: {
    label: t.declare,
    run: (ids) => moveActivation({ ...ids, to: "done_declared" }),
  },
  close: { label: t.close, run: (ids) => closeNow(ids) },
  resume: {
    label: t.resume,
    run: (ids) => setActivationLife({ ...ids, action: "resume", reason: "" }),
  },
};

/** One button of the trunk (Lancer, Déclarer réalisée, Clôturer,
 * Reprendre); the database's refusal said under it. */
export function GestureButton({
  ids,
  gesture,
}: {
  ids: Ids;
  gesture: keyof typeof GESTURES;
}) {
  const router = useRouter();
  const { pending, error, run } = useWriteSubmit(() => router.refresh(), "");
  const g = GESTURES[gesture];
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          disabled={pending}
          onClick={() => run(() => g.run(ids))}
        >
          {g.label}
        </Button>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </div>
  );
}
