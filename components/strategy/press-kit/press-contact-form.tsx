"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import {
  pressContactSchema,
  type PressContact,
} from "@/lib/strategy/documents/press-kit-model";

/** A press contact to add: name, role, email, phone (only the name needed). */
export function PressContactForm({
  onAdd,
}: {
  onAdd: (contact: PressContact) => void;
}) {
  const t = fr.strategyPressKit.links;
  const [contact, setContact] = useState<PressContact>({
    name: "",
    role: "",
    email: "",
    phone: "",
  });
  const field = (
    key: keyof PressContact,
    label: string,
    type: "text" | "email" | "tel" = "text",
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`press-contact-${key}`} required={key === "name"}>
        {label}
      </Label>
      <Input
        id={`press-contact-${key}`}
        type={type}
        value={contact[key]}
        maxLength={key === "phone" ? 40 : 120}
        onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
      />
    </div>
  );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = pressContactSchema.safeParse(contact);
        if (!parsed.success)
          return void toast.error(fr.framing.errors.invalid_input);
        onAdd(parsed.data);
        setContact({ name: "", role: "", email: "", phone: "" });
      }}
    >
      {field("name", t.contactName)}
      {field("role", t.contactRole)}
      {field("email", t.contactEmail, "email")}
      {field("phone", t.contactPhone, "tel")}
      <Button
        type="submit"
        variant="outline"
        className="justify-self-start sm:col-span-2"
      >
        {t.addContact}
      </Button>
    </form>
  );
}
