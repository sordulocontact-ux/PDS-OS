"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { HandoffItemLines } from "@/components/design/closure/handoff-item-lines";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { passToProduction } from "@/lib/design/actions/closure";
import type { HandoffItem } from "@/lib/design/handoff-plan";
import { fr } from "@/lib/i18n/fr";

// A deliverable whose validated sheet may go now, excluded or not.
const choosable = (i: HandoffItem) =>
  i.state === "ready" ||
  (i.state === "excluded" && i.sheetStatus === "ready_for_production");

/**
 * The transfer plan, previewed then confirmed (MKT-C2-13): each
 * deliverable, its validated sheet, responsible, date, dependencies and
 * reserves; unticked, it stays in Conception with a reason. What is already
 * in Production or not validated is said, not chosen.
 */
export function HandoffPlanForm({
  projectId,
  items,
  onDone,
}: {
  projectId: string;
  items: HandoffItem[];
  onDone: () => void;
}) {
  const t = fr.conceptionClosure;
  const router = useRouter();
  const [kept, setKept] = useState(
    () =>
      new Set(
        items.filter((i) => i.state === "ready").map((i) => i.deliverableId),
      ),
  );
  const [tried, setTried] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const { pending, error, run } = useWriteSubmit(() => {
    onDone();
    router.push(routes.projectProduction(projectId));
  }, t.done);
  const open = items.filter(choosable);
  const others = items.filter((i) => !choosable(i));

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const reasonOf = (id: string) =>
          String(form.get(`reason-${id}`) ?? "").trim();
        const excluded = [
          ...open
            .filter((i) => !kept.has(i.deliverableId))
            .map((i) => ({
              deliverableId: i.deliverableId,
              reason: reasonOf(i.deliverableId),
            })),
          // Excluded earlier and still not validated: the reason stays.
          ...others.flatMap((i) =>
            i.state === "excluded" && i.exclusionReason
              ? [{ deliverableId: i.deliverableId, reason: i.exclusionReason }]
              : [],
          ),
        ];
        setTried(true);
        const missing = excluded.filter((e) => !e.reason);
        setMissingCount(missing.length);
        if (missing.length) {
          document
            .getElementById(`reason-${missing[0].deliverableId}`)
            ?.focus();
          return;
        }
        run(() => passToProduction(projectId, excluded));
      }}
    >
      {open.length === 0 && (
        <p className="text-body-md text-muted-foreground">{t.nothingToHand}</p>
      )}
      {open.length > 0 && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-body-md font-semibold">
            {t.groups.ready}
          </legend>
          {open.map((i) => (
            <div key={i.deliverableId} className="flex flex-col gap-2">
              <CheckboxField
                label={t.include(i.title)}
                checked={kept.has(i.deliverableId)}
                onChange={(checked) =>
                  setKept((prev) => {
                    const next = new Set(prev);
                    if (checked) next.add(i.deliverableId);
                    else next.delete(i.deliverableId);
                    return next;
                  })
                }
              />
              <HandoffItemLines item={i} />
              {!kept.has(i.deliverableId) && (
                <ReasonField item={i} tried={tried} />
              )}
            </div>
          ))}
        </fieldset>
      )}
      {(["handed", "not_ready", "excluded"] as const).map((group) => {
        const list = others.filter((i) => i.state === group);
        if (!list.length) return null;
        return (
          <section key={group} className="flex flex-col gap-2">
            <h3 className="text-body-md font-semibold">{t.groups[group]}</h3>
            {list.map((i) => (
              <div key={i.deliverableId} className="flex flex-col gap-1">
                <span className="font-medium">{i.title}</span>
                <HandoffItemLines item={i} />
              </div>
            ))}
          </section>
        );
      })}
      <p className="text-caption text-muted-foreground">{t.consequences}</p>
      {missingCount > 0 && (
        <FormMessage kind="error">{t.missing(missingCount)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.confirm}
        onCancel={onDone}
      />
    </form>
  );
}

function ReasonField({ item, tried }: { item: HandoffItem; tried: boolean }) {
  const t = fr.conceptionClosure;
  const [value, setValue] = useState(item.exclusionReason ?? "");
  return (
    <TextareaField
      id={`reason-${item.deliverableId}`}
      name={`reason-${item.deliverableId}`}
      label={t.reasonLabel(item.title)}
      required
      rows={2}
      maxLength={1000}
      placeholder={t.reasonPlaceholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={tried && !value.trim() ? t.reasonMissing : undefined}
    />
  );
}
