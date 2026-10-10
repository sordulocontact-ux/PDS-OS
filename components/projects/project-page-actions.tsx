// The action of a project page (« Nouveau call », « Ajouter une tâche »…),
// on the right above its content: the page's name is the layout's h1
// (ProjectPageTitle), so a page brings no header of its own.
export function ProjectPageActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}
