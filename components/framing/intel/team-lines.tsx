"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AssignRoleDialog } from "@/components/framing/guide/assign-role-dialog";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { reviewTeamMember } from "@/lib/framing/actions/needs-team";
import { confirmQuestion } from "@/lib/framing/actions/questions";
import type { FramingData } from "@/lib/framing/queries";
import { teamBoard, type RoleCard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * « Intervenants » (dimension Équipe): a card per role the needs call for —
 * and who mixes, who masters on a music project — filled or to find, the
 * creative team as recorded, anyone else named.
 */
export function TeamLines({
  team,
  needs,
  music,
  creatives,
  engineers,
  projectId,
  editable,
  nextHref,
}: {
  team: FramingData["team"];
  needs: FramingData["needs"];
  music: boolean;
  creatives: Array<{ personId: string; name: string }>;
  engineers: Array<{ id: string; name: string }>;
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.team;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [assigning, setAssigning] = useState<RoleCard | null | undefined>();
  const { roles, others } = teamBoard(team, needs, { music, creatives });
  // Named once: already on the « Direction créative » card when they hold it.
  const listedCreatives = roles.some((card) => card.holder) ? [] : creatives;
  const proposed = team.some((m) => m.review_status === "proposed");

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((card) => (
          <li key={card.role}>
            <button
              type="button"
              disabled={!editable}
              onClick={() => setAssigning(card)}
              className={cn(
                "flex h-full min-h-24 w-full flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                card.member || card.holder
                  ? "border-border bg-background"
                  : "border-dashed border-border bg-[var(--surface-soft)]",
                editable && "hover:border-grey-300",
              )}
            >
              <span className="text-body-md font-semibold">
                {t.roles[card.role]}
              </span>
              <span className="text-caption text-muted-foreground">
                {card.member?.display_name ?? card.holder ?? t.toFind}
              </span>
              {card.member?.review_status === "proposed" && <ProposedBadge />}
            </button>
          </li>
        ))}
      </ul>

      {(others.length > 0 || listedCreatives.length > 0) && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-muted-foreground">{t.others}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-md">
            {listedCreatives.map((c) => (
              <li key={c.personId} className="flex items-center gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className="text-muted-foreground">
                  {fr.framingIntel.facts.creatives}
                </span>
              </li>
            ))}
            {others.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <span className="font-semibold">{m.display_name}</span>
                {m.role && (
                  <span className="text-muted-foreground">{m.role}</span>
                )}
                {m.review_status === "proposed" && <ProposedBadge />}
                {editable && (
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      run(() => reviewTeamMember(projectId, m.id, "rejected"))
                    }
                  >
                    {t.remove}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap gap-2">
          {(team.length > 0 || creatives.length > 0) && (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                proposed
                  ? run(
                      () => confirmQuestion(projectId, "contributors"),
                      () => router.push(nextHref),
                    )
                  : router.push(nextHref)
              }
            >
              {proposed
                ? fr.framingIntel.guide.confirm
                : fr.framingIntel.guide.next}
            </Button>
          )}
          <Button
            size="lg"
            variant={
              team.length > 0 || creatives.length > 0 ? "outline" : "default"
            }
            disabled={pending}
            onClick={() => setAssigning(null)}
          >
            {t.assign}
          </Button>
        </div>
      )}

      <AssignRoleDialog
        projectId={projectId}
        card={assigning ?? null}
        team={team}
        creatives={creatives}
        roles={roles.map((r) => r.role)}
        engineers={engineers}
        open={assigning !== undefined}
        onOpenChange={(open) => !open && setAssigning(undefined)}
      />
    </div>
  );
}
