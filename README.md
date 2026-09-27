# JS Dottignies – Bar U14 – Version Firebase

Cette version utilise **Firebase Realtime Database** au lieu de Supabase.

## Créneaux configurés

- 09h00 → 12h00 : 3 personnes
- 12h00 → 15h00 : 4 personnes
- 15h00 → 18h00 : 3 personnes
- 18h00 → fin : 3 personnes

Le quota est vérifié avec une transaction Firebase :
même si deux parents cliquent presque exactement en même temps,
le créneau ne peut pas dépasser son nombre maximum.

---

# 1. Créer le projet Firebase

Allez sur :

https://console.firebase.google.com

Puis :

1. Ajouter un projet
2. Donnez-lui par exemple le nom `jsdottignies-bar`
3. Google Analytics n'est pas nécessaire pour cette application.

---

# 2. Créer une application Web

Dans Firebase :

Project overview > Ajouter une application > Web `</>`

Donnez-lui un nom, par exemple :

`Bar JS Dottignies`

Firebase vous donnera un bloc semblable à :

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Copiez ces valeurs dans le fichier :

`config.js`

---

# 3. Activer Realtime Database

Dans Firebase :

Build > Realtime Database

Cliquez sur :

Create Database

Pour la région, choisissez de préférence une région européenne si proposée.

---

# 4. Installer les règles

Dans :

Realtime Database > Rules

Remplacez les règles existantes par le contenu du fichier :

`database.rules.json`

Puis cliquez sur :

Publish

---

# 5. Code administrateur

Le code est actuellement :

`2502`

Vous pouvez le changer dans :

`config.js`

IMPORTANT :
le PIN est pratique pour une petite utilisation interne,
mais il ne constitue pas une authentification sécurisée côté serveur.

---

# 6. Mise en ligne sur GitHub Pages

1. Créez un dépôt GitHub.
2. Déposez à la racine :
   - index.html
   - style.css
   - app.js
   - config.js
   - manifest.json
3. Ouvrez :
   Settings > Pages
4. Choisissez :
   Deploy from a branch
5. Branche :
   main
6. Dossier :
   /root

GitHub vous donnera ensuite une adresse publique.

---

# 7. Fonctionnement

Les parents voient les inscriptions en temps réel.

Lorsqu'un parent clique sur « Je m'inscris » :

- il encode son prénom ;
- son nom ;
- éventuellement le prénom du joueur ;
- Firebase vérifie le quota ;
- si une place reste disponible, l'inscription est enregistrée ;
- sinon l'inscription est refusée.

L'espace responsable permet de supprimer une inscription.
