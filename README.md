# PlanifProf

Planificateur numérique flexible et modulaire pour enseignants — application web (aucune installation), pensée pour remplacer l'agenda papier.

## Fonctionnalités incluses

- **Horaire flexible** : configuration selon jours de semaine (lundi-vendredi) ou cycle de plusieurs jours (ex. cycle de 9 jours), avec un nombre de périodes personnalisable par jour.
- **Calendrier réel** : vue semaine par dates, interaction tactile — on touche une case et une fenêtre contextuelle permet d'ajouter un événement ou une note.
- **Système de couleurs** pour catégoriser matières et groupes.
- **Widget météo** (via l'API gratuite Open-Meteo), utile pour planifier des activités extérieures.
- **Import de photo avec reconnaissance de texte (OCR)** pour transférer le contenu d'un horaire papier — semi-automatique : le texte reconnu est affiché pour vérification avant utilisation.
- **Gestion des groupes et élèves**, avec module d'évaluation (notes par évaluation).
- **Générateur d'équipes équilibrées** (niveau des élèves + mixité filles/garçons).
- **Pigeage aléatoire** d'élèves.
- **Banque de ressources personnelles**, réutilisable d'une année à l'autre, avec recherche par étiquette.
- **Export/impression** : impression de l'horaire, export du calendrier au format `.ics` (compatible Google Calendar, Outlook/Teams, Apple Calendar), export/import d'une sauvegarde JSON complète.
- **Modèle freemium (démo)** : bascule Gratuit / Pro dans l'onglet Compte, illustrant le modèle d'abonnement envisagé.

## Limites actuelles (nécessitent un vrai backend, hors de portée d'une page statique)

- **Synchronisation multi-appareils automatique** : les données sont stockées localement dans le navigateur. En attendant un vrai compte cloud, utilisez l'export/import JSON (onglet Compte) pour transférer vos données d'un appareil à l'autre.
- **Synchronisation bidirectionnelle avec Google Calendar / Microsoft Teams** : nécessite une authentification OAuth et un serveur. En attendant, l'export `.ics` permet une importation à sens unique dans ces calendriers.
- **Paiement réel pour l'abonnement Pro** : le bouton Pro dans l'onglet Compte est une démonstration (aucun paiement n'est traité).

## Utilisation

Ouvrir `index.html` dans un navigateur, ou héberger le dossier tel quel (ex. GitHub Pages). Aucune étape de build requise.
