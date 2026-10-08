import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PDFDocument,
  StandardFonts,
  type PDFFont,
  type PDFForm,
} from "pdf-lib";

import type {
  Creator,
  Publisher,
  Quality,
} from "@/lib/legal/formalities/definition";

// « PO génère une version du bulletin » (ticket Juridique 06): the official
// bulletin SACEM 725 - 02/2026 (œuvres éditées), the one given with the
// ticket, filled with the values of a document version. Its form fields have
// opaque names: each one below was matched to its rubric by its position on
// the page. Left empty on purpose (filled by hand on the bulletin, still
// editable): the signatures, « Je fais partie du groupe » (not asked by PDS
// OS), « Fait le », the rubric G table of non-joint contracts, and the part
// reserved to the SACEM.

const TEMPLATE = path.join(
  process.cwd(),
  "lib/legal/formalities/assets/sacem-725-02-2026.pdf",
);

type Content = Record<string, { value: unknown; source: string }>;

// Creators 1 to 5: name, first name, pseudonym, code international (IPI),
// COAD, then per quality its box and its Phono share (whole part, decimals).
const CREATOR_FIELDS = [
  {
    name: "21",
    first: "22",
    pseudo: "23",
    ipi: "24",
    coad: "25",
    lines: {
      composer: ["Check Box7", "a1", "a2"],
      author: ["Check Box8", "a4", "a5"],
      arranger: ["Check Box9", "a6", "a7"],
      adapter: ["Check Box10", "a8", "a9"],
    },
  },
  {
    name: "26",
    first: "27",
    pseudo: "28",
    ipi: "29",
    coad: "30",
    lines: {
      composer: ["Check Box11", "a10", "a11"],
      author: ["Check Box12", "a12", "a13"],
      arranger: ["Check Box13", "a14", "a15"],
      adapter: ["Check Box14", "a16", "a17"],
    },
  },
  {
    name: "31",
    first: "32",
    pseudo: "33",
    ipi: "34",
    coad: "35",
    lines: {
      composer: ["Check Box15", "a18", "a19"],
      author: ["Check Box16", "a20", "a21"],
      arranger: ["Check Box17", "a22", "a23"],
      adapter: ["Check Box18", "a24", "a25"],
    },
  },
  {
    name: "36",
    first: "37",
    pseudo: "38",
    ipi: "39",
    coad: "40",
    lines: {
      composer: ["Check Box19", "a26", "a27"],
      author: ["Check Box20", "a28", "a29"],
      arranger: ["Check Box21", "a30", "a31"],
      adapter: ["Check Box22", "a32", "a33"],
    },
  },
  {
    name: "41",
    first: "42",
    pseudo: "43",
    ipi: "44",
    coad: "45",
    lines: {
      composer: ["Check Box23", "a34", "a35"],
      author: ["Check Box24", "a36", "a37"],
      arranger: ["Check Box25", "a38", "a39"],
      adapter: ["Check Box26", "a40", "a41"],
    },
  },
] satisfies {
  name: string;
  first: string;
  pseudo: string;
  ipi: string;
  coad: string;
  lines: Record<Quality, [string, string, string]>;
}[];

// Publishers 1 to 3: denomination, Phono share (whole, decimals), IPI, COAD.
const PUBLISHER_FIELDS = [
  { name: "46", whole: "a42", decimals: "a43", ipi: "47", coad: "48" },
  { name: "49", whole: "a44", decimals: "a45", ipi: "50", coad: "51" },
  { name: "52", whole: "a46", decimals: "a47", ipi: "53", coad: "54" },
];

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

// « 33.3334 » → ["33", "3334"]; the bulletin writes the comma itself.
function share(phono: string): [string, string] {
  const [whole = "", decimals = ""] = phono.replace(",", ".").split(".");
  return [whole, decimals.replace(/0+$/, "")];
}

// The SACEM's notice: the code international (IPI name number, 9 to 11
// digits) or, failing it, the COAD. PDS OS keeps one « IPI / COAD » value.
function ipiOrCoad(value: string): { ipi: string; coad: string } {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9
    ? { ipi: digits, coad: "" }
    : { ipi: "", coad: value };
}

// A date typed as « 2026-10-07 » or « 07/10/2026 » → [dd, mm, yyyy].
function dateParts(value: string): [string, string, string] | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return [iso[3], iso[2], iso[1]];
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(value);
  return fr ? [fr[1].padStart(2, "0"), fr[2].padStart(2, "0"), fr[3]] : null;
}

