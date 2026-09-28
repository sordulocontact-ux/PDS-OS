import Link from "next/link";
import { IconChevronRight } from "nucleo-sharp-essential";

import { cn } from "@/lib/utils";

const rowClass = (selected: boolean) =>
  cn(
    "-mx-3 flex w-[calc(100%+1.5rem)] items-start gap-3 rounded-lg px-3 py-2.5 text-left text-body-lg font-semibold text-foreground transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
    selected && "bg-[var(--surface-sunken)] hover:bg-[var(--surface-sunken)]",
  );

function Content({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <>
      <IconChevronRight
        aria-hidden
        className="mt-1 size-4 shrink-0 text-muted-foreground"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="break-words">{children}</span>
        {detail && (
          <span className="text-caption font-medium text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
    </>
  );
}

/**
 * A line of the guided review, "›" first: a link to a point, or one choice of
 * a question (a radio, `selected` when picked). No divider between lines.
 */
export function GuideRow(
  props: {
    children: React.ReactNode;
    detail?: React.ReactNode;
  } & (
    | { href: string }
    | { selected: boolean; onSelect: () => void; disabled?: boolean }
  ),
) {
  if ("href" in props)
    return (
      <Link href={props.href} className={rowClass(false)}>
        <Content detail={props.detail}>{props.children}</Content>
      </Link>
    );
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      disabled={props.disabled}
      onClick={props.onSelect}
      className={rowClass(props.selected)}
    >
      <Content detail={props.detail}>{props.children}</Content>
    </button>
  );
}
