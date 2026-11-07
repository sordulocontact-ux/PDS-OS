"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { FactRows } from "@/components/ui/fact-row";
import { FilterChip } from "@/components/ui/filter-chip";
import { RequiredMark } from "@/components/ui/required-mark";
import { legal } from "@/lib/i18n/fr/legal";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { removeRightsholder } from "@/lib/legal/clearance/actions";
import { usageOf } from "@/lib/legal/clearance/element";
import { requestClearance } from "@/lib/legal/clearance/flow-actions";
import {
  listClearanceHolders,
  type HolderOption,
} from "@/lib/legal/clearance/holder-actions";
import {
  RIGHT_KINDS,
  rightsOf,
  type HolderRole,
  type RightKind,
  type Scope,
} from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";
import type { NetworkRole } from "@/lib/network/types";

import { useLegalAction } from "@/components/legal/use-legal-action";

import { ElementRow } from "./clearance-request";

const fr = { legal, legalClearance };

// Who holds a right when the Réseau says nothing of the contact: the
// work's publisher, the original recording's label.
const DEFAULT_ROLE: Record<RightKind, HolderRole> = {
  work: "publisher",
  master: "label",
};
// The structure a new contact of the Réseau starts as, from the panel.
const NETWORK_ROLE_OF: Record<RightKind, NetworkRole> = {
  work: "publisher",
  master: "label",
};

/**
 * What the code proposes from the element the dossier names (to correct,
 * never applied without the click that ends the moment): a sample takes
 * the melody and the sound; a topline, an interpolation or a cover is
 * recorded again, so only the work. Anything else: nothing proposed.
 * Decision of 07/10/2026 (docs/ARCHITECTURE.md § 8 sexies): the ticket
 * only says « Le type d'usage détermine les droits ».
 */
function proposedScope(element: string): Scope | null {
  if (element === "sample") return "both";
  if (["topline", "interpolation", "cover"].includes(element)) return "work";
  return null;
}

type Picked = { name: string; contactId: string | null; role: HolderRole };

/** The scope of a request from its two toggles; none chosen, none. */
const scopeOf = (work: boolean, master: boolean): Scope | null =>
  work && master ? "both" : work ? "work" : master ? "master" : null;

/** « Demander l'autorisation » (proto Juridique v3, Sacha 07/11/2026): what
 * is taken, the rights to ask for (one toggle each, proposed by the code),
 * who holds each one (the Réseau), then « J'ai envoyé la demande ». Nothing
 * to authorise is an « Autre issue » under the page. */
export function AskMoment({
  projectId,
  clearance,
}: {
  projectId: string;
  clearance: Clearance;
}) {
  const t = fr.legalClearance.flow;
  const proposal = clearance.scope ? null : proposedScope(clearance.element);
  const initial = rightsOf(clearance.scope ?? proposal);
  const [asked, setAsked] = useState<Record<RightKind, boolean>>({
    work: initial.includes("work"),
    master: initial.includes("master"),
  });
  const [proposed, setProposed] = useState(proposal !== null);
  const [picked, setPicked] = useState<Partial<Record<RightKind, Picked>>>({});
  const [tried, setTried] = useState(false);
  const scope = scopeOf(asked.work, asked.master);
  const root = useRef<HTMLDivElement>(null);
  const load = usePickerLoad(() => listClearanceHolders(clearance.id));
  const { pending, run } = useLegalAction();

  const rights = rightsOf(scope);
  const known = (right: RightKind) =>
    clearance.holders.filter((h) => h.right === right);
  const lacking = rights.filter((r) => known(r).length === 0 && !picked[r]);

  const focusFirstError = () =>
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus(),
    );

  function send() {
    if (!scope || lacking.length > 0) {
      setTried(true);
      focusFirstError();
      return;
    }
    run(() =>
      requestClearance({
        projectId,
        clearanceId: clearance.id,
        scope,
        usage: usageOf(clearance),
        holders: rights.flatMap((right) => {
          const h = picked[right];
          return h && known(right).length === 0 ? [{ right, ...h }] : [];
        }),
      }),
    );
  }

  async function copyRequest() {
    const elements = fr.legal.intake.facts.elements as Record<string, string>;
    const text = t.requestTemplate(
      elements[clearance.element] ?? elements.other,
      clearance.work,
      clearance.title,
    );
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.copied, { description: t.copiedDetail });
    } catch {
      toast.error(fr.legalClearance.errors.failed);
    }
  }

  const rightsId = `rights-${clearance.id}`;
  return (
    <div ref={root} className="flex flex-col gap-5">
      <FactRows>
        <ElementRow clearance={clearance} />
      </FactRows>

      <div className="flex flex-col gap-2">
        <span id={rightsId} className="text-sm leading-none font-medium">
          {t.rightsToAsk}
          <RequiredMark announce />
        </span>
        <div
          role="group"
          aria-labelledby={rightsId}
          className="flex flex-wrap gap-2"
        >
          {RIGHT_KINDS.map((right) => (
            <FilterChip
              key={right}
              pressed={asked[right]}
              aria-invalid={tried && !scope ? true : undefined}
              onClick={() => {
                setAsked((all) => ({ ...all, [right]: !all[right] }));
                setProposed(false);
                setTried(false);
              }}
            >
              {t.rightChip[right]}
            </FilterChip>
          ))}
        </div>
        {tried && !scope ? (
          <FieldError id={`${rightsId}-error`}>{t.scopeMissing}</FieldError>
        ) : (
          proposed &&
          proposal && (
            <p className="text-xs text-muted-foreground">
              {proposal === "both" ? t.proposed.sample : t.proposed.work}
            </p>
          )
        )}
      </div>

      {rights.map((right) =>
        known(right).length > 0 ? (
          <div key={right} className="flex flex-col gap-1.5">
            <span className="text-sm leading-none font-medium">
              {t.holderOf[right](clearance.work)}
            </span>
            {known(right).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <span className="min-w-0 break-words">
                  <span className="font-medium">{h.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    · {fr.legalClearance.roles[h.role as HolderRole]}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.removeHolder(h.name)}
                  disabled={pending}
                  onClick={() => run(() => removeRightsholder(projectId, h.id))}
                >
                  <IconXmark aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div key={right} className="flex flex-col gap-1.5">
            <PersonPickerField<HolderOption>
              refName={`holder-ref-${clearance.id}-${right}`}
              nameName={`holder-${clearance.id}-${right}`}
              legend={t.holderOf[right](clearance.work)}
              required
              load={load}
              defaultRef={null}
              defaultName={null}
              createRoles={[NETWORK_ROLE_OF[right]]}
              createKind="organization"
              refOfContact={(id) => id}
              onPick={(option, name) =>
                setPicked((all) => ({
                  ...all,
                  [right]: name.trim()
                    ? {
                        name,
                        contactId: option?.id ?? null,
                        role: option?.role ?? DEFAULT_ROLE[right],
                      }
                    : undefined,
                }))
              }
              error={
                tried && lacking.includes(right) ? t.holderMissing : undefined
              }
            />
            <p className="text-xs text-muted-foreground">
              {t.holderWhere[right]}
            </p>
          </div>
        ),
      )}

      <div className="flex flex-col gap-3">
        {tried && scope && lacking.length > 0 && (
          <FormMessage kind="error">
            {t.missingCount(lacking.length)}
          </FormMessage>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={send}>
            {t.sent}
          </Button>
          <Button variant="outline" onClick={copyRequest}>
            {t.copyRequest}
          </Button>
        </div>
      </div>
    </div>
  );
}
