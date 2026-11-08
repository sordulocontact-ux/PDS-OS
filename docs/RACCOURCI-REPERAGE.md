# Raccourci iPhone « Repérer dans PDS OS »

Envoie au Repérage (`/app/labo`) ce qu'on partage depuis TikTok, Instagram, Photos ou la vignette
d'une capture d'écran. Le raccourci reste **bête** : il transmet un lien ou une image, toute
l'intelligence est dans PDS OS. On peut donc faire évoluer le Repérage sans que personne ne
réinstalle le raccourci ; seul un changement d'adresse de l'app l'imposerait.

Côté app (`docs/ARCHITECTURE.md` § 10 bis) :

- `…/app/labo?url=<lien>` lit le lien dès l'ouverture (TikTok : profil, vidéo, lien court ;
  Instagram : profil ou story). L'adresse perd ensuite ses paramètres.
- `…/app/labo?coller=1` met en tête le bouton « Coller une capture ou un lien » : un toucher, la
  bulle « Coller » de Safari, et la capture part. iOS interdit à une page de lire le
  presse-papiers sans ce geste.
- Déconnecté, on passe par la connexion puis on revient sur la même adresse (`?next=`).

## Version installée (08/11/2026)

Lien d'installation : https://www.icloud.com/shortcuts/e163c98866e6437f876a6b37726ca9cf (repris
dans l'encart « Partager depuis TikTok ou Instagram » du Repérage, `components/labo/captures/share-shortcut.tsx`).
C'est la **version courte** : liens seulement (actions 1, 3 à 6 ci-dessous, sans le « Si / Sinon »).
Une capture d'écran se dépose sur la page. La version complète ci-dessous ajoute les captures ;
la publier = un nouveau lien iCloud, à remplacer dans `share-shortcut.tsx`.

## Créer le raccourci (une fois, sur l'iPhone ou le Mac de Sacha)

Le fichier ne peut pas être généré ni signé hors d'un appareil connecté à iCloud : on le crée dans
l'app **Raccourcis**, puis on le partage par un lien iCloud.

1. Raccourcis › **+** › nommer le raccourci **Repérer dans PDS OS**.
2. Ajouter les actions dans cet ordre :

   | # | Action (nom dans Raccourcis) | Réglage |
   | --- | --- | --- |
   | 1 | **Obtenir les URL de l'entrée** | entrée = **Entrée du raccourci** |
   | 2 | **Si** | « *URL* » **a une valeur** |
   | 3 | **Obtenir l'élément de la liste** | **Premier élément** de *URL* |
   | 4 | **Encoder en URL** | *Élément de la liste*, mode **Encoder** |
   | 5 | **URL** | `https://pds-os.vercel.app/app/labo?url=` suivi de la variable *Texte encodé en URL* |
   | 6 | **Ouvrir les URL** | *URL* (de l'action 5) |
   | 7 | **Sinon** | (ajouté avec le « Si ») |
   | 8 | **Copier dans le presse-papiers** | **Entrée du raccourci** |
   | 9 | **URL** | `https://pds-os.vercel.app/app/labo?coller=1` |
   | 10 | **Ouvrir les URL** | *URL* (de l'action 9) |
   | 11 | **Fin de si** | (ajouté avec le « Si ») |

3. Touche **ⓘ** (réglages du raccourci) :
   - activer **Afficher dans la feuille de partage** ;
   - **Reçoit** : URL, Pages web Safari, Texte, Images, Médias (décocher le reste) ;
   - **Si aucune entrée** : *Continuer*.
4. Tester : TikTok › Partager › **Plus** › « Repérer dans PDS OS ». Safari doit s'ouvrir sur le
   Repérage, qui lit le compte.

## Le partager à l'équipe

Dans Raccourcis : appui long sur le raccourci › **Partager** › **Copier le lien iCloud**. Le lien
`https://www.icloud.com/shortcuts/…` s'envoie à l'équipe. Il est **figé** : si le raccourci change,
il faut un nouveau lien et chacun le réinstalle.

## Consigne pour chaque membre

1. Ouvrir le lien iCloud sur l'iPhone › **Ajouter le raccourci**.
2. **Se connecter une fois à PDS OS dans Safari**, même si l'app est installée sur l'écran
   d'accueil : sur iPhone, l'app installée et Safari n'ont pas la même session, et le raccourci
   ouvre toujours Safari.
3. Le mettre en tête du menu Partager : Partager › faire défiler les actions › **Modifier les
   actions** › ajouter « Repérer dans PDS OS » aux favoris.
4. Utilisation :
   - **TikTok** : Partager › Plus › Repérer dans PDS OS ;
   - **Instagram** : l'avion en papier › Partager vers… › Repérer dans PDS OS (le lien d'un
     **profil** ; un reel ne dit pas qui l'a publié : faire une capture) ;
   - **capture d'écran** : toucher la vignette › Partager › Repérer dans PDS OS, puis sur la page
     toucher « Coller une capture ou un lien » et « Coller ».

## Limites connues

- Android n'a pas de Raccourcis : il faudra le partage de la PWA (Web Share Target), qui suppose un
  manifeste (absent aujourd'hui).
- Le raccourci vise la **production**. La pré-prod est protégée par l'authentification Vercel :
  pour tester avant la mise en prod, dupliquer le raccourci et remplacer l'adresse par celle de la
  branche `pre-prod`.
