"use client";

import { useId, useState, useTransition } from "react";

import { FieldError } from "@/components/auth/form-message";
import { DeezerAccountCard } from "@/components/labo/captures/deezer-account-card";
import { proofSentences } from "@/components/labo/captures/deezer-proofs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  chooseCaptureDeezer,
  type ChosenDeezer,
} from "@/lib/catalog/capture-actions";
import type {
  CaptureArtist,
  DeezerAccount,
} from "@/lib/catalog/capture-artist-types";
import { fr } from "@/lib/i18n/fr";
import { reviewTone } from "@/lib/ui/state-tones";

type Chosen = Extract<ChosenDeezer, { ok: true }>;

/**
 * Choosing a person's Deezer account by hand (Labo): the homonyms, PO's lean
 * first with its reasoning, each with its Deezer bio and proofs, then any
 * other artist page pasted as a link. Open when the code could not decide;
 * otherwise behind « Pas le bon compte Deezer ? ».
 */
export function DeezerChooser({
  artist,
  onChosen,
}: {
  artist: CaptureArtist;
  onChosen: (chosen: Chosen) => void;
}) {
  const t = fr.laboCaptures.chooser;
  const undecided = artist.status === "several";
  const [open, setOpen] = useState(undecided);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | "link" | null>(null);
  const [, startTransition] = useTransition();
  const fieldId = useId();

  const choose = (input: { deezerId: number } | { link: string }) => {
    setError(null);
    setPendingId("deezerId" in input ? input.deezerId : "link");
    startTransition(async () => {
      const result = await chooseCaptureDeezer(input).catch(
        () => ({ ok: false, error: "unavailable" }) as const,
      );
      setPendingId(null);
      if (!result.ok) return setError(t.errors[result.error]);
      setLink("");
      setOpen(false);
      onChosen(result);
    });
  };

  if (!open)
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start"
        onClick={() => setOpen(true)}
      >
        {t.open}
      </Button>
    );

  const suggested = artist.suggestion?.deezerId ?? null;
  const candidates = [...artist.others].sort(
    (a, b) =>
      Number(b.deezerId === suggested) - Number(a.deezerId === suggested),
  );

  return (
    <section
      aria-label={t.title}
      className="grid gap-3 rounded-xl border border-[var(--border-hairline)] p-3"
    >
      <h3 className="text-sm font-semibold">{t.title}</h3>
      {artist.suggestion && suggested === null && (
        <p className="text-sm">
          <span className="font-semibold">{t.undecided}</span>{" "}
          {artist.suggestion.reasoning}
        </p>
      )}
      {candidates.length > 0 && (
        <ul className="grid gap-3">
          {candidates.map((account) => (
            <Candidate
              key={account.deezerId}
              account={account}
              reasoning={
                account.deezerId === suggested
                  ? (artist.suggestion?.reasoning ?? null)
                  : null
              }
              pending={pendingId === account.deezerId}
              disabled={pendingId !== null}
              onPick={() => choose({ deezerId: account.deezerId })}
            />
          ))}
        </ul>
      )}
      <form
        className="grid gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (link.trim()) choose({ link: link.trim() });
        }}
      >
        <Label htmlFor={fieldId}>{t.otherLink}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={fieldId}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.otherPlaceholder}
            value={link}
            onChange={(event) => setLink(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className="h-10 min-w-0 flex-1 text-base md:text-sm"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={pendingId !== null || !link.trim()}
            aria-busy={pendingId === "link" || undefined}
          >
            {pendingId === "link" ? t.pending : t.use}
          </Button>
        </div>
        {error && <FieldError id={`${fieldId}-error`}>{error}</FieldError>}
      </form>
      {!undecided && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => setOpen(false)}
        >
          {t.close}
        </Button>
      )}
    </section>
  );
}

function Candidate({
  account,
  reasoning,
  pending,
  disabled,
  onPick,
}: {
  account: DeezerAccount;
  reasoning: string | null;
  pending: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const t = fr.laboCaptures.chooser;
  const proofs = proofSentences(account);
  return (
    <li className="grid gap-2 border-t border-[var(--border-hairline)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <DeezerAccountCard account={account} compact />
        </div>
        <Button
          type="button"
          size="sm"
          variant={reasoning ? "default" : "outline"}
          disabled={disabled}
          aria-busy={pending || undefined}
          aria-label={t.pick(account.name)}
          onClick={onPick}
        >
          {pending ? t.pending : t.pickShort}
        </Button>
      </div>
      {reasoning && (
        <p className="grid gap-1 text-sm">
          <span>
            <StatusBadge tone={reviewTone.proposed} size="sm">
              {t.suggested}
            </StatusBadge>
          </span>
          <span>{reasoning}</span>
        </p>
      )}
      {proofs.length > 0 && <p className="text-sm">{proofs.join(" ")}</p>}
      {account.bio && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {account.bio}
        </p>
      )}
    </li>
  );
}
