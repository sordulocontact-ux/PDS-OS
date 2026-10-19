import { IconBan } from "@/components/icons";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { StepBlocker, StepNote } from "@/lib/step-tools/model";
import { formatDayMonth } from "@/lib/utils/instant";

import { LiftBlockerDialog } from "./lift-blocker-dialog";
import { NotesDialogButton, type NotesDialogProps } from "./notes-dialog";

const t = fr.stepTools.blocker;

/**
 * An open blocker in its step (proto blockerRow): « Bloqué · what · Débloque :
 * X · prochaine action : … · signalé le … par … », and « Lever le blocage »
 * for the person who unblocks or the owner.
 */
export function BlockerCallout({
  projectId,
  blocker: b,
}: {
  projectId: string;
  blocker: StepBlocker;
}) {
  return (
    <Frame
      text={b.description}
      who={b.unblocker}
      next={b.nextAction}
      reported={t.reported(formatDayMonth(b.reportedAt), b.reportedBy)}
    >
      {b.canLift && <LiftBlockerDialog projectId={projectId} blocker={b} />}
    </Frame>
  );
}

/**
 * Two informations that contradict each other: a blocker until the owner
 * chooses the one that is authoritative (« Choisir ce qui fait foi »).
 */
export function ContradictionCallout({
  notes,
  owner,
  dialog,
}: {
  notes: StepNote[];
  // The project's owner, who decides.
  owner: string;
  dialog: NotesDialogProps;
}) {
  const last = notes.reduce((a, n) => (n.notedAt > a ? n.notedAt : a), "");
  return (
    <Frame
      text={t.contradiction(notes.map((n) => n.body))}
      who={owner}
      next={t.contradictionNext}
      reported={t.reported(formatDayMonth(last), "")}
    >
      {dialog.canDecide && <NotesDialogButton {...dialog} label={t.choose} />}
    </Frame>
  );
}

function Frame({
  text,
  who,
  next,
  reported,
  children,
}: {
  text: string;
  who: string;
  next: string;
  reported: string;
  children?: React.ReactNode;
}) {
  return (
    <ToneCallout tone="danger" as="div" className="flex gap-3">
      <IconBan aria-hidden className="mt-1 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p>
          <b className="font-semibold">{t.blocked}</b> · {text}
          <br />
          <span>
            {t.unblocks} <b className="font-semibold">{who}</b> ·{" "}
            {t.nextAction(next)} · {reported}
          </span>
        </p>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </ToneCallout>
  );
}
