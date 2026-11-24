# Consignes pour Claude

Ce projet fait partie d'un ensemble de projets suivis dans le carnet de bord `manmanvallet-ctrl/carnet-de-bord`.
Au début de chaque session, attache ce dépôt s'il ne l'est pas et suis son `CLAUDE.md` : façon d'expliquer, fin de séance, et surtout les **demandes transverses** (conformité, données personnelles, sécurité, accessibilité…), qui s'appliquent à tous les projets à la fois.

## Identité visuelle
La charte graphique est dans `docs/charte/` (README, jetons de couleur, typographie). Toute modification d'interface la respecte : fond papier, titres Fraunces en prune, rouge réservé au bouton « Sortie rapide », pas d'émoji, pas de dégradé ni d'ombre, 3 niveaux d'intensité en pastille à barres. Si un changement demande d'y déroger, le proposer à Manon et mettre à jour la charte (section « Décisions ») plutôt que de s'en écarter en silence.

## Avant chaque push
Lance `npm test` (données et fichiers) et `npm run test:parcours` (parcours dans un navigateur, il démarre son propre serveur). Si tu modifies un comportement testé, mets le test à jour dans le même commit. Si tu ajoutes un fichier à charger hors-ligne, ajoute-le à `FILES` dans `sw.js` et change `VERSION`.
