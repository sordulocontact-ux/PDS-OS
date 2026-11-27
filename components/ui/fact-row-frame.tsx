import Link from "next/link";
import type { ReactNode, Ref } from "react";

import { FactSourceHint } from "@/components/ui/fact-source-hint";
import { RequiredMark } from "@/components/ui/required-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { decisions } from "@/lib/i18n/fr/decisions";
import { columnIcons, type ColumnIcon } from "@/lib/ui/column-icons";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import type { WriteResult } from "@/lib/utils/write-result";

const fr = { decisions };

const t = fr.decisions.fact;

/** Where a fact comes from: a sentence, or the words said and where. */
export type FactSource =
  | string
  | { quote: string; from: string; href?: string | null };

/** « Modifier » in place: the field, its proposal, the module's action. */
export type FactEdit = {
  kind?: "text" | "date" | "number" | "select";
  value: string;
  // kind « select »: { value: label }.
  options?: Record<string, string>;
  // The proposal as said under the field (« Dim. 15/11/2026 »).
  proposal?: string;
  // The field may be emptied.
  optional?: boolean;
  onSave: (value: string) => Promise<WriteResult>;
  done?: string;
};

/** « Changer »: a `PickList` (or `PersonPickList`), in place or in a modal. */
export type FactChange = {
  list: ReactNode;
  // Set: the list opens in a modal of that title.
  dialogTitle?: string;
  dialogDescription?: string;
  // Open from the start (default: when the value is missing).
  defaultOpen?: boolean;
};

export type FactRowProps = {
  label?: string;
  // Before the label, from the one dictionary of the tables' columns (a
  // concept wears one icon everywhere, Sacha 27/11/2026): helps find the
  // row without reading, never replaces the label.
  icon?: ColumnIcon;
  value?: ReactNode;
  source?: FactSource | null;
  state?: { tone: Tone; label: string } | null;
  // On the right: a button or a link of the module.
  side?: ReactNode;
  // Nobody chosen yet: the value in red, « À choisir » when empty.
  missing?: boolean;
  missingLabel?: string;
  // `badge` (Sacha, 05/11/2026, the Master's Brief first): no red before
  // any attempt, the row keeps its label and source, « À choisir » is a
  // warning pill on the right (unless the row has its own state), and a
  // `change` list stays folded behind « Choisir ».
  missingAs?: "text" | "badge";
  // `edit` / `change` open from a click on the whole row (Sacha, 05/11/2026,
  // as on the Juridique and the Source): no « Modifier » / « Changer »
  // written at rest, the row's tint and its verb on hover say it.
  openOnRow?: boolean;
  // « Modifié par … » in the selection colour, instead of the source.
  changedBy?: string | null;
  // A field in place of the value (a form that saves as a whole, such as
  // the SACEM bulletin): the row label stays visible, the field carries its
  // own hidden one, and `required` adds the « * ».
  control?: ReactNode;
  required?: boolean;
  // Full width under the row.
  below?: ReactNode;
  // The whole row opens this view, or runs `onClick` (its words, for a
  // screen reader, in `hrefLabel`), never with a button beside it.
  href?: string | null;
  onClick?: () => void;
  hrefLabel?: string;
  // The row whose item is open (under it, or in PO's box): light grey, as
  // the open page in the navigation, `aria-current` (Sacha 09/11/2026:
  // « pas bleu, gris clair comme partout »).
  current?: boolean;
  // `href` opens without moving the page (a line opened in place).
  keepScroll?: boolean;
};

/** The source line under the value (« Modifié par … » once changed). */
export function FactSourceText({
  source,
  changedBy,
}: Pick<FactRowProps, "source" | "changedBy">) {
  if (changedBy)
    return (
      <span className="text-caption text-[color:var(--selection)]">
        {t.changedBy(changedBy)}
      </span>
    );
  if (!source) return null;
  if (typeof source === "string")
    return <span className="text-caption text-muted-foreground">{source}</span>;
  return (
    <span className="text-caption break-words text-muted-foreground">
      « {source.quote} » ·{" "}
      {source.href ? (
        <Link
          href={source.href}
          className="underline underline-offset-2 hover:text-foreground"
        >
          {source.from}
        </Link>
      ) : (
        source.from
      )}
    </span>
  );
}

/** The plain words of a source, for « Proposition : … · <source> ». */
export const factSourceWords = (source: FactSource | null | undefined) =>
  !source ? null : typeof source === "string" ? source : source.from;

