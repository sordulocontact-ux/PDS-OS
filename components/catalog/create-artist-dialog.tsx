"use client";

import { useState } from "react";

import { ArtistDetailsForm } from "@/components/catalog/artist-details-form";
import { DeezerArtistSearch } from "@/components/catalog/deezer-artist-search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ArtistOption, DeezerArtistResult } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// "Nouvel artiste" modal (step A): search Deezer first, then confirm the
// name and add notes; "Créer sans Deezer" keeps the manual form. From the
// artist list, a taken artist links to its page; from a picker, it offers to
// select that artist instead, so the form behind keeps its input.
export function CreateArtistDialog({
  open,
  onOpenChange,
  onCreated,
  initialName = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Given → picker mode: the artist (new or existing) is handed back.
  onCreated?: (artist: ArtistOption) => void;
  initialName?: string;
}) {
  const t = fr.catalog.artistForm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.close}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        {/* Mounted per opening: every opening starts from a blank state. */}
        {open && (
          <ArtistForm
            initialName={initialName}
            onCancel={() => onOpenChange(false)}
            onDone={(artist) => {
              onCreated?.(artist);
              onOpenChange(false);
            }}
            pickerMode={Boolean(onCreated)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Step =
  | { kind: "search"; query: string }
  | { kind: "details"; deezer: DeezerArtistResult | null; name: string };

// Also used on its own, in the side panel reviewing a PO draft.
export function ArtistForm({
  initialName,
  initialNotes,
  onCancel,
  onDone,
  pickerMode,
}: {
  initialName: string;
  initialNotes?: string;
  onCancel: () => void;
  onDone: (artist: ArtistOption) => void;
  pickerMode: boolean;
}) {
  const [step, setStep] = useState<Step>({
    kind: "search",
    query: initialName,
  });

  if (step.kind === "search") {
    return (
      <DeezerArtistSearch
        initialQuery={step.query}
        pickerMode={pickerMode}
        onChoose={(deezer) =>
          setStep({ kind: "details", deezer, name: deezer.name })
        }
        onExisting={onDone}
        onManual={(query) =>
          setStep({ kind: "details", deezer: null, name: query })
        }
        onCancel={onCancel}
      />
    );
  }

  return (
    <ArtistDetailsForm
      // A new choice starts from a blank action state.
      key={step.deezer?.deezerId ?? "manual"}
      deezer={step.deezer}
      initialName={step.name}
      initialNotes={initialNotes}
      onBack={() => setStep({ kind: "search", query: step.name })}
      onCancel={onCancel}
      onDone={onDone}
      pickerMode={pickerMode}
    />
  );
}
