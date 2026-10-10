"use client";

import { IconCheck, IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { useState } from "react";

import { ContactForm } from "@/components/network/contact-form";
import { buttonVariants } from "@/components/ui/button";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { routes } from "@/lib/auth/redirects";
import type { CaptureArtist } from "@/lib/catalog/capture-artist-types";
import { captureContact } from "@/lib/catalog/capture-contact";
import { fr } from "@/lib/i18n/fr";
import { loadContactOptions } from "@/lib/network/actions";

/**
 * A person read on a screenshot and the Réseau: « Dans le Réseau » when a
 * contact already has one of their accounts, else « Ajouter au Réseau »,
 * the real contact form filled with what the Labo found, saved by a person.
 * Saved, the button becomes the link to the new contact (the screenshot
 * stays on the page).
 */
export function CaptureNetworkAction({
  artist,
  canAdd,
}: {
  artist: CaptureArtist;
  canAdd: boolean;
}) {
  const t = fr.laboCaptures.network;
  const [added, setAdded] = useState<{ id: string; name: string } | null>(null);
  const contact = added ?? artist.contact;

  if (contact)
    return (
      <Link
        href={routes.networkContact(contact.id)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
        aria-label={t.open(contact.name)}
      >
        <IconCheck aria-hidden data-icon="inline-start" />
        {added ? t.added : t.inNetwork}
      </Link>
    );
  if (!canAdd) return null;

  return (
    <LoadedFormButton
      label={t.add}
      icon={IconPlus}
      variant="outline"
      size="sm"
      title={t.title}
      description={t.description}
      closeLabel={fr.network.form.close}
      load={loadContactOptions}
    >
      {(options, close) => {
        // Read when the form opens: the notes date the spotting.
        const initial = captureContact(artist, new Date());
        return (
          <ContactForm
            options={options}
            initial={initial}
            stay
            onCancel={close}
            onSaved={(id) => {
              close();
              setAdded({ id, name: initial.name ?? artist.artistName });
            }}
          />
        );
      }}
    </LoadedFormButton>
  );
}
