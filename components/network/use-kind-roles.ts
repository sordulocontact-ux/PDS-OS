"use client";

import { useState } from "react";

import {
  fitsKind,
  type NetworkKind,
  type NetworkRole,
} from "@/lib/network/types";

/**
 * The kind of a contact and its roles in the contact form: a change of kind
 * puts aside the roles that do not fit it (said on screen) and gives them
 * back if the kind changes back. A role held before the per-kind lists, that
 * does not fit, stays chosen until removed: nothing is dropped unseen.
 */
export function useKindRoles(
  initialKind: NetworkKind,
  initialRoles: readonly NetworkRole[],
) {
  const [kind, setKindState] = useState(initialKind);
  const [roles, setRoles] = useState<NetworkRole[]>([...initialRoles]);
  const [aside, setAside] = useState<NetworkRole[]>([]);

  function setKind(next: NetworkKind) {
    if (next === kind) return;
    const all = [...roles, ...aside];
    setRoles(all.filter((role) => fitsKind(role, next)));
    setAside(all.filter((role) => !fitsKind(role, next)));
    setKindState(next);
  }

  return { kind, setKind, roles, setRoles, aside };
}
