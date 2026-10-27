import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { roles } from "@/lib/i18n/fr/roles";
import { formatShortInstant } from "@/lib/utils/instant";

import { PrivateLinks, type PrivateLinkRow } from "./private-links";

const fr = { roles };

const t = fr.roles;

export type RoleKind = "exec" | "coord" | "valid";
const KIND_TONE = { exec: "info", coord: "neutral", valid: "action" } as const;

/** One role of a module: its holder (a member, or a contact through a
 * private link), what it does, and the module's own « Changer ». */
export type RoleRow = {
  key: string;
  label: string;
  kind: RoleKind;
  holder: { name: string; detail?: string; viaLink?: boolean } | null;
  what?: string;
  // The module's « Changer » (a button opening its form), owner only.
  action?: React.ReactNode;
};

export type RoleHistoryLine = {
  id: string;
  text: string;
  who: string | null;
  at: string;
};

export type RolesPanelProps = {
  roles: RoleRow[];
  links?: PrivateLinkRow[];
  history?: RoleHistoryLine[];
  // Each person's page by project (lot 11, `ContactLinksSection`).
  personLinks?: React.ReactNode;
};

/**
 * « Qui fait quoi » (proto BODY.org): each role with its kind (Exécute,
 * Coordonne, Valide) and holder, then the private links (the module's,
 * then each person's page by project), then the changes of role. Shown in a step or in `RolesDialog`.
 */
export function RolesPanel({
  roles,
  links = [],
  history = [],
  personLinks,
}: RolesPanelProps) {
  const count = new Map<string, number>();
  for (const r of roles)
    if (r.holder) count.set(r.holder.name, (count.get(r.holder.name) ?? 0) + 1);
  const multi = [...count].filter(([, n]) => n > 1);
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col">
        {roles.map((r) => (
          <li
            key={r.key}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-[color:var(--border-hairline)] py-3 first:border-t-0"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex flex-wrap items-center gap-2">
                <b className="font-semibold">{r.label}</b>
                <StatusBadge size="sm" tone={KIND_TONE[r.kind]}>
                  {t.kinds[r.kind]}
                </StatusBadge>
              </span>
              {r.holder ? (
                <span className="flex items-center gap-2">
                  <Avatar
                    name={r.holder.name}
                    pictureUrl={null}
                    className="size-6"
                  />
                  <span>
                    <b className="font-semibold">{r.holder.name}</b>
                    {[r.holder.detail, r.holder.viaLink ? t.viaLink : null]
                      .filter(Boolean)
                      .map((x) => ` · ${x}`)
                      .join("")}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t.none}</span>
              )}
              {r.what && (
                <span className="text-caption text-muted-foreground">
                  {r.what}
                </span>
              )}
            </span>
            {r.action}
          </li>
        ))}
      </ul>
      {multi.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {multi.map(([name, n]) => t.multi(name, n)).join(" ")}
        </p>
      )}
      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-md font-semibold">{t.history}</h3>
          <ul className="flex flex-col gap-1 text-caption">
            {history.map((h) => (
              <li key={h.id} className="flex gap-2">
                <span aria-hidden className="text-muted-foreground">
                  ↺
                </span>
                <span>
                  {t.historyLine(h.text, h.who, formatShortInstant(h.at))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {links.length > 0 ? (
        <PrivateLinks links={links}>{personLinks}</PrivateLinks>
      ) : (
        personLinks
      )}
    </div>
  );
}
