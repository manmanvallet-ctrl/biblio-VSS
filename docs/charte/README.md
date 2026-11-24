# Biblio VSS — charte graphique

> Version 2 (24/11/2026), après relecture : vert d'eau foncé en `#4f8783`, **3 niveaux** d'intensité au lieu de 4, pastille à barres. Voir « Décisions » en bas et « Dans l'appli ».

Biblio VSS est une bibliothèque en ligne de livres, films, séries, documentaires, podcasts, articles et BD sur l'inceste, le viol et les violences sexuelles, avec des ressources d'aide. La page Instagram la fait connaître. L'identité doit évoquer **un refuge et une bibliothèque**, pas une manifestation : calme, chaleureuse, sérieuse, jamais choquante.

## Voix

- On écrit simplement, en phrases courtes, avec l'écriture inclusive du site (« seul·e »).
- On vouvoie, comme sur le site. Ton doux, jamais injonctif.
- À faire : nommer les choses clairement (« inceste », « viol ») dans les textes, avec un avertissement de contenu quand c'est dur.
- À éviter : le sensationnel, les chiffres-chocs en gros, les points d'exclamation, les émojis (sauf ⚠️ pour l'avertissement de contenu).
- Phrase repère : « Vous n'êtes pas seul·e. »

## Couleurs

- **Fond** : toujours `papier` (crème). C'est ce qui donne l'effet bibliothèque et nous distingue des comptes militants en violet vif.
- **Couleur principale** : `prune`, pour les titres, le logo et les aplats forts. `violet` reprend la couleur actuelle du site, pour les liens et les boutons.
- **Accent** : `vert-eau` (`#4f8783`), en aplat ou en pictogramme uniquement (badges, pictos, reliures, série « Pour commencer en douceur »). Jamais en couleur de texte, et jamais de texte posé dessus : aucun des deux textes de la charte n'y atteint 4,5:1.
- **Relief** : `lavande` et `vert-eau-clair` pour les encadrés et les fonds de slides secondaires.
- **Texte** : `ink` sur tous les fonds clairs, `papier-clair` sur `prune` et `violet`.
- **Rouge** (`sortie`) : réservé au bouton « Sortie rapide » du site. S'il apparaît ailleurs, ce bouton perd sa force de signal.

Proportion conseillée sur un post : 60 % papier, 25 % prune ou lavande, 10 % vert-eau, 5 % texte.

## Niveaux d'intensité

Les niveaux sont la signature de Biblio VSS : ils doivent apparaître sur chaque fiche ressource, en pastille arrondie (`radius-lg`).

| Niveau | Couleur | Texte | Barres pleines |
|---|---|---|---|
| 1 · Intensité modérée | `intensite-1` (vert-eau-clair) | ink | 1 sur 3 |
| 2 · Intensité forte | `intensite-2` (lavande) | ink | 2 sur 3 |
| 3 · Intensité très forte | `intensite-3` (prune) | papier-clair | 3 sur 3 |

Une seule famille de nuances, du vert d'eau au prune. Jamais de vert, orange et rouge : ce code de feu tricolore fait alarme.

