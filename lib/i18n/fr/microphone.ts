/**
 * Why the microphone cannot be used, told apart so the user knows what to do
 * (PROJ-BUG-01). Shared by the call recorder and dictation.
 */
export const microphoneErrors = {
  unsupported:
    "Votre navigateur ne permet pas d'enregistrer. Utilisez Chrome ou Edge sur ordinateur.",
  permission_denied:
    "Vous n'avez pas autorisé le micro. Relancez et choisissez « Autoriser » quand le navigateur le demande.",
  permission_blocked:
    "Le micro est bloqué pour PDS OS dans ce navigateur. Cliquez sur l'icône à gauche de l'adresse, passez « Micro » sur « Autoriser », puis rechargez la page.",
  system_blocked:
    "Votre ordinateur bloque le micro pour ce navigateur. Sur Mac : Réglages Système › Confidentialité et sécurité › Microphone, autorisez le navigateur, puis relancez-le.",
  no_device:
    "Aucun micro détecté. Branchez un micro ou un casque, puis réessayez.",
  device_busy:
    "Le micro ne répond pas : il est peut-être utilisé par une autre application. Fermez-la, ou débranchez et rebranchez le micro, puis réessayez.",
  tab_cancelled:
    "Le partage de l'onglet a été annulé. Relancez et choisissez l'onglet du call.",
  no_tab_audio:
    "L'onglet a été partagé sans son. Recommencez en cochant « Partager aussi l'audio de l'onglet ».",
  device_error: "Le micro n'a pas pu être ouvert. Vérifiez qu'il est branché.",
  save_unavailable:
    "La sauvegarde de l'enregistrement n'a pas pu être préparée (connexion ?). Rien n'est enregistré : réessayez.",
  too_large: "Enregistrement arrêté : la limite de 100 Mo est atteinte.",
} as const;
