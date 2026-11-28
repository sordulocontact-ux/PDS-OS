import { IconCircleInfo } from "nucleo-sharp-essential";

import { IconStop } from "@/components/icons";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { AudioFile } from "@/components/ui/audio-file";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import {
  isReady,
  SOURCE_MODULES,
  type Readiness,
  type ReadinessItem,
} from "@/lib/distribution/readiness";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import { distributionSourceTone } from "@/lib/ui/state-tones";

const fr = { distribution, distributionJourney };

const t = fr.distribution.readiness;
const j = fr.distributionJourney.prep;

/**
 * The Préparation (proto step `prep`): the verdict, then every element the
 * deposit reuses, grouped by the module that owns it, each with its value,
 * its source, its state and « Corriger dans X » when it blocks. Computed by
 * code at each reading: nothing is ticked by hand.
 */
export function PrepStep({
  readiness,
  failed,
  legal,
}: {
  readiness: Readiness;
  failed: boolean;
  // « Juridique › Prêt pour la sortie », read from its own computation
  // (loadLegalReadiness): said, never recomputed here.
  // `href`: null for who may not open the Juridique (its pages answer 404).
  legal: {
    value: string;
    source: string;
    done: boolean;
    href: string | null;
  };
}) {
  const blockers = readiness.blockers.length;
  return (
    <div className="flex flex-col gap-4">
      {failed && <ToneCallout tone="danger">{t.failed}</ToneCallout>}
      {blockers > 0 ? (
        <ToneCallout tone="danger" icon={<IconStop />} as="div">
          <strong className="block font-semibold">
            {t.blockingCount(blockers)}
          </strong>
          {j.verdict(readiness.ready, readiness.total)}
        </ToneCallout>
      ) : (
        <ToneCallout tone="info" icon={<IconCircleInfo />}>
          <strong className="font-semibold">{j.readyTitle}</strong>{" "}
          {j.readyBody}
        </ToneCallout>
      )}
      {SOURCE_MODULES.map((module) => {
        const items = readiness.items.filter((item) => item.module === module);
        if (items.length === 0 && module !== "legal") return null;
        return (
          <section key={module} className="flex flex-col gap-2">
            <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
              {fr.distribution.modules[module]}
            </h3>
            <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
              {t.moduleNotes[module]}
            </p>
            <FactRows>
              {module === "legal" && (
                <FactRow
                  label={fr.distributionJourney.legalReady.label}
                  value={legal.value}
                  source={legal.source}
                  state={{
                    tone: legal.done ? "success" : "neutral",
                    label: legal.done
                      ? fr.distributionJourney.legalReady.states.ok
                      : fr.distributionJourney.legalReady.states.open,
                  }}
                  side={
                    legal.href ? (
                      <ViewLink
                        href={legal.href}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        <ButtonRoll>{t.see}</ButtonRoll>
                      </ViewLink>
                    ) : undefined
                  }
                />
              )}
              {items.map((item) => (
                <PrepRow key={item.key} item={item} />
              ))}
            </FactRows>
          </section>
        );
      })}
      <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {j.footer}
      </p>
    </div>
  );
}

function PrepRow({ item }: { item: ReadinessItem }) {
  const blocks = item.blocking && !isReady(item);
  return (
    <FactRow
      label={item.subject ? `${item.label} · ${item.subject}` : item.label}
      value={item.detail}
      source={item.source}
      state={{
        tone: distributionSourceTone(item.state, item.blocking),
        label: t.states[item.state],
      }}
      side={
        blocks ? (
          <ViewLink
            href={item.href}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>
              {j.correctIn(fr.distribution.modules[item.module])}
            </ButtonRoll>
          </ViewLink>
        ) : null
      }
      below={
        item.media ? (
          <AudioFile
            label={t.listen(item.media.fileName)}
            name={item.media.fileName}
            listenUrl={item.media.listenUrl}
            downloadUrl={item.media.downloadUrl}
          />
        ) : undefined
      }
    />
  );
}
