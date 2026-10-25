/**
 * DataModels (TypeDataModel) des acteurs et objets. Les libellés sont en français
 * directement dans les champs : les fiches d'objets génèrent leurs formulaires depuis ce schéma.
 */

import {
  CARACS, COMPETENCES, MAISONS, VOIES, TYPES_DEGATS, DISPONIBILITES,
  CATEGORIES_ADVERSAIRE, NIVEAUX_SORT, COMPETENCES_ARMES, NEXUS_DEPART, SYSTEM_ID
} from "./config.mjs";
import { deriver, enduranceBase, seuilFatigue, gradeSelonMerite } from "./calc.mjs";
import { cumulerEffets } from "./effets.mjs";
import { effetsDrogues } from "./drogues.mjs";
import { CHOIX_MATERIAUX, armureAvecMateriau } from "./materiaux.mjs";
import { bonusFrappeNexus } from "./initie-regles.mjs";
import { RUNES, RANGS_RUNE, GRADES_GEMMELITE, effetsRunesArmures } from "./runes.mjs";
import { ACADEMIES, FORTUNE_SOEUR_GRISE, academieDe, nomEffetAcademie } from "./academies.mjs";

const f = foundry.data.fields;

const entier = (initial = 0, extra = {}) =>
  new f.NumberField({ required: true, nullable: false, integer: true, initial, ...extra });
const texte = (label, initial = "") => new f.StringField({ required: true, blank: true, initial, label });
const html = (label) => new f.HTMLField({ required: false, label });
const choix = (label, choices, initial) =>
  new f.StringField({ required: true, blank: false, initial: initial ?? Object.keys(choices)[0], choices, label });

/** Jauge « valeur » courante d'une ressource. */
const jauge = (initial = 0) => new f.SchemaField({ value: entier(initial, { min: 0 }) });

/* -------------------------------------------------------------------------- */
/*  ACTEURS                                                                   */
/* -------------------------------------------------------------------------- */

/** Bonus saisis à la main (ou, plus tard, apportés par les Talents). */
function schemaBonus() {
  return new f.SchemaField({
    initiative: entier(0), mouvement: entier(0), defense: entier(0), degats: entier(0),
    endurance: entier(0), mana: entier(0), nexus: entier(0), horsDestin: entier(0)
  });
}

