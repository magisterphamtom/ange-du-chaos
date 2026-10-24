/**
 * Matériaux des armes et armures (livre de base, « Table des matériaux » p. 139) — règles pures, sans Foundry.
 * Le matériau d'un objet modifie ses dégâts (dés ou bonus), sa protection et son encombrement ; solidité,
 * disponibilité et coût sont affichés à titre d'information.
 */
export const MATERIAUX = {
  standard:    { label: "Acier (standard)",                    rang: "standard" },
  mediocre:    { label: "Médiocre (fragile, rouillé, poreux)", rang: "médiocre", des: -1, protMoitie: true, enc: 1, solidite: "50 % du maximum de dégâts possible", dispo: "Courant", cout: "30 à 50 % moins cher" },
  garVallon:   { label: "Acier blanc de Gar-Vallon",           rang: "supérieur", plat: 1, solidite: "+ 1", dispo: "Courant", cout: "× 2" },
  veronese:    { label: "Acier de Véronèse",                   rang: "supérieur", note: "+ 1 Perforant", dispo: "Courant", cout: "× 2" },
  nain:        { label: "Acier nain",                          rang: "supérieur", note: "+ 1 emplacement de Rune", solidite: "+ 2", pr: 1, dispo: "Rare", cout: "× 3" },
  runique:     { label: "Acier runique",                       rang: "supérieur", des: 1, solidite: "+ 3", pr: 3, enc: -2, dispo: "Rare", cout: "× 5" },
  yf:          { label: "Bois d'Yf (arcs)",                    rang: "supérieur", desArc: 1, dispo: "Rare", cout: "× 5" },
  sylve:       { label: "Bois sacré de la Sylve (arcs)",       rang: "ultime", desArc: 2, solidite: "Incassable", dispo: "Introuvable", cout: "Inestimable" },
  metalhion:   { label: "Métalhion",                           rang: "ultime", des: 2, solidite: "Incassable", pr: 3, enc: -3, dispo: "Introuvable", cout: "Inestimable" },
  noirMetal:   { label: "Noir-métal",                          rang: "ultime", des: 3, solidite: "Incassable", pr: 5, dispo: "Introuvable", cout: "Inestimable" }
};
export const CHOIX_MATERIAUX = Object.fromEntries(Object.entries(MATERIAUX).map(([k, m]) => [k, k === "standard" ? m.label : `${m.label} — ${m.rang}`]));

const mat = (cle) => MATERIAUX[cle] ?? MATERIAUX.standard;

/** Ajoute (ou retire) des dés au premier terme « NdX » d'une formule de dégâts (minimum 1 dé). */
export function ajouterDes(formule, delta) {
  if (!delta) return formule;
  const m = /^(\s*)(\d+)d(\d+)(.*)$/.exec(String(formule ?? ""));
  if (!m) return formule;
  return `${m[1]}${Math.max(1, Number(m[2]) + delta)}d${m[3]}${m[4]}`;
}

/** Arme : formule modifiée, bonus aux dégâts à plat, notes (capacité, solidité). `arc` : l'arme est un arc. */
export function armeAvecMateriau(formule, cle, { arc = false } = {}) {
  const m = mat(cle);
  const des = (m.des ?? 0) + (arc ? (m.desArc ?? 0) : 0);
  const notes = [];
  if (cle !== "standard" && MATERIAUX[cle]) {
    if (m.note) notes.push(`${m.label} : ${m.note}`);
    if (m.solidite) notes.push(`${m.label} : solidité ${m.solidite}`);
  }
  return { formule: ajouterDes(formule, des), plat: m.plat ?? 0, notes };
}

/** Armure : protection et encombrement modifiés. */
export function armureAvecMateriau({ protection, encombrement }, cle) {
  const m = mat(cle);
  let pr = protection ?? 0;
  if (m.protMoitie) pr = Math.ceil(pr / 2);
  pr += m.pr ?? 0;
  return { protection: Math.max(0, pr), encombrement: Math.max(0, (encombrement ?? 0) + (m.enc ?? 0)) };
}
export const estArc = (nom) => /\barc\b/i.test(String(nom ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
