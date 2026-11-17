# Biblio VSS

Bibliothèque mobile de ressources sur l'**inceste**, le **viol** et les **violences sexuelles** : livres, films, séries, documentaires, podcasts, BD, articles et rapports, avec des numéros d'aide.

Elle existe sous deux formes, avec le même contenu :

- une **application web installable (PWA)** : elle s'ouvre dans le navigateur du téléphone, s'ajoute à l'écran d'accueil et fonctionne hors-ligne ;
- des **applications Android et iPhone** pour Google Play et l'App Store (dossiers `android/` et `ios/`) : voir **[PUBLIER.md](PUBLIER.md)**.

## Fonctionnalités

- Recherche par titre, auteur ou thème (avec ou sans accents), filtres par catégorie et par thème
- **Listes thématiques** : Pour commencer, Pour les ados, Comprendre l'inceste, Le consentement…
- **Couvertures** générées automatiquement, ou vraies images si vous en ajoutez
- Onglet **Proposer** : formulaire pour suggérer une ressource, un événement ou une association
- **Agenda** des événements (groupes de parole, conférences, projections…) avec **filtre par ville**, ville mémorisée sur l'appareil, et ajout à l'agenda du téléphone
- **Notes SensCritique** sur les films, séries et documentaires
- **Annuaire d'aide** : lignes d'écoute, associations, groupes de parole, soins, démarches (dont le recueil de preuves sans plainte), avec téléphone, tchat, e-mail et site en un appui
- Lien pour **témoigner anonymement** sur la plateforme Classés sans suite
- **Niveau d'intensité** sur chaque fiche ; le résumé des contenus « très forts » est flouté jusqu'à ce qu'on appuie dessus
- Case « Contenus moins durs » pour masquer les contenus les plus éprouvants
- **Sortie rapide** : un bouton toujours visible (ou deux appuis sur Échap) ouvre un site neutre
- Onglet **Aide** : 17, 114, 3919, 119, Viols Femmes Informations, signalement en ligne, associations
- Favoris enregistrés uniquement sur l'appareil, aucun compte ni pistage
- Message d'avertissement à la première ouverture, thème sombre automatique

## Ajouter une ressource

Tout le contenu est dans `data/ressources.json`. Ajoutez un bloc comme celui-ci :

```json
{
  "id": "identifiant-unique",
  "titre": "Titre de l'œuvre",
  "auteur": "Autrice / réalisateur",
  "annee": 2024,
  "categorie": "livre",
  "themes": ["inceste", "témoignage"],
  "resume": "Deux ou trois phrases factuelles.",
  "intensite": 2,
  "lien": "https://… (facultatif)",
  "image": "images/mon-image.jpg (facultatif)"
}
```

- `categorie` : `livre`, `film`, `serie`, `documentaire`, `podcast`, `article` ou `bd`
- `intensite` : `1` (modérée), `2` (forte) ou `3` (très forte, résumé flouté)
- `image` : une affiche ou couverture placée dans le dossier `images/` (ou un lien `https://`). Sans image, une couverture colorée est générée. Vérifiez que vous avez le droit d'utiliser l'image.

## Modifier les listes thématiques

Elles sont dans `data/listes.json` : un titre, une description, une couleur et la liste des `id` des ressources, dans l'ordre d'affichage.

## Ajouter un événement

Dans `data/evenements.json` (vide au départ) :

```json
{
  "id": "groupe-parole-lyon-2026-12",
  "titre": "Groupe de parole pour victimes d'inceste",
  "type": "Groupe de parole",
  "date": "2026-12-03",
  "heure": "18:30",
  "ville": "Lyon",
  "lieu": "Adresse ou nom du lieu",
  "organisateur": "Nom de l'association",
  "description": "Quelques phrases.",
  "lien": "https://… (inscription, facultatif)",
  "gratuit": true
}
```

- `date` au format `AAAA-MM-JJ` ; `heure` (`HH:MM`) et `fin` (date de fin, pour un événement sur plusieurs jours) sont facultatifs.
- Les événements passés disparaissent tout seuls. La liste des villes du filtre se construit automatiquement.
- Écrivez toujours la ville de la même façon (« Lyon », pas « lyon »), sinon elle apparaîtra deux fois.

## Compléter l'annuaire d'aide

Il est dans `data/aide.json`. Chaque entrée a une catégorie (`ecoute`, `jeunes`, `groupes`, `associations`, `soins`, `demarches`, `prevention`, `infos`), une ville ou zone, une description, des horaires facultatifs et des contacts :

```json
"contacts": [
  { "type": "tel", "valeur": "0800059595", "label": "0 800 05 95 95" },
  { "type": "tchat", "valeur": "https://…" },
  { "type": "email", "valeur": "contact@…" },
  { "type": "web", "valeur": "https://…" }
]
```

⚠️ Vérifiez chaque numéro sur le site officiel de l'association avant de l'ajouter : une erreur peut empêcher quelqu'un d'obtenir de l'aide. Les urgences (17, 114, 3919, 119) sont écrites directement dans `index.html` pour toujours s'afficher.

## Mettre à jour les notes SensCritique

SensCritique n'a pas d'API publique : les notes sont relevées à la main (dernier relevé : novembre 2026) et stockées dans chaque fiche :

```json
"senscritique": { "note": 7.8, "votes": "10,1 k", "url": "https://www.senscritique.com/film/…" }
```

Pour une mise à jour, corrigez les notes puis la date `SC_DATE` en haut de `js/app.js`. Sans `note`, la fiche affiche seulement un lien vers la page SensCritique.

## Recevoir les propositions

Dans `js/config.js`, renseignez **une** des deux options :

- `suggestionEndpoint` : l'adresse d'un service de formulaires gratuit comme [Formspree](https://formspree.io). Les propositions arrivent par e-mail, sans que l'adresse soit visible dans l'application.
- `suggestionEmail` : votre adresse. Le formulaire ouvre alors l'application mail de la personne, avec le message prêt. ⚠️ L'adresse sera visible par tout le monde.

Après une modification, changez `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## Tester en local

```bash
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000.

## Mettre en ligne (gratuit)

Sur GitHub : **Settings → Pages → Branch** : choisissez la branche et le dossier `/ (root)`. L'application sera disponible à l'adresse `https://<compte>.github.io/biblio-VSS/`. Sur le téléphone, ouvrez cette adresse puis « Ajouter à l'écran d'accueil ».
