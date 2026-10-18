"use client";

import { IconCheck, IconXmark } from "nucleo-sharp-essential";
import { createContext, use, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { WriteDone } from "@/lib/utils/write-result";

const t = fr.moduleFrame.result;

type Ctx = { result: WriteDone | null; show: (r: WriteDone | null) => void };
const StepResult = createContext<Ctx | null>(null);

/**
 * Holds the last gesture's result of an open step, so ResultBanner shows it
 * where the person clicked (VISION-UX rule 7). StepPanel wraps its content
 * in it; a new page (another step) starts empty.
 */
export function StepResultProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [result, setResult] = useState<WriteDone | null>(null);
  const value = useMemo(() => ({ result, show: setResult }), [result]);
  return <StepResult value={value}>{children}</StepResult>;
}

/**
 * After a successful write: the toast with the same verb as the button
 * (`done`, else `fallback`), and the banner in the step when the result says
 * what follows. Safe outside a step: only the toast then.
 */
export function usePublishResult() {
  const ctx = use(StepResult);
  const show = ctx?.show;
  return useCallback(
    (result: WriteDone, fallback?: string) => {
      if (result.notice) toast.warning(result.notice);
      else {
        const message = result.done ? `${result.done}.` : fallback;
        if (message) toast.success(message);
      }
      if (result.done) show?.(result);
    },
    [show],
  );
}

/** The banner of the step's last gesture, if any (StepPanel's `flash`). */
export function ResultBanner() {
  const ctx = use(StepResult);
  if (!ctx?.result?.done) return null;
  return (
    <ResultBannerView result={ctx.result} onClose={() => ctx.show(null)} />
  );
}

/**
 * « ✓ **Dossier confirmé** · Ensuite : **Lina Haddad** · lancer le plan
 * (Juridique › Plan d'action) · Débloqué : **Plan d'action** · … ».
 */
export function ResultBannerView({
  result,
  onClose,
}: {
  result: WriteDone;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl bg-[var(--tone-success-bg)] px-4 py-3.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--tone-success-fg)]"
    >
      <IconCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <b className="font-semibold">{result.done}</b>
        {result.next?.map((n) => (
          <span key={`n-${n.step}-${n.who}`}>
            {t.next} <b className="font-semibold">{n.who}</b>
            {n.viaLink && ` (${t.viaLink})`} · {n.todo.toLowerCase()} ({n.step})
          </span>
        ))}
        {result.unlocked?.map((u) => (
          <span key={`u-${u.step}`}>
            {t.unlocked} <b className="font-semibold">{u.step}</b>
            {[u.who, u.todo?.toLowerCase()]
              .filter(Boolean)
              .map((part) => ` · ${part}`)
              .join("")}
          </span>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-my-1 text-current hover:text-current"
        aria-label={t.close}
        onClick={onClose}
      >
        <IconXmark aria-hidden />
      </Button>
    </div>
  );
}
