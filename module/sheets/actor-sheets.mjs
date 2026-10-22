/**
 * Fiches d'acteurs (ApplicationV2). PersonnageSheet : fiche à onglets complète.
 * PnjSheet / CreatureSheet : fiche compacte (profil type d'adversaire).
 */

import { ouvrirAssistant } from "../creation.mjs";
import {
  SYSTEM_ID, CARACS, COMPETENCES, MAISONS, VOIES, ETATS, CATEGORIES_ADVERSAIRE, NIVEAUX_SORT, ASSETS, RUNES, runeDe, artDe, adversaireDe
} from "../config.mjs";

import { appliquerOnglet } from "./onglets.mjs";
import { lancerTest } from "../rolls.mjs";
import { depenserNexus, depenserHorsDestin, reposer } from "../destin.mjs";
import { attaquer } from "../attaque.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const TPL = (nom) => `systems/${SYSTEM_ID}/templates/actor/${nom}.hbs`;

/** Types d'objets autorisés par type d'acteur. */
const OBJETS_AUTORISES = {
  personnage: null, // tous
  pnj: ["arme", "armure", "bouclier", "equipement", "sort", "talent", "artmartial", "drogue"],
  creature: ["arme", "sort", "talent", "equipement"]
};

/** Types d'objets dont on ne peut posséder qu'un exemplaire (le nouveau remplace l'ancien). */
const OBJETS_UNIQUES = ["maison", "voie"];

function enrichir(html, acteur) {
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", {
    secrets: acteur.isOwner, relativeTo: acteur
  });
}

