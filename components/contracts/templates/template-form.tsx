"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  TemplateBodyEditor,
  type TemplateEditorHandle,
} from "@/components/contracts/templates/template-body-editor";
import { TemplateSourceField } from "@/components/contracts/templates/template-source-field";
import {
  ValueSuggestions,
  type ValueSuggestionsHandle,
} from "@/components/contracts/templates/value-suggestions";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { CONTRACT_TYPES, type ContractType } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { createContractTemplate } from "@/lib/legal/contracts/template-actions";
import type { TemplateAbout } from "@/lib/legal/contracts/template-values";
import type { TemplateSource } from "@/lib/legal/contracts/upload-source";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";
import { cn } from "@/lib/utils";
import { jsonListOf } from "@/lib/utils/form-data";

export type TemplateDraft = {
  seriesId: string | null;
  name: string;
  type: ContractType;
  roles: FormRole[];
  usage: string;
  body: string;
  source: TemplateSource | null;
};

/**
 * A template pasted by a human (« aucun modèle juridique nouveau ni aucune
 * clause n'est inventé »), its values inserted as chips (saved as {{id}}),
 * or found in a contract already filled in, or imported from a source
 * file kept with it: PO reads an imported contract at once and its text
 * stays folded behind what he found. A new version starts from the current text and file;
 * the original is never touched.
 */
export function TemplateForm({
  organizationId,
  initial,
  onDone,
  onCancel,
  request,
  submitLabel,
}: {
  organizationId: string;
  initial?: TemplateDraft;
  onDone: () => void;
  onCancel: () => void;
  // Made for a person of « Contrats à prévoir »: asked of the direction.
  request?: { projectId: string; key: string; name: string };
  submitLabel?: string;
}) {
  const t = fr.legalContracts.templates;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editor = useRef<TemplateEditorHandle>(null);
  const suggestions = useRef<ValueSuggestionsHandle>(null);
  // An imported contract shows what PO found, not its raw text.
  const [textOpen, setTextOpen] = useState(true);
  const [body, setBody] = useState(initial?.body ?? "");
  // Values found by « Repérer les valeurs », still to replace or ignore.
  const [toDecide, setToDecide] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  // Name, type, roles and usage: typed, or proposed by PO from the contract.
  const [about, setAbout] = useState<TemplateAbout>({
    name: initial?.name ?? "",
    type: initial?.type ?? "other",
    roles: initial?.roles ?? [],
    usage: initial?.usage ?? "",
  });
  // Remounts those fields with what PO proposed.
  const [aboutKey, setAboutKey] = useState(0);
  const [proposed, setProposed] = useState(false);

  // Only what is still empty: what the person chose is kept.
  function fillAbout(found: TemplateAbout) {
    const form = new FormData(formRef.current!);
    const name = String(form.get("name") ?? "").trim();
    const type = String(form.get("type") ?? "other") as ContractType;
    const roles = jsonListOf(form.get("roles")) as FormRole[];
    const usage = String(form.get("usage") ?? "").trim();
    setAbout({
      name: name || found.name,
      type: type !== "other" ? type : found.type,
      roles: roles.length > 0 ? roles : found.roles,
      usage: usage || found.usage,
    });
    setAboutKey((key) => key + 1);
    setProposed(true);
  }

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await createContractTemplate({
        seriesId: initial?.seriesId ?? null,
        name: String(form.get("name") ?? ""),
        type: String(form.get("type") ?? "") as ContractType,
        roles: jsonListOf(form.get("roles")) as FormRole[],
        usage: String(form.get("usage") ?? ""),
        body: String(form.get("body") ?? ""),
        source: form.get("source_path")
          ? {
              path: String(form.get("source_path")),
              name: String(form.get("source_name") ?? ""),
            }
          : null,
        request,
      });
      if (!result.ok) return setError(result.error);
      if (request) toast.success(`${fr.legalDocuments.template.sent}.`);
      onDone();
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-4">
      <TemplateSourceField
        organizationId={organizationId}
        initial={initial?.source ?? null}
        onText={(text, name) => {
          // The text it replaces stays one click away.
          const before = body;
          editor.current?.load(text);
          setTextOpen(false);
          suggestions.current?.analyze(text, name);
          if (before.trim())
            toast.success(t.source.imported(name), {
              action: {
                label: t.source.undo,
                onClick: () => {
                  editor.current?.load(before);
                  suggestions.current?.clear();
                  setTextOpen(true);
                },
              },
            });
        }}
      />
      <Fragment key={aboutKey}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="name"
            label={t.form.name}
            required
            maxLength={200}
            defaultValue={about.name}
          />
          <OptionSelect
            name="type"
            label={t.form.type}
            required
            items={Object.fromEntries(
              CONTRACT_TYPES.map((type) => [type, fr.contracts.types[type]]),
            )}
            defaultValue={about.type}
          />
        </div>
        <OptionSelect
          multiple
          name="roles"
          label={t.form.roles}
          required
          items={Object.fromEntries(
            FORM_ROLES.map((role) => [role, fr.legalForms.roles[role]]),
          )}
          defaultValue={about.roles}
        />
        <Field
          name="usage"
          label={t.form.usage}
          maxLength={500}
          defaultValue={about.usage}
        />
        {proposed && (
          <ToneCallout tone="info" role="status">
            {t.form.proposed}
          </ToneCallout>
        )}
      </Fragment>
      {!textOpen && (
        <div className="flex flex-col gap-3 rounded-lg bg-[var(--surface-soft)] p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-sm font-medium">{t.editor.label}</h3>
            <p className="text-sm text-muted-foreground">{t.source.folded}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setTextOpen(true)}
          >
            {t.source.showText}
          </Button>
        </div>
      )}
      <div className={cn(!textOpen && "hidden")}>
        <TemplateBodyEditor
          ref={editor}
          name="body"
          defaultValue={initial?.body}
          highlight={toDecide}
          onChange={setBody}
        />
      </div>
      <ValueSuggestions
        ref={suggestions}
        editor={editor}
        body={body}
        onPending={setToDecide}
        onAbout={fillAbout}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.form.submitting : (submitLabel ?? t.form.submit)}
        </Button>
      </div>
    </form>
  );
}
