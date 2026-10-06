"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";

/**
 * Links shown once, to copy and send by any channel (fiches de
 * renseignements, confirmations de répartition): each one selectable by
 * hand when the clipboard is refused.
 */
export function LinksDialog({
  open,
  onClose,
  title,
  description,
  links,
  copyLabel,
  copiedLabel,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  links: Array<{ key: string; label: string; url: string }>;
  copyLabel: string;
  copiedLabel: string;
  closeLabel: string;
}) {
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(copiedLabel);
    } catch {
      // The field stays selectable: the link can be copied by hand.
    }
  };
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      description={description}
      closeLabel={closeLabel}
      size={links.length > 1 ? "wide" : "default"}
    >
      <ul className="flex flex-col gap-4">
        {links.map((link) => (
          <li key={link.key} className="flex flex-col gap-2">
            {links.length > 1 && <span className="font-medium">{link.label}</span>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={link.url}
                aria-label={link.label}
                className="font-mono text-sm"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" size="lg" className="shrink-0" onClick={() => copy(link.url)}>
                {copyLabel}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </FormDialog>
  );
}