/** The layout of a fact row, shared by the editable ones. */
export function FactRowFrame({
  label,
  icon,
  value,
  source,
  state,
  side,
  missing,
  missingLabel = t.missing,
  missingAs = "text",
  changedBy,
  control,
  required,
  below,
  href,
  onClick,
  hrefLabel,
  current,
  keepScroll,
  sourceNode,
  hoverAction,
  buttonRef,
}: FactRowProps & {
  sourceNode?: ReactNode;
  // `openOnRow`: the verb of the click (« Choisir », « Changer »,
  // « Modifier »), opening on hover, read by a screen reader with the row;
  // the row's button for the focus.
  hoverAction?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const action = Boolean(href || onClick);
  const empty = value === undefined || value === null || value === "";
  const pill = missing && missingAs === "badge";
  // Nothing chosen yet: the label reads as the title, its source under it.
  const titleOnly = pill && empty && !control;
  const shownState =
    state ?? (pill ? { tone: "warning" as const, label: missingLabel } : null);
  // One line per fact (Sacha, 27/11/2026, after Accordee): the label in a
  // column on the left, the value beside it; a plain source (a place: « Réseau »,
  // « Crédits du titre ») in a hint on the right. What was said (a quote, PO's
  // proposal, « Modifié par … ») stays written: what PO understood always
  // shows its words (docs/VISION-UX.md rule 12). A field or a label alone
  // keep their stacked layout.
  const inline = !control && !titleOnly && Boolean(label);
  const hint =
    inline && !changedBy && !sourceNode && typeof source === "string"
      ? source
      : null;
  const frame =
    "grid grid-cols-1 items-start gap-x-3 gap-y-1 border-b border-[color:var(--border-hairline)] px-3.5 py-2.75 text-body-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]";
  const sourceLine = hint
    ? null
    : (sourceNode ?? <FactSourceText source={source} changedBy={changedBy} />);
  const content = inline ? (
    <>
      <div className="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-4">
        {action && hrefLabel && <span className="sr-only">{hrefLabel}</span>}
        {/* Text, not a flex box: the label keeps the value's baseline. */}
        <span className="text-caption text-muted-foreground md:w-44 md:shrink-0">
          {icon && <FactIcon icon={icon} />}
          {label}
          {required && <RequiredMark />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              "break-words [overflow-wrap:anywhere]",
              missing && !pill && "font-semibold text-error",
            )}
          >
            {missing && empty && !pill ? missingLabel : value}
          </span>
          {sourceLine}
        </span>
      </div>
      {(hint || shownState || side || hoverAction) && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {hint && <FactSourceHint label={t.source(hint)} inert={action} />}
          {shownState && (
            <StatusBadge tone={shownState.tone} size="sm">
              {shownState.label}
            </StatusBadge>
          )}
          {side}
          {hoverAction && <HoverVerb verb={hoverAction} />}
        </div>
      )}
      {below && <div className="flex flex-col gap-2 md:col-span-2">{below}</div>}
    </>
  ) : (
    <>
      <div className="flex min-w-0 flex-col gap-0.5">
        {action && hrefLabel && (
          <span className="sr-only">{hrefLabel}</span>
        )}
        {label && (
          <span
            className={
              titleOnly
                ? "font-medium"
                : control
                  ? // A field's label in ink, above its explanations in grey
                    // (Sacha, 09/11/2026: the SACEM bulletin).
                    "font-medium text-foreground"
                  : "text-caption text-muted-foreground"
            }
          >
            {label}
            {required && <RequiredMark />}
          </span>
        )}
        {!control &&
          (titleOnly ? null : (
          <span
            className={cn(
              "break-words [overflow-wrap:anywhere]",
              missing && !pill && "font-semibold text-error",
            )}
          >
            {missing && empty && !pill ? missingLabel : value}
          </span>
          ))}
        {!control &&
          (sourceNode ?? (
            <FactSourceText source={source} changedBy={changedBy} />
          ))}
      </div>
      {(shownState || side || hoverAction) && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {shownState && (
            <StatusBadge tone={shownState.tone} size="sm">
              {shownState.label}
            </StatusBadge>
          )}
          {side}
          {hoverAction && <HoverVerb verb={hoverAction} />}
        </div>
      )}
      {control && (
        // A field takes the row's whole width, under its label and state:
        // the same width whether a pill sits on the right or not (Sacha,
        // 09/11/2026, the SACEM bulletin).
        <div className="flex min-w-0 flex-col gap-1 md:col-span-2">
          {control}
          {sourceNode ?? (
            <FactSourceText source={source} changedBy={changedBy} />
          )}
        </div>
      )}
      {below && <div className="flex flex-col gap-2 md:col-span-2">{below}</div>}
    </>
  );
  const actionFrame = cn(
    frame,
    "outline-none [transition:var(--transition-control)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
    current
      ? "bg-[var(--surface-sunken)]"
      : "hover:bg-[var(--control-bg-hover)]",
  );
  if (onClick)
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-current={current || undefined}
        className={cn(actionFrame, "group/fact w-full cursor-pointer text-left")}
      >
        {content}
      </button>
    );
  return href ? (
    <ViewLink
      href={href}
      scroll={keepScroll ? false : undefined}
      aria-current={current || undefined}
      className={actionFrame}
    >
      {content}
    </ViewLink>
  ) : (
    <div className={frame}>{content}</div>
  );
}

/**
 * The verb of a row opening on click, folded at rest. On hover it comes out
 * from the row's edge glued to the pill and pushes it: one motion, one speed
 * (Sacha, 05/11/2026). A hover done dozens of times a day: --duration-slide
 * in, faster out, with the curve of what moves on screen; no slide when
 * motion is reduced.
 */
function HoverVerb({ verb }: { verb: string }) {
  return (
    <span className="-ml-2 grid grid-cols-[0fr] transition-[grid-template-columns] duration-[var(--duration-base)] ease-[var(--ease-standard)] group-hover/fact:grid-cols-[1fr] group-hover/fact:duration-[var(--duration-slide)] group-focus-visible/fact:grid-cols-[1fr] motion-reduce:transition-none">
      <span className="min-w-0 overflow-hidden">
        <span className="block px-2 text-body-sm font-medium whitespace-nowrap opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover/fact:opacity-100 group-focus-visible/fact:opacity-100">
          {verb}
        </span>
      </span>
    </span>
  );
}

/** The icon before a fact's label (`columnIcons`). */
function FactIcon({ icon }: { icon: ColumnIcon }) {
  const Icon = columnIcons[icon];
  return (
    <Icon aria-hidden className="mr-1.5 inline size-3.5 align-[-0.2em]" />
  );
}
