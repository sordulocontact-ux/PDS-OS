"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { NextCard } from "@/components/legal/tracking/next-card";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  prepareLegalForm,
  reviewLegalForm,
  setLegalFormState,
} from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";
import { formatDate } from "@/lib/release/format";

const facts = (values: Record<string, string>) =>
  Object.entries(values).map(([id, value]) => ({
    label: fr.legalForms.fields[id] ?? id,
    value: fr.legalForms.options[id]?.[value] ?? value,
  }));

/**
 * One person's fiche in the plan's panel (the prototype's): prepare its
 * link (shown once, to copy and send by any channel), mark it sent, follow
 * it, check a correction before it applies, read the answers.
 */
export function FichePanel({
  projectId,
  row,
}: {
  projectId: string;
  row: FormRow;
}) {
  const t = fr.legalForms.page;
  const p = fr.legal.panels.fiche;
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const act = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error ?? t.failed);
      router.refresh();
    });
  const prepare = () =>
    startTransition(async () => {
      const result = await prepareLegalForm(projectId, row.key);
      if (!result.ok) return void toast.error(result.error);
      setUrl(result.url);
      router.refresh();
    });
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      toast.error(t.failed);
    }
  };
  const roles = row.creditRoles
    .map((role) => fr.masterPage.credits.roles[role])
    .join(", ")
    .toLowerCase();

  if (row.namesakeId)
    return (
      <ToneCallout tone="warning">
        {t.namesake}{" "}
        <Link
          href={routes.projectLegal(projectId)}
          className="underline underline-offset-4"
        >
          {t.linkFirst}
        </Link>
      </ToneCallout>
    );

  // The link just prepared: shown here once, to copy.
  if (url)
    return (
      <NextCard kind="act" label={p.next} title={p.sendLink(row.name)}>
        <div className="flex items-center gap-2 rounded-xl border bg-background p-1.5 pl-3">
          <code className="min-w-0 flex-1 truncate text-sm">{url}</code>
          <Button size="sm" variant="outline" onClick={copy}>
            {t.copy}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{p.once}</p>
        <Button
          className="self-start"
          disabled={pending || !row.formId}
          onClick={() =>
            act(async () => {
              if (!row.formId) return { ok: false };
              const result = await setLegalFormState(
                projectId,
                row.formId,
                "sent",
              );
              if (result.ok) setUrl(null);
              return result;
            })
          }
        >
          {t.markSent}
        </Button>
      </NextCard>
    );

  if (
    row.state === "none" ||
    row.state === "expired" ||
    row.state === "revoked"
  )
    return (
      <NextCard kind="act" label={p.next} title={p.prepare(row.name)}>
        <p className="text-sm text-muted-foreground">
          {p.prepareBody(row.name, roles)}
        </p>
        <Button className="self-start" disabled={pending} onClick={prepare}>
          {pending ? t.preparing : t.prepare}
        </Button>
      </NextCard>
    );

  if (row.state === "link_generated")
    return (
      <NextCard kind="act" label={p.next} title={p.sendLink(row.name)}>
        <p className="text-sm text-muted-foreground">{p.linkGone}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              act(() => setLegalFormState(projectId, row.formId!, "sent"))
            }
          >
            {t.markSent}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={prepare}>
            {t.newLink}
          </Button>
        </div>
      </NextCard>
    );

  const answers = row.submission && (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.person}</h3>
        <FactList facts={facts(row.submission.person)} />
      </section>
      {Object.keys(row.submission.contribution).length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t.contribution}</h3>
          <FactList facts={facts(row.submission.contribution)} />
        </section>
      )}
    </div>
  );

  if (row.state === "sent")
    return (
      <NextCard
        kind="wait"
        label={p.waiting}
        title={p.sent(row.since ? formatDate(row.since) : "")}
      >
        <p className="text-sm text-muted-foreground">{p.sentBody}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={prepare}>
            {t.newLink}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              act(() => setLegalFormState(projectId, row.formId!, "revoked"))
            }
          >
            {t.revoke}
          </Button>
        </div>
      </NextCard>
    );

  if (row.state === "action_required" && row.submission)
    return (
      <>
        <NextCard kind="decision" label={p.decision} title={p.corrected}>
          <FactList
            facts={Object.entries(row.submission.corrections).map(
              ([id, c]) => ({
                label: fr.legalForms.fields[id] ?? id,
                value: t.correction(c.before, c.after),
              }),
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                act(() => reviewLegalForm(projectId, row.formId!, true))
              }
            >
              {t.accept}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                act(() => reviewLegalForm(projectId, row.formId!, false))
              }
            >
              {t.refuse}
            </Button>
          </div>
        </NextCard>
        {answers}
      </>
    );

  return (
    <>
      <ToneCallout tone="success">
        <span className="font-medium">{p.complete}</span> — {p.completeBody}
      </ToneCallout>
      {answers}
    </>
  );
}
