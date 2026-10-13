# JS Dottignies — Bar multi-équipes (Supabase)

## 1. Préparer Supabase
Dans https://supabase.com/dashboard > projet `twsutaticsyjfrbhfgsz` > SQL Editor > New query :
- Ouvrir `supabase_setup.sql` et **remplacer** `CHANGEZ_CE_MOT_DE_PASSE_AVANT_EXECUTION` par un mot de passe responsable **long et unique** (au moins 16 caractères). Ne pas publier ce fichier modifié sur GitHub.
- Exécuter le script dans SQL Editor. Les tables, fonctions et autorisations seront créées.
- Ce mot de passe remplace l'ancien code PIN Firebase, qui n'était pas sécurisé côté serveur.

## 2. Déployer sur GitHub Pages
Sur le dépôt GitHub de l'application, remplacer les fichiers du site par : `index.html`, `app.js`, `config.js`, `style.css`, `manifest.json`, `logo-js-dottignies.png`, `basket-arena-bg.png`. Conserver `supabase_setup.sql` hors des fichiers publiés après avoir défini le vrai mot de passe.
La connexion à Supabase est déjà renseignée dans `config.js` : URL du projet et **clé publique** publishable uniquement.

## 3. Fonctionnement
À l'accueil, choisir parmi les 21 équipes. Dans « Accès responsable », entrer le nouveau mot de passe configuré dans SQL, puis enregistrer la date. Les parents peuvent s'inscrire sur 4 créneaux (4,4,3,3 places) ou proposer un renfort. Les quotas sont garantis par une opération SQL atomique, même en cas d'inscriptions simultanées. Actualisation automatique toutes les 12 secondes.

## 4. Migration des anciennes données Firebase
**Attention : la nouvelle base Supabase démarre vide.** Les inscriptions de Firebase ne sont pas automatiquement copiées. L'accès ancien U14 reste disponible dans l'ancien site Firebase si celui-ci est encore actif. Pour importer les données précédentes, il faut un export JSON de la Realtime Database Firebase ; ne pas effacer l'ancienne base avant cet export.

## 5. Sécurité
Les écritures passent par des fonctions serveur et les tables ne sont pas lisibles directement via REST. Le mot de passe responsable est vérifié côté SQL (empreinte bcrypt). Les listes nominatives des inscriptions sont publiques pour les utilisateurs de l'application, conformément à son usage. Il n'y a pas de compte parent ; prévoir CAPTCHA / anti-abus ou authentification si l'app est exposée largement. Ne jamais mettre une clé `service_role` ou `sb_secret_` dans `config.js`.