/** Socle commun : glisser-déposer d'objets, actions de liste, onglets robustes. */
class BaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "actor"],
    position: { width: 880, height: 780 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      openItem: BaseActorSheet.#openItem,
      deleteItem: BaseActorSheet.#deleteItem,
      toggleEquip: BaseActorSheet.#toggleEquip,
      toggleEtat: BaseActorSheet.#toggleEtat,
      adcOnglet: BaseActorSheet.#changerOnglet,
      jet: BaseActorSheet.#jet,
      attaquer: BaseActorSheet.#attaquer,
      addCompetence: BaseActorSheet.#addCompetence,
      removeCompetence: BaseActorSheet.#removeCompetence
    }
  };

  /** Titre explicite (évite l'affichage « TYPES.Actor.xxx: nom »). */
  get title() {
    return this.actor.name;
  }

  /** Onglets de la fiche (vide pour une fiche sans onglets). Redéfini par les fiches à onglets. */
  static ONGLETS = [];

  /** Le partiel de section doit exister avant le premier rendu. */
  async _preFirstRender(context, options) {
    await super._preFirstRender?.(context, options);
    await foundry.applications.handlebars.loadTemplates({
      "adc-section": `systems/${SYSTEM_ID}/templates/partials/section.hbs`,
      "adc-ligne-f": `systems/${SYSTEM_ID}/templates/partials/ligne-fiche.hbs`
    });
  }

  /** Onglet actuellement affiché (mémorisé entre deux rendus). */
  _ongletActif = null;

  _listeOnglets() {
    const actif = this._ongletActif ?? this.constructor.ONGLETS[0]?.id;
    return this.constructor.ONGLETS.map(o => ({
      ...o, actif: o.id === actif, court: o.court ?? o.label, icone: `${ASSETS}/onglets/${o.id}.webp`
    }));
  }

  _afficherOnglet() {
    const ids = this.constructor.ONGLETS.map(o => o.id);
    if (!ids.length) return;
    const demande = this._ongletActif;
    const actif = ids.includes(demande) ? demande : ids[0];
    this._ongletActif = actif;
    appliquerOnglet(this.element, actif);
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._afficherOnglet();
  }

  /** Clic sur un score : fenêtre de jet (Maj + clic : jet direct, sans fenêtre). */
  static async #jet(event, target) {
    const { type, cle } = target.dataset;
    await lancerTest(this.actor, type, cle, { rapide: event.shiftKey });
  }

  /** Bouton d'attaque d'une arme (ligne de la liste) ou attaque type d'un PNJ. */
  static async #attaquer(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    await attaquer(this.actor, id ? this.actor.items.get(id) : null);
  }

  static async #changerOnglet(event, target) {
    this._ongletActif = target.dataset.tab;
    this._afficherOnglet();
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system;
    context.champs = this.actor.system.schema.fields;
    context.source = this.actor.system.toObject?.() ?? this.actor.system;
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.onglets = this._listeOnglets();
    context.sections = this._sectionsObjets();
    context.etats = ETATS.map(e => ({ ...e, actif: this.actor.statuses?.has(e.id) ?? false }));
    return context;
  }

  /** Sections d'objets prêtes à afficher (une ligne par objet). */
  _sectionsObjets() {
    const items = this.actor.items.contents.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const ligne = (it, resume, equipable = false, rune = null) => ({
      id: it.id, img: it.img, name: it.name, resume,
      rune: rune ? `${ASSETS}/runes/${rune}.webp` : null,
      equipable, equipee: equipable ? !!it.system.equipee : false, attaquable: it.type === "arme"
    });
    const de = (type) => items.filter(i => i.type === type);
    const s = (cle, titre, type, lignes, extra = {}) => ({ cle, titre, type, lignes, vide: !lignes.length, ...extra });

    return {
      armes: s("armes", "Armes", "arme", de("arme").map(i =>
        ligne(i, `${i.system.degats} · ${i.system.typeDegats}${i.system.capacites ? " · " + i.system.capacites : ""}`, true))),
      armures: s("armures", "Armures", "armure", de("armure").map(i =>
        ligne(i, `PR ${i.system.protection} · ENC ${i.system.encombrement} · ${i.system.localisation}`, true))),
      boucliers: s("boucliers", "Boucliers", "bouclier", de("bouclier").map(i =>
        ligne(i, `Défense +${i.system.bonusDefense} · Rés. ${i.system.resistance}`, true))),
      equipement: s("equipement", "Équipement", "equipement", de("equipement").map(i =>
        ligne(i, `× ${i.system.quantite}`))),
      drogues: s("drogues", "Drogues", "drogue", de("drogue").map(i => ligne(i, i.system.toxicite || ""))),
      sorts: s("sorts", "Sorts", "sort", de("sort")
        .sort((a, b) => Object.keys(NIVEAUX_SORT).indexOf(a.system.niveau) - Object.keys(NIVEAUX_SORT).indexOf(b.system.niveau))
        .map(i => ligne(i, `${NIVEAUX_SORT[i.system.niveau]} · ${i.system.source} · ${i.system.mana} PM · ND ${i.system.difficulte}`, false, runeDe(i.system.source)))),
      artsMartiaux: s("artsMartiaux", "Arts martiaux", "artmartial", de("artmartial").map(i =>
        ligne(i, i.system.coupSpecial?.nom || ""))),
      talents: s("talents", "Talents", "talent", de("talent").map(i => ligne(i, i.system.origine || ""))),
      fortunes: s("fortunes", "Fortune", "fortune", de("fortune").map(i => ligne(i, ""))),
      maledictions: s("maledictions", "Malédiction", "malediction", de("malediction").map(i => ligne(i, ""))),
      maisons: s("maisons", "Maison du Chaos", "maison", de("maison").map(i => ligne(i, ""))),
      voies: s("voies", "Voie de formation", "voie", de("voie").map(i => ligne(i, "")))
    };
  }

  /* ----------------------------- Glisser-déposer ---------------------------- */

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    const el = this.element;

    // Source : une ligne d'objet peut être glissée (vers un jeton, un autre acteur, une macro…).
    el.addEventListener("dragstart", (ev) => {
      const ligne = ev.target.closest?.("[data-item-id]");
      if (!ligne) return;
      const item = this.actor.items.get(ligne.dataset.itemId);
      if (!item) return;
      ev.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));
    });

    // Cible : dépôt d'un objet (monde, compendium, autre acteur).
    el.addEventListener("dragover", (ev) => ev.preventDefault());
    el.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      if (this._dropEnCours) return;
      this._dropEnCours = true;
      try {
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
        if (data?.type !== "Item") return;
        const item = await CONFIG.Item.documentClass.fromDropData(data);
        if (item) await this._onDropItem(ev, item);
      } catch (err) {
        console.error(`${SYSTEM_ID} | Dépôt impossible`, err);
        ui.notifications.error("Dépôt impossible : voir la console (F12).");
      } finally {
        this._dropEnCours = false;
      }
    }, true);
  }

  async _onDropItem(event, item) {
    if (!this.actor.isOwner || !item) return null;
    if (item.parent?.uuid === this.actor.uuid) return null; // simple réordonnancement

    const autorises = OBJETS_AUTORISES[this.actor.type];
    if (autorises && !autorises.includes(item.type)) {
      ui.notifications.warn(`Un(e) ${this.actor.type} ne peut pas recevoir un objet de type « ${item.type} ».`);
      return null;
    }

    // Maison / Voie : un seul exemplaire, et la fiche mémorise la clé choisie.
    if (OBJETS_UNIQUES.includes(item.type)) {
      const anciens = this.actor.items.filter(i => i.type === item.type).map(i => i.id);
      if (anciens.length) await this.actor.deleteEmbeddedDocuments("Item", anciens);
      if (this.actor.type === "personnage" && item.system.cle) {
        await this.actor.update({ [`system.${item.type}`]: item.system.cle });
      }
    }

    // Une Fortune / Malédiction remplace la précédente.
    if (["fortune", "malediction"].includes(item.type)) {
      const anciens = this.actor.items.filter(i => i.type === item.type).map(i => i.id);
      if (anciens.length) await this.actor.deleteEmbeddedDocuments("Item", anciens);
    }

    const [cree] = await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
    return cree;
  }

  /* ----------------------------- Actions ------------------------------------ */

  static #itemDe(sheet, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return sheet.actor.items.get(id);
  }

  static async #openItem(event, target) {
    BaseActorSheet.#itemDe(this, target)?.sheet.render(true);
  }

  static async #deleteItem(event, target) {
    const item = BaseActorSheet.#itemDe(this, target);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Supprimer l'objet" },
      content: `<p>Supprimer <strong>${foundry.utils.escapeHTML(item.name)}</strong> de la fiche ?</p>`
    });
    if (!ok) return;
    if (this.actor.type === "personnage" && OBJETS_UNIQUES.includes(item.type)) {
      await this.actor.update({ [`system.${item.type}`]: "" });
    }
    await item.delete();
  }

  static async #toggleEquip(event, target) {
    const item = BaseActorSheet.#itemDe(this, target);
    if (item) await item.update({ "system.equipee": !item.system.equipee });
  }

  static async #toggleEtat(event, target) {
    await this.actor.toggleStatusEffect(target.dataset.etat);
  }

  static async #addCompetence() {
    const liste = foundry.utils.deepClone(this.actor.system.toObject().competences ?? []);
    liste.push({ nom: "Nouvelle compétence", score: 10 });
    await this.actor.update({ "system.competences": liste });
  }

  static async #removeCompetence(event, target) {
    const idx = Number(target.dataset.index);
    const liste = foundry.utils.deepClone(this.actor.system.toObject().competences ?? []);
    liste.splice(idx, 1);
    await this.actor.update({ "system.competences": liste });
  }
}

