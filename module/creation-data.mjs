/**
 * Assistant de création (p. 43-62) : état du brouillon, budgets, validations et application.
 * Fonctions pures, testables sans Foundry.
 */
import { CARACS, COMPETENCES, MAISONS, VOIES } from "./config.mjs";
import { FORMATION_BASE_COMP, COMP_MAISONS, COMP_VOIES } from "./formations.mjs";

export const ETAPES = [
  { id: 1, titre: "Caractéristiques" },
  { id: 2, titre: "Maison du Chaos" },
  { id: 3, titre: "Formation" },
  { id: 4, titre: "Compétences libres" },
  { id: 5, titre: "Fortune et Malédiction" },
  { id: 6, titre: "Art martial et sorts" },
  { id: 7, titre: "Mérite" },
  { id: 8, titre: "Traits secondaires" },
  { id: 9, titre: "Touches finales" }
];

export const REGLES = {
  caracDepart: 4, caracPoints: 15, caracMaxCreation: 7, caracMaxMerite: 10,
  ptsMaison: 20, maxMaison: 7, ptsBase: 20, maxBase: 7, ptsVoie: 20, maxVoie: 9, ptsLibres: 20, maxLibres: 9,
  merite: 15, sortsSorcier: 5, sourcesSorcier: ["Éléments", "Cycles", "Ombres"]
};

const zero = (cles) => Object.fromEntries(cles.map(k => [k, 0]));

export function etatInitial() {
  return {
    etape: 1,
    caracs: zero(Object.keys(CARACS)),               // points ajoutés au départ de 4
    maison: "", talentsMaison: [],
    voie: "",
    pts: { maison: {}, base: {}, voie: {}, libres: {} },
    fortune: "", malediction: "", art: "", sorts: [],
    merite: { comps: {}, caracs: zero(Object.keys(CARACS)), nexus: 0, arts: [], sorts: [] },
    infos: { nom: "", genre: "", age: "", taille: "", poids: "", cheveux: "", yeux: "", peau: "", historique: "", physionomie: "", personnalite: "" }
  };
}

export const estLoki = (e) => e.maison === "loki";
export const estSorcier = (e) => e.voie === "sorcier";
export const somme = (o) => Object.values(o ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);

/** Liste à plat des compétences d'une liste (les « X ou Y » donnent leurs deux options). */
export const aPlat = (liste) => liste.flat();
export const listeMaison = (e) => COMP_MAISONS[e.maison] ?? [];
export const listeVoie = (e) => COMP_VOIES[e.voie] ?? [];

/** Rang cumulé par compétence après les étapes jusqu'à `jusqua` (« maison », « base », « voie », « libres », « merite »). */
export function rangs(e, jusqua = "merite") {
  const ordre = ["maison", "base", "voie", "libres"];
  const r = zero(Object.keys(COMPETENCES));
  for (const phase of ordre) {
    for (const [k, v] of Object.entries(e.pts[phase] ?? {})) r[k] = (r[k] ?? 0) + (Number(v) || 0);
    if (phase === jusqua) return r;
  }
  for (const [k, v] of Object.entries(e.merite.comps)) r[k] += Number(v) || 0;
  // Sorcier (académie d'Eodh) : +1 rang en Beau-parleur.
  if (estSorcier(e)) r.beauParleur += 1;
  return r;
}

/** Valeurs de caractéristiques de base choisies (avant bonus de Maison / Voie / formation). */
export function caracsBase(e) {
  const out = {};
  for (const k of Object.keys(CARACS)) out[k] = REGLES.caracDepart + (e.caracs[k] || 0) + (e.merite.caracs[k] || 0);
  return out;
}

/** Coût en Mérite pour passer une compétence du rang r au rang r+1. */
export function coutRang(r) {
  if (r >= 10) return Infinity;
  if (r < 6) return 1;
  if (r < 9) return 2;
  return 3;
}
export function coutMerite(e) {
  let total = 0;
  const base = rangs(e, "libres");
  for (const [k, n] of Object.entries(e.merite.comps)) {
    let r = base[k] + (estSorcier(e) && k === "beauParleur" ? 1 : 0);
    for (let i = 0; i < n; i++) { total += coutRang(r); r++; }
  }
  total += 5 * somme(e.merite.caracs) + 5 * (e.merite.nexus || 0) + 3 * e.merite.arts.length + 3 * e.merite.sorts.length;
  return total;
}

