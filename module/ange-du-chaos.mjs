/**
 * L'Ange du Chaos — système Foundry VTT (v13/v14).
 * Point d'entrée unique : enregistrements au hook « init ».
 * Les modules importés (datamodels, sheets…) ne figurent PAS dans `esmodules`.
 */

import { initialiserEtats } from "./etats.mjs";
import { SYSTEM_ID, ETATS, adversaireDe } from "./config.mjs";
import { ACTOR_MODELS, ITEM_MODELS } from "./datamodels.mjs";
import { PersonnageSheet, PnjSheet, CreatureSheet } from "./sheets/actor-sheets.mjs";
import { ObjetSheet } from "./sheets/item-sheet.mjs";
import { enregistrerReglagesWiki, initialiserWiki } from "./wiki.mjs";
import { initialiserDestin } from "./destin.mjs";
import { initialiserCombat } from "./attaque.mjs";
import { initialiserCreation } from "./creation.mjs";
import { enregistrerReglagesContenu, initialiserContenu } from "./contenu.mjs";

import { iconeObjet } from "./icones.mjs";

Hooks.once("init", () => {
  console.log(`${SYSTEM_ID} | Initialisation du système L'Ange du Chaos`);

  // --- DataModels --------------------------------------------------------
  for (const [type, model] of Object.entries(ACTOR_MODELS)) CONFIG.Actor.dataModels[type] = model;
  for (const [type, model] of Object.entries(ITEM_MODELS)) CONFIG.Item.dataModels[type] = model;

  // --- Jauges de jeton ---------------------------------------------------
  CONFIG.Actor.trackableAttributes = {
    personnage: { bar: ["endurance", "mana", "nexus", "horsDestin"], value: [] },
    pnj: { bar: ["endurance"], value: [] },
    creature: { bar: ["endurance"], value: [] }
  };

  // --- États préjudiciables (icônes de jeton) -----------------------------
  CONFIG.statusEffects = ETATS.map(e => ({ id: e.id, name: e.name, img: e.img }));

  // --- Jeton et portrait officiels : un adversaire ou PNJ connu reçoit son illustration -----
  Hooks.on("preCreateActor", (actor, data) => {
    if (!["pnj", "creature"].includes(actor.type)) return;
    const a = adversaireDe(data.name ?? actor.name);
    if (!a) return;
    const defaut = !data.img || data.img === "icons/svg/mystery-man.svg";
    const maj = { "prototypeToken.texture.src": a.jeton, "prototypeToken.name": data.name ?? actor.name };
    if (defaut) maj.img = a.illustration;
    actor.updateSource(maj);
  });

  // --- Icône par défaut d'un objet créé à la main ou glissé depuis un compendium vide -----
  Hooks.on("preCreateItem", (item, data) => {
    if (data.img && !/^icons\/svg\//.test(data.img)) return;
    item.updateSource({ img: iconeObjet(item.type, data.system ?? {}, data.name ?? item.name) });
  });

  // --- Fiches --------------------------------------------------------------
  const { DocumentSheetConfig } = foundry.applications.apps;
  const Actor = CONFIG.Actor.documentClass;
  const Item = CONFIG.Item.documentClass;

  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, PersonnageSheet, {
    types: ["personnage"], makeDefault: true, label: "Fiche de personnage"
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, PnjSheet, {
    types: ["pnj"], makeDefault: true, label: "Fiche de PNJ"
  });
  DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, CreatureSheet, {
    types: ["creature"], makeDefault: true, label: "Fiche de créature"
  });
  DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, ObjetSheet, {
    makeDefault: true, label: "Fiche d'objet"
  });

  // --- Partiel de section d'objets (listes avec glisser-déposer) -------------
  foundry.applications.handlebars.loadTemplates({
    "adc-section": `systems/${SYSTEM_ID}/templates/partials/section.hbs`
  });

  // --- Wiki du livre de base (journaux créés à l'ouverture du monde) ---------
  enregistrerReglagesWiki();
  initialiserWiki();

  // --- Nexus, Hors-Destin, repos, relance de test -----------------------------
  initialiserDestin();

  // --- Combat : attaque, réactions, dégâts, états, initiative -----------------
  initialiserCombat();
  initialiserEtats();

  // --- Contenu du livre (objets, sorts, bestiaire) créé à l'ouverture du monde ---
  enregistrerReglagesContenu();
  initialiserContenu();

  // --- Assistant de création de personnage ---------------------------------
  initialiserCreation();

  // --- Helpers Handlebars ----------------------------------------------------
  Handlebars.registerHelper("adcEq", (a, b) => a === b);
  Handlebars.registerHelper("adcGt", (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper("adcSigne", n => (Number(n) > 0 ? `+${n}` : `${n}`));
});
