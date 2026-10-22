/**
 * Règles de combat — fonctions pures (aucune dépendance à Foundry), testables sous Node.
 * Livre de base, chap. « Combat » (p. 98-111) et « Santé et conditions physiques » (p. 112-116).
 */
import { resoudreTest, d10, SEUIL_MAJEURE, SEUIL_CRITIQUE } from "./jets.mjs";
import { modifsDrogues } from "./drogues.mjs";

/** Table d'attaque localisée (p. 105) : bonus à la Défense passive, dés de dégâts en plus, effet. */
export const LOCALISATIONS = {
  aucune:      { label: "Torse (aucune)", defense: 0,  des: 0, effet: "" },
  tete:        { label: "Tête",           defense: 10, des: 2, effet: "" },
  oeil:        { label: "Œil",            defense: 15, des: 2, effet: "aveugle" },
  bras:        { label: "Bras",           defense: 3,  des: 0, effet: "membre" },
  jambe:       { label: "Jambe",          defense: 3,  des: 0, effet: "membre" },
  entrejambe:  { label: "Entrejambe",     defense: 10, des: 2, effet: "etourdi" }
};

/** Actions d'attaque (p. 104) : modification du test et des dégâts. */
export const ACTIONS_ATTAQUE = {
  attaque: { label: "Attaque",         handicap: false, inspire: false, degats: 0,  detail: "Attaque standard" },
  brutale: { label: "Frappe brutale",  handicap: true,  inspire: false, degats: 5,  detail: "Handicap au test, +5 dégâts" },
  precise: { label: "Frappe précise",  handicap: false, inspire: true,  degats: -5, detail: "Inspiration au test, −5 dégâts" }
};

/** « 2d6+1 » → { n: 2, faces: 6, fixe: 1 }. Texte libre toléré (espaces, majuscules, « 2D6 + 1 »). */
export function analyserDegats(texte) {
  const t = String(texte ?? "").toLowerCase().replace(/\s+/g, "");
  const m = t.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (m) return { n: Number(m[1] || 1), faces: Number(m[2]), fixe: Number(m[3] ?? 0) };
  const fixe = t.match(/^[+-]?\d+$/);
  return { n: 0, faces: 6, fixe: fixe ? Number(t) : 0 };
}

/** Degré d'une attaque selon l'écart avec la Défense passive (ou le résultat de la réaction). */
export function degreAttaque(total, cible) {
  if (total < cible) return "echec";
  if (total - cible >= SEUIL_CRITIQUE) return "critique";
  if (total - cible >= SEUIL_MAJEURE) return "majeure";
  return "simple";
}

/** Dés de dégâts supplémentaires pour le degré de réussite (p. 110). */
export const desDegre = (degre) => (degre === "critique" ? 2 : degre === "majeure" ? 1 : 0);

/**
 * Calcule les dégâts d'une attaque réussie.
 * @param {object} p
 * @param {string} p.formule       dés de l'arme (« 2d6+1 »)
 * @param {string} p.degre         simple | majeure | critique
 * @param {number} p.bonusDegats   bonus aux dégâts du personnage
 * @param {number} [p.ajust=0]     ±5 (frappe brutale ou précise)
 * @param {number} [p.desEnPlus=0] dés supplémentaires (localisation, adversaire au sol, feinte…)
 * @param {number} [p.protection=0]
 * @param {boolean} [p.ignoreArmure=false]
 */
export function calculerDegats({ formule, degre, bonusDegats = 0, ajust = 0, desEnPlus = 0, protection = 0, ignoreArmure = false, rng = Math.random }) {
  const { n, faces, fixe } = analyserDegats(formule);
  const nbDes = n + desDegre(degre) + desEnPlus;
  const des = Array.from({ length: nbDes }, () => Math.floor(rng() * faces) + 1);
  const somme = des.reduce((a, b) => a + b, 0);
  const brut = somme + fixe + bonusDegats + ajust;
  const prot = ignoreArmure ? 0 : protection;
  const net = Math.max(0, brut - prot);
  return { des, faces, fixe, bonusDegats, ajust, desEnPlus, brut, protection: prot, net, absorbe: brut > 0 && net === 0 };
}

/**
 * Applique des dégâts à une jauge d'Endurance.
 * @returns {{ avant:number, apres:number, epuise:boolean, portes:boolean }}
 */
export function appliquerDegats({ endurance, seuil, degats, nonLetal = false }) {
  let apres = endurance - degats;
  let portes = false;
  if (apres <= 0) {
    if (nonLetal) apres = 1; // inconscient, stabilisé à 1 point (p. 110)
    else { apres = 0; portes = true; }
  }
  return { avant: endurance, apres, epuise: apres <= seuil, portes, inconscient: nonLetal && endurance - degats <= 0 };
}

