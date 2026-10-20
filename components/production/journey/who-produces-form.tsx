"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import type { CompanyOption } from "@/lib/production/companies";
import type { OrganizationKind } from "@/lib/production/organization";
import { chooseProducer } from "@/lib/production/producer-actions";
import type { ProductionMode } from "@/lib/production/sheet";

const t = fr.productionProducer;
const tl = fr.productionLight.choices;
const MODES = ["direct", "call", "import"] as const;
type Kind = OrganizationKind | "derived";

export type WhoProducesDefaults = {
  kind?: Kind | null;
  companyId?: string | null;
  mode?: ProductionMode | null;
};

/**
 * « Qui produit ? » (proto pqBody): internal or external — proposed from
 * the Fiche and the Réseau —, the company when external (the one PO
 * proposes first, with why; « Créer la fiche d'une société »), how the
 * preproduction is organised, then « Confirmer ». Nothing goes outside:
 * the company's private link is made in « Qui fait quoi ». `defaults` (and
 * `stay`): opened prefilled by PO, the page stays.
 */
export function WhoProducesForm({
  projectId,
  deliverableId,
  internalHint,
  companies,
  defaults,
  stay = false,
  variant = "clip",
  clip = null,
}: {
  projectId: string;
  deliverableId: string;
  // The kind of deliverable (proto PROD_CHOICES): a clip, a cover, teasers.
  variant?: "clip" | "cover" | "teasers";
  // Teasers: the clip they may be drawn from, and who produces it.
  clip?: { sheetId: string; who: string } | null;
  // « Tom Mercier · chargé de production ».
  internalHint: string;
  companies: CompanyOption[];
  defaults?: WhoProducesDefaults;
  stay?: boolean;
}) {
  const router = useRouter();
  const suggested = companies.find((c) => c.suggested) ?? null;
  const [kind, setKind] = useState<Kind | null>(
    defaults?.kind ??
      (variant === "teasers" && clip
        ? "derived"
        : variant === "cover"
          ? "internal"
          : companies.length > 0
            ? "external"
            : "internal"),
  );
  // A cover and teasers drawn from the clip need no preparation mode.
  const withMode = !(variant === "cover" || kind === "derived");
  const [company, setCompany] = useState<string | null>(
    defaults?.companyId ?? suggested?.id ?? null,
  );
  const [mode, setMode] = useState<ProductionMode | null>(
    defaults?.mode ?? null,
  );
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, error, run } = useWriteSubmit(
    () => (stay ? router.refresh() : undefined),
    t.confirm,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!kind) next.kind = t.errors.kind;
    if (kind === "external" && !company) next.company = t.errors.company;
    if (withMode && !mode) next.mode = t.errors.mode;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      formRef.current
        ?.querySelector<HTMLInputElement>(`[data-field="${first}"] input`)
        ?.focus();
      return;
    }
    if (!kind || (withMode && !mode)) return;
    run(() =>
      chooseProducer({
        projectId,
        deliverableId,
        organization: kind,
        companyContactId: kind === "external" ? company : null,
        fromSheetId: kind === "derived" ? (clip?.sheetId ?? null) : null,
        mode: withMode && mode ? mode : "direct",
      }),
    );
  }

  const count = Object.keys(errors).length;
  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-6"
      onSubmit={submit}
    >
      <div data-field="kind" className="flex flex-col gap-1.5">
        <ChoiceCards<Kind>
          name="producer-kind"
          legend={t.legend}
          variant="list"
          value={kind}
          onChange={setKind}
          choices={
            variant === "cover"
              ? [
                  {
                    value: "internal",
                    label: tl.cover.internal.label,
                    detail: tl.cover.internal.detail,
                    hint: internalHint,
                  },
                  {
                    value: "external",
                    label: tl.cover.external.label,
                    detail: tl.cover.external.detail,
                    hint: tl.cover.external.hint,
                  },
                ]
              : variant === "teasers" && clip
                ? [
                    {
                      value: "derived",
                      label: tl.teasers.derived.label,
                      detail: tl.teasers.derived.detail,
                      hint: tl.teasers.clipBy(clip.who),
                    },
                    {
                      value: "internal",
                      label: tl.teasers.internal.label,
                      detail: tl.teasers.internal.detail,
                      hint: internalHint,
                    },
                  ]
                : [
                    {
                      value: "external",
                      label: t.kinds.external.label,
                      detail: t.kinds.external.detail,
                      hint: t.kinds.external.hint,
                    },
                    {
                      value: "internal",
                      label: t.kinds.internal.label,
                      detail: t.kinds.internal.detail,
                      hint: internalHint,
                    },
                  ]
          }
        />
        <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
          {t.proposed}
        </p>
        <FieldError id="producer-kind-error">{errors.kind}</FieldError>
      </div>
      {kind === "external" && (
        <div data-field="company" className="flex flex-col gap-1.5">
          {companies.length > 0 ? (
            <ChoiceCards<string>
              name="producer-company"
              legend={variant === "cover" ? tl.cover.who : t.company.legend}
              required
              variant="list"
              value={company}
              onChange={setCompany}
              choices={companies.map((c) => ({
                value: c.id,
                label: c.name,
                tag: c.suggested ? t.company.suggested : undefined,
                hint: c.reason,
              }))}
            />
          ) : (
            <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
              {variant === "cover" ? tl.cover.none : t.company.none}
            </p>
          )}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreating(true)}
            >
              {variant === "cover" ? tl.cover.create : t.company.create}
            </Button>
          </div>
          <FieldError id="producer-company-error">{errors.company}</FieldError>
          <CreateContactDialog
            open={creating}
            onOpenChange={setCreating}
            name=""
            kind={variant === "cover" ? "person" : "organization"}
            roles={
              variant === "cover" ? ["photographer"] : ["production_company"]
            }
            title={t.company.createTitle}
            onCreated={(id) => {
              setCreating(false);
              setCompany(id);
              router.refresh();
            }}
          />
        </div>
      )}
      {withMode && (
        <div data-field="mode" className="flex flex-col gap-1.5">
          <ChoiceCards<ProductionMode>
            name="producer-mode"
            legend={t.mode.legend}
            variant="list"
            value={mode}
            onChange={setMode}
            choices={MODES.map((m) => ({
              value: m,
              label: t.mode.choices[m].label,
              hint: t.mode.choices[m].hint,
            }))}
          />
          <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
            {t.mode.nothingOutside}
          </p>
          <FieldError id="producer-mode-error">{errors.mode}</FieldError>
        </div>
      )}
      {count > 0 && (
        <FormMessage kind="error">{t.errors.missing(count)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {t.confirm}
        </Button>
      </div>
    </form>
  );
}
