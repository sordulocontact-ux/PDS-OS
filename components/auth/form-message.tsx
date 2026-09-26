import { cn } from "@/lib/utils";

// Inline form message. Errors are announced (role="alert"), information is
// polite (role="status"). Never a toast: the message stays next to the form.
export function FormMessage({
  kind,
  children,
  className,
}: {
  kind: "error" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;

  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        kind === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function FieldError({
  id,
  children,
}: {
  id: string;
  children?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
