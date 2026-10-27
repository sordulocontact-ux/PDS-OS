"use client";

import { useState } from "react";

import { Loading, type SavedLink } from "@/components/assistant/draft-forms";
import { ContactForm } from "@/components/catalog/artist-page/contact-form";
import { ArtistProfileForm } from "@/components/catalog/artist-page/artist-profile-form";
import { ArtistForm } from "@/components/catalog/create-artist-dialog";
import { loadArtistForm } from "@/lib/assistant/draft-form-actions";
import type { ArtistDraft } from "@/lib/assistant/drafts";
import { routes } from "@/lib/auth/redirects";
import type { ArtistOption } from "@/lib/catalog/types";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

type Step =
  | { kind: "create" }
  | { kind: "profile"; artist: ArtistOption }
  | { kind: "contact"; artist: ArtistOption; index: number };

// A PO artist draft, reviewed with the real forms, one after the other:
// creation (Deezer search, name, notes) for a new artist, then identity and
// biography, then each proposed contact. Every step saves on its own.
export function ArtistDraftFlow({
  draft,
  onSaved,
  onCancel,
  onStep,
}: {
  draft: ArtistDraft;
  onSaved: (saved: SavedLink) => void;
  onCancel: () => void;
  // Tells the panel which step is shown, for its description.
  onStep: (description: string) => void;
}) {
  const t = fr.assistant.drafts.sheet;
  const { values, contacts } = draft;
  const [step, setStep] = useState<Step>(
    draft.artistId
      ? { kind: "profile", artist: { id: draft.artistId, name: values.name } }
      : { kind: "create" },
  );
  const hasProfile = Boolean(
    values.legalName || values.countryCode || values.bio,
  );

  function go(next: Step | null, artist: ArtistOption) {
    if (!next) {
      onSaved({ label: artist.name, href: routes.artist(artist.id) });
      return;
    }
    if (next.kind === "profile") onStep(t.artistProfile);
    if (next.kind === "contact")
      onStep(t.contacts(contacts.length - next.index));
    setStep(next);
  }
  const firstContact = (artist: ArtistOption): Step | null =>
    contacts.length ? { kind: "contact", artist, index: 0 } : null;

  if (step.kind === "create") {
    return (
      <ArtistForm
        initialName={values.name}
        initialNotes={values.notes ?? ""}
        initialRelation={values.relation}
        pickerMode={false}
        // The contacts PO proposes are reviewed one by one after.
        withContact={contacts.length === 0}
        onCancel={onCancel}
        onDone={(artist) =>
          go(
            hasProfile ? { kind: "profile", artist } : firstContact(artist),
            artist,
          )
        }
      />
    );
  }

  const { artist } = step;
  if (step.kind === "profile") {
    return (
      <Loading load={() => loadArtistForm(artist.id)}>
        {(saved) =>
          saved && (
            <ArtistProfileForm
              // The saved record, with what PO proposes in place.
              artist={{
                ...saved,
                ...values,
                relation: values.relation ?? saved.relation,
              }}
              onDone={(message) => {
                const next = firstContact(artist);
                // Skipped on an existing artist, with no contact to review:
                // nothing was saved.
                if (!next && !message && draft.artistId) onCancel();
                else go(next, { ...artist, name: saved.name });
              }}
            />
          )
        }
      </Loading>
    );
  }

  const contact = contacts[step.index];
  const next = step.index + 1;
  return (
    <ContactForm
      // A new form per contact: each starts from its own proposal.
      key={step.index}
      artistId={artist.id}
      contact={null}
      defaults={contact}
      onDone={() =>
        go(
          next < contacts.length
            ? { kind: "contact", artist, index: next }
            : null,
          artist,
        )
      }
    />
  );
}
