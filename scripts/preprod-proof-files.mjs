// The files of the pre-production proofs (supabase/preprod/showcase-finance-
// proofs.sql writes their rows): six PDFs made here, with the text a real
// ticket or invoice has (so the code finds each value in it), and the photo
// of a taxi ticket kept in supabase/preprod/files/. Uploaded as the
// pre-production business manager (malik.durand@preprod.pds, PREPROD_PASSWORD),
// through the bucket's own rules: never a service key.
//
//   node scripts/preprod-proof-files.mjs
//
// Reads PREPROD_SUPABASE_URL, PREPROD_ANON_KEY and PREPROD_PASSWORD from the
// environment or .env.preprod.local. A file already there is kept.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

if (existsSync(".env.preprod.local"))
  for (const line of readFileSync(".env.preprod.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
const {
  PREPROD_SUPABASE_URL: url,
  PREPROD_ANON_KEY: anon,
  PREPROD_PASSWORD: pw,
} = process.env;
if (!url || !anon || !pw) {
  console.error(
    "PREPROD_SUPABASE_URL, PREPROD_ANON_KEY ou PREPROD_PASSWORD manquant.",
  );
  process.exit(1);
}

const euro = (cents) =>
  `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }).replace(/\s/g, " ")} €`;

const DOCS = {
  sncf: {
    vendor: "SNCF Connect",
    title: "Reçu",
    ref: "QKZ7LM",
    day: "12/11/2026",
    ttc: 18000,
    lines: [["Paris Gare de Lyon - Lyon Part-Dieu, 2 passagers", 18000]],
  },
  "studio-ombre": {
    vendor: "Studio Ombre",
    title: "Facture",
    ref: "F-2026-118",
    day: "10/11/2026",
    ttc: 108000,
    vat: 18000,
    lines: [["Ingénierie son, 3 jours", 90000]],
  },
  sonofix: {
    vendor: "SonoFix",
    title: "Facture",
    ref: "SF-4471",
    day: "12/11/2026",
    ttc: 35000,
    lines: [["Réparation enceinte active", 35000]],
  },
  adobe: {
    vendor: "Adobe Systems",
    title: "Facture",
    ref: "IEU2026-88213",
    day: "01/11/2026",
    ttc: 7199,
    vat: 1200,
    lines: [["Creative Cloud, 1 mois", 5999]],
  },
  "loca-plateau": {
    vendor: "Loca Plateau",
    title: "Facture",
    ref: "LP-2026-031",
    day: "04/11/2026",
    ttc: 240000,
    vat: 40000,
    lines: [["Location plateau, 2 jours", 200000]],
  },
  devis: {
    vendor: "Imprimerie Lumière",
    title: "Devis",
    ref: "DEVIS-552",
    day: "08/11/2026",
    ttc: 46800,
    vat: 7800,
    lines: [["500 affiches A2", 39000]],
  },
};

async function pdf(d) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 540;
  const text = (s, x, size = 10, f = font) =>
    page.drawText(s, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
  text(d.vendor, 40, 18, bold);
  y -= 22;
  text(d.title, 40, 11);
  y -= 30;
  for (const line of [
    `Référence : ${d.ref}`,
    `Date : ${d.day}`,
    "Client : PDS Records",
  ]) {
    text(line, 40);
    y -= 16;
  }
  y -= 18;
  for (const [label, cents] of d.lines) {
    text(label, 40);
    text(euro(cents), 300);
    y -= 18;
  }
  page.drawLine({
    start: { x: 40, y: y + 8 },
    end: { x: 380, y: y + 8 },
    thickness: 0.5,
  });
  y -= 10;
  if (d.vat) {
    text("TVA 20 %", 40);
    text(euro(d.vat), 300);
    y -= 18;
  }
  text("Total TTC", 40, 11, bold);
  text(euro(d.ttc), 300, 11, bold);
  return Buffer.from(await doc.save());
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });
const { error: signIn } = await supabase.auth.signInWithPassword({
  email: "malik.durand@preprod.pds",
  password: pw,
});
if (signIn) throw new Error(`Connexion refusée : ${signIn.message}`);
// The organization, read from the rows the SQL wrote (a Finance member reads
// them): the files go under it, at the paths those rows name.
const { data: rows } = await supabase
  .from("finance_proofs")
  .select("organization_id")
  .like("file_path", "%/seed-proof-%")
  .limit(1);
const org = rows?.[0]?.organization_id;
if (!org)
  throw new Error(
    "Aucun justificatif de démonstration : jouer d'abord supabase/preprod/showcase-finance-proofs.sql.",
  );

const files = [
  ...Object.entries(DOCS).map(([key, d]) => [
    `seed-proof-${key}.pdf`,
    () => pdf(d),
    "application/pdf",
  ]),
  [
    "seed-proof-g7.jpg",
    async () => readFileSync("supabase/preprod/files/seed-proof-g7.jpg"),
    "image/jpeg",
  ],
];
for (const [name, make, contentType] of files) {
  const { error } = await supabase.storage
    .from("finance-files")
    .upload(`${org}/${name}`, await make(), { contentType });
  if (error && !/exists|duplicate/i.test(error.message))
    throw new Error(`${name} : ${error.message}`);
  console.log(error ? `${name} : déjà là` : `${name} : déposé`);
}
