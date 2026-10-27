"use client";

import { useMemo, useState } from "react";

import { SinglePicker } from "@/components/catalog/single-picker";
import { ContentFormatForm } from "@/components/projects/content-format-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shell } from "@/lib/i18n/fr/shell";
import type { ContentFormatOption } from "@/lib/projects/types";

const fr = { shell };

// The PDS format a content project is an edition of ("PDS Mic"). Formats
// are data: a missing one is created here, in a modal, and selected.
export function ContentFormatField({
  formats,
  defaultSelectedId,
  error,
}: {
  formats: ContentFormatOption[];
  defaultSelectedId: string | null;
  error?: string;
}) {
  const t = fr.shell.newProject;
  const p = t.contentFormatPicker;
  const [created, setCreated] = useState<ContentFormatOption[]>([]);
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const [creating, setCreating] = useState<string | null>(null);

  const options = useMemo(() => {
    const known = new Set(formats.map((f) => f.id));
    return [...formats, ...created.filter((f) => !known.has(f.id))].map(
      (f) => ({ id: f.id, label: f.name, detail: f.description ?? undefined }),
    );
  }, [formats, created]);

  return (
    <>
      <SinglePicker
        name="contentFormatId"
        legend={t.fields.contentFormat}
        required
        options={options}
        selectedId={selectedId}
        onSelect={setSelectedId}
        searchLabel={p.searchLabel}
        placeholder={p.placeholder}
        onCreate={(query) => setCreating(query)}
        createLabel={(query) => (query ? p.createNamed(query) : p.create)}
        noResultLabel={p.noResult}
        allSelectedLabel={p.allSelected}
        removeLabel={p.remove}
        error={error}
      />
      <Dialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
      >
        <DialogContent closeLabel={t.contentFormatForm.close}>
          <DialogHeader>
            <DialogTitle>{t.contentFormatForm.title}</DialogTitle>
            <DialogDescription>
              {t.contentFormatForm.description}
            </DialogDescription>
          </DialogHeader>
          {creating !== null && (
            <ContentFormatForm
              initialName={creating}
              onCancel={() => setCreating(null)}
              onCreated={(format) => {
                setCreated((current) => [...current, format]);
                setSelectedId(format.id);
                setCreating(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
