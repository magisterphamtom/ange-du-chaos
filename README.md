<p align="center"><img src="images/banniere.png" alt="L'Ange du Chaos — système Foundry VTT" width="100%"></p>

# L'Ange du Chaos — système Foundry VTT

Système de jeu pour **Foundry VTT v14** adapté de *L'Ange du Chaos*, le jeu de rôle des éditions **Les XII Singes** (d'après les romans de Michel Robert). Développé avec l'autorisation de l'éditeur.

> **État : version de travail (0.10.0).** Le code est écrit et vérifié par des bancs d'essai, mais il n'a pas encore été éprouvé en partie dans Foundry. Voir [`ETAT.md`](ETAT.md) pour le détail et la liste des tests à faire.

## Ce que le système fait

- **Fiches** de personnage (onglets illustrés), de PNJ et de créature, glisser-déposer des objets, jauges d'Endurance, de Nexus, de Mana et de Hors-Destin.
- **Jets** avec le dé du Destin (d10 explosif), Inspiration et Handicap, degrés de réussite, cartes de chat où le résultat s'affiche d'abord et le calcul se déplie d'un clic.
- **Nexus et Hors-Destin** : relance, Inspiration, dégâts réduits, les six usages du Hors-Destin, repos de 8 h, nouvelle séance.
- **Combat automatisé** : attaque contre la Défense passive, réactions (Esquive, Parade), dégâts moins Protection, Seuil de fatigue, Portes de Dame Mort et Dernier soupir, initiative dans le Combat Tracker, états préjudiciables appliqués aux jetons.
- **Assistant de création** en 9 étapes (Maison ou Loki, formation et Voie, points libres, Fortune et Malédiction, Art martial, Mérite, traits secondaires), relançable depuis la fiche.
- **Contenu du livre** (avec le pack d'assets personnel) : armes, armures, sorts, drogues, Arts martiaux, Fortunes, Malédictions, Maisons, Voies, Talents et bestiaire, créés à l'ouverture du monde ; wiki du livre en journaux Joueurs et Meneur de jeu.

## Installation

1. Télécharger ce dépôt (bouton **Code → Download ZIP**) et décompresser le dossier dans `Data/systems/`, de façon à obtenir `Data/systems/ange-du-chaos/system.json`.
2. Relancer Foundry, créer un monde avec le système « L'Ange du Chaos ».

Pas encore de release ni de lien d'installation automatique : ils viendront quand le système aura été testé en jeu.

## Illustrations et textes du livre

Ce dépôt ne contient **que le moteur de jeu**. Les illustrations officielles, le wiki et les textes du livre ne sont pas diffusés ici : ils viennent d'un pack d'assets personnel (dossier `assets/`) fabriqué à partir de ton exemplaire du livre. Sans ce pack, le système fonctionne (fiches, jets, combat, création), mais sans illustrations, sans wiki et sans contenu pré-rempli ; l'assistant de création a alors besoin du contenu pour proposer Talents, Fortunes, Arts martiaux et sorts.

## Vérifications hors Foundry

```
node tools/test-calc.mjs        # caractéristiques, compétences, traits dérivés
node tools/test-jets.mjs        # moteur de jets
node tools/test-destin.mjs      # Nexus, Hors-Destin, repos
node tools/test-combat.mjs      # règles de combat
node tools/test-attaque.mjs     # attaque, réactions, dégâts, états
node tools/test-creation.mjs    # assistant de création
```

Les bancs `test-wiki` et `test-contenu` demandent le pack d'assets personnel.

## Auteur et mentions

Système non officiel, réalisé par **magisterphamtom**. *L'Ange du Chaos* est une œuvre des éditions **Les XII Singes** et de **Michel Robert** : tous les droits sur le jeu, son univers, ses textes et ses illustrations leur appartiennent.
