import type { GuideTopic } from "@/lib/assistant/guide/types";

/** The Business module (BIZ 2 to 7): the deals, their calls, the deal memo
 * and the contract. */
export const businessTopics: GuideTopic[] = [
  {
    key: "deals",
    title: "Deals",
    summary:
      "Les négociations avec les artistes (PDS MIC d'abord) : étapes, termes négociés, prochaine action et relances.",
    keywords: [
      "deal",
      "deals",
      "negociation",
      "negocier",
      "business",
      "business manager",
      "accord de principe",
      "relance",
      "termes",
      "call du deal",
      "preparer un call",
      "deal memo",
      "memo",
      "contrat du deal",
      "conforme",
      "avance",
      "cachet",
      "royalties",
      "splits",
    ],
    nav: "/app/deals",
    facts: [
      "Un deal est une négociation avec un artiste, à part du projet : la personne qui le négocie écrit sur le deal, jamais dans le projet.",
      "Pour un PDS MIC, un deal s'ouvre pour la participation d'un artiste à un titre ; son contrat est celui de la participation. Le deal d'une participation que l'artiste a acceptée commence directement « En négociation » ; un deal ouvert avant y passe dès que la participation est acceptée. Un projet collectif ne se négocie que par la participation d'un artiste invité : on l'invite à la création du collectif (« Artistes invités » dans « Nouveau projet », ou une sélection d'artistes) ou ensuite sur un titre du projet ; une participation refusée, retirée ou dont le titre est abandonné ne reçoit plus de deal.",
      "Étapes : À contacter, Call prévu, Négociation, Accord de principe, Contractualisation, Signé ; ou Abandonné, toujours avec un motif. Un deal abandonné ne se rouvre pas : pour reprendre, la direction ouvre un nouveau deal, depuis la page du deal abandonné (« Ouvrir un nouveau deal », artiste déjà choisi).",
      "L'accord de principe est proposé par la personne qui négocie et validé par la direction, qui peut le renvoyer en négociation avec un motif. La contractualisation attend un accord validé. Dès qu'un terme est confirmé, un deal À contacter ou Call prévu propose directement l'accord de principe. La direction est prévenue, et voit les termes confirmés juste au-dessus de son bouton de validation.",
      "Chaque terme négocié (splits auteur-compositeur, part du master, royalties, avance ou cachet, crédits, territoires, durée, exclusivité, promo) a sa valeur, son état (Proposé par PDS, Contre-proposition, Confirmé, À définir) et l'historique de ses changements.",
      "Chaque deal a une prochaine action (avec son jour) et une date de relance (si personne n'a répondu d'ici là) : le jour venu, PDS OS prévient la personne qui négocie, et l'action apparaît dans son Travail et son accueil. Le prochain call du deal, jour et heure, s'affiche à côté de la prochaine action.",
      "Depuis la page d'un deal, « Préparer un call » crée un call dont l'ordre du jour reprend le contexte du deal et les termes encore à négocier (tous ceux qui ne sont pas confirmés). Un deal « À contacter » passe alors à « Call prévu ».",
      "Le call d'un deal s'enregistre, se transcrit et se clôture comme tout call, depuis sa page dans Calls. Il n'appartient pas au projet : il n'apparaît ni dans les Calls du projet ni dans ses modules (Cadrage, Stratégie…), seulement pour ceux qui lisent le deal.",
      "Après le call, PO propose sur la page du deal les changements qu'il a lus (un terme, une étape, la prochaine action) avec le passage de la transcription : vous les vérifiez dans le vrai formulaire, ou vous les écartez. PO ne change jamais un deal lui-même.",
      "Le deal memo est une photo numérotée des termes du deal (valeur et état de chacun), avec son auteur, sa date et son statut, Brouillon ou Validé. Il est pris à l'accord de principe (validé avec lui par la direction) ou à la main avec « Nouveau deal memo ». Il ne change jamais : un nouveau deal memo prend les termes du moment, les précédents restent, chacun exportable en PDF.",
      "Seule la direction valide un deal memo, et seulement le dernier.",
      "Le contrat d'un deal de participation (PDS MIC) est celui de la participation, dans le Juridique. Un autre deal se lie à un contrat principal parmi ceux de son projet ou de son artiste ; les autres contrats de l'opération restent dans Contrats.",
      "Le contrat se compare au dernier deal memo validé, terme par terme : PDS OS ne lit pas le PDF du contrat. Il compare seulement le montant saisi sur le contrat à l'avance ou au cachet ; pour chaque terme, la personne qui négocie ou la direction dit « Conforme » ou « Différent », avec ce que dit le contrat. Les termes que le contrat contredit sont signalés ; rien n'est corrigé tout seul.",
      "Sur la fiche d'un artiste, l'onglet Business réunit ses deals puis son budget : deals à relancer, en cours, signés (les collaborations terminées restent consultables) et abandonnés, avec l'étape, la prochaine action, le contrat et le projet de chacun. Chacun n'y voit que les deals qu'il a le droit de voir, et jamais de contact ; la partie Budget suit ses propres droits.",
      "La page Deals est une seule liste : onglets En cours, À relancer, Signés, Abandonnés ; filtres par étape, personne qui négocie et projet.",
    ],
    faq: [
      {
        q: "Qui voit un deal ?",
        a: "La direction voit tous les deals. La personne qui le négocie voit les siens, et seulement eux. Le responsable du projet lié le lit sans le modifier.",
      },
      {
        q: "Qui voit le call d'un deal ?",
        a: "Ceux qui lisent le deal : la direction, la personne qui le négocie et le responsable du projet lié (qui le lit seulement). L'équipe du projet ne le voit pas. L'enregistrent et le traitent la direction et la personne qui négocie.",
      },
      {
        q: "Qui crée un deal et le confie ?",
        a: "La direction, ou le responsable du projet lié, avec « Nouveau deal » sur la page Deals ; il se confie à un membre qui négocie (business manager, business). Le business manager ouvre aussi un deal sur un artiste du Catalogue, qui lui est confié ; un deal de projet ou de PDS MIC lui est confié par la direction ou le chef de projet. Le poste business n'ouvre pas de deal : « Ouvrir un deal » sur la page Deals lui dit à qui le demander. La direction change la personne qui négocie depuis le bloc Informations, en haut de la page du deal.",
      },
    ],
    permissions: ["negotiate", "validate"],
  },
];
