/**
 * Voie de l'Initié (Guide du Meneur de jeu, p. 212-217) — règles pures, sans Foundry.
 *  Zen : 1 Nexus + Arts du combat ND 20, dure « rang de Volonté » tours ; à la sortie, Handicap pendant la moitié du temps passé.
 *  Talents d'Initié : Cri, Dévier le vent, Armure, Transe curative (1 Nexus chacun) ; Rhys : Frappe du Nexus.
 */
export const normI = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").toLowerCase().trim();

export const ND_ZEN = 20;
export const ND_CRI = 20;
export const DEGATS_CRI = "4d6";
export const PROTECTION_ARMURE_INITIE = 20;

/** Clé d'action d'après le nom du talent (tolère le préfixe « Initié : » / « Talent d'Initié : » des fiches de PNJ). */
const ACTIONS = [
  [/(^|\b)zen\b/, "zen"],
  [/\bcri\b/, "cri"],
  [/devier le vent/, "devier"],
  [/armure de l'initie/, "armure"],
  [/transe curative/, "transe"]
];
export function actionInitie(nom) {
  const n = normI(nom);
  for (const [re, cle] of ACTIONS) if (re.test(n)) return cle;
  return null;
}

/** Le personnage connaît-il le Zen ? */
export const connaitZen = (noms) => (noms ?? []).some(n => actionInitie(n) === "zen");

/** Art martial Rhys (Frappe du Nexus : + rang de Nexus aux dégâts). */
export const estRhys = (nom) => /^(le )?rhys$/.test(normI(nom));
export function bonusFrappeNexus(nomsArts, rangNexus) {
  return (nomsArts ?? []).some(estRhys) ? Math.max(0, rangNexus ?? 0) : 0;
}

/** Durée du Handicap après le Zen : moitié du temps passé dedans (arrondi au supérieur). */
export const toursHandicapApresZen = (toursPasses) => Math.ceil(Math.max(0, toursPasses ?? 0) / 2);

/** Les non-Initiés ont un dé de Handicap contre un Initié en Zen (attaque comme défense). */
export const handicapContreZen = ({ adversaireEnZen, moiConnaitZen }) => !!adversaireEnZen && !moiConnaitZen;

/** Effet d'une réussite de « Dévier le vent, étreindre le vide ». */
export function issueDevier(contact, degre) {
  if (contact) {
    if (degre === "critique") return "Il brise net l'arme saisie, ou la projette à une portée (en mètres) égale à son score d'Arts du combat, puis peut faire un test d'Armes de tir en action gratuite.";
    if (degre === "majeure") return "L'attaque est parée (aucun dégât) et il désarme automatiquement son assaillant.";
    return "Il attrape la lame entre ses paumes : l'attaque est parée et n'inflige aucun dégât.";
  }
  if (degre === "critique") return "Il retourne le projectile vers une cible de son choix (portée en mètres = son score d'Arts du combat) et peut faire un test d'Armes de tir en action gratuite.";
  if (degre === "majeure") return "Il dévie le projectile (aucun dégât) et peut même l'attraper.";
  return "Il dévie le projectile : aucun dégât.";
}
