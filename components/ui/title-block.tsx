import { cn } from "@/lib/utils";

// A card's title and the sentence under it, read as one block: 4 px between
// them (Sacha's Figma of the SACEM step, 10/11/2026, « partout » ; 10 px from
// 07/11, 6 px before), the card's own gap only around the pair (Sacha,
// 04/11/2026: « on dirait qu'ils ne sont pas ensemble »). `className`:
// placement only (more air under the pair in a step's card).
export function TitleBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {children}
    </div>
  );
}
