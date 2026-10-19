"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { NextCard } from "@/components/ui/next-card";
import {
  usePlanSheet,
  type PreparedLink,
} from "@/components/legal/tracking/plan-sheet-context";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { FicheLinkCard } from "@/components/legal/forms/fiche-link-card";
import { AddToNetworkButton } from "@/components/network/add-to-network-button";
import { fr } from "@/lib/i18n/fr";
import { mailtoHref } from "@/lib/utils/mailto";
import {
  prepareLegalForm,
  reviewLegalForm,
  setLegalFormState,
} from "@/lib/legal/forms/actions";
import type { FormRow } from "@/lib/legal/forms/queries";
import { formatInstant } from "@/lib/utils/instant";

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
  projectTitle = "",
  row,
}: {
  projectId: string;
  // For the ready e-mail of « Relancer ».
  projectTitle?: string;
  row: FormRow;
}) {
  const t = fr.legalForms.page;
  const p = fr.legal.panels.fiche;
  const router = useRouter();
  // Kept by the plan, not here: the panel may remount after the refresh.
  const sheet = usePlanSheet();
  const link = sheet.links[row.key] ?? null;
  const setLink = (next: PreparedLink | null) => sheet.setLink(row.key, next);
  // Just prepared, or kept sealed by the server (rule 19).
  const url = link?.url ?? row.link?.url ?? null;
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
      setLink(result);
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

  // A featured artist not in the Réseau yet: added there, linked to the
  // artist page, before any fiche.
  if (row.artistId)
    return (
      <NextCard kind="act" label={p.next} title={t.notInNetwork(row.name)}>
        <AddToNetworkButton
          label={fr.legal.board.verbs.addToNetwork}
          action={{
            kind: "add_to_network",
            name: row.name,
            roles: ["artist"],
            links: [],
            artistId: row.artistId,
          }}
        />
      </NextCard>
    );

  if (row.namesakeId)
    return (
      <ToneCallout tone="warning">
        {t.namesake}{" "}
        <Link
          href={routes.projectLegalStep(projectId, "inventory")}
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
        {link?.email && (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            nativeButton={false}
            render={
              <a
                href={mailtoHref(
                  link.email,
                  t.emailSubject(link.project),
                  t.emailBody(row.name, link.project, link.url),
                )}
              />
            }
          >
            {t.email}
          </Button>
        )}
        {link && !row.link?.url && (
          <p className="text-sm text-muted-foreground">{p.once}</p>
        )}
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
              if (result.ok) setLink(null);
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
        {row.revokedReason && (
          <p className="text-sm text-muted-foreground">
            {t.revokedWhy(row.revokedReason)}
          </p>
        )}
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
        title={p.sent(row.since ? formatInstant(row.since) : "")}
      >
        <p className="text-sm text-muted-foreground">{p.sentBody}</p>
        <FicheLinkCard
          projectId={projectId}
          projectTitle={projectTitle}
          row={row}
          pending={pending}
          onRenew={prepare}
        />
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
