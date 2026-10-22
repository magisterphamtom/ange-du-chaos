/**
 * Académies de magie (livre de base p. 149-150). Fonctions pures, sans Foundry.
 * `rang` : bonus de rang dérivés de l'académie. Eodh n'en dérive pas : son +1 en Beau-parleur est déjà donné par la Voie du Sorcier
 * (écrit sur la fiche à la création).
 * `reduction` : { source, n } les sorts de cette source coûtent n mana de moins.
 */
export const ACADEMIES = {
  eodh: {
    nom: "Académie d'Eodh", court: "Eodh",
    avantage: "+1 rang en Beau-parleur · +1 dé d'Inspiration aux tests d'Arts étranges pour Lien de mana · sorts des Ombres : −1 mana",
    rangParVoie: true, rang: { beauParleur: 1 }, reduction: { source: "Ombres", n: 1 },
    enseignees: ["Éléments", "Cycles", "Ombres"], interdites: ["Sang"]
  },
  "guelfe-blanche": {
    nom: "Temple de la Guelfe blanche", court: "Guelfe blanche",
    avantage: "+1 rang en Guérison · sorts de Lumière : −1 mana",
    rang: { guerison: 1 }, reduction: { source: "Lumière", n: 1 },
    enseignees: ["Éléments", "Lumière"], interdites: ["Sang", "Ombres"]
  },
  "gar-vallon": {
    nom: "Académie de Gar-Vallon", court: "Gar-Vallon",
    avantage: "+1 rang en Érudition · +3 au total de mana",
    rang: { erudition: 1 }, mana: 3,
    enseignees: ["Éléments", "Cycles", "Inanimé"], interdites: ["Sang"]
  },
  pendarakh: {
    nom: "Académie de Pendarakh", court: "Pendarakh",
    avantage: "+1 rang en Survie · récupère 3 points de mana de plus lors d'une période de repos en extérieur",
    rang: { survie: 1 },
    enseignees: ["Éléments", "Sylve", "Lumière"], interdites: ["Inanimé"]
  },
  "claire-aube": {
    nom: "Académie de la Claire-Aube", court: "Claire-Aube",
    avantage: "+1 rang en Esquive · sorts des Éléments : −1 mana",
    condition: "PJ féminin, Fortune Sœur grise",
    rang: { esquive: 1 }, reduction: { source: "Éléments", n: 1 },
    enseignees: ["Éléments", "Cycles", "Sylve"], interdites: ["Sang", "Ombres"]
  },
  ambre: {
    nom: "Académie d'Ambre", court: "Ambre",
    avantage: "+1 rang en Artisanat · sorts des Cycles : −1 mana",
    rang: { artisanat: 1 }, reduction: { source: "Cycles", n: 1 },
    enseignees: ["Éléments", "Cycles", "Lumière", "Inanimé"], interdites: ["Sylve", "Sang"]
  },
  "arbre-monde": {
    nom: "Académie de l'Arbre monde", court: "Arbre monde",
    avantage: "+1 rang en Nature · sorts de la Sylve : −1 mana",
    rang: { nature: 1 }, reduction: { source: "Sylve", n: 1 },
    enseignees: ["Éléments", "Sylve"], interdites: ["Ombres", "Inanimé"]
  },
  tenebres: {
    nom: "Académie des Ténèbres", court: "Ténèbres", inaccessible: true,
    avantage: "+1 rang en Intimidation · régénère 1 mana par 3 points d'Endurance infligés rituellement ; réserve de sang = score d'Arts étranges",
    rang: { intimidation: 1 },
    enseignees: ["Sang", "Cycles", "Inanimé"], interdites: []
  }
};

export const FORTUNE_ACADEMIE = "Académie magique";
export const FORTUNE_SOEUR_GRISE = "Sœur grise";

/** Académies qu'une Fortune « Académie magique » peut choisir (ni Eodh, ni Ténèbres, ni Claire-Aube qui a sa Fortune). */
export const ACADEMIES_CHOISISSABLES = Object.keys(ACADEMIES).filter(k => !["eodh", "tenebres", "claire-aube"].includes(k));

/** Académie effective d'un personnage : choix explicite, sinon Eodh (Sorcier) ou Claire-Aube (Sœur grise Sorcière). */
export function academieDe({ voie = "", academie = "", fortune = "" } = {}) {
  if (academie && ACADEMIES[academie]) return academie;
  if (voie === "sorcier") return fortune === FORTUNE_SOEUR_GRISE ? "claire-aube" : "eodh";
  return "";
}

/** Nom pseudo-objet pris par cumulerEffets pour les bonus de l'académie. */
export const nomEffetAcademie = (id) => (id ? `academie:${id}` : null);

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Réduction de coût en mana d'un sort selon l'académie (jamais sous 0). */
export function coutMana(academieId, source, mana) {
  const r = ACADEMIES[academieId]?.reduction;
  const n = r && norm(r.source) === norm(source) ? r.n : 0;
  return { mana: Math.max(0, (Number(mana) || 0) - n), reduit: n > 0 && (Number(mana) || 0) > 0 };
}

/** Une source est-elle enseignée par l'académie ? (« Communs » toujours.) */
export const sourceEnseignee = (academieId, source) =>
  norm(source) === "communs" || (ACADEMIES[academieId]?.enseignees ?? []).some(s => norm(s) === norm(source));
