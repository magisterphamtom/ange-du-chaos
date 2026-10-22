/**
 * Calculs purs du jeu (aucune dépendance à Foundry) : testables sous Node.
 * Chaque table est recopiée du livre de base (p. 34-35, 83-85).
 */

import { CARACS, COMPETENCES, GRADES } from "./config.mjs";

/** Libellé d'une caractéristique (p. 34). */
export function libelleCarac(score) {
  if (score <= 2) return "Défaillant";
  if (score <= 4) return "Faible";
  if (score <= 6) return "Moyen";
  if (score <= 8) return "Doué";
  if (score <= 10) return "Héroïque";
  return "Légendaire";
}

/** Libellé du rang de maîtrise d'une compétence (p. 35). */
export function libelleRang(rang) {
  if (rang <= 0) return "Inapte";
  if (rang <= 3) return "Novice";
  if (rang <= 6) return "Entraîné";
  if (rang <= 9) return "Expert";
  if (rang === 10) return "Maître";
  return "Grand maître";
}

/** Table d'Endurance (p. 83) selon CON + VOL. */
export function enduranceBase(sommeConVol) {
  const s = Math.floor(sommeConVol);
  if (s <= 5) return 10;
  if (s <= 7) return 15;
  if (s <= 9) return 20;
  if (s <= 11) return 25;
  if (s <= 13) return 30;
  if (s <= 15) return 35;
  if (s <= 17) return 40;
  if (s <= 19) return 45;
  if (s === 20) return 50;
  if (s <= 22) return 55;
  if (s <= 24) return 60;
  if (s === 25) return 65;
  return 65 + 5 * (s - 25);
}

/** Seuil de fatigue (p. 84) selon l'Endurance totale (base + Carrure). */
export function seuilFatigue(enduranceTotale) {
  if (enduranceTotale < 15) return 2;
  if (enduranceTotale < 20) return 3;
  if (enduranceTotale < 25) return 4;
  if (enduranceTotale < 30) return 5;
  if (enduranceTotale < 35) return 6;
  if (enduranceTotale < 40) return 7;
  if (enduranceTotale < 45) return 8;
  if (enduranceTotale < 50) return 9;
  if (enduranceTotale < 55) return 10;
  return 10 + Math.floor((enduranceTotale - 50) / 5);
}

/** Bonus aux dégâts (p. 84) selon la Puissance. */
export function bonusDegats(puissance) {
  if (puissance <= 2) return -1;
  if (puissance <= 4) return 0;
  if (puissance === 5) return 1;
  if (puissance === 6) return 2;
  if (puissance === 7) return 3;
  if (puissance === 8) return 4;
  if (puissance === 9) return 6;
  if (puissance === 10) return 8;
  if (puissance <= 12) return 10;
  return 10 + Math.floor((puissance - 11) / 2);
}

/** Points de mana (p. 85) : le double du score d'Arts étranges. */
export function manaMax(scoreArtsEtranges) {
  return 2 * scoreArtsEtranges;
}

/** Mouvement (p. 82) : moyenne REF/PUI arrondie à l'inférieur, moins l'Encombrement. */
export function mouvement(ref, pui, encombrement = 0) {
  return Math.floor((ref + pui) / 2) - encombrement;
}

/** Grade selon le Mérite cumulé (p. 82). */
export function gradeSelonMerite(merite) {
  let grade = GRADES[0];
  for (const g of GRADES) if (merite >= g.merite) grade = g;
  return grade;
}

/**
 * Calcule tout ce qui dérive des données saisies. Fonction pure : on lui passe
 * un objet « source » et un objet « contexte » (bonus venant d'objets possédés).
 *
 * @param {object} src  {caracs:{ref:{base},...}, competences:{cle:{rang}}, merite, bonus:{...}}
 * @param {object} ctx  {bonusCaracs:{ref:n,...}, encombrement:n, bonusDefense:n, effets:{…cumulerEffets}}
 */
export function deriver(src, ctx = {}) {
  const bonusCaracs = ctx.bonusCaracs ?? {};
  const out = { caracs: {}, competences: {} };
  const fx = ctx.effets ?? {};

  for (const cle of Object.keys(CARACS)) {
    const base = src.caracs?.[cle]?.base ?? 0;
    const bonus = bonusCaracs[cle] ?? 0;
    out.caracs[cle] = { base, bonus, valeur: base + bonus, libelle: libelleCarac(base + bonus) };
  }

  for (const [cle, def] of Object.entries(COMPETENCES)) {
    const rangBase = src.competences?.[cle]?.rang ?? 0;
    const rangBonus = fx.rang?.[cle] ?? 0;
    const rang = rangBase + rangBonus;
    const scoreBonus = fx.score?.[cle] ?? 0;
    const score = out.caracs[def.carac].valeur + rang + scoreBonus;
    out.competences[cle] = { rang, rangBase, rangBonus, scoreBonus, score, libelle: libelleRang(rang), inapte: rang <= 0 };
  }

  const b = src.bonus ?? {};
  const enc = ctx.encombrement ?? 0;
  const carrure = out.competences.carrure.rang;
  const base = enduranceBase(out.caracs.con.valeur + out.caracs.vol.valeur);

  out.encombrement = enc;
  out.enduranceMax = base + carrure + (b.endurance ?? 0) + (fx.endurance ?? 0);
  out.seuilFatigue = seuilFatigue(out.enduranceMax);
  out.bonusDegats = bonusDegats(out.caracs.pui.valeur) + (b.degats ?? 0) + (fx.degats ?? 0);
  out.initiative = out.competences.artsDuCombat.score + (b.initiative ?? 0) + (fx.initiative ?? 0) - enc;
  out.mouvement = mouvement(out.caracs.ref.valeur, out.caracs.pui.valeur, enc) + (b.mouvement ?? 0) + (fx.mouvement ?? 0);
  out.defensePassive = out.competences.esquive.score + (b.defense ?? 0) + (ctx.bonusDefense ?? 0) - enc;
  out.manaMax = manaMax(out.competences.artsEtranges.score) + (b.mana ?? 0);

  const grade = gradeSelonMerite(src.merite ?? 0);
  out.grade = grade.id;
  out.gradeLabel = grade.label;
  out.horsDestinMax = grade.horsDestin + (b.horsDestin ?? 0) + (fx.horsDestin ?? 0);
  out.nexusMax = (src.nexus?.max ?? 5) + (b.nexus ?? 0);
  return out;
}
