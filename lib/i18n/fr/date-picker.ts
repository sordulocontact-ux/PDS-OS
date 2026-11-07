/** The date field of every form (components/ui/date-picker.tsx) and its
 * calendar (components/ui/calendar.tsx). */
export const datePicker = {
  placeholder: "jj/mm/aaaa",
  open: "Ouvrir le calendrier",
  dialog: "Choisir une date",
  previousMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  today: "Aujourd'hui",
  clear: "Effacer",
  // Monday first, read by screen readers in full.
  weekdays: ["L", "M", "M", "J", "V", "S", "D"],
  weekdaysLong: [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ],
  // Native validation of the typed text (the form's own errors come after).
  invalid: "Date incomplète ou inexistante : jj/mm/aaaa.",
  before: (day: string) => `Choisissez une date à partir du ${day}.`,
  after: (day: string) => `Choisissez une date jusqu'au ${day}.`,
};
