// « Mon Gmail » in the page « Mails » (Sacha 23/11/2026): the member's own
// Gmail, read live, seen by them only.
export const mailboxGmail = {
  view: "Mon Gmail",
  // In the reading pane: the account a mail is read from.
  account: (email: string) => `Gmail · ${email}`,
  failed: (emails: string[]) =>
    emails.length === 1
      ? `Gmail ne répond pas pour ${emails[0]}.`
      : `Gmail ne répond pas pour ${emails.join(", ")}.`,
  emptyTitle: "Aucun mail dans votre Gmail",
  emptyBody:
    "Les mails reçus et envoyés de vos comptes Google s'affichent ici.",
  errors: {
    notFound: "Ce mail n'est pas dans vos comptes Google.",
    unreachable: (email: string) => `Gmail ne répond pas pour ${email}.`,
  },
};
