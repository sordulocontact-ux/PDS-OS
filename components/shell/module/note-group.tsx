/** A titled list of noted information (« Informations notées », « À
 * confirmer », « Contradiction à trancher »…): its rows are `NoteRow`. */
export function NoteGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-body-md font-semibold">{title}</h3>
      {children}
    </section>
  );
}
