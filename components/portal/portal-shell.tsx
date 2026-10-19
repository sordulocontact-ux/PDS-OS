import { IconLock } from "nucleo-sharp-essential";

import { Avatar } from "@/components/ui/avatar";
import { fr } from "@/lib/i18n/fr";
import type { PortalFrame } from "@/lib/portal/frame";

import { portalCardClass } from "./portal-card";

const t = fr.portal;
const ROLE_LABELS: Record<string, string> = fr.auth.members.roles;
const FORMATS: Record<string, string> = fr.shell.musicFormats;

/**
 * The frame of every private page (proto portal, commons.md § 8): the top
 * bar « PDS · « Projet » · Nom » with « Lien privé · sans compte », a 820 px
 * column, the line « Projet · Artiste · format · rôle », the title, the
 * page's cards (`PortalSections`), and « Votre contact chez PDS » (the
 * project's owner) at the bottom. Without a frame (unknown token), the bar
 * and the title only.
 */
export function PortalShell({
  frame,
  role,
  title,
  children,
}: {
  frame: PortalFrame | null;
  // The person's part (« Ingénieur du mix »), when the frame has none.
  role?: string | null;
  title: string;
  children: React.ReactNode;
}) {
  const caption = frame
    ? [
        frame.project,
        frame.artist,
        frame.format ? (FORMATS[frame.format] ?? null) : null,
        role ?? frame.role,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <main className="flex flex-1 flex-col bg-[var(--surface-app)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-hairline)] bg-[var(--surface-page)] px-6 py-3.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-primary text-caption font-bold text-primary-foreground"
          >
            PDS
          </span>
          {frame && (
            <b className="min-w-0 font-semibold break-words">
              {t.bar(frame.project, frame.person)}
            </b>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
          <IconLock aria-hidden className="size-3.5" />
          {t.lock}
        </span>
      </header>
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-[18px] px-4 pt-7 pb-36">
        <div className="flex flex-col gap-1">
          {caption && (
            <p className="text-caption text-muted-foreground">{caption}</p>
          )}
          <h1 className="text-display-md font-medium text-balance">{title}</h1>
        </div>
        {children}
        {frame?.owner && (
          <section className={portalCardClass}>
            <h2 className="text-display-sm font-medium">{t.contact}</h2>
            <span className="flex items-center gap-2.5">
              <Avatar name={frame.owner} pictureUrl={null} className="size-7" />
              <span>
                <b className="font-semibold">{frame.owner}</b>
                {frame.ownerRole && ROLE_LABELS[frame.ownerRole]
                  ? ` · ${ROLE_LABELS[frame.ownerRole]}`
                  : ""}
              </span>
            </span>
          </section>
        )}
      </div>
    </main>
  );
}
