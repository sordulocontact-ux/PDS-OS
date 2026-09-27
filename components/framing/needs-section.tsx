"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { StatusBadge } from "@/components/ui/status-badge";
import { needTone } from "@/lib/ui/state-tones";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addNeed, updateNeed } from "@/lib/framing/actions/needs-team";
import { NEED_PRESETS } from "@/lib/framing/needs-presets";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

type Family = keyof typeof fr.framing.needs.families;
const PRESET_FAMILIES = Object.keys(NEED_PRESETS).filter(
  (f) => NEED_PRESETS[f as Family].length > 0,
) as Family[];

export function NeedsSection({
  needs,
  projectId,
}: {
  needs: FramingData["needs"];
  projectId: string;
}) {
  const t = fr.framing.needs;
  const a = fr.framing.actions;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [label, setLabel] = useState("");
  const [family, setFamily] = useState<Family>("creation_content");
  const presetLabels: Record<string, string> = t.presets;
  const existingLabels = new Set(
    needs.map((n) => n.label.trim().toLowerCase()),
  );

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">{t.hint}</p>

      {canEdit && (
        <div className="grid gap-3">
          {PRESET_FAMILIES.map((f) => (
            <div key={f} className="grid gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t.families[f]}
              </p>
              <div className="flex flex-wrap gap-2">
                {NEED_PRESETS[f].map((preset) => {
                  const presetLabel = presetLabels[preset];
                  const added = existingLabels.has(
                    presetLabel.trim().toLowerCase(),
                  );
                  return (
                    <FilterChip
                      key={preset}
                      pressed={added}
                      disabled={pending || added}
                      onClick={() =>
                        run(() => addNeed(projectId, presetLabel, f))
                      }
                    >
                      {presetLabel}
                    </FilterChip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {needs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {needs.map((need) => (
            <li
              key={need.id}
              className="grid gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{need.label}</span>
                <StatusBadge tone="neutral" size="sm">
                  {t.families[need.family as Family]}
                </StatusBadge>
                <StatusBadge tone={needTone[need.state]} size="sm">
                  {need.state === "committed" ? t.committed : t.identified}
                </StatusBadge>
                {need.review_status === "proposed" && <ProposedBadge />}
              </div>
              {need.provenance && (
                <ProvenanceNote provenance={need.provenance} />
              )}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  {need.review_status === "proposed" ? (
                    <>
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            updateNeed(projectId, need.id, {
                              review_status: "confirmed",
                            }),
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
                            updateNeed(projectId, need.id, {
                              review_status: "rejected",
                            }),
                          )
                        }
                      >
                        {a.reject}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          updateNeed(projectId, need.id, {
                            state:
                              need.state === "committed"
                                ? "identified"
                                : "committed",
                          }),
                        )
                      }
                    >
                      {need.state === "committed" ? t.uncommit : t.commit}
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => addNeed(projectId, label, family),
              () => setLabel(""),
            );
          }}
        >
          <div className="grid min-w-56 flex-1 gap-1">
            <Label htmlFor="need-label">{t.other}</Label>
            <Input
              id="need-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="need-family">{t.family}</Label>
            <OptionSelect
              id="need-family"
              label={t.family}
              options={t.families}
              value={family}
              onChange={(v) => setFamily(v as Family)}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={pending || label.trim() === ""}
          >
            {a.add}
          </Button>
        </form>
      )}
    </div>
  );
}
