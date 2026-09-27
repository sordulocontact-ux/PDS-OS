import type { ComponentType } from "react";

import type { IconProps } from "nucleo-sharp-essential";

// EmptyState (docs/DESIGN.md § 7): 22 px icon, title, one instruction, and
// the creation action when the viewer may create.
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-16 text-center">
      <Icon className="size-[22px] text-muted-foreground" aria-hidden />
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// A list still empty inside a section (contacts, tracks, shares): one line
// in the same dashed frame, without icon or title.
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