export class PersonnageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const caracs = {};
    for (const [k, c] of Object.entries(CARACS)) {
      caracs[k] = new f.SchemaField({ base: entier(4, { min: 0, max: 20 }) }, { label: c.label });
    }
    const competences = {};
    for (const [k, c] of Object.entries(COMPETENCES)) {
      competences[k] = new f.SchemaField({ rang: entier(0, { min: 0, max: 20 }) }, { label: c.label });
    }
    return {
      identite: new f.SchemaField({
        genre: texte("Genre"), taille: texte("Taille"), poids: texte("Poids"),
        cheveux: texte("Cheveux"), yeux: texte("Yeux"), peau: texte("Peau"), age: texte("Âge")
      }),
      maison: new f.StringField({ required: true, blank: true, initial: "", choices: { "": "—", ...Object.fromEntries(Object.entries(MAISONS).map(([k, v]) => [k, v.label])) } }),
      voie: new f.StringField({ required: true, blank: true, initial: "", choices: { "": "—", ...Object.fromEntries(Object.entries(VOIES).map(([k, v]) => [k, v.label])) } }),
      academie: new f.StringField({ required: true, blank: true, initial: "", choices: { "": "—", ...Object.fromEntries(Object.entries(ACADEMIES).filter(([, a]) => !a.inaccessible).map(([k, a]) => [k, a.court])) } }),
      caracs: new f.SchemaField(caracs),
      competences: new f.SchemaField(competences),
      merite: entier(0, { min: 0 }),
      meriteDepense: entier(0, { min: 0 }),
      endurance: jauge(10),
      mana: jauge(0),
      nexus: new f.SchemaField({ value: entier(NEXUS_DEPART, { min: 0 }), max: entier(NEXUS_DEPART, { min: 0 }) }),
      horsDestin: jauge(1),
      bonus: schemaBonus(),
      monnaie: new f.SchemaField({ or: entier(0, { min: 0 }), argent: entier(300, { min: 0 }), bronze: entier(0, { min: 0 }) }),
      biographie: new f.SchemaField({ historique: html("Historique"), physionomie: html("Physionomie"), personnalite: html("Personnalité") }),
      notes: html("Notes")
    };
  }

  /** Bonus de caractéristiques apportés par la Maison, la Voie et la formation de base. */
  _bonusCaracs() {
    const bonus = { ref: 0, con: 0, pui: 0, cha: 0, int: 0, vol: 0 };
    // Formation de base du Maraudeur-Fantôme : +1 REF, CON, VOL.
    for (const k of ["ref", "con", "vol"]) bonus[k] += 1;
    const maison = MAISONS[this.maison];
    if (maison) bonus[maison.bonus] += 1;
    const voie = VOIES[this.voie];
    if (voie) bonus[voie.bonus] += 1;
    return bonus;
  }

  prepareDerivedData() {
    const items = this.parent?.items ?? [];
    // Effets chiffrés des Talents, Fortunes et Malédictions possédés (au grade du personnage).
    const objetsEffets = [...items].filter(it => ["talent", "fortune", "malediction"].includes(it.type) || (it.type === "maladie" && it.system.active)).map(it => it.name);
    const academie = academieDe({ voie: this.voie, academie: this.academie, fortune: objetsEffets.find(n => n === FORTUNE_SOEUR_GRISE) ?? "" });
    const effets = cumulerEffets(
      [...objetsEffets, nomEffetAcademie(academie)].filter(Boolean),
      gradeSelonMerite(this.merite ?? 0).id
    );
    // Rhys (art martial des Initiés) : Frappe du Nexus = + rang de Nexus aux dégâts.
    effets.degats += bonusFrappeNexus([...items].filter(it => it.type === "artmartial").map(it => it.name), this.nexus?.max ?? 0);
    // Runes d'armures actives, gravées sur une armure portée.
    const ra = effetsRunesArmures(items);
    effets.protectionArmures += ra.protection;
    effets.encombrementArmures += ra.encombrement;
    effets.endurance += ra.endurance;
    if (ra.furtivite) effets.score.furtivite = (effets.score.furtivite ?? 0) + ra.furtivite;
    effets.runes = ra;
    // Drogues absorbées et dépendances (drapeau de l'acteur) : effets positifs, négatifs, manque.
    const dr = effetsDrogues(this.parent?.getFlag?.(SYSTEM_ID, "drogues"));
    if (dr.ignoreEpuise) effets.ignoreEpuise = true;
    for (const i of dr.immunise) if (!effets.immunise.includes(i)) effets.immunise.push(i);
    effets.drogues = dr;
    let encombrement = 0;
    let protectionMax = 0, protectionBase = 0;
    let bonusDefense = 0;
    for (const it of items) {
      if (!it.system.equipee) continue;
      if (it.type === "armure") {
        const am = armureAvecMateriau({ protection: it.system.protection, encombrement: it.system.encombrement }, it.system.materiau);
        encombrement += Math.max(0, am.encombrement + effets.encombrementArmures);
        protectionBase = Math.max(protectionBase, am.protection);
        protectionMax = Math.max(protectionMax, am.protection + effets.protectionArmures);
      }
      if (it.type === "bouclier") bonusDefense += it.system.bonusDefense ?? 0;
    }

    // Armure trop lourde pour le porteur : +3 d'Encombrement (p. 135).
    const ctxBase = { bonusCaracs: this._bonusCaracs(), effets };
    const pre = deriver(this, { ...ctxBase, encombrement });
    if (protectionBase > pre.competences.armures.score) encombrement += 3;

    const d = deriver(this, { ...ctxBase, encombrement, bonusDefense });
    d.protection = protectionMax + effets.protectionNaturelle;
    d.armureTropLourde = protectionBase > pre.competences.armures.score;
    d.effets = effets;
    if (dr.seuilZero) d.seuilFatigue = 0;
    d.academie = academie;
    this.derive = d;

    // Plafonne les jauges à leur maximum.
    this.endurance.max = d.enduranceMax;
    this.endurance.seuil = d.seuilFatigue;
    this.endurance.epuise = this.endurance.value <= d.seuilFatigue;
    this.mana.max = d.manaMax;
    this.horsDestin.max = d.horsDestinMax;
    this.nexus.max = d.nexusMax;
  }
}

