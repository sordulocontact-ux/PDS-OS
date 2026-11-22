"use client";

import { useEffect, useState } from "react";

import { listNetworkPeople } from "@/lib/network/people-actions";

/** A Réseau contact who can receive an e-mail. */
export type NetworkEmail = { name: string; email: string; detail: string };

// Read once per page, shared by every recipients field of the page.
let loading: Promise<NetworkEmail[]> | null = null;

const load = () =>
  (loading ??= listNetworkPeople()
    .then((people) =>
      people
        .filter((p) => p.email)
        .map((p) => ({
          name: p.label,
          email: p.email!.toLowerCase(),
          detail: p.detail ?? "",
        })),
    )
    .catch(() => {
      loading = null;
      return [];
    }));

/**
 * The Réseau's contacts that have an address, to pick an e-mail's
 * recipients from and to name an address already written (« Léa Martin »
 * rather than lea@label.fr). Empty until read.
 */
export function useNetworkEmails() {
  const [people, setPeople] = useState<NetworkEmail[]>([]);
  useEffect(() => {
    let alive = true;
    void load().then((list) => alive && setPeople(list));
    return () => {
      alive = false;
    };
  }, []);
  return people;
}