**Pastille à barres** : à gauche du texte, trois petites barres de hauteur croissante (5, 8 et 11 px dans l'appli) ; autant de barres pleines que le niveau, les autres à 30 % d'opacité. Les niveaux 1 et 2 ont presque la même clarté : sans les barres, on ne les distinguerait que par la teinte, ce que les personnes daltoniennes ne voient pas.

## Typographie

- **Titres** : Fraunces (serif, gratuite sur Google Fonts et dans Canva). Remplacement : DM Serif Display.
- **Texte** : Inter (sans-serif). Remplacement : Montserrat ou Open Sans.
- Tailles données pour un visuel de 1080 px de large : `display` 72, `titre-1` 48, `titre-2` 32, `citation` 28 en italique, `corps` 24, `petit` 20, `etiquette` 18 (gras).
- Jamais plus de 40 mots par slide. Pas de texte en capitales sur plus de 3 mots.

## Formats Instagram

- **Post et carrousel** : 1080 × 1350 px (4:5). Marge de sécurité `space-20` (80 px) sur les 4 côtés.
- **Story et Reel** : 1080 × 1920 px. Garder le texte entre 250 px du haut et 340 px du bas (zones couvertes par l'interface).
- **Photo de profil** : monogramme « BV » en Fraunces papier-clair sur un rond prune.

## Gabarits

- **Fiche ressource** : fond papier ; photo de l'objet (livre, affiche) en `radius-md` ; type de ressource en `etiquette` ink sur une pastille vert-eau-clair (avec un picto vert-eau) ; titre en `titre-2` prune ; auteur·rice et année en `petit` ink-muted ; pastille d'intensité ; 2 lignes « Pour qui » en `corps`.
- **Carrousel « Comprendre »** : slide 1 en aplat prune avec le titre en `display` papier-clair ; slides suivantes sur papier, une idée par slide ; dernière slide « Retrouvez la liste complète sur Biblio VSS ».
- **Série « Pour commencer en douceur »** : fond `vert-eau-clair`, bandeau vert-eau en haut.
- **Post « Aide » (épinglé)** : fond lavande, numéros en `titre-2` prune, un numéro par ligne.

## Motif

Des tranches de livres alignées sur une étagère : des rectangles verticaux de largeurs inégales (multiples de 8 px), coins `radius-sm`, posés sur un filet `trait` ou ink. À utiliser en bandeau ou en coin, jamais en plein fond, et jamais plus de 5 couleurs.

## À éviter

- Le rouge en dehors du bouton de sortie.
- Le rose pastel (infantilisant sur ce sujet).
- Les photos de personnes en détresse, les mains qui se protègent, les visages en larmes.
- Les dégradés et les ombres portées.
- Le violet saturé en plein fond (effet tract militant).

## Dans Canva

Créer un Brand Kit « Biblio VSS » : ajouter les 15 couleurs avec leurs codes, Fraunces pour les titres et Inter pour le texte, puis 4 modèles (fiche ressource, carrousel Comprendre, douceur, story Agenda).

## Dans l'appli (site et applications mobiles)

La charte ci-dessus est pensée pour Instagram (visuels de 1080 px). Dans l'appli, elle s'applique ainsi (fichier `css/style.css`, en haut) :

- **Polices** : Fraunces pour les titres (en prune), Inter pour le texte. Elles sont **hébergées dans l'appli** (`fonts/`, licence OFL) : aucune requête vers Google Fonts, donc rien n'est envoyé à un tiers à l'ouverture.
- **Tailles** : échelle web, environ la taille Instagram divisée par 2,5 (texte courant 16 px, titres de fiche 17 px, pastilles 12,5 px).
- **Thème sombre** (créé pour l'appli, la charte n'en avait pas) : fond `#1a1520`, cartes `#241d2c`, texte `#f2edf7`, texte secondaire `#b8aec4`, titres en lavande `#dcd0ec`, liens et boutons `#c9b3ec`. Niveaux : `#2d4c49`, `#41345a`, `#c9b3ec`. Tous les textes dépassent 4,5:1.
- **Couvertures générées** : un aplat de la palette par type de ressource, avec une reliure à gauche (rappel du motif étagère), sans dégradé ni ombre.
- **Listes thématiques** : trois tons qui alternent (vert-eau-clair avec bandeau vert-eau pour la première, « Pour commencer », puis lavande, puis prune).
- **Icônes** : dessinées au trait (SVG), jamais d'émoji.
- **Rouge** : uniquement le bouton « Sortie rapide ». Les astérisques de champs obligatoires et les messages d'erreur sont en prune ou en gras.
- **Zones tactiles** : 44 px minimum, y compris « Sortie rapide ».

## Décisions

- 24/11/2026 : vert d'eau foncé de `#5e9c98` à `#4f8783` (le premier n'atteignait pas 3:1 sur papier pour un pictogramme).
- 24/11/2026 : 3 niveaux d'intensité au lieu de 4, pour garder la notation des 58 ressources existantes (`data/ressources.json`) et les règles de floutage et de « Contenus moins durs » (niveau 3).
- 24/11/2026 : pastille à barres, pour que le niveau se lise sans la couleur.
