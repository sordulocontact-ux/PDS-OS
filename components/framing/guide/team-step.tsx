"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AssignRoleDialog } from "@/components/framing/guide/assign-role-dialog";
import {
  OptionContent,
  optionClass,
} from "@/components/framing/guide/guide-row";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { reviewTeamMember } from "@/lib/framing/actions/needs-team";
import { confirmProposed } from "@/lib/framing/actions/review";
import type { FramingData } from "@/lib/framing/queries";
import { teamBoard, type RoleCard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** Équipe projet: a card per role the needs call for, filled or to find. */
export function TeamStep({
  team,
  needs,
  projectId,
  editable,
  nextHref,
}: {
  team: FramingData["team"];
  needs: FramingData["needs"];
  projectId: string;
  editable: boolean;
  nextHref: string;
}) {
  const t = fr.framingGuide.team;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  // undefined: closed; null: any role; a card: that role.
  const [assigning, setAssigning] = useState<RoleCard | null | undefined>();
  const { roles, others } = teamBoard(team, needs);

  return (
    <FramingStepCard
      title={t.title}
      actions={
        editable && (
          <>
            <Button
              size="lg"
              variant="ghost"
              disabled={pending}
              onClick={() => setAssigning(null)}
            >
              {t.assign}
            </Button>
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                run(
                  () => confirmProposed(projectId, "team"),
                  () => router.push(nextHref),
                )
              }
            >
              {t.confirm}
            </Button>
          </>
        )
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((card) => (
          <li key={card.role}>
            <button
              type="button"
              disabled={!editable}
              onClick={() => setAssigning(card)}
              className={cn(
                optionClass(false),
                "h-full",
                !card.member && "border-dashed bg-transparent",
              )}
            >
              <OptionContent
                detail={
                  <>
                    {card.member?.review_status === "proposed" && (
                      <ProposedBadge />
                    )}
                    {card.member?.display_name ?? t.toFind}
                  </>
                }
              >
                {t.roles[card.role]}
              </OptionContent>
            </button>
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-body-md font-medium text-foreground">{t.others}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-md">
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

      <AssignRoleDialog
        projectId={projectId}
        card={assigning ?? null}
        team={team}
        open={assigning !== undefined}
        onOpenChange={(open) => !open && setAssigning(undefined)}
      />
    </FramingStepCard>
  );
}
