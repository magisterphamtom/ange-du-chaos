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

/* -------------------------------------------------------------------------- */
/*  Difficulté automatique (livre p. 150-171)                                  */
/* -------------------------------------------------------------------------- */

const CARACS_PAR_NOM = { charme: "cha", volonte: "vol", reflexes: "ref", constitution: "con", puissance: "pui", intelligence: "int" };
const COMPETENCES_OPPOSEES = { resilience: "resilience", sagacite: "sagacite" };
const sansAccents = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Lit la difficulté d'un sort.
 * @returns {{ mode:"fixe"|"defense"|"carac"|"opposeCompetence"|"opposeAttaque"|"variable"|"inconnu", nd?:number, base?:number, carac?:string, competence?:string, texte:string }}
 */
export function analyserDifficulte(sort) {
  if (Number(sort.difficulte) > 0) return { mode: "fixe", nd: Number(sort.difficulte), texte: String(sort.difficulte) };
  const effet = String(sort.effet ?? "");
  const m = effet.match(/^Difficulté\s*:\s*([^.]*?)\./);
  const texte = m ? m[1].trim() : "";
  const t = sansAccents(texte);
  if (/defense passive/.test(t)) return { mode: "defense", texte };
  const c = t.match(/^(\d+)\s*\+\s*(?:le |la |l')?([a-z]+)\b/);
  if (c && CARACS_PAR_NOM[c[2]]) return { mode: "carac", base: Number(c[1]), carac: CARACS_PAR_NOM[c[2]], texte };
  if (/oppose.*attaque/.test(t)) return { mode: "opposeAttaque", texte };
  if (/^oppose/.test(t)) {
    if (/oppose(?:e)? au test d.attaque/.test(sansAccents(effet))) return { mode: "opposeAttaque", texte };
    const o = sansAccents(effet).match(/oppose(?:e)? (?:a|au) (?:un )?(?:test de |test d')?(?:la |le |l')?(resilience|sagacite)/);
    if (o) return { mode: "opposeCompetence", competence: COMPETENCES_OPPOSEES[o[1]], texte };
    return { mode: "variable", texte };
  }
  if (/variable/.test(t)) return { mode: "variable", texte };
  return { mode: "inconnu", texte };
}

/**
 * Difficulté d'un test de sort à partir de la cible désignée.
 * @param {object} analyse   résultat d'analyserDifficulte
 * @param {object|null} cible { defense:number, carac(cle):number|null, competence(cle):number|null }
 * @param {Function} [lancer] (score) => total d'un test opposé (injecté : jets.mjs)
 * @returns {{ nd:number|null, note:string, opposition:object|null }}
 */
export function difficulteDepuisCible(analyse, cible, lancer = null) {
  const sans = (note) => ({ nd: null, note, opposition: null });
  switch (analyse.mode) {
    case "fixe": return { nd: analyse.nd, note: "", opposition: null };
    case "variable": return sans("Difficulté variable : à fixer par le Meneur.");
    case "opposeAttaque": return sans("Réaction opposée au test d'attaque adverse : comparer les deux résultats.");
    case "inconnu": return sans(analyse.texte ? `Difficulté : ${analyse.texte}.` : "");
  }
  if (!cible) return sans(`Difficulté : ${analyse.texte}. Désignez une cible (touche T) pour la calculer.`);
  if (analyse.mode === "defense") return { nd: cible.defense, note: `ND = Défense passive de la cible (${cible.defense})`, opposition: null };
  if (analyse.mode === "carac") {
    const v = cible.carac(analyse.carac);
    if (v === null || v === undefined) return sans(`Difficulté : ${analyse.texte} (caractéristique de la cible inconnue : à fixer par le Meneur).`);
    return { nd: analyse.base + v, note: `ND = ${analyse.base} + ${v} (${analyse.texte})`, opposition: null };
  }
  // opposeCompetence : la cible fait son test, son total devient la difficulté.
  const score = cible.competence(analyse.competence);
  if (score === null || score === undefined || !lancer) return sans(`Test opposé à ${analyse.competence} de la cible : score inconnu, à fixer par le Meneur.`);
  const r = lancer(score);
  const nd = Math.max(1, r.total);
  return { nd, note: `Opposé : ${analyse.competence} de la cible = ${r.total}`, opposition: { competence: analyse.competence, score, total: r.total, catastrophe: !!r.catastrophe } };
}

/* -------------------------------------------------------------------------- */
/*  Dégâts automatiques (sorts dont le livre donne la formule — p. 152-167)     */
/* -------------------------------------------------------------------------- */

/**
 * `attaque` : le test est un test d'attaque contre la Défense passive (les degrés de réussite ajoutent des dés, comme
 * pour une arme). Sinon les dégâts sont fixes (degré simple). `ignoreArmure` : aucune Protection ne s'applique.
 */
export const SORTS_DEGATS = {
  "Fronde de mana": { formule: "3d6", attaque: true },
  "Flèche-feu": { formule: "3d6", attaque: true },
  "Main de l’orage": { formule: "3d6", attaque: true, note: "Ignore la Protection d'une armure métallique non magique (à déduire à la main)." },
  "Épine de mana": { formule: "3d6", attaque: true, note: "Perforant +1 par degré de réussite (à gérer à la main)." },
  "Flèche-Feuille": { formule: "6d6", attaque: true, note: "Perforant +1 par degré de réussite (à gérer à la main)." },
  "Griffes de Nihilith": { formule: "3d6", attaque: true, note: "Capacité Acéré." },
  "Brise-os": { formule: "2d6", attaque: false, note: "Effets d'une action Briser les os (p. 105)." },
  "Ruisseaux de sang": { formule: "5d8", attaque: false, ignoreArmure: true, note: "Le sorcier récupère de l'Endurance (voir l'effet du sort)." },
  "Foudres d’Eodh": { formule: "2d6", attaque: false, ignoreArmure: true, note: "La cible subit l'état Étourdi. Létaux ou non, au choix du sorcier." }
};

/** États infligés à la cible quand le test du sort est réussi (identifiants de CONFIG.statusEffects). */
export const SORTS_ETATS = {
  "Crépuscule": "aveugle",
  "Visage de Nocta": "trouilleBleue",
  "Foudres d’Eodh": "etourdi"
};