// « 3:12 », « 1:03:12 » or « 3 min 12 » → [h, m, s].
function durationParts(value: string): [string, string, string] | null {
  const n = value.match(/\d+/g);
  if (!n || n.length < 2 || n.length > 3) return null;
  const [h, m, s] = n.length === 3 ? n : ["0", ...n];
  return [
    Number(h) ? String(Number(h)) : "",
    m.padStart(2, "0"),
    s.padStart(2, "0"),
  ];
}

function writer(form: PDFForm, font: PDFFont) {
  // The standard font cannot draw every character a name may hold: one it
  // cannot is written without its accent, or dropped.
  const drawable = (value: string) =>
    [...value]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          const plain = ch.normalize("NFD").replace(/\p{M}/gu, "");
          try {
            font.encodeText(plain);
            return plain;
          } catch {
            return "";
          }
        }
      })
      .join("");
  return {
    set(name: string, value: string) {
      if (!value) return;
      const field = form.getTextField(name);
      const max = field.getMaxLength();
      field.setText(drawable(max ? value.slice(0, max) : value));
    },
    check(name: string) {
      form.getCheckBox(name).check();
    },
  };
}

/** The official bulletin of a document version, filled, as a PDF. */
export async function sacem725Pdf(content: Content): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(await readFile(TEMPLATE));
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const w = writer(form, font);
  const v = (key: string) => content[key]?.value;

  // A. Title; B. designation of the work.
  w.set("1", text(v("title")));
  w.set("3", text(v("subtitle")));
  w.set("8", text(v("genre")));
  const duration = durationParts(text(v("duration")));
  if (duration) {
    w.set("5", duration[0]);
    w.set("6", duration[1]);
    w.set("7", duration[2]);
  }
  const arrangement = v("arrangement") as {
    scope?: string;
    detail?: string;
  } | null;
  if (arrangement?.scope === "all") w.check("Check Box7A");
  if (arrangement?.scope === "specific") {
    w.check("Check Box8A");
    w.set("10", text(arrangement.detail));
  }
  const first = dateParts(text(v("first_exploitation")));
  if (first) {
    w.set("13c", first[0]);
    w.set("14c", first[1]);
    w.set("15c", first[2]);
  }
  w.set("12", text(v("first_exploitation_place")));
  w.set("z20", text(v("iswc")).replace(/\D/g, ""));
  const territories = text(v("territories"));
  if (/^monde$/i.test(territories)) w.check("Check Box7B");
  else if (territories) {
    w.check("Check Box8B");
    w.set("16", territories);
  }
  w.set("12589", text(v("performers")));

  // C. Group; D. DEP and DR follow the Phono shares.
  w.set("9", text(v("group_name")));
  if ((v("dep_dr") as { choice?: string } | null)?.choice === "follow_phono")
    w.check("Box100");

  // E. Creators.
  ((v("creators") as Creator[] | null) ?? []).slice(0, 5).forEach((c, i) => {
    const f = CREATOR_FIELDS[i];
    w.set(f.name, c.last_name.trim());
    w.set(f.first, c.first_name.trim());
    w.set(f.pseudo, c.pseudonym.trim());
    const code = ipiOrCoad(c.ipi.trim());
    w.set(f.ipi, code.ipi);
    w.set(f.coad, code.coad);
    if (!c.quality) return;
    const [box, whole, decimals] = f.lines[c.quality];
    w.check(box);
    const [n, d] = share(c.phono);
    w.set(whole, n);
    w.set(decimals, d);
  });

  // F. Publishers.
  ((v("publishers") as Publisher[] | null) ?? [])
    .slice(0, 3)
    .forEach((p, i) => {
      const f = PUBLISHER_FIELDS[i];
      w.set(f.name, p.name.trim());
      const [n, d] = share(p.phono);
      w.set(f.whole, n);
      w.set(f.decimals, d);
      const code = ipiOrCoad(p.ipi.trim());
      w.set(f.ipi, code.ipi);
      w.set(f.coad, code.coad);
    });

  // G. Without a copy of the contract: the date it was signed jointly.
  const contract = v("publishing_contract") as {
    provided?: boolean;
    rubric_g?: string;
  } | null;
  const signed = !contract?.provided && dateParts(text(contract?.rubric_g));
  if (signed) {
    w.set("55", signed[0]);
    w.set("56", signed[1]);
    w.set("57", signed[2]);
  }

  form.updateFieldAppearances(font);
  return pdf.save();
}
