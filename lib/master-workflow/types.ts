// Master workflow of a project, first step: the État du master
// (docs/ARCHITECTURE.md § 8 septies). What the project's titles already hold
// for their mix and mastering, as facts classified by code. Client-safe.

import type { AudioState } from "@/lib/catalog/title-rules";
import type { CreditContactAction } from "@/lib/facts/credit-contact";
import type { Fact, FactStatus } from "@/lib/facts/types";

/** The credits the workflow follows: who mixes, who masters. */
export const ENGINEER_ROLES = ["mix_engineer", "mastering_engineer"] as const;
export type EngineerRole = (typeof ENGINEER_ROLES)[number];

/**
 * What a row offers, decided by the server from the viewer's permissions.
 * Every form is the one of the title's own page (Audio, Fichiers, Sessions,
 * Crédits) or of the Réseau: the rules stay in one place.
 */
export type MasterFactAction =
  // Add to the Réseau, or link a credit to its namesake.
  | CreditContactAction
  // No audio yet: the title's audio import (the state is asked).
  | { kind: "add_audio"; masterId: string; defaultState: AudioState }
  // The mix's source to confirm or change (the project's owner): the
  // title's audio versions, master final excepted, the detected one first.
  | {
      kind: "confirm_source";
      projectId: string;
      masterId: string;
      title: string;
      // The source confirmed so far, if any.
      currentFileId: string | null;
      // The latest version detected by code: offered first.
      detectedFileId: string;
      options: SourceOption[];
    }
  // No separated tracks: the title's file import, category stems.
  | { kind: "add_stems"; masterId: string }
  // No studio session: the title's session form.
  | { kind: "add_session"; masterId: string }
  // Nobody credited for a role: the title's credit form, the role (and the
  // engineer named in a session, if any) already filled.
  | {
      kind: "credit_engineer";
      masterId: string;
      role: EngineerRole;
      name: string | null;
    };

/** An audio version offered as the mix's source. */
export type SourceOption = {
  fileId: string;
  // "Mise à plat · sauvee_v3.wav · v2".
  label: string;
  // "Ajoutée le 3 oct. 2026 · Dernière version détectée".
  hint: string;
};

export type MasterFact = Fact<MasterFactAction>;

// The order of the ticket: the source first, what the mix needs, then who
// mixes and masters.
export const MASTER_SECTION_KEYS = [
  "sources",
  "materials",
  "engineers",
] as const;
export type MasterSectionKey = (typeof MASTER_SECTION_KEYS)[number];

export type MasterSection = {
  key: MasterSectionKey;
  facts: MasterFact[];
  // The read failed: the page says so instead of an empty list.
  failed: boolean;
};

/** An engineer of the Réseau, with what PDS already did with them. */
export type NetworkEngineer = {
  id: string;
  name: string;
  href: string;
  // Its organization in the Réseau (studio, label…).
  structure: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  // "Mix sur 2 titres · Mastering sur 1 titre", from the credits linked to
  // the contact; null when none.
  history: string | null;
};

export type MasterInventory = {
  // No title attached to the project: nothing to follow but the Réseau.
  hasTitles: boolean;
  sections: MasterSection[];
  engineers: { rows: NetworkEngineer[]; failed: boolean };
  counts: Record<FactStatus, number>;
  // manage_network: add an engineer to the Réseau from the page.
  canAddContact: boolean;
  // Where a file added from the page is stored; null without manage_catalog.
  organizationId: string | null;
};
