# Biblio VSS

Bibliothèque mobile de ressources sur l'**inceste**, le **viol** et les **violences sexuelles** : livres, films, séries, documentaires, podcasts, BD, articles et rapports, avec des numéros d'aide.

C'est une **application web installable (PWA)** : elle s'ouvre dans le navigateur du téléphone, s'ajoute à l'écran d'accueil comme une application et fonctionne hors-ligne. Pas besoin de passer par l'App Store ou le Play Store.

## Fonctionnalités

- Recherche par titre, auteur ou thème, filtres par catégorie et par thème
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
  "lien": "https://… (facultatif)"
}
```

- `categorie` : `livre`, `film`, `serie`, `documentaire`, `podcast`, `article` ou `bd`
- `intensite` : `1` (modérée), `2` (forte) ou `3` (très forte, résumé flouté)

Après une modification, changez `VERSION` dans `sw.js` pour que les téléphones récupèrent la nouvelle version.

## Tester en local

```bash
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000.

## Mettre en ligne (gratuit)

Sur GitHub : **Settings → Pages → Branch** : choisissez la branche et le dossier `/ (root)`. L'application sera disponible à l'adresse `https://<compte>.github.io/biblio-VSS/`. Sur le téléphone, ouvrez cette adresse puis « Ajouter à l'écran d'accueil ».
