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
- `aussi` (facultatif) : d'autres formats de la même ressource, par exemple `["podcast"]` pour un livre que l'auteur·rice présente dans un podcast (mettre alors le lien de l'épisode dans `lien`). La fiche affiche les deux formats et apparaît sous les deux filtres.
- `isbn` (livres et BD, facultatif) : les 13 chiffres de l'ISBN, sans tiret. La fiche affiche alors « Acheter en librairie indépendante », qui ouvre la page du livre sur librairiesindependantes.com. Choisissez une édition disponible (souvent la version poche) : vérifiez que `https://www.librairiesindependantes.com/product/<isbn>/` montre bien le livre.
- `resume` : deux ou trois phrases factuelles, rédigées pour Biblio VSS (avec l'aide de Claude). Les 58 résumés ont été vérifiés le 24/11/2026 : faits, dates et citations comparés aux pages des éditeurs, des diffuseurs et aux documents eux-mêmes. Les 8 ressources de la liste « Entre enfants », ajoutées le 27/11/2026, ont été vérifiées de la même façon. Tout nouveau résumé doit l'être aussi.
- `presentation` (facultatif) : texte officiel affiché sous « Afficher plus », `{ "texte": "…", "source": "Présentation de l'éditeur (Folio)", "url": "https://…" }`. Recopié tel quel, jamais réécrit (ni par une IA). Sources utilisées : la fiche du livre sur librairiesindependantes.com (présentation de l'éditeur), le synopsis SensCritique pour les films et séries, la page de la radio pour les podcasts. En cas de demande d'un ayant droit, retirer le texte (voir les mentions légales).
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

- `type` : Groupe de parole, Conférence, Table ronde, Projection, Spectacle / théâtre, Marche, Rassemblement, Atelier, Exposition, Formation.
- `date` au format `AAAA-MM-JJ` ; `heure` (`HH:MM`) et `fin` (date de fin, pour un événement sur plusieurs jours) sont facultatifs.
- Les événements passés disparaissent tout seuls. La liste des villes du filtre se construit automatiquement.
- Écrivez toujours la ville de la même façon (« Lyon », pas « lyon »), sinon elle apparaîtra deux fois.

### Veille automatique des événements

Les groupes de parole du **CAIIP**, d'**En Parler** et de **Pas de Secret** sont relevés automatiquement **chaque lundi** sur leurs sites (`.github/workflows/releve-evenements.yml`, qui lance `scripts/releve-evenements.js`) : nouvelles dates, mention « Complet », dates passées retirées. Chaque événement garde sa source et sa date de relevé, affichées dans sa fiche. Si un site change de présentation, le script le signale dans le journal de la tâche et garde les dates déjà connues. Pour lancer un relevé tout de suite : onglet **Actions** → **Relevé de l'agenda** → **Run workflow**, ou en local `node scripts/releve-evenements.js`.

Chaque semaine, une tâche planifiée cherche de nouveaux événements à partir des mots-clés de `veille/mots-cles.md`, vérifie chacun sur sa page d'origine, puis propose les nouveautés dans une **pull request** à relire avant publication. Pour changer les sujets, les villes ou les sources surveillées, modifiez simplement ce fichier.

## Mettre à jour les notes SensCritique

Elles se mettent à jour **automatiquement le 1er de chaque mois** (`.github/workflows/notes-senscritique.yml`, qui lance `scripts/maj-notes-senscritique.js`). Pour lancer une mise à jour tout de suite : onglet **Actions** du dépôt → **Notes et images** → **Run workflow**. Ou en local :

```bash
node scripts/maj-notes-senscritique.js
```

Pour ajouter une note à une nouvelle fiche, il suffit d'y mettre le lien de sa page : `"senscritique": { "url": "https://www.senscritique.com/film/…" }`. La note apparaîtra à la mise à jour suivante.

## Images (affiches, couvertures, podcasts)

Chaque fiche affiche l'image de l'œuvre, enregistrée dans `images/` en petite taille (pour que l'application reste légère et fonctionne hors-ligne). Elles sont récupérées par `scripts/recuperer-images.js` :

- films, séries, documentaires : l'affiche de la page SensCritique ;
- livres et BD : la couverture d'une **édition française** sur Open Library (sinon Google Livres) ;
- podcasts : le visuel officiel sur Apple Podcasts.

Les nouvelles fiches reçoivent leur image automatiquement lors de la tâche mensuelle. Pour le faire tout de suite :

```bash
node scripts/recuperer-images.js
```

Si l'image trouvée n'est pas la bonne (mauvaise édition…), ajoutez à la fiche `"image_url"` : une page SensCritique de l'œuvre ou le lien direct d'une image, puis relancez le script avec l'identifiant de la fiche (`node scripts/recuperer-images.js mon-id`). La source est indiquée sous l'image dans la fiche.

Les affiches et couvertures restent la propriété de leurs auteurs et éditeurs. Leur usage en petite taille pour présenter une œuvre est courant, mais ce n'est pas un droit automatique : en cas de demande d'un ayant droit, retirez l'image (supprimez `image` de la fiche).

## Onglet « Comprendre » (définitions et questionnaire)

Le contenu est dans `data/comprendre.json` :

- `questions_frequentes` : questions et réponses (par exemple « Inceste et pédocriminalité : quelle différence ? ») ;
- `definitions` : chaque terme avec un résumé, un texte et sa **source officielle** (Légifrance, service-public…) ;
- `questionnaire` : le texte des questions de « Faire le point » (bandeau masqué pour l'instant, à retravailler).
- `rubriques` : les 7 rubriques du sommaire et leur format : `liste` (fiches dépliables), `tuiles` (grille d'icônes, la fiche s'ouvre en panneau), `reflexion` (questions d'atelier). Une rubrique peut avoir des `etapes` (schéma à faire défiler).
- Chaque fiche a une `rubrique`, et peut avoir une `icone` (format tuiles) et une `reflexion` : des questions pour réfléchir ou en parler, en une ou plusieurs parties. Elles s'affichent dans la fiche et dans la rubrique « Pour réfléchir ensemble ». Les réponses ne sont jamais enregistrées.

Les définitions juridiques suivent le Code pénal en vigueur (vérifié en novembre 2026, après la loi du 6 novembre 2025 sur le consentement). Mettez à jour `maj` et les textes à chaque changement de loi. Le questionnaire ne garde aucune réponse : elles sont effacées à la fin ou à la fermeture.

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

La version navigateur est publiée automatiquement sur **GitHub Pages** à chaque modification de la branche `main` (`.github/workflows/site.yml`). À faire une seule fois :

1. Sur GitHub : **Settings → Pages → Source** : choisissez **GitHub Actions**.
2. L'application est alors disponible à l'adresse **https://biblio-vss.fr** (nom de domaine OVH branché sur GitHub Pages, voir ci-dessous).

### Nom de domaine biblio-vss.fr

Le domaine est acheté chez OVH ; GitHub Pages sert le site à cette adresse.

- **Zone DNS (OVH)** : 4 enregistrements `A` sur `biblio-vss.fr` vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, 4 enregistrements `AAAA` vers `2606:50c0:8000::153` à `2606:50c0:8003::153`, et `www` en `CNAME` vers `manmanvallet-ctrl.github.io.`. Ne pas toucher aux enregistrements `MX` et au `TXT` SPF : ils font marcher la boîte `contact@biblio-vss.fr`.
- **GitHub** : Settings → Pages → Custom domain : `biblio-vss.fr`, puis cocher **Enforce HTTPS**. Le domaine est aussi vérifié dans les réglages du compte (Settings → Pages → Add a domain), pour que personne d'autre ne puisse l'utiliser sur GitHub.
- Le site étant servi à la racine du domaine, `404.html` utilise des liens qui partent de `/`, et les balises Open Graph de `index.html` pointent vers `https://biblio-vss.fr/`.

Sur le téléphone, ouvrez cette adresse puis « Ajouter à l'écran d'accueil » : elle s'installe comme une application et fonctionne hors-ligne.

GitHub Pages gratuit demande un dépôt **public**. Si le dépôt doit rester privé, d'autres hébergeurs gratuits (Netlify, Cloudflare Pages) peuvent publier le dossier `www/` produit par `npm run build`.
