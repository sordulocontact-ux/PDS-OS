"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { ProofChip } from "@/components/distribution/deposit/proof-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { declareAnswers } from "@/lib/distribution/declare-actions";
import type { OrchardAnswer } from "@/lib/distribution/tracking";
import { removeProof, uploadProof } from "@/lib/distribution/upload-proof";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.distributionJourney.orchard;

type Answer = OrchardAnswer;

/**
 * « Ce que The Orchard vous a dit » (VISION-UX rule 7, proto `UI.orchard`):
 * one box per answer not declared yet, each only once the one before is
 * ticked (a help of the screen: nothing is deduced, § 7), its date and, if
 * any, its proof — a proof given to one line is offered to the others
 * (« Même e-mail que… »). One « Enregistrer » declares them all.
 */
export function OrchardForm({
  projectId,
  organizationId,
  left,
  today,
}: {
  projectId: string;
  organizationId: string;
  // The answers not declared yet, in order.
  left: Answer[];
  today: string;
}) {
  const [ticked, setTicked] = useState<Partial<Record<Answer, boolean>>>({});
  const [dates, setDates] = useState<Partial<Record<Answer, string>>>({});
  // A file of its own, or false: the shared one was removed from this line.
  const [own, setOwn] = useState<Partial<Record<Answer, File | false>>>({});
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setTicked({});
    setOwn({});
    setDates({});
  }, t.answersSaved(2));

  const proofOf = (k: Answer): { file: File; from?: Answer } | null => {
    const mine = own[k];
    if (mine === false) return null;
    if (mine) return { file: mine };
    const from = left.find((x) => x !== k && ticked[x] && own[x]);
    const shared = from ? own[from] : undefined;
    return from && shared ? { file: shared, from } : null;
  };

  const toggle = (k: Answer, on: boolean) => {
    setMissing(false);
    const index = left.indexOf(k);
    setTicked((prev) => {
      const next = { ...prev, [k]: on };
      // Unticking one unticks the ones after it.
      if (!on) for (const after of left.slice(index + 1)) next[after] = false;
      return next;
    });
  };

  const submit = () => {
    const chosen = left.filter((k) => ticked[k]);
    if (chosen.length === 0) return setMissing(true);
    run(async () => {
      const uploaded = new Map<File, { path: string; name: string }>();
      for (const k of chosen) {
        const proof = proofOf(k);
        if (proof && !uploaded.has(proof.file)) {
          const up = await uploadProof({
            organizationId,
            projectId,
            file: proof.file,
          });
          if ("error" in up) {
            for (const done of uploaded.values()) await removeProof(done.path);
            return { ok: false, error: up.error };
          }
          uploaded.set(proof.file, up);
        }
      }
      const result = await declareAnswers({
        projectId,
        items: chosen.map((k) => {
          const proof = proofOf(k);
          const up = proof ? uploaded.get(proof.file) : undefined;
          return {
            kind: k,
            declaredOn: dates[k] ?? today,
            proofPath: up?.path ?? "",
            proofName: up?.name ?? "",
          };
        }),
      });
      if (!result.ok)
        for (const done of uploaded.values()) await removeProof(done.path);
      return result;
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.tellTitle}
      </h3>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.tellBody}
      </p>
      <div className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
        {left.map((k, index) => {
          // A box opens once the one before it is ticked.
          const enabled = index === 0 || Boolean(ticked[left[index - 1]]);
          const on = Boolean(ticked[k]);
          const proof = proofOf(k);
          const [label, hint] = t.tell[k];
          const id = `oc-${k}`;
          return (
            <div
              key={k}
              className={cn(
                "flex flex-wrap items-start gap-3 border-b border-[color:var(--border-hairline)] px-3.5 py-3 last:border-b-0",
                !enabled && "opacity-50",
              )}
            >
              <Checkbox
                id={id}
                checked={on}
                disabled={!enabled}
                onChange={(e) => toggle(k, e.currentTarget.checked)}
                className="mt-0.5"
              />
              <label htmlFor={id} className="flex min-w-0 flex-1 flex-col">
                <b className="font-semibold">{label}</b>
                <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
                  {hint}
                </span>
              </label>
              {on && (
                <span className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    className="h-9 w-auto"
                    aria-label={t.dateOf(label)}
                    value={dates[k] ?? today}
                    max={today}
                    onChange={(e) =>
                      setDates((d) => ({ ...d, [k]: e.target.value }))
                    }
                  />
                  {proof ? (
                    <ProofChip
                      name={
                        proof.from
                          ? t.sameAs(t.nodes[proof.from])
                          : proof.file.name
                      }
                      onRemove={() => setOwn((o) => ({ ...o, [k]: false }))}
                    />
                  ) : (
                    <label
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      })}
                    >
                      <IconPaperclip aria-hidden />
                      {t.attach}
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setOwn((o) => ({ ...o, [k]: file }));
                        }}
                      />
                    </label>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <FormMessage kind="error">
        {missing ? t.nothingTicked : error}
      </FormMessage>
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {t.save}
        </Button>
      </div>
    </section>
  );
}
