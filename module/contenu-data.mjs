/**
 * Contenu du livre → données de documents Foundry. Fonctions pures (testables sans Foundry).
 * Les textes viennent de `assets/contenu/contenu.json` (pack d'assets privé, jamais dans le dépôt).
 */
import { iconeObjet } from "./icones.mjs";
export const DOSSIER_RACINE = "L'Ange du Chaos — Contenu";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Texte brut (retours à la ligne) → paragraphes HTML. */
export const para = (t) => String(t ?? "").split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
const DISPOS = new Set(["courant", "commun", "rare", "introuvable", "nd"]);
const dispo = (d) => (DISPOS.has(d) ? d : "nd");
const TYPES = new Set(["P", "T", "I"]);

const TITRES_SORTS = { apprenti: "Apprenti", expert: "Expert", maitre: "Maître" };

/** Chaque entrée : { dossier: [chemin…], doc: données du document }. */
export function documentsItems(c) {
  const out = [];
  const add = (type, chemin, name, system, extra = {}) => out.push({ doc: "Item", chemin, data: { name, type, img: iconeObjet(type, system, name), system, ...extra } });

  for (const a of c.armes ?? []) {
    add("arme", ["Armes", a.categorie === "tir" ? "À distance" : "De contact"], a.nom, {
      categorie: a.categorie, competence: a.competence, degats: a.degats || "",
      typeDegats: TYPES.has(a.typeDegats) ? a.typeDegats : "I", capacites: a.capacites || "",
      puissanceRequise: a.puissanceRequise || 0, porteeEffective: a.porteeEffective || "", porteeMax: a.porteeMax || "",
      disponibilite: dispo(a.disponibilite), cout: a.cout || "", description: ""
    });
  }
  for (const a of c.armures ?? []) {
    add("armure", ["Armures"], a.nom, {
      protection: a.protection, encombrement: a.encombrement || 0, localisation: a.localisation || "To",
      categorieProtection: TYPES.has(a.types?.[0]) ? a.types[0] : "", capacites: a.capacites || "",
      disponibilite: dispo(a.disponibilite), cout: a.cout || "",
      description: a.types?.length ? `<p>Protection contre : ${esc(a.types.join(", "))}.</p>` : ""
    });
  }
  for (const b of c.boucliers ?? []) {
    add("bouclier", ["Boucliers"], b.nom, {
      bonusDefense: b.bonusDefense || 0, resistance: b.resistance || 0, capacites: b.capacites || "", cout: b.cout || "",
      description: `<p>Dégâts : ${esc(b.degats)} (${esc(b.typeDegats)}). Disponibilité : ${esc(b.dispo)}.</p>`
    });
  }
  for (const e of c.equipement ?? []) {
    add("equipement", ["Équipement"], e.nom, { quantite: 1, cout: e.cout || "", disponibilite: dispo(e.dispo), description: para(e.description) });
  }
  for (const d of c.drogues ?? []) {
    add("drogue", ["Drogues"], d.nom, {
      toxicite: d.toxicite || "", addiction: d.addiction || "", dependance: d.dependance || "", origine: d.origine || "",
      rarete: d.rarete || "", prix: d.prix || "", inoculation: d.inoculation || "", duree: d.duree || "", manque: d.manque || "",
      effets: para(d.effets), description: ""
    });
  }
  for (const s of c.sorts ?? []) {
    add("sort", ["Sorts", s.source, TITRES_SORTS[s.niveau] ?? "Apprenti"], s.nom, {
      source: s.source, niveau: TITRES_SORTS[s.niveau] ? s.niveau : "apprenti", mana: s.mana || 0, difficulte: s.difficulte || 0,
      portee: s.portee || "", incantation: s.incantation || "", cible: s.cible || "", duree: s.duree || "", degats: "",
      effet: para(s.effet), description: ""
    });
  }
  for (const a of c.artsmartiaux ?? []) {
    add("artmartial", ["Arts martiaux"], a.nom, {
      effetPermanent: { nom: a.effetPermanent?.nom || "", description: para(a.effetPermanent?.description) },
      coupSpecial: { nom: a.coupSpecial?.nom || "", actions: a.coupSpecial?.actions || "", duree: a.coupSpecial?.duree || "", description: para(a.coupSpecial?.description) },
      description: ""
    });
  }
  for (const t of c.talents ?? []) {
    add("talent", ["Talents"], t.nom, { origine: t.origine || "", description: t.description || "", paliers: "" });
  }
  for (const f of c.fortunes ?? []) add("fortune", ["Fortunes"], f.nom, { description: para(f.description) });
  for (const f of c.maledictions ?? []) add("malediction", ["Malédictions"], f.nom, { description: para(f.description) });
  for (const m of c.maisons ?? []) {
    add("maison", ["Maisons"], m.nom, { cle: m.cle, description: m.description || "", competences: m.competences || "", talentsSecrets: m.talentsSecrets || "" });
  }
  for (const v of c.voies ?? []) {
    add("voie", ["Voies"], v.nom, { cle: v.cle, description: v.description || "", competences: v.competences || "", talent: `<h3>${esc(v.talent?.nom)}</h3>${v.talent?.description || ""}` });
  }
  return out;
}

export function documentsActeurs(c) {
  return (c.adversaires ?? []).map(a => ({
    doc: "Actor", chemin: [a.section],
    data: {
      name: a.nom, type: "creature",
      system: {
        categorie: a.categorie, plan: a.plan, espece: a.section,
        endurance: { value: a.endurance, max: a.endurance }, protection: a.protection, defensePassive: a.defensePassive,
        initiative: a.initiative, mouvement: a.mouvement,
        attaque: { nom: a.attaque?.nom || "Attaque", score: a.attaque?.score ?? 10, degats: a.attaque?.degats || "2d6" },
        competences: (a.competences ?? []).map(k => ({ nom: k.nom, score: k.score })),
        talents: a.talents || "",
        notes: `<p>NEXUS : ${a.nexus ?? 0} — Actions par tour : ${a.actions ?? 1}.</p>`
      }
    }
  }));
}

/** Liste des chemins de dossiers distincts (pour les créer d'abord), par type de document. */
export function cheminsDistincts(docs) {
  const s = new Set();
  for (const d of docs) for (let i = 1; i <= d.chemin.length; i++) s.add(JSON.stringify([d.doc, ...d.chemin.slice(0, i)]));
  return [...s].map(x => JSON.parse(x));
}
