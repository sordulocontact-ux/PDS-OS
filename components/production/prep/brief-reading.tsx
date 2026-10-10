import { fr } from "@/lib/i18n/fr";
import type { ProductionBrief } from "@/lib/production/brief";

const t = fr.productionBrief;

type Topic = {
  key: string;
  label: string;
  choice: string | null;
  text: string | null;
};

/**
 * The director's brief read in its order: intent, coverage, camera, sound,
 * run of show, constraints, references, needs to confirm. A closed choice
 * shows its label, then its detail; an empty topic says « Non renseigné »,
 * never a guess.
 */
export function BriefReading({ brief }: { brief: ProductionBrief }) {
  const topics: Topic[] = [
    {
      key: "stagingIntent",
      label: t.topics.stagingIntent,
      choice: null,
      text: brief.stagingIntent,
    },
    {
      key: "coverage",
      label: t.topics.coverage,
      choice: brief.coverage ? t.choices.coverage[brief.coverage].label : null,
      text: brief.coverageNote,
    },
    {
      key: "camera",
      label: t.topics.camera,
      choice: brief.cameraSetup
        ? t.choices.cameraSetup[brief.cameraSetup].label
        : null,
      text: brief.cameraNote,
    },
    {
      key: "sound",
      label: t.topics.sound,
      choice: brief.soundCapture
        ? t.choices.soundCapture[brief.soundCapture].label
        : null,
      text: brief.soundNote,
    },
    {
      key: "runOfShow",
      label: t.topics.runOfShow,
      choice: null,
      text: brief.runOfShow,
    },
    {
      key: "constraintsNote",
      label: t.topics.constraintsNote,
      choice: null,
      text: brief.constraintsNote,
    },
    {
      key: "referencesNote",
      label: t.topics.referencesNote,
      choice: null,
      text: brief.referencesNote,
    },
    {
      key: "openNeeds",
      label: t.topics.openNeeds,
      choice: null,
      text: brief.openNeeds,
    },
  ];

  return (
    <dl className="grid gap-x-6 gap-y-5 md:grid-cols-2">
      {topics.map((topic) => (
        <div key={topic.key} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-sm text-muted-foreground">{topic.label}</dt>
          {!topic.choice && !topic.text ? (
            <dd className="text-muted-foreground">{t.notFilled}</dd>
          ) : (
            <dd className="flex flex-col gap-0.5">
              {topic.choice && (
                <span className="font-semibold">{topic.choice}</span>
              )}
              {topic.text && (
                <span className="break-words whitespace-pre-line">
                  {topic.text}
                </span>
              )}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
