import type { PortalCardItem } from "@/components/portal/portal-sections";
import { AudioFile } from "@/components/ui/audio-file";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import type { PublicListen } from "@/lib/master-workflow/listen-public";
import { formatTimecode } from "@/lib/master-workflow/mix-types";
import { formatShortInstant } from "@/lib/utils/day";

import { ListenForm } from "./listen-form";

const t = fr.masterListen;

/**
 * The artist's cards (proto `master:v1`, rôle « mona »): each version in
 * listening, its player, their own feedback, « Envoyer mon retour ».
 * Nothing in listening: one card that says so.
 */
export function listenPortalCards({
  token,
  listen,
}: {
  token: string;
  listen: PublicListen;
}): PortalCardItem[] {
  if (listen.versions.length === 0)
    return [
      {
        id: "listen",
        title: t.empty,
        state: "waiting",
        order: 5,
        workflow: "master",
        body: <p className="text-muted-foreground">{t.emptyLine}</p>,
      },
    ];
  return listen.versions.map((v) => ({
    id: `listen-${v.id.slice(0, 8)}`,
    title: t.card(v.stage, v.number, v.title),
    state: v.mine.length > 0 ? "done" : "todo",
    action: v.mine.length > 0 ? null : { label: t.todo, due: null },
    badge: v.mine.length > 0 ? t.states.done : undefined,
    order: 5,
    workflow: "master",
    body: (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border-hairline)] p-4">
          <b className="font-semibold break-all">
            {t.version(v.stage, v.number, v.fileName)}
          </b>
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {t.deposited(v.by, formatShortInstant(v.at))}
          </span>
          <AudioFile
            label={t.version(v.stage, v.number, v.fileName)}
            listenUrl={v.url}
            downloadUrl={null}
          />
        </div>
        <p className="text-muted-foreground">{t.intro(listen.validator)}</p>
        {v.mine.length > 0 && (
          <FactRows>
            {v.mine.map((c) => (
              <FactRow
                key={c.at}
                label={t.yours}
                value={
                  <span>
                    {c.timecode !== null && (
                      <b className="font-semibold tabular-nums">
                        {formatTimecode(c.timecode)} ·{" "}
                      </b>
                    )}
                    « {c.body} »
                  </span>
                }
                source={formatShortInstant(c.at)}
              />
            ))}
          </FactRows>
        )}
        <ListenForm
          token={token}
          versionId={v.id}
          validator={listen.validator}
        />
      </div>
    ),
  }));
}
