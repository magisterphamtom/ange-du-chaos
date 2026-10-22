/**
 * Drogues du monde des Plans (livre p. 121-128) — fonctions pures, sans Foundry.
 * Prendre une dose : test de Résilience (ND selon le rang). Réussite : effet positif seul.
 * Échec : effet positif ET négatif. Catastrophe : en plus, dépendance (une dose par période, sinon « En manque ! »).
 * L'état d'un personnage : { actives: [{nom, positif, negatif}], dependances: [{nom, manque, permanente}] }.
 */
import { norm } from "./effets.mjs";

/** ND du test de Résilience (p. 121) : Douce 10, Dure 15, Létale 20. */
export function ndDrogue(toxicite, addiction) {
  const n = Number(String(addiction ?? "").replace(/[^\d]/g, ""));
  if (n > 0) return n;
  return { douce: 10, dure: 15, letale: 20 }[norm(toxicite)] ?? 10;
}

/*
  Cibles d'un effet : { caracs:[…], competences:[…], physique:true, init:true }
  Un effet positif donne un dé d'Inspiration, un effet négatif un dé de Handicap sur ces tests.
*/
export const DROGUES = {
  "pesquann": {
    positif: { ignoreEpuise: true }, negatif: { handicap: { caracs: ["ref", "vol"] } }, manque: { caracs: ["ref", "vol"] }
  },
  "herbe loki": {
    positif: { inspire: { caracs: ["cha"] } }, negatif: { handicap: { caracs: ["int"] } }, manque: { caracs: ["int"] }
  },
  "bleu-songe": {
    positif: { inspire: { caracs: ["vol"] }, immunise: ["demoralise", "trouilleBleue"] }, negatif: { handicap: { caracs: ["ref"] } }, manque: { caracs: ["int"] }
  },
  "licorne pourpre": {
    positif: { inspire: { competences: ["seduction", "artsDuPlaisir"] } }, negatif: { handicap: { caracs: ["int", "vol"] } }, manque: { caracs: ["vol"] }
  },
  "cristal d'ambre": {
    positif: { inspire: { caracs: ["vol"] } }, negatif: { handicap: { caracs: ["con", "pui"] } }, manque: { caracs: ["con", "pui"] }
  },
  "poudre de lotus": {
    // Positif : 1 minute ; négatif : le reste de la journée (on met fin au positif à la main).
    positif: { inspire: { caracs: ["ref"], init: true } }, negatif: { handicap: { caracs: ["ref"], init: true } }, manque: { caracs: ["con", "pui"] }
  },
  "perle de kaa": {
    positif: { inspire: { competences: ["artsDuPlaisir", "perception"] } }, negatif: { handicap: { caracs: ["int"] } }, manque: { caracs: ["int"] }
  },
  "pentii": {
    positif: { inspire: { caracs: ["vol"] }, immunise: ["demoralise", "trouilleBleue"] }, negatif: { handicap: { caracs: ["ref"], init: true } }, manque: { caracs: ["ref"], init: true }
  },
  "mithass noir": {
    positif: { seuilZero: true }, negatif: { nexusBloque: true, sortBloque: true }, manque: { caracs: ["vol"] }
  },
  "brume-feu": {
    positif: { sortEndurance: true, sortSansSoin: true, inspire: { competences: ["artsEtranges"] } }, negatif: { handicap: { physique: true } }, manque: { caracs: ["con", "vol"] }
  }
};

/** Retrouve la fiche d'effets d'une drogue par son nom (« Herbe Loki n° 22 », « Brume Feu »…). */
export function trouverDrogue(nom) {
  const n = norm(nom).replace(/brume feu/, "brume-feu");
  const cle = Object.keys(DROGUES).find(k => n.includes(k));
  return cle ? { cle, ...DROGUES[cle] } : null;
}

export const etatVide = () => ({ actives: [], dependances: [] });
const copie = (e) => ({ actives: (e?.actives ?? []).map(a => ({ ...a })), dependances: (e?.dependances ?? []).map(d => ({ ...d })) });
const meme = (a, b) => norm(a) === norm(b);

/** Dose absorbée : jamais de cumul d'effet ; un effet négatif déjà subi reste. Une dose met fin au manque. */
export function prendreDose(etat, { nom, negatif = false, dependant = false }) {
  const e = copie(etat);
  const ex = e.actives.find(a => meme(a.nom, nom));
  if (ex) { ex.positif = true; ex.negatif = ex.negatif || negatif; }
  else e.actives.push({ nom, positif: true, negatif });
  const dep = e.dependances.find(d => meme(d.nom, nom));
  if (dep) dep.manque = false;
  else if (dependant) e.dependances.push({ nom, manque: false, permanente: false });
  return e;
}

