import { Avatar } from "@/components/ui/avatar";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { FactSourceHint } from "@/components/ui/fact-source-hint";
import type { ColumnIcon } from "@/lib/ui/column-icons";
import { roles } from "@/lib/i18n/fr/roles";

import { PrivateLinks, type PrivateLinkRow } from "./private-links";

const fr = { roles };

const t = fr.roles;

export type RoleKind = "exec" | "coord" | "valid";
// The role's icon by what it does: coordinates (a person in charge),
// executes (a job), validates (a decision).
const KIND_ICON: Record<RoleKind, ColumnIcon> = {
  coord: "person",
  exec: "role",
  valid: "decision",
};

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

export type RolesPanelProps = {
  roles: RoleRow[];
  links?: PrivateLinkRow[];
  // Each person's page by project (lot 11, `ContactLinksSection`).
  personLinks?: React.ReactNode;
};

/**
 * « Qui fait quoi » (proto BODY.org): each role with its kind (Exécute,
 * Coordonne, Valide) and holder, then the private links (the module's,
 * then each person's page by project), Shown in a step or in `RolesDialog`.
 */
export function RolesPanel({
  roles,
  links = [],
  personLinks,
}: RolesPanelProps) {
  const count = new Map<string, number>();
  for (const r of roles)
    if (r.holder) count.set(r.holder.name, (count.get(r.holder.name) ?? 0) + 1);
  const multi = [...count].filter(([, n]) => n > 1);
  return (
    <div className="flex flex-col gap-6">
      {/* One row per role, as every fact (Sacha 27/11/2026, after the
          fiche de renseignements): the role on the left, its holder beside
          it, what it does and its kind in the ⓘ, « Changer » at the end. */}
      <FactRows>
        {roles.map((r) => (
          <FactRow
            key={r.key}
            icon={KIND_ICON[r.kind]}
            label={r.label}
            value={
              r.holder ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar
                    name={r.holder.name}
                    pictureUrl={null}
                    className="size-5"
                  />
                  <span>
                    {r.holder.name}
                    {[r.holder.detail, r.holder.viaLink ? t.viaLink : null]
                      .filter(Boolean)
                      .map((x) => (
                        <span key={x} className="text-muted-foreground">
                          {` · ${x}`}
                        </span>
                      ))}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t.none}</span>
              )
            }
            side={
              <>
                {r.action}
                <FactSourceHint
                  label={[t.kinds[r.kind], r.what].filter(Boolean).join(" · ")}
                />
              </>
            }
          />
        ))}
      </FactRows>
      {multi.length > 0 && (
        <p className="text-caption text-muted-foreground">
          {multi.map(([name, n]) => t.multi(name, n)).join(" ")}
        </p>
      )}
      {links.length > 0 ? (
        <PrivateLinks links={links}>{personLinks}</PrivateLinks>
      ) : (
        personLinks
      )}
    </div>
  );
}