/* -------------------------------------------------------------------------- */
/*  PERSONNAGE                                                                */
/* -------------------------------------------------------------------------- */

export class PersonnageSheet extends BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "actor", "personnage", "feuille"],
    actions: {
      setRang: function (event, target) { return PersonnageSheet.#setRang(this, target); },
      depenserNexus: function () { return depenserNexus(this.actor); },
      depenserHorsDestin: function () { return depenserHorsDestin(this.actor); },
      reposer: function () { return reposer(this.actor); },
      assistant: function () { return ouvrirAssistant(this.actor); }
    },
    position: { width: 880, height: 960 }
  };

  static PARTS = {
    corps: { template: TPL("personnage"), scrollable: [".adc-contenu"] }
  };

  static ONGLETS = [
    { id: "profil", label: "Profil" },
    { id: "combat", label: "Combat" },
    { id: "equipement", label: "Équipement" },
    { id: "magie", label: "Magie" },
    { id: "biographie", label: "Biographie" }
  ];

  /** Clic sur une case de rang : fixe le rang (re-clic sur le rang actuel : −1). */
  static async #setRang(sheet, target) {
    const { cle, rang } = target.dataset;
    if (!(cle in COMPETENCES)) return;
    const actuel = sheet.actor.system.competences[cle].rang;
    const n = Number(rang);
    await sheet.actor.update({ [`system.competences.${cle}.rang`]: actuel === n ? n - 1 : n });
  }

  /** Données propres à la fiche imprimée : traits, armure par zone, cartes d'Arts martiaux, de drogues et de sorts. */
  _contexteFiche() {
    const items = this.actor.items.contents.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const de = (t) => items.filter(i => i.type === t);
    const txt = (h, max = 0) => {
      const t = String(h ?? "").replace(/<\/(p|h\d|li|div)>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      return max && t.length > max ? t.slice(0, max - 1) + "…" : t;
    };
    const ligne = (it, extra = {}) => ({ id: it.id, img: it.img, name: it.name, ...extra });
    const secs = this._sectionsObjets();

    // Talent secret, Fortune, Malédiction (une ligne + « Effet »).
    const secret = de("talent").filter(t => !/^Voie/.test(t.system.origine ?? ""));
    const blocsTraits = [
      { type: "talent", titre: "Talent secret", lignes: secret.map(t => ligne(t, { effet: txt(t.system.description, 240) })) },
      { type: "fortune", titre: "Fortune", lignes: de("fortune").map(t => ligne(t, { effet: txt(t.system.description, 240) })) },
      { type: "malediction", titre: "Malédiction", lignes: de("malediction").map(t => ligne(t, { effet: txt(t.system.description, 240) })) }
    ];

    // États préjudiciables : effet résumé (fiche imprimée).
    const EFFET = {
      aveugle: "Tests physiques Handicapés", demoralise: "Inspiration impossible", epuise: "Handicap sur tests physiques",
      etourdi: "-1 Action / Tour", faceContreTerre: "-10 Défense passive + Handicap aux réactions", pisseLeSang: "-3 pts d'Endurance / Tour",
      surpris: "Pas de Réaction possible", trouilleBleue: "« 10 » bloqués", enManque: "Handicap selon la drogue", portesDameMort: "Endurance à 0 : mourant"
    };
    const etatsFiche = ETATS.map(e => ({ ...e, effet: EFFET[e.id] ?? "", actif: this.actor.statuses?.has(e.id) ?? false }));

    // Armes : tableau Type / Dégâts / Capacité.
    const armes = de("arme").map(i => ligne(i, { degats: i.system.degats, capacites: i.system.capacites, equipee: !!i.system.equipee }));

    // Armure par zone (armures portées).
    const zones = [["Tête", ["T", "Te"]], ["Torse", ["To"]], ["Bras droit", ["BD"]], ["Bras gauche", ["BG"]], ["Jambe droite", ["JD"]], ["Jambe gauche", ["JG"]]];
    const portees = de("armure").filter(a => a.system.equipee);
    const armureLoc = zones.map(([label, codes]) => {
      const sur = portees.filter(a => String(a.system.localisation ?? "").split(",").map(x => x.trim()).some(c => codes.includes(c)));
      const meilleure = sur.sort((a, b) => b.system.protection - a.system.protection)[0];
      return { label, nom: meilleure?.name ?? "", pr: meilleure ? meilleure.system.protection + (this.actor.system.derive?.effets?.protectionArmures ?? 0) + (this.actor.system.derive?.effets?.protectionNaturelle ?? 0) : "" };
    });

    // Arts martiaux (cartes), drogues et sorts.
    const arts = de("artmartial").map(i => ligne(i, {
      permNom: i.system.effetPermanent?.nom, permDesc: txt(i.system.effetPermanent?.description, 260),
      coupNom: i.system.coupSpecial?.nom, coupInfo: [i.system.coupSpecial?.actions, i.system.coupSpecial?.duree].filter(Boolean).join(" · "),
      coupDesc: txt(i.system.coupSpecial?.description, 260)
    }));
    const drogues = de("drogue").map(i => ligne(i, {
      toxicite: i.system.toxicite, addiction: i.system.addiction, dependance: i.system.dependance, origine: i.system.origine,
      rarete: i.system.rarete, prix: i.system.prix, inoculation: i.system.inoculation, effets: txt(i.system.effets, 220),
      duree: i.system.duree, manque: i.system.manque
    }));
    const sorts = de("sort")
      .sort((a, b) => Object.keys(NIVEAUX_SORT).indexOf(a.system.niveau) - Object.keys(NIVEAUX_SORT).indexOf(b.system.niveau))
      .map(i => ligne(i, {
        mana: i.system.mana, difficulte: i.system.difficulte || "var.", incantation: i.system.incantation,
        portee: i.system.portee, cible: i.system.cible, duree: i.system.duree, effet: txt(i.system.effet, 300)
      }));

    // Voie : talent de Voie en clair.
    const voie = de("voie")[0];
    const voieTalent = voie ? String(voie.system.talent ?? "").replace(/<h3>.*?<\/h3>/i, "") : "";

    // Académie magique (Sorcier : Eodh).
    const sorcier = this.actor.system.voie === "sorcier";
    const academie = sorcier
      ? { nom: "Eodh", avantage: "+1 rang en Beau-parleur", enseignees: "Éléments, Cycles, Ombres", interdites: "Sylve, Sang, Inanimé, Lumière" }
      : { nom: "", avantage: "", enseignees: "", interdites: "" };

    return {
      blocsTraits, etatsFiche, armes, armureLoc, arts, drogues, sorts, voieLigne: voie ? { name: voie.name } : null,
      voieTalent, academie, sections: secs
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const d = this.actor.system.derive ?? {};

    context.maisons = Object.fromEntries([["", "—"], ...Object.entries(MAISONS).map(([k, v]) => [k, v.label])]);
    context.voies = Object.fromEntries([["", "—"], ...Object.entries(VOIES).map(([k, v]) => [k, v.label])]);
    context.derive = d;
    context.assets = ASSETS;
    context.runes = Object.keys(RUNES).map(k => `${ASSETS}/runes/${k}.webp`);
    context.artVoie = artDe(this.actor.system.voie, this.actor.system.maison);

    // Caractéristiques et compétences (rangs en cases : 3 Novice, 3 Entraîné, 3 Expert, 1 Maître).
    const groupes = Object.entries(CARACS).map(([cle, c]) => {
      const dc = d.caracs?.[cle] ?? { base: 0, bonus: 0, valeur: 0, libelle: "" };
      return {
        cle, label: c.label, abbr: c.abbr,
        base: this.actor.system.caracs[cle].base,
        bonus: dc.bonus, valeur: dc.valeur, libelle: dc.libelle,
        competences: Object.entries(COMPETENCES)
          .filter(([, comp]) => comp.carac === cle)
          .map(([k, comp]) => {
            const dk = d.competences?.[k] ?? {};
            const base = this.actor.system.competences[k].rang;
            const bonus = dk.rangBonus ?? 0;
            return {
              cle: k, label: comp.label, rang: base,
              score: dk.score ?? 0,
              total: (dk.score ?? 0) - dc.valeur,
              libelle: dk.libelle ?? "",
              inapte: dk.inapte ?? true,
              cases: Array.from({ length: 10 }, (_, i) => ({
                n: i + 1, plein: i < base, bonus: i >= base && i < base + bonus, fin: [3, 6, 9].includes(i + 1)
              }))
            };
          })
      };
    });
    context.caracs = groupes;
    // Colonne gauche : Réflexes, Constitution, Puissance. Colonne droite : Charme, Intelligence, Volonté (comme la fiche imprimée).
    const g = (k) => groupes.find(x => x.cle === k);
    context.colonnesComp = [[g("ref"), g("con"), g("pui")], [g("cha"), g("int"), g("vol")]];
    Object.assign(context, this._contexteFiche());
    context.maisonLabel = MAISONS[this.actor.system.maison]?.label ?? "—";
    context.voieLabel = VOIES[this.actor.system.voie]?.label ?? "—";

    context.enrichi = {
      historique: await enrichir(this.actor.system.biographie.historique, this.actor),
      physionomie: await enrichir(this.actor.system.biographie.physionomie, this.actor),
      personnalite: await enrichir(this.actor.system.biographie.personnalite, this.actor),
      notes: await enrichir(this.actor.system.notes, this.actor)
    };
    return context;
  }
}

/* -------------------------------------------------------------------------- */
/*  PNJ / CRÉATURE                                                            */
/* -------------------------------------------------------------------------- */

export class PnjSheet extends BaseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "actor", "pnj"],
    position: { width: 720, height: 760 }
  };

  static PARTS = {
    corps: { template: TPL("pnj"), scrollable: [""] }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.categories = Object.fromEntries(Object.entries(CATEGORIES_ADVERSAIRE).map(([k, v]) => [k, v.label]));
    context.estCreature = this.actor.type === "creature";
    context.assets = ASSETS;
    context.artAdversaire = adversaireDe(this.actor.name)?.filigrane ?? null;
    const talentsMax = CATEGORIES_ADVERSAIRE[this.actor.system.categorie]?.talents ?? 0;
    context.talentsMax = talentsMax >= 99 ? "illimités" : talentsMax;
    context.enrichi = {
      description: await enrichir(this.actor.system.description, this.actor),
      talents: await enrichir(this.actor.system.talents, this.actor),
      notes: await enrichir(this.actor.system.notes, this.actor),
      capacites: await enrichir(this.actor.system.capacites, this.actor)
    };
    return context;
  }
}

export class CreatureSheet extends PnjSheet {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "actor", "creature"]
  };
}
