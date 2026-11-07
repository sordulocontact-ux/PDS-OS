import type { ReactNode } from "react";

/**
 * One numbered step of a how-to inside a step (« 1. Ce que vous reprenez »,
 * « 2. À qui demander », « 3. Envoyez-leur la demande »): its number in a
 * disc, its title, then what to do. Put them in a `NumberedSteps`.
 */
export function NumberedStep({
  n,
  title,
  children,
}: {
  n: number;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-full border border-[color:var(--border-hairline)] text-sm font-semibold tabular-nums"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <h4 className="text-base leading-7 font-semibold">
          <span className="sr-only">{n}. </span>
          {title}
        </h4>
        {children}
      </div>
    </li>
  );
}

/** The ordered list of `NumberedStep`s. */
export function NumberedSteps({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col gap-7">{children}</ol>;
}