/** Étape de répartition de points dans une liste : erreurs éventuelles. */
function verifierListe(e, phase, liste, total, plafond, avant) {
  const erreurs = [];
  const pts = e.pts[phase] ?? {};
  const permis = new Set(aPlat(liste));
  for (const k of Object.keys(pts)) if (pts[k] && !permis.has(k)) erreurs.push(`${COMPETENCES[k]?.label ?? k} n'est pas dans la liste de cette étape.`);
  const reste = total - somme(pts);
  if (reste > 0) erreurs.push(`Il reste ${reste} point${reste > 1 ? "s" : ""} à répartir.`);
  if (reste < 0) erreurs.push(`${-reste} point${reste < -1 ? "s" : ""} de trop.`);
  const cumul = rangs(e, phase);
  for (const k of permis) if (cumul[k] > plafond) erreurs.push(`${COMPETENCES[k].label} dépasse ${plafond}.`);
  for (const item of liste) {
    if (Array.isArray(item)) { if (!item.some(k => (pts[k] || 0) >= 1)) erreurs.push(`Au moins 1 point en ${item.map(k => COMPETENCES[k].label).join(" ou ")}.`); }
    else if ((pts[item] || 0) < 1) erreurs.push(`Au moins 1 point en ${COMPETENCES[item].label}.`);
  }
  return erreurs;
}

/** Erreurs bloquantes d'une étape (liste vide = on peut passer à la suivante). */
export function erreursEtape(e, n, contenu = {}) {
  const err = [];
  switch (n) {
    case 1: {
      const reste = REGLES.caracPoints - somme(e.caracs);
      if (reste > 0) err.push(`Il reste ${reste} point${reste > 1 ? "s" : ""} à répartir.`);
      if (reste < 0) err.push(`${-reste} point${reste < -1 ? "s" : ""} de trop.`);
      for (const k of Object.keys(CARACS)) if (REGLES.caracDepart + e.caracs[k] > REGLES.caracMaxCreation) err.push(`${CARACS[k].label} dépasse ${REGLES.caracMaxCreation}.`);
      break;
    }
    case 2:
      if (!e.maison) err.push("Choisis une Maison du Chaos (ou le Loki).");
      else {
        err.push(...verifierListe(e, "maison", listeMaison(e), REGLES.ptsMaison, REGLES.maxMaison));
        const attendus = estLoki(e) ? 2 : 1;
        if (e.talentsMaison.length !== attendus) err.push(estLoki(e) ? "Le Loki reçoit ses deux Talents." : "Choisis 1 Talent secret.");
      }
      break;
    case 3:
      err.push(...verifierListe(e, "base", FORMATION_BASE_COMP, REGLES.ptsBase, REGLES.maxBase));
      if (!e.voie) err.push("Choisis une Voie de formation.");
      else err.push(...verifierListe(e, "voie", listeVoie(e), REGLES.ptsVoie, REGLES.maxVoie));
      break;
    case 4: {
      const reste = REGLES.ptsLibres - somme(e.pts.libres);
      if (reste > 0) err.push(`Il reste ${reste} point${reste > 1 ? "s" : ""} à répartir.`);
      if (reste < 0) err.push(`${-reste} point${reste < -1 ? "s" : ""} de trop.`);
      const cumul = rangs(e, "libres");
      for (const k of Object.keys(e.pts.libres)) if (cumul[k] > REGLES.maxLibres) err.push(`${COMPETENCES[k].label} dépasse ${REGLES.maxLibres}.`);
      break;
    }
    case 5:
      if (!estLoki(e) && !e.fortune) err.push("Choisis une Fortune.");
      if (!e.malediction && !estLoki(e)) err.push("Choisis une Malédiction.");
      break;
    case 6:
      if (!e.art) err.push("Choisis un Art martial.");
      if (estSorcier(e) && e.sorts.length !== REGLES.sortsSorcier) err.push(`Choisis ${REGLES.sortsSorcier} sorts d'Apprenti (${e.sorts.length}/${REGLES.sortsSorcier}).`);
      break;
    case 7: {
      const reste = REGLES.merite - coutMerite(e);
      if (reste < 0) err.push(`${-reste} point${reste < -1 ? "s" : ""} de Mérite en trop.`);
      if (!estSorcier(e) && e.merite.sorts.length) err.push("Seul un Sorcier apprend des sorts.");
      break;
    }
    case 9:
      if (!e.infos.nom.trim()) err.push("Donne un nom à ton personnage.");
      break;
  }
  return err;
}