/** Perte d'Endurance d'une réaction (p. 102), interdite sous le Seuil de fatigue (p. 106). */
export const COUT_REACTION = 3;
export function reactionPossible({ endurance, seuil }) {
  return endurance > seuil;
}

/**
 * Réaction de défense (Esquive ou Parade) : test opposé, strictement supérieur pour réussir (p. 106).
 * Si l'attaquant l'emporte, le résultat de la réaction remplace la Défense passive pour calculer le degré.
 */
export function resoudreReaction({ totalAttaque, scoreReaction, bloque = false, inspire = false, handicap = false, rng = Math.random }) {
  const r = resoudreTest({ score: scoreReaction, bloque, inspire, handicap, rng });
  const evite = r.total > totalAttaque && !r.catastrophe;
  return { ...r, evite, degreSiTouche: evite ? null : degreAttaque(totalAttaque, Math.max(r.total, -999)) };
}

/** Dernier soupir (p. 112) : Carrure ND 15, jamais de Handicap. Réussite simple → 1 PV, majeure → 1 PV et conscient, critique → seuil + 1. */
export function dernierSoupir({ scoreCarrure, seuil, secondSouffleUtilise = false, rng = Math.random }) {
  const r = resoudreTest({ score: scoreCarrure, nd: 15, rng });
  const degre = r.degre;
  let issue, endurance = 0;
  if (degre === "catastrophe") issue = "mort";
  else if (degre === "echec") issue = "agonie"; // 3 tours supplémentaires
  else if (degre === "simple") { issue = "stabilise"; endurance = 1; }
  else if (degre === "majeure" || (degre === "critique" && secondSouffleUtilise)) { issue = "conscient"; endurance = 1; }
  else { issue = "souffle"; endurance = seuil + 1; }
  return { ...r, issue, endurance };
}

/** Initiative (p. 102) : 1 dé du Destin + score d'initiative ; départage : meilleur score, puis PJ avant PNJ. */
export function initiative({ score, joueur = true, inspire = false, handicap = false, bloque = false, rng = Math.random }) {
  const r = resoudreTest({ score, bloque, inspire, handicap, rng });
  const departage = (score + 100) / 1000 + (joueur ? 0.0001 : 0); // jamais plus d'une unité
  return { ...r, rang: r.total, valeur: r.total + departage };
}

/** Un test est « physique » s'il repose sur REF, CON ou PUI (p. 36). */
export const CARACS_PHYSIQUES = ["ref", "con", "pui"];

/**
 * Effets des états sur un test (p. 112-115).
 * @param {Set<string>} etats  identifiants des états actifs
 * @param {boolean} physique   le test dépend de REF, CON ou PUI
 * @param {object} [fx]        effets de Talents/Fortunes : { ignoreEpuise, immunise:[états], handicap:[compétences] } + cle de la compétence testée
 */
export function effetsDesEtats(etats, { physique, fx = {}, cle = null, carac = null, init = false }) {
  const has = (e) => etats.has(e);
  const notes = [];
  let handicap = false, bloque = false, sansInspiration = false, inspire = false;
  if (physique && has("epuise")) {
    if (fx.ignoreEpuise) notes.push("Même pas mal : pas de Handicap dû à l'Épuisement");
    else { handicap = true; notes.push("Épuisé : Handicap"); }
  }
  if (physique && has("aveugle")) { handicap = true; notes.push("Aveuglé : Handicap"); }
  if (cle && (fx.handicap ?? []).includes(cle)) { handicap = true; notes.push("Fortune ou Malédiction : Handicap"); }
  // Drogues : dé d'Inspiration (effet positif) ou de Handicap (effet négatif, manque).
  const dr = modifsDrogues(fx.drogues, { carac, cle, physique, init });
  for (const src of dr.handicap) { handicap = true; notes.push(`${src} : Handicap`); }
  for (const src of dr.inspire) { inspire = true; notes.push(`${src} : Inspiration`); }
  if (has("trouilleBleue") && !(fx.immunise ?? []).includes("trouilleBleue")) { bloque = true; notes.push("Trouille bleue : bloqué"); }
  if (has("demoralise") && !(fx.immunise ?? []).includes("demoralise")) { sansInspiration = true; notes.push("Démoralisé : pas d'Inspiration"); }
  if (sansInspiration) inspire = false;
  return { handicap, inspire, bloque, sansInspiration, notes };
}
