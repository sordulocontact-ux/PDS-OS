"use client";

import { IconImage } from "nucleo-sharp-essential";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { network } from "@/lib/i18n/fr/network";
import {
  NETWORK_PICTURE_EXTENSIONS,
  type NetworkPictureSource,
} from "@/lib/network/picture-rules";
import { squarePicture } from "@/lib/network/picture-resize";
import type { NetworkKind } from "@/lib/network/types";

const fr = { network };

/**
 * The head of the contact form: its picture, clicked to choose one, next to
 * its name (`children`), as folk or SoundCloud do (Sacha, 05/11/2026). The
 * picture is cropped square in the browser and sent with « Enregistrer »
 * (`picture`), or removed (`pictureRemove`); never written before the form
 * is saved, so « Annuler » leaves it as it was. Without one, the server takes
 * the picture of the TikTok or Instagram profile (retour d'Ibé, 01/11/2026).
 */
export function ContactPictureField({
  name,
  kind,
  pictureUrl,
  pictureSource,
  error,
  children,
}: {
  // The contact's name, for the initials shown without a picture.
  name: string;
  kind: NetworkKind;
  pictureUrl: string | null;
  pictureSource: NetworkPictureSource | null;
  error?: string;
  // The name field, beside the picture.
  children: ReactNode;
}) {
  const t = fr.network.form.picture;
  const id = useId();
  const chooser = useRef<HTMLInputElement>(null);
  const carrier = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [reading, setReading] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  const preview = useObjectUrl(chosen);

  // The resized file travels in a named file input, sent with the form.
  // Checked after every render: React empties the form's fields after a
  // submission that failed, the chosen picture must still go next time.
  useEffect(() => {
    const input = carrier.current;
    if (!input || (input.files?.[0] ?? null) === chosen) return;
    const files = new DataTransfer();
    if (chosen) files.items.add(chosen);
    input.files = files.files;
  });

  async function choose(file: File | undefined) {
    if (chooser.current) chooser.current.value = "";
    if (!file) return;
    setReading(true);
    const square = await squarePicture(file);
    setReading(false);
    setUnreadable(!square);
    if (square) {
      setChosen(square);
      setRemoved(false);
    }
  }

  const shown = preview ?? (removed ? null : pictureUrl);
  // Where the picture shown comes from, said only when it is not obvious.
  const source = chosen
    ? null
    : removed
      ? t.removed
      : pictureUrl && pictureSource === "tiktok"
        ? t.fromTiktok
        : pictureUrl && pictureSource === "instagram"
          ? t.fromInstagram
          : !shown
            ? t.auto
            : null;
  const message = unreadable ? t.unreadable : error;

  return (
    <div className="flex items-start gap-4" aria-busy={reading || undefined}>
      <button
        type="button"
        onClick={() => chooser.current?.click()}
        disabled={reading}
        aria-label={shown ? t.replace : t.add[kind]}
        className="group relative mt-1 shrink-0 rounded-[var(--radius-circle)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar
          name={name || "?"}
          pictureUrl={shown}
          className="size-18 text-[length:var(--type-body-lg)]"
        />
        {/* On hover, the picture says it can be changed. */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-circle)] bg-[var(--overlay-scrim)] text-[color:var(--text-on-dark)] opacity-0 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)] group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <IconImage className="size-5" />
        </span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {children}
        {/* Pulled left so the first label lines up with the field. */}
        <div className="-ml-2 flex flex-wrap items-center gap-x-1 gap-y-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={reading}
            onClick={() => chooser.current?.click()}
          >
            {reading ? t.reading : shown ? t.replace : t.add[kind]}
          </Button>
          {chosen || removed ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setChosen(null);
                setRemoved(false);
              }}
            >
              {t.undo}
            </Button>
          ) : (
            pictureUrl && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setRemoved(true)}
              >
                {t.remove}
              </Button>
            )
          )}
          {source && (
            <span className="text-sm text-muted-foreground">{source}</span>
          )}
        </div>
        <FieldError id={`${id}-error`}>{message}</FieldError>
      </div>
      <input
        ref={chooser}
        type="file"
        accept={Object.keys(NETWORK_PICTURE_EXTENSIONS).join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      <input
        ref={carrier}
        type="file"
        name="picture"
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
      {removed && <input type="hidden" name="pictureRemove" value="1" />}
    </div>
  );
}
