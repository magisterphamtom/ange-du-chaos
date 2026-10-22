/**
 * Lancer un sort (livre p. 150) : on dépense le mana du sort, puis test d'Arts étranges.
 * Échec : le mana investi est perdu, sans autre conséquence. Catastrophe : le mana brûle le sorcier,
 * il perd autant de points d'Endurance que de mana dépensé. Fonctions pures, sans Foundry.
 */
import { coutMana } from "./academies.mjs";

/** Coût réel d'un sort pour une académie. */
export const coutDuSort = (academieId, sort) => coutMana(academieId, sort.source, sort.mana).mana;

/** Peut-on payer ? (un acteur sans jauge de mana — PNJ, créature — lance sans dépenser.) */
export const peutLancer = (manaActuel, cout) => manaActuel === null || manaActuel === undefined || manaActuel >= cout;

/**
 * Conséquences du lancement.
 * @returns {{ mana:number|null, endurance:number, perte:number, issue:"reussite"|"echec"|"catastrophe", ligne:string }}
 */
export function consequencesSort({ manaActuel, enduranceActuelle, cout, degre }) {
  const mana = manaActuel === null || manaActuel === undefined ? null : Math.max(0, manaActuel - cout);
  const catastrophe = degre === "catastrophe";
  const perte = catastrophe ? cout : 0;
  const endurance = Math.max(0, enduranceActuelle - perte);
  const reussi = !catastrophe && degre !== "echec";
  const issue = catastrophe ? "catastrophe" : reussi ? "reussite" : "echec";
  const ligne = issue === "reussite" ? `−${cout} mana`
    : issue === "echec" ? `Sort raté : −${cout} mana perdus`
    : `Catastrophe : −${cout} mana et −${perte} Endurance (le mana brûle le sorcier)`;
  return { mana, endurance, perte, issue, ligne };
}

/** Bloc HTML des détails du sort affiché sur la carte quand le test est réussi. */
export function detailsSortHTML(sort, esc = (s) => String(s ?? "")) {
  const l = (t, v) => (v ? `<div><b>${t} :</b> ${esc(v)}</div>` : "");
  const effet = esc(sort.effet).replace(/\n/g, "<br>");
  return `<div class="adc-c-sort">${l("Portée", sort.portee)}${l("Cible", sort.cible)}${l("Durée", sort.duree)}${l("Temps d'incantation", sort.incantation)}${effet ? `<div class="adc-c-sort-effet">${effet}</div>` : ""}</div>`;
}