/** Fin de tous les effets de la drogue. */
export function terminer(etat, nom) {
  const e = copie(etat);
  e.actives = e.actives.filter(a => !meme(a.nom, nom));
  return e;
}

/** Fin de l'effet positif seul (Poudre de lotus : 1 minute) ; le négatif continue s'il y en a un. */
export function finPositif(etat, nom) {
  const e = copie(etat);
  const a = e.actives.find(x => meme(x.nom, nom));
  if (a) { a.positif = false; if (!a.negatif) e.actives = e.actives.filter(x => x !== a); }
  return e;
}

/** « En manque ! » : le MJ constate qu'une période de dépendance s'est écoulée sans dose (ou l'enlève). */
export function basculerManque(etat, nom) {
  const e = copie(etat);
  const d = e.dependances.find(x => meme(x.nom, nom));
  if (d) d.manque = !d.manque;
  return e;
}

/** Sevrage (p. 122) : réussite → sevré (majeure ou critique : dégoûté) ; échec → on recommence ; catastrophe → permanente. */
export function resoudreSevrage(degre) {
  if (degre === "catastrophe") return { sevre: false, permanente: true, degoute: false };
  if (degre === "echec") return { sevre: false, permanente: false, degoute: false };
  return { sevre: true, permanente: false, degoute: degre === "majeure" || degre === "critique" };
}

export function appliquerSevrage(etat, nom, degre) {
  const e = copie(etat);
  const r = resoudreSevrage(degre);
  const d = e.dependances.find(x => meme(x.nom, nom));
  if (!d) return { etat: e, ...r };
  if (r.sevre) e.dependances = e.dependances.filter(x => x !== d);
  else if (r.permanente) d.permanente = true;
  return { etat: e, ...r };
}

/** Effets cumulés des drogues actives et des manques, prêts à être lus par les jets. */
export function effetsDrogues(etat) {
  const t = { ignoreEpuise: false, immunise: [], seuilZero: false, nexusBloque: false, sortBloque: false, sortEndurance: false, sortSansSoin: false, inspire: [], handicap: [], actives: [] };
  const fusion = (bloc, source) => {
    if (!bloc) return;
    if (bloc.ignoreEpuise) t.ignoreEpuise = true;
    for (const i of bloc.immunise ?? []) if (!t.immunise.includes(i)) t.immunise.push(i);
    for (const k of ["seuilZero", "nexusBloque", "sortBloque", "sortEndurance", "sortSansSoin"]) if (bloc[k]) t[k] = true;
    if (bloc.inspire) t.inspire.push({ ...bloc.inspire, source });
    if (bloc.handicap) t.handicap.push({ ...bloc.handicap, source });
  };
  for (const a of etat?.actives ?? []) {
    const d = trouverDrogue(a.nom);
    if (!d) continue;
    t.actives.push(a.nom);
    if (a.positif) fusion(d.positif, `${a.nom}`);
    if (a.negatif) fusion(d.negatif, `${a.nom} (effet négatif)`);
  }
  for (const m of etat?.dependances ?? []) {
    if (!m.manque) continue;
    const d = trouverDrogue(m.nom);
    if (d?.manque) t.handicap.push({ ...d.manque, source: `En manque de ${m.nom}` });
  }
  return t;
}

/** Un effet vise-t-il ce test ? ctx : { carac, cle (compétence), physique, init }. */
export function vise(mod, { carac = null, cle = null, physique = false, init = false } = {}) {
  if (init) return !!mod.init;
  if (mod.physique && physique) return true;
  if (carac && (mod.caracs ?? []).includes(carac)) return true;
  if (cle && (mod.competences ?? []).includes(cle)) return true;
  return false;
}

/** Inspiration / Handicap venant des drogues pour un test donné. */
export function modifsDrogues(fx, ctx) {
  const inspire = [], handicap = [];
  for (const m of fx?.inspire ?? []) if (vise(m, ctx)) inspire.push(m.source);
  for (const m of fx?.handicap ?? []) if (vise(m, ctx)) handicap.push(m.source);
  return { inspire, handicap };
}

/** Un sort de soin est interdit sous Brume-Feu : repéré à son texte (le livre ne les étiquette pas). Couvre soins, régénération, guérison de maladie, résurrection. */
export const estSortDeSoin = (sort) =>
  /\b(soigne|soigner|soin|soins|guéri\w*|guérison|régénér\w*|restaure|dissipe les effets|ramener un mort)\b/i.test(`${sort?.nom ?? ""} ${sort?.effet ?? ""}`)
  || /récupèr\w*[^.]{0,80}endurance/i.test(sort?.effet ?? "");
