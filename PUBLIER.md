# Publier Biblio VSS sur Google Play et l'App Store

L'application web est emballée dans de vraies applications Android (`android/`) et iOS (`ios/`) grâce à [Capacitor](https://capacitorjs.com). Le contenu est le même partout : on modifie le site, puis on resynchronise.

> Les tarifs et règles des stores changent souvent : vérifiez-les sur leurs sites avant de vous lancer.

## 0. À décider avant la première publication

- **Identifiant de l'application** : `fr.bibliovss.app` (dans `capacitor.config.json`). Il est **définitif** une fois l'application publiée. Si vous avez un nom de domaine, prenez-le à l'envers (ex. `org.monasso.bibliovss`).
- **Compte personnel ou compte d'organisation** : si le projet est porté par une association, créez les comptes au nom de l'association. Sur Google Play, un compte d'organisation évite la phase de test obligatoire décrite plus bas. Chez Apple, les associations à but non lucratif peuvent demander une exonération des frais annuels.
- **Adresse de contact** : à ajouter dans `confidentialite.html` et dans les fiches des stores.
- **Envoi des propositions** : à configurer dans `js/config.js`.

## 1. Mettre à jour les applications après une modification

```bash
npm install
```

```bash
npm run sync
```

`npm run sync` copie le site dans `www/` puis dans les projets Android et iOS.

## 2. Android (Google Play)

**Ce qu'il faut :** un compte Google Play Console (frais d'inscription uniques, 25 $ à ce jour), et Android Studio sur n'importe quel ordinateur (Windows, Mac ou Linux).

1. **Tester sur un téléphone** : chaque envoi sur GitHub construit automatiquement un fichier `.apk` (onglet **Actions** du dépôt → dernière exécution → `biblio-vss-debug-apk`). Installez-le sur un téléphone Android pour essayer.
2. **Créer la version à publier** : ouvrez le projet avec `npm run android`, puis dans Android Studio : **Build → Generate Signed App Bundle** → créez une **clé de signature**.
   ⚠️ Gardez précieusement cette clé et son mot de passe (plusieurs copies sauvegardées) : sans elle, impossible de mettre à jour l'application.
3. **Dans la Play Console** : créez l'application, remplissez la fiche (description, captures d'écran, icône 512×512 déjà dans `icons/icon-512.png`), puis :
   - **Politique de confidentialité** : l'adresse en ligne de `confidentialite.html`
   - **Sécurité des données** : aucune donnée collectée ; si le formulaire de proposition est activé, déclarez « contenu fourni par l'utilisateur, facultatif, non partagé »
   - **Classification du contenu** : répondez honnêtement au questionnaire (le thème des violences sexuelles est abordé en texte, sans images)
4. **Compte personnel récent** : Google impose un **test fermé avec au moins 12 testeurs pendant 14 jours** avant de pouvoir publier. Ce n'est pas exigé pour un compte d'organisation.

## 3. iPhone (App Store)

**Ce qu'il faut :** un **Mac avec Xcode** (Apple ne permet pas de construire une application iOS autrement), et un compte Apple Developer Program (99 $ par an à ce jour, exonération possible pour les associations).
Sans Mac, des services en ligne comme Codemagic ou Ionic Appflow peuvent construire l'application iOS pour vous.

1. Sur le Mac : `npm install`, puis `npm run ios` pour ouvrir le projet dans Xcode.
2. Dans Xcode : choisissez votre équipe (**Signing & Capabilities**), puis **Product → Archive → Distribute App**.
3. Dans App Store Connect : fiche de l'application, captures d'écran, lien vers la politique de confidentialité, questionnaire de confidentialité (« aucune donnée collectée », sauf formulaire), questionnaire d'âge.

**Risque de refus à connaître :** Apple refuse parfois les applications qui ne sont « qu'un site web emballé » (règle 4.2). Pour mettre toutes les chances de votre côté, mettez en avant dans la description ce que l'application apporte : fonctionnement hors-ligne, sortie rapide, favoris privés, numéros d'aide en un appui. Si Apple refuse, on pourra ajouter des fonctions propres au téléphone (partage, rappels…).

## 4. Particularités de l'application native

- **Sortie rapide** : sur Android, l'application se ferme. Sur iPhone (où une application n'a pas le droit de se fermer seule), elle affiche une page de notes vierge.
- Les liens externes, les numéros d'appel et les SMS s'ouvrent dans les applications du téléphone.
- Pas besoin du mode hors-ligne du site : tous les fichiers sont déjà dans l'application. En revanche, **ajouter une ressource demande de publier une nouvelle version** de l'application. (Si cela devient trop contraignant, on pourra faire charger la liste depuis Internet.)
