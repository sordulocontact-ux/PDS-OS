import type { ReactNode } from "react";

/**
 * A block of a Conception step (proto `.vers` + `.dhead`): its title, an
 * action on the right (« Ajouter un livrable »), then its content.
 */
export function DesignBlock({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={typeof title === "string" ? title : undefined}
      className="flex flex-col gap-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-body-md font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
