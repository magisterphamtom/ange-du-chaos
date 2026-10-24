/**
 * Objets magiques du livre de base (chap. « Arts étranges », p. 169-171) : runes d'armes et d'armures, gemmelite.
 * Fonctions pures, sans Foundry. Les textes du livre restent dans le pack d'assets privé ; ici : clés et valeurs chiffrées.
 *
 * Une rune est gravée sur une arme ou une armure (emplacements : Apprenti 1, Expert 2, Maître 3), puis « déclenchée »
 * par un mot de pouvoir (action gratuite) : elle agit alors 1 heure. L'état « active » se coche sur la fiche.
 */
import { norm } from "./effets.mjs";

export const RANGS_RUNE = { apprenti: "Apprenti", expert: "Expert", maitre: "Maître" };
export const EMPLACEMENTS = { apprenti: 1, expert: 2, maitre: 3 };

/*
  Champs de `fx` :
   Armes  : degatsPlus (dégâts fixes), desPlus (dés du type de l'arme), attaque (bonus au test), inspireAttaque,
            perforant, pisseLeSang, destructionPR (PR retirés), elem {nom, n, faces} (dés supplémentaires d'un autre type),
            parade (bonus), inspireParade, handicapAttaquants
   Armures: protection, encombrement (négatif), furtivite (bonus), inspireFurtivite, reaction (bonus Esquive/Parade),
            inspireEsquive, endurance, effroi
*/
export const RUNES = {
  acere: { nom: "Rune acérée", cible: "arme", rangs: {
    apprenti: { degatsPlus: 2 }, expert: { desPlus: 1 }, maitre: { desPlus: 1, perforant: true } } },
  precision: { nom: "Rune de précision", cible: "arme", rangs: {
    apprenti: { attaque: 1 }, expert: { inspireAttaque: true }, maitre: { inspireAttaque: true, perforant: true } } },
  defense: { nom: "Rune de défense", cible: "arme", rangs: {
    apprenti: { parade: 1 }, expert: { inspireParade: true }, maitre: { inspireParade: true, handicapAttaquants: true } } },
  cruaute: { nom: "Rune de cruauté", cible: "arme", rangs: { expert: { pisseLeSang: true } } },
  destruction: { nom: "Rune de destruction", cible: "arme", rangs: { expert: { destructionPR: 1 }, maitre: { destructionPR: 3 } } },
  feu: { nom: "Rune de feu", cible: "arme", rangs: { expert: { elem: { nom: "feu", n: 1, faces: 6 } } } },
  froid: { nom: "Rune de froid", cible: "arme", rangs: { expert: { elem: { nom: "froid", n: 1, faces: 6 } } } },
  foudre: { nom: "Rune de foudre", cible: "arme", rangs: { expert: { elem: { nom: "foudre", n: 1, faces: 6 } } } },

  renforcement: { nom: "Rune de renforcement", cible: "armure", rangs: {
    apprenti: { protection: 1 }, expert: { protection: 3 }, maitre: { protection: 5, resistant: true } } },
  troisiemeOeil: { nom: "Rune du troisième œil", cible: "armure", rangs: { apprenti: { reaction: 1 }, expert: { inspireEsquive: true } } },
  discretion: { nom: "Rune de discrétion", cible: "armure", rangs: { apprenti: { furtivite: 1 }, expert: { inspireFurtivite: true } } },
  poidsPlume: { nom: "Rune de poids plume", cible: "armure", rangs: { apprenti: { encombrement: -1 }, expert: { encombrement: -2 } } },
  manteauDuDemon: { nom: "Rune du manteau du démon", cible: "armure", rangs: { maitre: { effroi: true } } },
  colosse: { nom: "Rune du colosse", cible: "armure", rangs: { expert: { endurance: 10 } } }
};

/** Liste à plat des runes du livre (pour le pack de contenu et les choix). */
export function cataloguePlat() {
  const out = [];
  for (const [cle, r] of Object.entries(RUNES)) {
    for (const rang of Object.keys(r.rangs)) out.push({ cle, rang, cible: r.cible, nom: `${r.nom} (${RANGS_RUNE[rang]})`, emplacements: EMPLACEMENTS[rang] });
  }
  return out;
}

export const defRune = (cle, rang) => RUNES[cle]?.rangs?.[rang] ?? null;

