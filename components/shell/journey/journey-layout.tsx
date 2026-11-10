/**
 * The layout of every module page with a journey (proto « Mise en page des
 * modules », Ibé's feedback of 07/11, Sacha 10/11/2026): the journey on the
 * left, full height, and on its right the page's head (the open step's title
 * as h1, its why, « Qui fait quoi », the module's facts and chips), then the
 * step's content, without a card. No « Maintenant » card above: the journey
 * marks the viewer's steps « À vous » and the navigation's dots the other
 * modules; a step waiting for someone says it inside (StepWaiting). On a
 * phone: the head, the journey, then the step.
 *
 * The trail stays in the page's top bar: the head's ModuleHeader positions
 * it there, so nothing here is a positioned box (no `relative`).
 */
export function JourneyLayout({
  spine,
  head,
  children,
}: {
  spine: React.ReactNode;
  head: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-y-6 [grid-template-areas:'head'_'spine'_'body'] min-[900px]:grid-cols-[240px_minmax(0,1fr)] min-[900px]:grid-rows-[auto_1fr] min-[900px]:gap-x-6 min-[900px]:[grid-template-areas:'spine_head'_'spine_body'] xl:grid-cols-[272px_minmax(0,1fr)] xl:gap-x-8">
      <div className="flex min-w-0 flex-col gap-5 [grid-area:head]">{head}</div>
      <div className="min-w-0 self-stretch [grid-area:spine]">{spine}</div>
      <div className="min-w-0 [grid-area:body]">{children}</div>
    </div>
  );
}
