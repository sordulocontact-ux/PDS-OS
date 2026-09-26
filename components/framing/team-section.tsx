"use client";

import { useState } from "react";

import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addTeamMember,
  reviewTeamMember,
} from "@/lib/framing/actions/needs-team";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

export function TeamSection({
  team,
  projectId,
}: {
  team: FramingData["team"];
  projectId: string;
}) {
  const t = fr.framing.team;
  const a = fr.framing.actions;
  const { pending, run } = useFramingAction();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  return (
    <section className="grid gap-3 py-4">
      <h3 className="text-sm font-medium">{t.title}</h3>
      {team.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {team.map((member) => (
            <li key={member.id} className="grid gap-1.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{member.display_name}</span>
                {member.role && (
                  <span className="text-muted-foreground">— {member.role}</span>
                )}
                {member.review_status === "proposed" && <ProposedBadge />}
              </div>
              {member.provenance && (
                <ProvenanceNote
                  provenance={member.provenance}
                  projectId={projectId}
                />
              )}
              {member.review_status === "proposed" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        reviewTeamMember(projectId, member.id, "confirmed"),
                      )
                    }
                  >
                    {a.confirm}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        reviewTeamMember(projectId, member.id, "rejected"),
                      )
                    }
                  >
                    {a.reject}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => addTeamMember(projectId, name, role),
            () => {
              setName("");
              setRole("");
            },
          );
        }}
      >
        <div className="grid min-w-40 flex-1 gap-1">
          <Label htmlFor="team-name">{t.name}</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid min-w-40 flex-1 gap-1">
          <Label htmlFor="team-role">{t.role}</Label>
          <Input
            id="team-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending || name.trim() === ""}
        >
          {a.add}
        </Button>
      </form>
    </section>
  );
}