/** Retrouve cle et rang d'un nom du type « Rune acérée (Apprenti) » ou « Rune de feu ». */
export function cleDepuisNom(nom) {
  const n = norm(nom);
  const rang = Object.entries(RANGS_RUNE).find(([, l]) => n.includes(norm(l)))?.[0] ?? null;
  const cle = Object.entries(RUNES).filter(([, r]) => n.includes(norm(r.nom))).sort((a, b) => b[1].nom.length - a[1].nom.length)[0]?.[0] ?? null;
  return { cle, rang };
}

/** Effets chiffrés d'une rune active (vide si elle n'est pas active ou inconnue). */
export function effetRune(rune) {
  const s = rune.system ?? rune;
  if (!s.active) return null;
  return defRune(s.cle, s.rang);
}

const itemsDe = (actorOuListe) => Array.from(actorOuListe?.items ?? actorOuListe ?? []);

/** Cumul des effets des runes d'armures actives, gravées sur une armure portée. */
export function effetsRunesArmures(actorOuListe) {
  const items = itemsDe(actorOuListe);
  const portees = new Set(items.filter(i => i.type === "armure" && i.system?.equipee).map(i => i.id));
  const t = { protection: 0, encombrement: 0, furtivite: 0, endurance: 0, reaction: 0, inspireEsquive: false, inspireFurtivite: false, effroi: false, resistant: false, sources: [] };
  for (const r of items) {
    if (r.type !== "rune" || r.system?.cible !== "armure" || !portees.has(r.system.objetId)) continue;
    const e = effetRune(r);
    if (!e) continue;
    t.sources.push(r.name);
    for (const k of ["protection", "encombrement", "furtivite", "endurance", "reaction"]) t[k] += e[k] ?? 0;
    for (const k of ["inspireEsquive", "inspireFurtivite", "effroi", "resistant"]) t[k] = t[k] || !!e[k];
  }
  return t;
}

/** Cumul des effets des runes actives d'une arme donnée (id de l'objet). */
export function effetsRunesArme(actorOuListe, armeId) {
  const t = { degatsPlus: 0, desPlus: 0, attaque: 0, inspireAttaque: false, perforant: false, pisseLeSang: false, destructionPR: 0, elem: [], parade: 0, inspireParade: false, handicapAttaquants: false, sources: [] };
  if (!armeId) return t;
  for (const r of itemsDe(actorOuListe)) {
    if (r.type !== "rune" || r.system?.cible !== "arme" || r.system.objetId !== armeId) continue;
    const e = effetRune(r);
    if (!e) continue;
    t.sources.push(r.name);
    for (const k of ["degatsPlus", "desPlus", "attaque", "destructionPR", "parade"]) t[k] += e[k] ?? 0;
    for (const k of ["inspireAttaque", "perforant", "pisseLeSang", "inspireParade", "handicapAttaquants"]) t[k] = t[k] || !!e[k];
    if (e.elem) t.elem.push(e.elem);
  }
  return t;
}

/** Parade et Esquive : bonus et Inspiration venant des runes (armes portées / armures portées). */
export function effetsRunesDefense(actorOuListe) {
  const items = itemsDe(actorOuListe);
  const armes = items.filter(i => i.type === "arme" && i.system?.equipee).map(i => effetsRunesArme(items, i.id));
  const arm = effetsRunesArmures(items);
  return {
    parade: Math.max(0, ...armes.map(a => a.parade)) + arm.reaction,
    inspireParade: armes.some(a => a.inspireParade),
    handicapAttaquants: armes.some(a => a.handicapAttaquants),
    esquive: arm.reaction,
    inspireEsquive: arm.inspireEsquive,
    effroi: arm.effroi
  };
}

/* ------------------------------ Gemmelite -------------------------------- */

export const GRADES_GEMMELITE = { commune: "Commune", rare: "Rare", pure: "Pure" };

/**
 * Degré de réussite appliqué au sort libéré (p. 169) :
 * commune : Apprenti simple ; rare : Apprenti majeure ou Expert simple ; pure : Apprenti critique ou Expert majeure. Jamais de sort de Maître.
 * @returns {"simple"|"majeure"|"critique"|null} null si le grade ne peut pas stocker ce niveau de sort
 */
export function degreGemmelite(grade, niveauSort) {
  const t = { commune: { apprenti: "simple" }, rare: { apprenti: "majeure", expert: "simple" }, pure: { apprenti: "critique", expert: "majeure" } };
  return t[grade]?.[niveauSort] ?? null;
}
