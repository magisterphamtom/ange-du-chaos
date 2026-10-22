/**
 * Moteur de jets — fonctions pures (aucune dépendance à Foundry), testables par simulation.
 *
 * Règles appliquées (livre de base, chap. « Les règles » : dé du Destin, Inspiration, Handicap) :
 *  - 2 à 9 : le résultat s'ajoute simplement.
 *  - 10 : on relance et on AJOUTE 10 au nouveau résultat ; un nouveau 10 recommence, et ainsi de suite.
 *    Après un 10, un 1 vaut simplement +1 (total +11).
 *  - 1 : on relance et on SOUSTRAIT le nouveau résultat (le 1 initial compte aussi : 1, 10, 8 → −19) ;
 *    un 10 sur ces relances recommence l'opération.
 *  - Total (score + dé) ≤ 0 : catastrophe.
 *  - Inspiration : deux dés du Destin, on garde le meilleur ; Handicap : on garde le moins bon ;
 *    les deux s'annulent ; plusieurs sources ne comptent qu'une fois.
 *  - Double 10 (Inspiration ou Handicap) : réussite critique automatique ; double 1 : catastrophe automatique.
 *  - « Bloqué » (rang 0 Inapte) : un 10 ne se relance pas.
 *  - Degrés : réussite simple ; majeure à +5 de la difficulté ; critique à +10.
 */

export const SEUIL_MAJEURE = 5;
export const SEUIL_CRITIQUE = 10;
export const MAX_RELANCES = 50; // garde-fou (probabilité astronomiquement faible d'y arriver)

/** d10 par défaut. `rng` renvoie un réel dans [0, 1). */
export const d10 = (rng = Math.random) => Math.floor(rng() * 10) + 1;

/**
 * Un dé du Destin complet.
 * @returns {{ jets:number[], valeur:number, oeil:"aucun"|"sourire"|"cruel" }}
 */
export function lancerDestin({ rng = Math.random, bloque = false } = {}) {
  const premier = d10(rng);
  const jets = [premier];

  if (premier >= 2 && premier <= 9) return { jets, valeur: premier, oeil: "aucun" };
  if (bloque && premier === 10) return { jets, valeur: 10, oeil: "aucun" };

  if (premier === 10) {
    // Chaîne positive : 10 + 10 + … + dernier résultat non-10 (un 1 final vaut +1).
    let valeur = 10;
    for (let i = 0; i < MAX_RELANCES; i++) {
      const r = d10(rng);
      jets.push(r);
      valeur += r;
      if (r !== 10) break;
    }
    return { jets, valeur, oeil: "sourire" };
  }

  // premier === 1 : chaîne négative, tout est soustrait.
  let valeur = -1;
  for (let i = 0; i < MAX_RELANCES; i++) {
    const r = d10(rng);
    jets.push(r);
    valeur -= r;
    if (r !== 10) break;
  }
  return { jets, valeur, oeil: "cruel" };
}

/**
 * Résout un test de compétence.
 * @param {object} p
 * @param {number} p.score        caractéristique + rang
 * @param {number} [p.bonus=0]    modificateurs divers
 * @param {number} [p.nd=null]    niveau de difficulté (null : pas de comparaison, juste le total)
 * @param {boolean} [p.inspire]   au moins une source d'Inspiration
 * @param {boolean} [p.handicap]  au moins une source de Handicap
 * @param {boolean} [p.bloque]    rang 0 (Inapte) ou autre blocage
 * @param {Function} [p.rng]
 */
export function resoudreTest({ score, bonus = 0, nd = null, inspire = false, handicap = false, bloque = false, rng = Math.random }) {
  const mode = inspire && handicap ? "normal" : inspire ? "inspire" : handicap ? "handicap" : "normal";
  const nb = mode === "normal" ? 1 : 2;
  const destins = Array.from({ length: nb }, () => lancerDestin({ rng, bloque }));

  let retenu = 0;
  if (nb === 2) {
    const [a, b] = destins;
    const meilleur = a.valeur >= b.valeur ? 0 : 1;
    retenu = mode === "inspire" ? meilleur : 1 - meilleur;
  }
  const de = destins[retenu].valeur;

  const premiers = destins.map(d => d.jets[0]);
  const double10 = nb === 2 && premiers.every(j => j === 10);
  const double1 = nb === 2 && premiers.every(j => j === 1);

  const base = score + bonus;
  const total = base + de;
  const catastrophe = double1 || (!double10 && total <= 0);

  let reussite = null;
  let degre = null;
  if (double10) {
    reussite = true;
    degre = "critique";
  } else if (catastrophe) {
    reussite = false;
    degre = "catastrophe";
  } else if (nd !== null) {
    reussite = total >= nd;
    if (!reussite) degre = "echec";
    else if (total - nd >= SEUIL_CRITIQUE) degre = "critique";
    else if (total - nd >= SEUIL_MAJEURE) degre = "majeure";
    else degre = "simple";
  }

  return {
    mode, destins, retenu, de, score, bonus, base, total, nd,
    double10, double1, catastrophe, reussite, degre, bloque
  };
}
