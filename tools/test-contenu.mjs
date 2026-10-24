// Banc d'essai du contenu : mappe contenu.json vers des documents et vérifie les valeurs contre les listes fermées du système.
// Usage : node tools/test-contenu.mjs [chemin/vers/contenu.json]
import fs from "node:fs";
import { DISPONIBILITES, MAISONS, VOIES, COMPETENCES_ARMES, TYPES_DEGATS, NIVEAUX_SORT, CATEGORIES_ADVERSAIRE } from "../module/config.mjs";
import { documentsItems, documentsActeurs, cheminsDistincts } from "../module/contenu-data.mjs";
const chemin = process.argv[2] ?? "assets/contenu/contenu.json";
if (!fs.existsSync(chemin)) { console.log("contenu.json absent : test ignoré (pack d'assets privés non installé)."); process.exit(0); }
const c = JSON.parse(fs.readFileSync(chemin, "utf8")).contenu;
const items = documentsItems(c), acteurs = documentsActeurs(c);
let erreurs = 0;
const ko = (m) => { erreurs++; console.error("KO", m); };
for (const { data: d } of items) {
  const s = d.system;
  if (!d.name) ko("nom vide");
  if ("disponibilite" in s && !(s.disponibilite in DISPONIBILITES)) ko(`${d.name}: dispo ${s.disponibilite}`);
  if (d.type === "arme") {
    if (!(s.competence in COMPETENCES_ARMES)) ko(`${d.name}: compétence ${s.competence}`);
    if (!(s.typeDegats in TYPES_DEGATS)) ko(`${d.name}: type ${s.typeDegats}`);
    if (s.degats && !/^(\+ ?)?\d*d?\d+(\+\d+)?$/.test(s.degats) && !/^\d+d\d+(\+\d+)?$/.test(s.degats) && !/^\+\d+d?\d*$/.test(s.degats)) ko(`${d.name}: dégâts "${s.degats}"`);
  }
  if (d.type === "maison" && !(s.cle in MAISONS)) ko(`${d.name}: clé ${s.cle}`);
  if (d.type === "voie" && !(s.cle in VOIES)) ko(`${d.name}: clé ${s.cle}`);
  if (d.type === "sort" && !(s.niveau in NIVEAUX_SORT)) ko(`${d.name}: niveau ${s.niveau}`);
  if (d.type === "armure" && !(Number.isInteger(s.protection) && s.protection > 0)) ko(`${d.name}: protection`);
}
const FORMULE = /^\d+d\d+([+-]\d+)?(\+\d+d\d+)?(\+\d+)?$|^0$/;
for (const { data: d } of acteurs) {
  const s = d.system;
  if (!(s.categorie in CATEGORIES_ADVERSAIRE)) ko(`${d.name}: catégorie ${s.categorie}`);
  for (const k of ["ref", "con", "int", "pui", "cha", "vol"]) if (!Number.isInteger(s.caracs?.[k])) ko(`${d.name}: carac ${k}`);
  for (const w of [s.attaque, ...s.attaquesSup]) {
    if (!FORMULE.test(w.degats)) ko(`${d.name}: dégâts "${w.degats}"`);
    if (!Number.isInteger(w.score)) ko(`${d.name}: score d'attaque`);
  }
  for (const k of ["defensePassive", "initiative", "mouvement"]) if (!Number.isInteger(s[k])) ko(`${d.name}: ${k}`);
  if (!(s.endurance.max > 0) || !(s.actions >= 1) || typeof s.reaction !== "boolean") ko(`${d.name}: endurance/actions/réaction`);
}
const par = {}; for (const { data: d } of items) par[d.type] = (par[d.type] ?? 0) + 1;
console.log({ items: items.length, acteurs: acteurs.length, dossiers: cheminsDistincts([...items, ...acteurs]).length, par });
if (items.length < 250 || acteurs.length < 40) ko("effectifs trop bas");
// Création complète avec bouchons de Foundry.
const crees = { Folder: [], Item: [], Actor: [] }; let n = 0; const reglages = {};
const mk = (t) => ({ create: async (d) => { const doc = { ...d, id: `${t}${++n}` }; crees[t].push(doc); return doc; },
  createDocuments: async (l) => { l.forEach(d => crees[t].push({ ...d, id: `${t}${++n}` })); return l; }, deleteDocuments: async () => {} });
globalThis.Folder = mk("Folder"); globalThis.Item = mk("Item"); globalThis.Actor = mk("Actor");
globalThis.ui = { notifications: { warn: console.warn, info: (m) => console.log("info:", m) } };
globalThis.game = { user: { isGM: true }, items: [], actors: [], folders: [],
  settings: { set: async (s, k, v) => { reglages[k] = v; }, get: (s, k) => reglages[k], register() {} } };
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(chemin, "utf8")) });
const { creerContenu, CONTENU_VERSION } = await import("../module/contenu.mjs");
const ok = await creerContenu();
const ids = new Set(crees.Folder.map(f => f.id));
const orphelins = [...crees.Item, ...crees.Actor].filter(d => !ids.has(d.folder));
const mauvaisParent = crees.Folder.filter(f => f.folder && !crees.Folder.some(p => p.id === f.folder && crees.Folder.indexOf(p) < crees.Folder.indexOf(f)));
console.log({ ok, dossiers: crees.Folder.length, items: crees.Item.length, acteurs: crees.Actor.length, version: reglages.contenuVersion, attendue: CONTENU_VERSION });
if (!ok || orphelins.length || mauvaisParent.length || reglages.contenuVersion !== CONTENU_VERSION) ko("création incohérente");
if (erreurs) { console.error(`ÉCHEC : ${erreurs} erreur(s)`); process.exit(1); }
console.log("OK : contenu mappé, valeurs conformes aux listes du système.");