/** PNJ : profil type simplifié (Brute / Coriace / Défi / Épique). */
export class PnjData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      categorie: choix("Catégorie", Object.fromEntries(Object.entries(CATEGORIES_ADVERSAIRE).map(([k, v]) => [k, v.label])), "brute"),
      description: html("Description"),
      endurance: new f.SchemaField({ value: entier(10, { min: 0 }), max: entier(10, { min: 0 }) }),
      seuilFatigue: entier(2, { min: 0 }),
      protection: entier(0, { min: 0 }),
      defensePassive: entier(10),
      initiative: entier(10),
      mouvement: entier(6, { min: 0 }),
      bonusDegats: entier(0),
      attaque: new f.SchemaField({
        nom: texte("Attaque", "Arme"),
        score: entier(12),
        degats: texte("Dégâts", "2d6"),
        note: texte("Capacités de l'arme")
      }),
      attaquesSup: new f.ArrayField(new f.SchemaField({
        nom: texte("Attaque", "Arme"), score: entier(12), degats: texte("Dégâts", "2d6"), note: texte("Capacités")
      })),
      caracs: new f.SchemaField(Object.fromEntries(["ref", "con", "int", "pui", "cha", "vol"].map(k => [k, entier(5, { min: 0 })]))),
      nexus: entier(0, { min: 0 }),
      actions: entier(1, { min: 1 }),
      reaction: new f.BooleanField({ initial: false, label: "Réaction" }),
      artsEtranges: entier(0, { min: 0 }),
      protectionNom: texte("Nom de la protection"),
      competences: new f.ArrayField(new f.SchemaField({
        nom: texte("Compétence"), score: entier(10)
      })),
      talents: html("Talents d'adversaire"),
      notes: html("Notes")
    };
  }
}

/** Créature du bestiaire : même profil qu'un PNJ, plus espèce et Plan. */
export class CreatureData extends PnjData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      espece: texte("Espèce"),
      plan: texte("Plan d'origine"),
      capacites: html("Capacités spéciales")
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  OBJETS                                                                    */
/* -------------------------------------------------------------------------- */

class ObjetBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { description: html("Description") };
  }
}

const CATEGORIES_ARME = { contact: "Contact", tir: "Distance (tir ou jet)" };
const TYPES_DEGATS_MODELE = Object.fromEntries(Object.entries(TYPES_DEGATS).map(([k, v]) => [k, `${v} (${k})`]));
const COMPETENCES_ARME_MODELE = COMPETENCES_ARMES;
const DISPOS = Object.fromEntries(Object.entries(DISPONIBILITES));

export class ArmeData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      categorie: choix("Catégorie", CATEGORIES_ARME, "contact"),
      competence: choix("Compétence", COMPETENCES_ARME_MODELE, "lames1"),
      degats: texte("Dégâts (ex. 2d6+1)", "2d6"),
      typeDegats: choix("Type de dégâts", TYPES_DEGATS_MODELE, "T"),
      capacites: texte("Capacités (ex. Équilibré, Perforant)"),
      materiau: choix("Matériau", CHOIX_MATERIAUX, "standard"),
      puissanceRequise: entier(0, { min: 0, label: "Puissance requise" }),
      porteeEffective: texte("Portée effective"),
      porteeMax: texte("Portée maximale"),
      disponibilite: choix("Disponibilité", DISPOS, "commun"),
      cout: texte("Coût (£A)"),
      equipee: new f.BooleanField({ initial: false, label: "Équipée" })
    };
  }
}

export class ArmureData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      protection: entier(1, { min: 0, label: "Protection (PR)" }),
      encombrement: entier(0, { min: 0, label: "Encombrement (ENC)" }),
      localisation: texte("Localisation (To, T, BD, BG, JD, JG)", "To"),
      categorieProtection: new f.StringField({ required: true, blank: true, initial: "", choices: { "": "—", ...TYPES_DEGATS_MODELE }, label: "Catégorie de protection (option)" }),
      capacites: texte("Capacités (Résistant, Encombrant…)"),
      materiau: choix("Matériau", CHOIX_MATERIAUX, "standard"),
      disponibilite: choix("Disponibilité", DISPOS, "commun"),
      cout: texte("Coût (£A)"),
      equipee: new f.BooleanField({ initial: false, label: "Portée" })
    };
  }
}

/** Maladie (livre de base p. 118) : virulence, durée d'infection, effets ; active = le personnage en souffre. */
export class MaladieData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      virulence: entier(10, { min: 0, label: "Virulence (ND de Résilience)" }),
      duree: texte("Durée d'infection"),
      effet: html("Effets"),
      active: new f.BooleanField({ initial: false, label: "Infecté (effets en cours)" })
    };
  }
}

export class BouclierData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      bonusDefense: entier(1, { label: "Bonus de Défense passive" }),
      resistance: entier(10, { min: 0, label: "Résistance" }),
      capacites: texte("Capacités"),
      cout: texte("Coût (£A)"),
      equipee: new f.BooleanField({ initial: false, label: "Porté" })
    };
  }
}

