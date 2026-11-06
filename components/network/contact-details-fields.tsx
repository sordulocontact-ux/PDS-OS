"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { Fragment, useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { network } from "@/lib/i18n/fr/network";
import type { SaveContactResult } from "@/lib/network/actions";
import { deezerUrl, spotifyUrl } from "@/lib/network/socials";
import type { NetworkContactValues } from "@/lib/network/types";

const fr = { network };

const DETAILS = [
  "email",
  "phone",
  "website",
  "city",
  "tiktok",
  "instagram",
  "spotify",
  "deezer",
  "notes",
] as const;
type Detail = (typeof DETAILS)[number];

// What the contact already has, as typed in its field.
function savedValue(
  values: Partial<NetworkContactValues> | undefined,
  detail: Detail,
): string {
  switch (detail) {
    case "tiktok":
      return values?.tiktok ? `@${values.tiktok}` : "";
    case "instagram":
      return values?.instagram ? `@${values.instagram}` : "";
    case "spotify":
      return values?.spotifyId ? spotifyUrl(values.spotifyId) : "";
    case "deezer":
      return values?.deezerId ? deezerUrl(values.deezerId) : "";
    default:
      return values?.[detail] ?? "";
  }
}

/**
 * How to reach a contact (e-mail, phone, website, city), its accounts
 * (TikTok, Instagram, a handle or the profile link; Spotify, Deezer, the
 * artist page) and its notes. Only what the contact has is shown; each empty
 * one is a « + E-mail » under the fields, opened on a click (Sacha,
 * 05/11/2026: « trop d'informations d'un coup »; Attio, Linear). A field
 * the server refused stays open. An empty field is not sent: the server
 * reads it as empty, as before.
 */
export function ContactDetailsFields({
  values,
  error,
}: {
  values?: Partial<NetworkContactValues>;
  error: Extract<SaveContactResult, { ok: false }> | null;
}) {
  const t = fr.network.form;
  const [opened, setOpened] = useState<Detail[]>([]);
  // The field just opened takes the focus (React focuses it on mount).
  const [justOpened, setJustOpened] = useState<Detail | null>(null);
  const shown = (detail: Detail) =>
    savedValue(values, detail) !== "" ||
    opened.includes(detail) ||
    error?.field === detail;
  const closed = DETAILS.filter((detail) => !shown(detail));

  function field(detail: Detail) {
    const common = {
      name: detail,
      autoFocus: justOpened === detail,
      defaultValue: savedValue(values, detail),
      error: error?.field === detail ? error.error : undefined,
    };
    switch (detail) {
      case "notes":
        return (
          <TextareaField
            {...common}
            label={t.notes}
            maxLength={2000}
            rows={3}
            placeholder={t.notesPlaceholder}
          />
        );
      case "email":
        return (
          <Field
            {...common}
            type="email"
            label={t.email}
            autoComplete="off"
            maxLength={320}
          />
        );
      case "phone":
        return (
          <Field
            {...common}
            type="tel"
            label={t.phone}
            autoComplete="off"
            maxLength={40}
          />
        );
      case "website":
        return (
          <Field
            {...common}
            type="url"
            inputMode="url"
            label={t.website}
            autoComplete="off"
            maxLength={500}
            placeholder={t.websitePlaceholder}
          />
        );
      case "city":
        return (
          <Field
            {...common}
            label={t.city}
            autoComplete="off"
            maxLength={120}
          />
        );
      default:
        return (
          <Field
            {...common}
            label={t[detail]}
            placeholder={t[`${detail}Placeholder`]}
            inputMode={
              detail === "spotify" || detail === "deezer" ? "url" : undefined
            }
            autoComplete="off"
            spellCheck={false}
            maxLength={500}
          />
        );
    }
  }

  return (
    <>
      {DETAILS.filter(shown).map((detail) => (
        <Fragment key={detail}>{field(detail)}</Fragment>
      ))}
      {closed.length > 0 && (
        <div
          role="group"
          aria-label={t.addDetail}
          className="flex flex-wrap items-center gap-2"
        >
          {closed.map((detail) => (
            <Button
              key={detail}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpened((list) => [...list, detail]);
                setJustOpened(detail);
              }}
            >
              <IconPlus aria-hidden />
              {t.details[detail]}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
