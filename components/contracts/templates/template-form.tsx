"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  DocumentEditor,
  type DocumentEditorHandle,
} from "@/components/contracts/document-editor";
import {
  TemplateSourceField,
  type TemplateSourceHandle,
} from "@/components/contracts/templates/template-source-field";
import { useValueFinder } from "@/components/contracts/templates/use-value-finder";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ToneCallout } from "@/components/ui/tone-callout";
import { CONTRACT_TYPES, type ContractType } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import type { DocumentFont } from "@/lib/legal/contracts/document-fonts";
import {
  CONTRACT_LANGUAGES,
  type ContractLanguage,
} from "@/lib/legal/contracts/language";
import { createContractTemplate } from "@/lib/legal/contracts/template-actions";
import { aboutFromText } from "@/lib/legal/contracts/template-about";
import type { TemplateAbout } from "@/lib/legal/contracts/template-values";
import type { TemplateSource } from "@/lib/legal/contracts/upload-source";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";
import { jsonListOf } from "@/lib/utils/form-data";

const fr = { contracts, legalContracts, legalDocuments, legalForms };

export type TemplateDraft = {
  seriesId: string | null;
  name: string;
  type: ContractType;
  // French when not given (Ibé, 18/11/2026: the contract's language).
  language?: ContractLanguage;
  // Its Word file's typeface; the default look when not given.
  font?: DocumentFont | null;
  roles: FormRole[];
  usage: string;
  body: string;
  source: TemplateSource | null;
};

/**
 * A template pasted by a human (« aucun modèle juridique nouveau ni aucune
 * clause n'est inventé »), written on the page of the contract as its PDF
 * (`DocumentEditor`), its values inserted from « Insérer une information »
 * (saved as {{id}}), or found in a contract already filled in, or imported
 * from a source file kept with it: PO reads an imported contract at once and
 * the contract stays in sight. A new version starts from the current text
 * and file; the original is never touched.
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
  const editor = useRef<DocumentEditorHandle>(null);
  const source = useRef<TemplateSourceHandle>(null);
  const [body, setBody] = useState(initial?.body ?? "");
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
  // The language the imported contract is written in: never translated.
  const [language, setLanguage] = useState<ContractLanguage>(
    initial?.language ?? "fr",
  );
  // The typeface of the imported or pasted contract (Sacha 25/11/2026).
  const [font, setFont] = useState<DocumentFont | null>(initial?.font ?? null);
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

  const finder = useValueFinder(editor, fillAbout);

  // A contract imported or pasted whole: what it says of itself, at once
  // and without PO (its title, the type it names, its roles, its language),
  // then its values found by the code and PO.
  function readContract(text: string, typeface: DocumentFont | null) {
    setFont(typeface);
    const read = aboutFromText(text);
    setLanguage(read.language);
    fillAbout({
      name: read.name ?? "",
      type: read.type ?? "other",
      roles: read.roles,
      usage: "",
    });
    finder.find(text);
  }

  function submit(form: FormData) {
    startTransition(async () => {
      const result = await createContractTemplate({
        seriesId: initial?.seriesId ?? null,
        name: String(form.get("name") ?? ""),
        type: String(form.get("type") ?? "") as ContractType,
        language,
        font,
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
    // The contract on the left, what it is on the right, as a dropped
    // contract (Sacha 26/11/2026); one column when the modal is narrower (a
    // container query: PO's panel too), the contract then under its
    // information and above « Enregistrer ».
    <form ref={formRef} action={submit} className="@container">
      {/* The grid inside the container: a container query never applies to
          the container itself. */}
      <div className="grid gap-5 @5xl:grid-cols-[minmax(0,1fr)_22rem] @5xl:grid-rows-[auto_1fr]">
        <div className="@container flex min-w-0 flex-col gap-4 @5xl:col-start-2 @5xl:row-start-1">
          <TemplateSourceField
            ref={source}
            organizationId={organizationId}
            initial={initial?.source ?? null}
            onText={(text, name, typeface) => {
              // The text it replaces stays one click away, in its typeface.
              const before = body;
              const fontBefore = font;
              editor.current?.load(text);
              readContract(text, typeface);
              if (before.trim())
                toast.success(t.source.imported(name), {
                  action: {
                    label: t.source.undo,
                    onClick: () => {
                      editor.current?.load(before);
                      setFont(fontBefore);
                    },
                  },
                });
            }}
          />
          <Fragment key={aboutKey}>
            <div className="grid gap-4 @md:grid-cols-2">
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
                  CONTRACT_TYPES.map((type) => [
                    type,
                    fr.contracts.types[type],
                  ]),
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
            <ChipChoice
              name="language"
              legend={t.form.language}
              required
              options={CONTRACT_LANGUAGES.map((value) => ({
                value,
                label: fr.legalContracts.languages[value],
              }))}
              value={language}
              onChange={(next) => next && setLanguage(next)}
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
        </div>
        <div className="min-w-0 @5xl:col-start-1 @5xl:row-span-2 @5xl:row-start-1">
          <DocumentEditor
            ref={editor}
            name="body"
            label={t.editor.label}
            placeholder={t.editor.placeholder}
            fields
            defaultValue={initial?.body}
            busy={finder.pending ? t.values.finding : null}
            font={font}
            onChange={setBody}
            onFile={(file) => source.current?.read(file)}
            onPasteContract={readContract}
          />
        </div>
        <div className="flex flex-col gap-3 @5xl:col-start-2 @5xl:row-start-2 @5xl:self-start">
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
        </div>
      </div>
    </form>
  );
}