export function etapeValide(e, n, contenu) { return erreursEtape(e, n, contenu).length === 0; }

/**
 * Données à écrire sur l'acteur + documents à lui ajouter.
 * @param contenu  { talents, fortunes, maledictions, artsmartiaux, sorts, maisons, voies } (contenu.json)
 * @param docsItems  fonction (contenu) → [{ data }] (documentsItems de contenu-data.mjs)
 */
export function appliquer(e, contenu, docsItems) {
  const r = rangs(e, "merite");
  const cb = caracsBase(e);
  const update = {
    name: e.infos.nom.trim() || "Agent du Chaos",
    system: {
      maison: e.maison, voie: e.voie,
      caracs: Object.fromEntries(Object.keys(CARACS).map(k => [k, { base: cb[k] }])),
      competences: Object.fromEntries(Object.keys(COMPETENCES).map(k => [k, { rang: r[k] }])),
      merite: REGLES.merite,
      identite: { genre: e.infos.genre, age: e.infos.age, taille: e.infos.taille, poids: e.infos.poids, cheveux: e.infos.cheveux, yeux: e.infos.yeux, peau: e.infos.peau },
      biographie: {
        historique: paragraphes(e.infos.historique), physionomie: paragraphes(e.infos.physionomie), personnalite: paragraphes(e.infos.personnalite)
      },
      monnaie: { or: 0, argent: 300, bronze: 0 }
    }
  };
  // Nexus maximum dérivé = nexus.max (5) + bonus.nexus (achats de Mérite).
  update.system.bonus = { nexus: e.merite.nexus || 0 };
  update.system.nexus = { value: 5 + (e.merite.nexus || 0), max: 5 };
  delete update.system["nexus.max"]; delete update.system["nexus.value"];

  const sousContenu = {
    talents: (contenu.talents ?? []).filter(t => e.talentsMaison.includes(t.nom) || t.origine === nomVoie(contenu, e.voie)),
    fortunes: (contenu.fortunes ?? []).filter(x => x.nom === e.fortune),
    maledictions: (contenu.maledictions ?? []).filter(x => x.nom === (estLoki(e) ? "Esprit protecteur" : e.malediction)),
    artsmartiaux: (contenu.artsmartiaux ?? []).filter(x => x.nom === e.art || e.merite.arts.includes(x.nom)),
    sorts: (contenu.sorts ?? []).filter(x => e.sorts.includes(x.nom) || e.merite.sorts.includes(x.nom) || (estSorcier(e) && x.source === "Communs")),
    // Armes de départ : le livre dit que le personnage possède toute arme qu'il sait manier : rien à créer ici.
  };
  const items = docsItems(sousContenu).map(d => d.data);
  return { update, items };
}

const nomVoie = (contenu, cle) => (contenu.voies ?? []).find(v => v.cle === cle)?.nom ?? "";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphes = (t) => String(t ?? "").split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");

/** Talents de Maison proposés (Loki : les deux sont imposés). */
export function talentsDeMaison(contenu, cle) {
  const m = (contenu.maisons ?? []).find(x => x.cle === cle);
  return m ? m.talents.map(t => t.nom) : [];
}
export { MAISONS, VOIES };

/** +1 de la formation de base, de la Maison et de la Voie (comme PersonnageData._bonusCaracs). */
export function bonusCaracsDe(e) {
  const b = zero(Object.keys(CARACS));
  for (const k of ["ref", "con", "vol"]) b[k] += 1;
  if (MAISONS[e.maison]) b[MAISONS[e.maison].bonus] += 1;
  if (VOIES[e.voie]) b[VOIES[e.voie].bonus] += 1;
  return b;
}

/** Traits secondaires du brouillon (étape 8), calculés par le même moteur que la fiche. */
export function traitsDe(e, deriver) {
  const r = rangs(e, "merite"), cb = caracsBase(e);
  const src = {
    caracs: Object.fromEntries(Object.keys(CARACS).map(k => [k, { base: cb[k] }])),
    competences: Object.fromEntries(Object.keys(COMPETENCES).map(k => [k, { rang: r[k] }])),
    merite: REGLES.merite, bonus: { nexus: e.merite.nexus || 0 }, nexus: { max: 5 }
  };
  return deriver(src, { bonusCaracs: bonusCaracsDe(e), encombrement: 0 });
}