export class EquipementData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantite: entier(1, { min: 0, label: "Quantité" }),
      cout: texte("Coût (£A)"),
      disponibilite: choix("Disponibilité", DISPOS, "courant")
    };
  }
}

export class DrogueData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      toxicite: texte("Toxicité"),
      addiction: texte("Addiction"),
      dependance: texte("Dépendance"),
      origine: texte("Origine"),
      rarete: texte("Rareté"),
      prix: texte("Prix"),
      inoculation: texte("Inoculation"),
      duree: texte("Durée"),
      manque: texte("Manque"),
      effets: html("Effets")
    };
  }
}

export class SortData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      source: texte("Source / Élément"),
      niveau: choix("Niveau", NIVEAUX_SORT, "apprenti"),
      mana: entier(5, { min: 0, label: "Coût en mana" }),
      difficulte: entier(15, { min: 0, label: "Difficulté (ND)" }),
      portee: texte("Portée"),
      incantation: texte("Temps d'incantation", "1 action simple"),
      cible: texte("Cible"),
      duree: texte("Durée"),
      degats: texte("Dégâts (ex. 3d6)"),
      effet: html("Effet")
    };
  }
}

export class ArtMartialData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      effetPermanent: new f.SchemaField({ nom: texte("Effet permanent — nom"), description: html("Effet permanent") }),
      coupSpecial: new f.SchemaField({
        nom: texte("Coup spécial — nom"),
        actions: texte("Nombre d'actions", "1 action complexe"),
        duree: texte("Durée", "Instantanée"),
        description: html("Coup spécial (1 point de Nexus)")
      })
    };
  }
}

export class TalentData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      origine: texte("Origine (Maison, Voie, adversaire…)"),
      paliers: html("Paliers par grade (Maraudeur / Capitaine / Ombre)")
    };
  }
}

export class FortuneData extends ObjetBase {}
export class Malediction extends ObjetBase {}

export class MaisonData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cle: choix("Maison", Object.fromEntries(Object.entries(MAISONS).map(([k, v]) => [k, v.label])), "eodh"),
      competences: html("Compétences de la Maison"),
      talentsSecrets: html("Talents secrets")
    };
  }
}

export class VoieData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cle: choix("Voie", Object.fromEntries(Object.entries(VOIES).map(([k, v]) => [k, v.label])), "protecteur"),
      competences: html("Compétences de la Voie"),
      talent: html("Talent de la Voie")
    };
  }
}

/** Rune gravée sur une arme ou une armure (livre de base p. 169-171). */
export class RuneData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      cle: choix("Rune", Object.fromEntries(Object.entries(RUNES).map(([k, v]) => [k, v.nom])), "acere"),
      rang: choix("Rang", RANGS_RUNE, "apprenti"),
      cible: choix("Se grave sur", { arme: "Une arme", armure: "Une armure" }, "arme"),
      emplacements: entier(1, { min: 1, max: 3, label: "Emplacements de rune utilisés" }),
      objetId: new f.StringField({ required: true, blank: true, initial: "", label: "Gravée sur (identifiant de l'objet)" }),
      active: new f.BooleanField({ initial: false, label: "Active (mot de pouvoir prononcé, 1 heure)" }),
      effet: html("Effet")
    };
  }
}

/** Gemmelite : cristal qui stocke un sort (livre de base p. 169). */
export class GemmeliteData extends ObjetBase {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      grade: choix("Grade", GRADES_GEMMELITE, "commune"),
      source: texte("Source de mana (couleur du cristal)"),
      sortNom: texte("Sort stocké"),
      niveauSort: choix("Niveau du sort", { apprenti: "Apprenti", expert: "Expert" }, "apprenti"),
      charges: new f.SchemaField({ value: entier(1, { min: 0 }), max: entier(1, { min: 0 }) }),
      motDePouvoir: texte("Mot de pouvoir"),
      effet: html("Effets")
    };
  }
}

export const ACTOR_MODELS = { personnage: PersonnageData, pnj: PnjData, creature: CreatureData };
export const ITEM_MODELS = {
  arme: ArmeData, armure: ArmureData, bouclier: BouclierData, equipement: EquipementData,
  drogue: DrogueData, sort: SortData, artmartial: ArtMartialData, talent: TalentData,
  fortune: FortuneData, malediction: Malediction, maison: MaisonData, voie: VoieData,
  rune: RuneData, gemmelite: GemmeliteData, maladie: MaladieData
};
