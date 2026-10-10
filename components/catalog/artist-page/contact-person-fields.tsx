"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import type { ContactRole } from "@/lib/catalog/contacts";
import { fr } from "@/lib/i18n/fr";
import {
  listNetworkPeople,
  type NetworkPersonOption,
} from "@/lib/network/people-actions";
import type { NetworkRole } from "@/lib/network/types";

// The Réseau role of who holds a contact role for an artist: listed first.
const NETWORK_ROLE: Partial<Record<ContactRole, NetworkRole>> = {
  manager: "manager",
  press: "media",
  legal: "lawyer",
};

/**
 * Who an artist's contact is (UX test of 09/10/2026: « manager… en nom
 * libre, hors Réseau »): a person of the Réseau, added to it, or only a
 * name; their email and phone are filled from their fiche, still editable.
 * Submitted as `networkContactId`, `name`, `email`, `phone`, or prefixed
 * (`contact` → `contactNetworkContactId`, `contactName`…).
 */
export function ContactPersonFields({
  role,
  prefix = "",
  required = false,
  defaultNetworkId,
  defaultName,
  defaultEmail,
  defaultPhone,
  errors,
}: {
  role: ContactRole;
  prefix?: string;
  required?: boolean;
  defaultNetworkId: string | null;
  defaultName: string | null;
  defaultEmail: string | null;
  defaultPhone: string | null;
  errors: { name?: string; email?: string; phone?: string };
}) {
  const t = fr.catalog.contacts.form;
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [named, setNamed] = useState(Boolean(defaultName));
  const [filled, setFilled] = useState(false);
  const networkRole = NETWORK_ROLE[role];
  // « contact » + « email » = « contactEmail ».
  const field = (name: string) =>
    prefix ? `${prefix}${name[0].toUpperCase()}${name.slice(1)}` : name;

  const picked = (option: NetworkPersonOption | null, name: string) => {
    setNamed(Boolean(option || name.trim()));
    if (!option) return;
    // What their fiche says, over what was not typed.
    setEmail((current) => option.email ?? current);
    setPhone((current) => option.phone ?? current);
    setFilled(Boolean(option.email || option.phone));
  };

  return (
    <>
      <PersonPickerField<NetworkPersonOption>
        refName={field("networkContactId")}
        nameName={field("name")}
        legend={t.person}
        required={required}
        load={() => listNetworkPeople()}
        defaultRef={defaultNetworkId}
        defaultName={defaultName}
        // A manager added from here is a manager in the Réseau too.
        createRoles={networkRole ? [networkRole] : []}
        refOfContact={(id) => id}
        suggest={
          networkRole
            ? (option) => option.roles.includes(networkRole)
            : undefined
        }
        onPick={picked}
        error={errors.name}
      />
      {named && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name={field("email")}
            type="email"
            label={t.email}
            inputMode="email"
            autoComplete="off"
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            hint={filled ? t.fromNetwork : undefined}
            error={errors.email}
          />
          <Field
            name={field("phone")}
            type="tel"
            label={t.phone}
            inputMode="tel"
            autoComplete="off"
            maxLength={40}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={errors.phone}
          />
        </div>
      )}
    </>
  );
}
