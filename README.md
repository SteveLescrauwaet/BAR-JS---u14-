# JS Dottignies – Organisation du bar, toutes équipes

Déployez tous les fichiers à la racine du dépôt GitHub Pages, en conservant config.js (Firebase déjà configuré).

## Utilisation

La page d’accueil propose les 21 équipes du club et une entrée distincte « U14 – ancien planning (17/10/2026) ». Cette dernière utilise **exactement** le chemin Firebase historique `barEvents/u14-2026-10-17` pour conserver les inscriptions et disponibilités existantes. Les 21 nouvelles équipes utilisent `barEvents/team-<identifiant>` et ne partagent aucune inscription.

À la première visite d'une équipe, son planning affiche « Date à définir ». Cliquez sur « Accès responsable », saisissez le PIN existant, puis configurez la date. Les 4 créneaux et leurs quotas restent identiques à la version d'origine. Modifier la date conserve les inscriptions : le responsable doit supprimer les anciennes inscriptions s'il réutilise le planning pour un autre jour.

## Firebase

**Important :** publier le nouveau fichier `database.rules.json` dans Firebase > Realtime Database > Rules. Les règles originales autorisaient déjà les inscriptions publiques et ne sécurisaient pas les suppressions côté serveur. Le PIN affiché dans config.js n'est pas une authentification Firebase. La présente version conserve ce fonctionnement : ne considérez pas l'accès responsable comme sécurisé. Pour une mise en production durable, utiliser Firebase Authentication + règles de sécurité serveur et un identifiant d'événement par date afin d'archiver les anciennes permanences.

Après déploiement, vérifier sur téléphone et ordinateur : choix équipe, date, inscription, renfort, suppression en admin, retour accueil et conservation des inscriptions U14 historiques.
