<p align="center"><img src="images/banniere.png" alt="L'Ange du Chaos — système Foundry VTT" width="100%"></p>

# L'Ange du Chaos — système Foundry VTT

Système de jeu non officiel pour **Foundry VTT** (v13, vérifié sur v14.369) qui adapte **L'Ange du Chaos**, le jeu de rôle des éditions **Les XII Singes**, d'après la saga de romans de **Michel Robert**.
Développé avec l'autorisation des éditions Les XII Singes.

> **Ce dépôt ne contient que du code.** Ni les illustrations, ni les polices, ni les textes du livre n'y figurent. Il faut posséder le livre de base ; les éléments graphiques et le contenu du livre se branchent à part (voir « Contenu et illustrations »).

## Le jeu en quelques lignes

Dans le monde des Plans, vous incarnez des **agents du Chaos** : des maraudeurs-fantômes envoyés en mission d'un plan d'existence à l'autre, au service d'un pouvoir qui ne dit pas toujours la vérité. L'ambiance est celle d'une dark fantasy d'intrigue, d'épées, de magie et de trahisons.

- **Un personnage** se définit par six caractéristiques (Réflexes, Constitution, Puissance, Charme, Intelligence, Volonté) et 36 compétences, par sa **Maison** d'origine, sa **Voie** de formation, ses Talents, sa Fortune et sa Malédiction.
- **Un test** se joue avec le **dé du Destin** (un d10 qui peut exploser vers le haut comme vers le bas), le score de la compétence, et un niveau de difficulté. Selon l'écart, on obtient une réussite simple, majeure ou critique, ou un échec, voire une catastrophe.
- **Inspiration et Handicap** : un dé de plus, on garde le meilleur ; ou le pire.
- **Nexus et Hors-Destin** : des réserves de points qui permettent de forcer le sort, d'annuler un état, de sauver sa peau.
- **Un combat** où l'on attaque contre une défense passive, où l'on réagit en payant de son Endurance, et où les blessures se paient (états préjudiciables, dernier soupir, portes de Dame Mort).
- **La magie** passe par le mana, les arts étranges et huit académies de sorcellerie.
- **La progression** se fait au Mérite : Maraudeur-Fantôme, Capitaine-Maraudeur, puis Ombre du Chaos.

Pour les règles complètes, le livre de base fait foi.

## Ce que fait le système dans Foundry

| Domaine | Ce qui est automatisé |
|---|---|
| **Fiche de personnage** | Une fiche à onglets à l'image de la fiche imprimée : profil, combat, équipement, magie, biographie. Calcul de l'Endurance, du seuil de fatigue, de l'initiative, de la défense, du mouvement, du mana. Compétences à cases, sections repliables, popup de description au clic sur le nom d'une compétence. |
| **Création** | Un assistant en une seule fenêtre : Maison, formation, Voie, Fortune, Malédiction, académie de magie, équipement de départ. |
| **Jets** | Fenêtre de test avec ND, bonus, Inspiration / Handicap, Nexus ; cartes de chat ; relance au Nexus ; dés 3D avec *Dice So Nice* si le module est installé. |
| **Combat** | Attaque contre la cible désignée, localisation, réactions (esquive, parade), dégâts moins protection, Endurance, états automatiques (Épuisé, Aux portes de Dame Mort…), dernier soupir, hémorragie, initiative. |
| **États préjudiciables** | Effets appliqués aux jets ; rappel dans le chat au début du tour ; bouton « se défaire » avec le bon test ; levée au repos. |
| **Magie** | Mana, coût réduit par l'académie, test d'Arts étranges, échec et catastrophe, huit académies et leurs avantages. |
| **Talents, Fortunes, Malédictions** | Leurs bonus chiffrés sont appliqués automatiquement, y compris selon le grade. |
| **Drogues** | Test de Résilience, effets positifs et négatifs sur les jets, dépendance, manque, sevrage. |
| **Nexus, Hors-Destin, repos** | Dépense, repos de huit heures avec conditions, début de session. |
| **PNJ et créatures** | Fiches compactes dans le même style, avec attaque et compétences. |

Les fonctions sont détaillées, version par version, dans [`ETAT.md`](ETAT.md), avec la liste de ce qui reste à faire.

## Installation

Dans Foundry : **Systèmes → Installer un système**, puis coller l'adresse du manifeste :

```
https://github.com/magisterphamtom/ange-du-chaos/releases/latest/download/system.json
```

Créez ensuite un monde avec le système « L'Ange du Chaos ». Après une mise à jour, rechargez avec Ctrl + Maj + R.

À la main : décompresser le zip de la release dans `Data/systems/ange-du-chaos/`.

## Contenu et illustrations

Le système fonctionne sans le contenu du livre, mais il est bien plus agréable avec. Il lit, dans le dossier `assets/` du système :

- `assets/contenu/` : les armes, armures, sorts, drogues, Talents, Fortunes, bestiaire… du livre, que le MJ importe d'un clic (« Recréer le contenu du livre ») ;
- `assets/wiki/` : le livre sous forme de journaux ;
- `assets/fonts/`, `assets/fiche/`, `assets/onglets/`… : polices et illustrations de la fiche.

Ce « pack d'assets » est **personnel et privé** : il contient des textes et des images protégés, et n'est donc pas distribué ici. Sans lui, le système reste jouable (fiches, jets, combat), mais sans les polices, les ornements et les illustrations du livre : l'apparence est alors plus sobre et certaines images manquent.

## Vérifications hors Foundry

Les calculs du jeu sont des fonctions pures testables avec Node.js (aucune dépendance) :

```
node tools/test-calc.mjs
node tools/bench.mjs
```

Les autres bancs d'essai (`tools/test-*.mjs`) couvrent les jets, le combat, les effets, les académies, les sorts, les drogues et les états.

> Aucun de ces tests ne remplace un essai dans Foundry : la liste des vérifications à faire en jeu est dans `ETAT.md`.

## Remerciements et droits

- *L'Ange du Chaos*, le jeu de rôle, est une création des éditions **Les XII Singes**, tirée de l'univers de **Michel Robert**. Tous les droits sur le jeu, son texte et ses illustrations leur appartiennent.
- Ce système est une adaptation de fan, réalisée avec l'accord de l'éditeur. Il n'est ni vendu ni distribué avec le contenu du livre.
- Code : magisterphamtom, avec l'assistance de Claude (Anthropic).

Un problème ou une idée ? Ouvrez une [issue](https://github.com/magisterphamtom/ange-du-chaos/issues).
