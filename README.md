# PlanifProf

Planificateur numérique flexible et modulaire pour enseignants — application web (aucune installation), pensée pour remplacer l'agenda papier.

## Fonctionnalités incluses

- **Horaire flexible** : configuration selon jours de semaine (lundi-vendredi) ou cycle de plusieurs jours (ex. cycle de 9 jours), avec un nombre de périodes personnalisable par jour.
- **Calendrier réel** : vue semaine par dates, interaction tactile — on touche une case et une fenêtre contextuelle permet d'ajouter un événement ou une note.
- **Système de couleurs** pour catégoriser matières et groupes.
- **Widget météo** (via l'API gratuite Open-Meteo), utile pour planifier des activités extérieures.
- **Import de photo avec reconnaissance de texte (OCR)** pour transférer le contenu d'un horaire papier — semi-automatique : le texte reconnu est affiché pour vérification avant utilisation.
- **Compte enseignant et synchronisation cloud (Firebase)** : chaque enseignant crée son propre compte (courriel/mot de passe ou Google) ; toutes ses données sont stockées dans Firestore, isolées des autres enseignants, et synchronisées automatiquement entre tous ses appareils.
- **Gestion des groupes et élèves**, avec module d'évaluation (notes par évaluation).
- **Générateur d'équipes équilibrées** (niveau des élèves + mixité filles/garçons).
- **Pigeage aléatoire** d'élèves.
- **Banque de ressources personnelles**, réutilisable d'une année à l'autre, avec recherche par étiquette.
- **Export/impression** : impression de l'horaire, export du calendrier au format `.ics` (compatible Google Calendar, Outlook/Teams, Apple Calendar), export/import d'une sauvegarde JSON complète.
- **Modèle freemium (démo)** : bascule Gratuit / Pro dans l'onglet Compte, illustrant le modèle d'abonnement envisagé.

## Limites actuelles

- **Sans compte** : les données restent seulement dans le navigateur local (utilisez l'export/import JSON dans l'onglet Compte pour transférer manuellement).
- **Synchronisation bidirectionnelle avec Google Calendar / Microsoft Teams** : nécessite une intégration OAuth propre à ces services, non incluse. En attendant, l'export `.ics` permet une importation à sens unique dans ces calendriers.
- **Paiement réel pour l'abonnement Pro** : le bouton Pro dans l'onglet Compte est une démonstration (aucun paiement n'est traité).

## Configuration Firebase (compte et synchronisation)

Ce projet utilise Firebase Authentication (courriel/mot de passe + Google) et Firestore, chargés via CDN (aucune installation npm requise). La configuration se trouve dans `js/firebase-config.js`. Dans la console Firebase du projet :

1. **Authentication** → Sign-in method → activer *Adresse e-mail/Mot de passe* (et *Google* en option).
2. **Firestore Database** → créer une base en mode production.
3. **Règles Firestore** à publier :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Chaque enseignant connecté a ses données stockées dans `users/{son-identifiant}`, invisibles aux autres comptes.

## Utilisation

Ouvrir `index.html` dans un navigateur, ou héberger le dossier tel quel (ex. GitHub Pages). Aucune étape de build requise.
