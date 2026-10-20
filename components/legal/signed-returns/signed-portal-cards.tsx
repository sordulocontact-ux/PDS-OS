import { contractFileName } from "@/components/legal/contracts/contract-document-card";
import type { PortalCardItem } from "@/components/portal/portal-sections";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { fr } from "@/lib/i18n/fr";
import type {
  ContactBulletin,
  ContactContract,
  ContactSignatures,
} from "@/lib/legal/signed-returns/public";
import { formatDay } from "@/lib/utils/day";
import { fileNamePart } from "@/lib/utils/file-name-part";

import { SignedUploadForm } from "./signed-upload-form";

const t = fr.signedReturns.portal;

type Frame = { token: string; person: string; project: string; owner: string };

/**
 * « Votre contrat » and « Le bulletin SACEM de … » on the person's page by
 * project (/c/, proto « Projet complet » portal): what PDS prepares, then
 * the version to sign (« Télécharger ») and the signed PDF deposited here,
 * then « reçu, PDS le vérifie » and « Signé ».
 */
export function signedPortalCards(
  frame: Frame,
  data: ContactSignatures,
): PortalCardItem[] {
  return [
    ...data.contracts.map((c, i) => contractCard(frame, c, i)),
    ...data.bulletins.map((b, i) => bulletinCard(frame, b, i)),
  ];
}

function download(href: string, fileName: string) {
  return (
    <PdfExportButton
      href={href}
      fileName={fileName}
      label={t.download}
      pendingLabel={fr.legalDocuments.contract.pdfPending}
      failedLabel={fr.signedReturns.errors.failed}
      variant="outline"
      size="sm"
    />
  );
}

function contractCard(
  frame: Frame,
  c: ContactContract,
  index: number,
): PortalCardItem {
  const c2 = t.contract;
  const toSign = c.status === "sent" && !c.deposit;
  const name = contractFileName(frame.person, frame.project, c.version ?? 1);
  const sentLine = !c.sentOn
    ? ""
    : c.sentVia === "other" && c.sentHow
      ? c2.sentOther(c.sentHow, formatDay(c.sentOn))
      : c2.sentLink(formatDay(c.sentOn));
  return {
    id: `ps-contract-${c.id.slice(0, 8)}`,
    title: c2.title,
    state: c.status === "signed" ? "done" : toSign ? "todo" : "waiting",
    badge: c.status === "signed" ? t.signedBadge : undefined,
    action: { label: c2.action },
    // After the fiche, before the invoice (the journey reversed).
    order: 40 + index,
    workflow: "legal",
    body:
      c.status === "signed" ? (
        <p className="font-medium">{c2.signed}</p>
      ) : c.deposit ? (
        <p className="font-medium">
          {c2.received(formatDay(c.deposit.at), frame.owner)}
        </p>
      ) : c.status === "sent" ? (
        <>
          <p className="text-muted-foreground">
            {sentLine && `${sentLine} `}
            {c2.sign}
          </p>
          <FactRows>
            <FactRow
              label={c2.document}
              value={<b className="font-semibold break-all">{name}</b>}
              source={c2.documentSource}
              side={download(`/c/${frame.token}/contrat/${c.id}`, name)}
            />
          </FactRows>
          <SignedUploadForm
            token={frame.token}
            kind="contract"
            id={c.id}
            label={c2.file}
            submitLabel={c2.send}
            doneLabel={c2.sent}
          />
        </>
      ) : (
        <p className="text-muted-foreground">
          {c.status === "approved" ? c2.approved : c2.preparing}
        </p>
      ),
  };
}

function bulletinCard(
  frame: Frame,
  b: ContactBulletin,
  index: number,
): PortalCardItem {
  const b2 = t.bulletin;
  const name = fr.legalDocuments.bulletin.fileName(
    fileNamePart(b.title, "Titre"),
    b.version,
  );
  const signedOn = b.signedOn ?? b.signedAt;
  return {
    id: `ps-bulletin-${b.id.slice(0, 8)}`,
    title: b2.title(b.title),
    state: b.status === "signed" ? "done" : "todo",
    badge: b.status === "signed" ? t.signedBadge : undefined,
    action: { label: b2.action },
    order: 45 + index,
    workflow: "legal",
    body:
      b.status === "signed" ? (
        <p className="font-medium">
          {b2.signed(signedOn ? formatDay(signedOn) : "", frame.owner)}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">{b2.intro(b.title)}</p>
          <FactRows>
            <FactRow
              label={b2.document}
              value={<b className="font-semibold break-all">{name}</b>}
              source={b2.documentSource}
              side={download(`/c/${frame.token}/bulletin/${b.id}`, name)}
            />
          </FactRows>
          <SignedUploadForm
            token={frame.token}
            kind="bulletin"
            id={b.id}
            label={b2.file}
            submitLabel={b2.send}
            doneLabel={b2.sent}
          />
        </>
      ),
  };
}
