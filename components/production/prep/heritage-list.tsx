import { Children } from "react";

/** A titled list of what Conception decided; its empty label otherwise. */
export function HeritageList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: React.ReactNode;
  children: React.ReactNode;
}) {
  const items = Children.toArray(children);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">{items}</ul>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
