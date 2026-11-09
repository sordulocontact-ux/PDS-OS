"use client";

import { IconCheck, IconXmark } from "nucleo-sharp-essential";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import { lowerFirst } from "@/lib/ui/journey";
import type { WriteDone } from "@/lib/utils/write-result";

const fr = { moduleFrame };

const t = fr.moduleFrame.result;

type Ctx = { result: WriteDone | null; show: (r: WriteDone | null) => void };
const StepResult = createContext<Ctx | null>(null);

const pathOf = (href: string) => new URL(href, "http://pds.local").pathname;

// The result carried to the step opened for the viewer, until its page
// shows it: the banner goes where the person now is.
let carried: { path: string; result: WriteDone } | null = null;

/**
 * Holds the last gesture's result of an open step, so ResultBanner shows it
 * where the person clicked (VISION-UX rule 7). StepPanel wraps its content
 * in it; a new page (another step) starts empty, unless the gesture opened
 * it (`open`): it then starts with that gesture's result.
 */
export function StepResultProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [result, setResult] = useState<WriteDone | null>(() =>
    carried?.path === pathname ? carried.result : null,
  );
  useEffect(() => {
    if (carried?.path === pathname) carried = null;
  }, [pathname]);
  const value = useMemo(() => ({ result, show: setResult }), [result]);
  return <StepResult value={value}>{children}</StepResult>;
}

/**
 * After a successful write: the toast with the same verb as the button
 * (`done`, else `fallback`; `toast: false` for a gesture repeated many
 * times, the banner says it), and the banner in the step when the result
 * says what follows. When the viewer's next step is on another page
 * (`open`), it is opened at once and the banner goes with it (lot 3 of
 * Ibé's feedback). Safe outside a step: only the toast and the opening.
 */
export function usePublishResult() {
  const ctx = use(StepResult);
  const show = ctx?.show;
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (
      result: WriteDone,
      fallback?: string,
      options: { toast?: boolean } = {},
    ) => {
      if (result.notice) toast.warning(result.notice);
      else if (options.toast !== false) {
        const message = result.done ? `${result.done}.` : fallback;
        if (message) toast.success(message);
      }
      const open = result.open;
      const away = open && pathOf(open.href) !== pathname ? open : null;
      if (away && result.done) carried = { path: pathOf(away.href), result };
      else if (result.done) show?.(result);
      if (away) router.push(away.href);
    },
    [show, router, pathname],
  );
}

/** The banner of the step's last gesture, if any (StepPanel's `flash`);
 * never one said where it was made (`at`, ResultLine). */
export function ResultBanner() {
  const ctx = use(StepResult);
  if (!ctx?.result?.done || ctx.result.at) return null;
  return (
    <ResultBannerView result={ctx.result} onClose={() => ctx.show(null)} />
  );
}

/**
 * « ✓ **Dossier confirmé** · Étape ouverte pour vous : **Juridique › Plan
 * d'action** · En attente de **Lina Haddad** : valider le plan (Juridique ›
 * Plan d'action) · Débloqué : **Plan d'action** · … ».
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
        {result.open && (
          <span>
            {t.opened} <b className="font-semibold">{result.open.step}</b>
          </span>
        )}
        {result.next
          ?.filter((n) => !(n.viewer && n.step === result.open?.step))
          .map((n) =>
            n.viewer ? (
              <span key={`n-${n.step}-${n.who}`}>
                {t.mine} {lowerFirst(n.todo)} ({n.step})
              </span>
            ) : (
              <span key={`n-${n.step}-${n.who}`}>
                {t.waiting} <b className="font-semibold">{n.who}</b>
                {n.viaLink && ` (${t.viaLink})`} : {lowerFirst(n.todo)} (
                {n.step})
              </span>
            ),
          )}
        {result.unlocked?.map((u) => (
          <span key={`u-${u.step}`}>
            {t.unlocked} <b className="font-semibold">{u.step}</b>
            {[u.who, u.todo ? lowerFirst(u.todo) : null]
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

// How long a quiet result stays (proto « Les dimensions »): read, then gone.
const LINE_MS = 8000;

/**
 * « ✓ Réponse enregistrée · Contraintes calendaires », in one quiet line
 * where the gesture was made (`at`, given by the gesture's result): a
 * Cadrage has dozens of answers, the step's green banner for each was noise
 * (Akili's feedback, proto « Les dimensions », Sacha 09/11/2026). Gone after
 * 8 s, or at the next gesture.
 */
export function ResultLine({
  at,
  className,
}: {
  at: string;
  className?: string;
}) {
  const ctx = use(StepResult);
  const result = ctx?.result?.at === at ? ctx.result : null;
  const show = ctx?.show;
  useEffect(() => {
    if (!result || !show) return;
    const timer = setTimeout(() => show(null), LINE_MS);
    return () => clearTimeout(timer);
  }, [result, show]);
  if (!result?.done) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--tone-success-fg)]",
        className,
      )}
    >
      <IconCheck aria-hidden className="size-4 shrink-0" />
      {result.done}
    </p>
  );
}