/** Applique une action de l'interface au brouillon (mutation). Les garde-fous répètent ceux de l'affichage. */
export function agir(e, act, d = {}, contenu = {}) {
  const delta = Number(d.d) || 0;
  switch (act) {
    case "pt": {
      const { phase, cle } = d;
      if (phase === "caracs") {
        const v = REGLES.caracDepart + e.caracs[cle] + delta;
        if (delta > 0 && (somme(e.caracs) >= REGLES.caracPoints || v > REGLES.caracMaxCreation)) return;
        if (delta < 0 && e.caracs[cle] <= 0) return;
        e.caracs[cle] += delta;
      } else if (["maison", "base", "voie", "libres"].includes(phase)) {
        const pts = (e.pts[phase] ??= {});
        const total = { maison: REGLES.ptsMaison, base: REGLES.ptsBase, voie: REGLES.ptsVoie, libres: REGLES.ptsLibres }[phase];
        const plafond = { maison: REGLES.maxMaison, base: REGLES.maxBase, voie: REGLES.maxVoie, libres: REGLES.maxLibres }[phase];
        const liste = { maison: listeMaison(e), base: FORMATION_BASE_COMP, voie: listeVoie(e), libres: [] }[phase];
        const alt = liste.find(x => Array.isArray(x) && x.includes(cle));
        if (delta > 0 && alt && alt.some(o => o !== cle && (pts[o] || 0) > 0)) return;
        if (delta > 0 && (somme(pts) >= total || rangs(e, phase)[cle] >= plafond)) return;
        if (delta < 0 && !(pts[cle] > 0)) return;
        pts[cle] = (pts[cle] || 0) + delta;
        if (!pts[cle]) delete pts[cle];
      } else if (phase === "meriteComp") {
        const n = e.merite.comps[cle] || 0, r = rangs(e, "merite")[cle];
        if (delta > 0 && (r >= 10 || coutRang(r) > REGLES.merite - coutMerite(e))) return;
        if (delta < 0 && n <= 0) return;
        e.merite.comps[cle] = n + delta; if (!e.merite.comps[cle]) delete e.merite.comps[cle];
      } else if (phase === "meriteCarac") {
        const n = e.merite.caracs[cle] || 0, v = REGLES.caracDepart + e.caracs[cle] + n;
        if (delta > 0 && (REGLES.merite - coutMerite(e) < 5 || v >= REGLES.caracMaxMerite)) return;
        if (delta < 0 && n <= 0) return;
        e.merite.caracs[cle] = n + delta;
      } else if (phase === "meriteNexus") {
        if (delta > 0 && REGLES.merite - coutMerite(e) < 5) return;
        if (delta < 0 && !(e.merite.nexus > 0)) return;
        e.merite.nexus = (e.merite.nexus || 0) + delta;
      }
      break;
    }
    case "choisir": {
      if (d.champ === "maison" && e.maison !== d.val) {
        e.maison = d.val; e.pts.maison = {}; e.talentsMaison = [];
        if (estLoki(e)) { e.talentsMaison = talentsDeMaison(contenu, "loki"); e.fortune = ""; e.malediction = ""; }
      } else if (d.champ === "voie" && e.voie !== d.val) {
        e.voie = d.val; e.pts.voie = {};
        if (!estSorcier(e)) { e.sorts = []; e.merite.sorts = []; }
      }
      break;
    }
    case "talent":
      if (!estLoki(e)) e.talentsMaison = [d.val];
      break;
    case "sort": {
      const i = e.sorts.indexOf(d.val);
      if (i >= 0) e.sorts.splice(i, 1);
      else if (e.sorts.length < REGLES.sortsSorcier) e.sorts.push(d.val);
      break;
    }
    case "meriteArt": {
      const i = e.merite.arts.indexOf(d.val);
      if (i >= 0) e.merite.arts.splice(i, 1);
      else if (d.val !== e.art && REGLES.merite - coutMerite(e) >= 3) e.merite.arts.push(d.val);
      break;
    }
    case "meriteSort": {
      const i = e.merite.sorts.indexOf(d.val);
      if (i >= 0) e.merite.sorts.splice(i, 1);
      else if (estSorcier(e) && REGLES.merite - coutMerite(e) >= 3) e.merite.sorts.push(d.val);
      break;
    }
    case "champ":
      if (["fortune", "malediction", "art"].includes(d.champ)) {
        e[d.champ] = d.val;
        if (d.champ === "art") e.merite.arts = e.merite.arts.filter(x => x !== d.val);
      }
      break;
    case "info":
      if (d.cle in e.infos) e.infos[d.cle] = d.val;
      break;
  }
}
