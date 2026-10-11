/** Shared by the generic dialog buttons of components/ui (DialogButton,
 * ConfirmButton, RecordMenu). */
export const dialogs = {
  cancel: "Annuler",
  close: "Fermer",
  edit: "Modifier",
  remove: "Supprimer",
  deleting: "Suppression…",
  saving: "Enregistrement…",
  reasonRequired: "Écrivez la raison.",
  menu: (what: string) => `Actions pour « ${what} »`,
};
