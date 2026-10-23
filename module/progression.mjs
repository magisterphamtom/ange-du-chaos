/**
 * Progression au Mérite (livre p. 82, « Expérience au mérite ») — fonctions pures, sans Foundry.
 *  Compétence : 1 Mérite par rang jusqu'au rang 6, 2 de 6 à 9, 3 pour passer Maître (10).
 *  Art martial : 3. Sort d'Apprenti (Sorcier) : 3. Caractéristique ou Nexus +1 : 5 (caractéristique max 10).
 *  Sorts d'Expert : rang de Capitaine-Maraudeur ; sorts de Maître : rang d'Ombre.
 * Le livre ne chiffre pas l'achat d'un sort d'Expert ou de Maître : on applique le même prix que l'Apprenti (hypothèse).
 */
import { norm } from "./effets.mjs";
import { ACADEMIES } from "./academies.mjs";

export const PRIX = { art: 3, carac: 5, nexus: 5, sort: { apprenti: 3, expert: 3, maitre: 3 } };
export const CARAC_MAX = 10;
export const RANG_NIVEAU_SORT = { apprenti: "maraudeur", expert: "capitaine", maitre: "ombre" };
const ORDRE_GRADE = ["maraudeur", "capitaine", "ombre"];

/** Prix d'un rang de compétence en plus, selon le rang actuel. */
export function coutCompetence(rang) {
  if (rang >= 10) return Infinity;
  if (rang < 6) return 1;
  if (rang < 9) return 2;
  return 3;
}

/** Le grade atteint permet-il ce niveau de sort ? */
export const niveauPermis = (grade, niveau) => ORDRE_GRADE.indexOf(grade) >= ORDRE_GRADE.indexOf(RANG_NIVEAU_SORT[niveau] ?? "maraudeur");

/** Une source est-elle accessible ? Tout est permis sauf les sources interdites par l'académie (Eodh : Sang). Communs : toujours. */
export function sourcePermise(academieId, source) {
  if (norm(source) === "communs") return true;
  return !(ACADEMIES[academieId]?.interdites ?? []).some(s => norm(s) === norm(source));
}

/**
 * Liste des achats possibles.
 * @param {object} c { disponible, grade, caracs:{cle:base}, rangs:{cle:rangBase}, nexusBonus, sorcier, academie,
 *                     sortsPossedes:[noms], artsPossedes:[noms], sortsDispo:[{nom,source,niveau}], artsDispo:[{nom}],
 *                     libellesCaracs, libellesComps }
 * @returns {{type, cle, label, cout, possible, raison}[]}
 */
export function optionsAchat(c) {
  const out = [];
  const ok = (cout) => (cout <= c.disponible ? "" : `Il manque ${cout - c.disponible} Mérite`);
  for (const [cle, rang] of Object.entries(c.rangs ?? {})) {
    const cout = coutCompetence(rang);
    out.push({ type: "competence", cle, label: `${c.libellesComps?.[cle] ?? cle} : rang ${rang} → ${rang + 1}`, cout, possible: rang < 10 && cout <= c.disponible, raison: rang >= 10 ? "Rang maximum" : ok(cout) });
  }
  for (const [cle, base] of Object.entries(c.caracs ?? {})) {
    const raison = base >= CARAC_MAX ? "Maximum atteint" : ok(PRIX.carac);
    out.push({ type: "carac", cle, label: `${c.libellesCaracs?.[cle] ?? cle} : ${base} → ${base + 1}`, cout: PRIX.carac, possible: !raison, raison });
  }
  out.push({ type: "nexus", cle: "nexus", label: `Nexus maximum : +1`, cout: PRIX.nexus, possible: PRIX.nexus <= c.disponible, raison: ok(PRIX.nexus) });
  const poss = new Set((c.artsPossedes ?? []).map(norm));
  for (const a of c.artsDispo ?? []) if (!poss.has(norm(a.nom))) out.push({ type: "art", cle: a.nom, label: a.nom, cout: PRIX.art, possible: PRIX.art <= c.disponible, raison: ok(PRIX.art) });
  const ps = new Set((c.sortsPossedes ?? []).map(norm));
  for (const s of c.sortsDispo ?? []) {
    if (ps.has(norm(s.nom)) || norm(s.source) === "communs") continue;
    const cout = PRIX.sort[s.niveau] ?? PRIX.sort.apprenti;
    let raison = "";
    if (!c.sorcier) raison = "Réservé aux Sorciers";
    else if (!sourcePermise(c.academie, s.source)) raison = "Source interdite par l'académie";
    else if (!niveauPermis(c.grade, s.niveau)) raison = s.niveau === "expert" ? "Il faut être Capitaine-Maraudeur" : "Il faut être Ombre du Chaos";
    else raison = ok(cout);
    out.push({ type: "sort", cle: s.nom, label: `${s.nom} (${s.source}, ${s.niveau === "apprenti" ? "Apprenti" : s.niveau === "expert" ? "Expert" : "Maître"})`, cout, possible: !raison, raison, niveau: s.niveau });
  }
  return out;
}

/** Ce que gagne un personnage en franchissant un grade (livre p. 82-83). */
export function passageDeGrade(ancien, nouveau) {
  const i = ORDRE_GRADE.indexOf(ancien), j = ORDRE_GRADE.indexOf(nouveau);
  if (j <= i) return [];
  const l = ["Les capacités de son Talent de Voie progressent d'un rang."];
  if (j >= 1 && i < 1) l.push("Un Sorcier peut maintenant apprendre et lancer des sorts d'Expert.");
  if (j >= 2 && i < 2) l.push("Un Sorcier peut maintenant apprendre et lancer des sorts de Maître.");
  l.push("Un point de Hors-Destin de plus par session.");
  return l;
}
