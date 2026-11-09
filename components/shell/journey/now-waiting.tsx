import { IconAlarmClock } from "nucleo-sharp-essential";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { journey } from "@/lib/i18n/fr/journey";
import { lowerFirst } from "@/lib/ui/journey";

import type { NowItem } from "./now-card";
import { initials } from "./step-waiting";

const fr = { journey };

const t = fr.journey;

/** « En attente de **Claire Morel** (lien privé) : valider la V1 · Étape »
 * — who « Maintenant » waits for, an avatar or a clock when nobody is named
 * (a date), and « Voir », but to a step already shown (`shown`). */
export function WaitingRows({
  items,
  shown = [],
}: {
  items: NowItem[];
  shown?: string[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map(({ step, place }) => {
        const who = step.actor?.name;
        return (
          <li
            key={step.href + step.key}
            className="flex items-center gap-2.5 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]"
          >
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold"
            >
              {who ? initials(who) : <IconAlarmClock className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              {t.now.waitingOfName(who ?? "")}
              <b className="font-semibold">{who ?? "—"}</b>
              {step.actor?.viaLink && (
                <span className="text-[color:var(--text-secondary)]">
                  {" "}
                  ({t.privateLink})
                </span>
              )}
              {" : "}
              {lowerFirst(step.actor?.todo ?? "")}
              <span className="text-[color:var(--text-secondary)]">
                {" · "}
                {[place, step.title].filter(Boolean).join(" › ")}
              </span>
            </span>
            {!shown.includes(step.key) && (
              <ViewLink
                href={step.href}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ButtonRoll>{t.now.see}</ButtonRoll>
              </ViewLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
