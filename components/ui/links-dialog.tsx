"use client";


import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";

export type OneTimeLink = {
  key: string;
  label: string;
  // Null: nothing new to send, `note` says why (a link kept, JUR-27).
  url: string | null;
  note?: string;
  /** A ready e-mail carrying the link (`mailto:`), when the address is known. */
  email?: { href: string; label: string };
};

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
  links: OneTimeLink[];
  copyLabel: string;
  copiedLabel: string;
  closeLabel: string;
}) {
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
            {link.url === null ? (
              <p className="text-sm text-muted-foreground">{link.note}</p>
            ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={link.url}
                aria-label={link.label}
                className="font-mono text-sm"
                onFocus={(event) => event.currentTarget.select()}
              />
              {link.email && (
                <Button
                  variant="outline"
                  size="lg"
                  className="shrink-0"
                  render={<a href={link.email.href} />}
                  nativeButton={false}
                >
                  {link.email.label}
                </Button>
              )}
              {/* On failure, the field stays selectable: copied by hand. */}
              <CopyButton
                value={link.url}
                label={copyLabel}
                copiedLabel={copiedLabel}
                icon={null}
                variant="default"
                className="shrink-0"
              />
            </div>
            )}
          </li>
        ))}
      </ul>
    </FormDialog>
  );
}
