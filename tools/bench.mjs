// Banc d'essai hors Foundry : bouchons minimaux de `foundry`, `Hooks`, `CONFIG`, `Handlebars`,
// puis exécution du hook `init`, construction des schémas et calcul des données dérivées.
// Lancer : node tools/bench.mjs   (npm i handlebars requis dans un dossier parent pour la précompilation)
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- bouchons ------------------------------------------------------------ */
class DataField { constructor(opts = {}) { Object.assign(this, { label: "", ...opts }); } }
class StringField extends DataField {}
class HTMLField extends StringField {}
class NumberField extends DataField {}
class BooleanField extends DataField {}
class ArrayField extends DataField { constructor(el, o) { super(o); this.element = el; } }
class SchemaField extends DataField { constructor(fields, o) { super(o); this.fields = fields; } }
class TypeDataModel {}
const enregistrements = [];
globalThis.foundry = {
  data: { fields: { DataField, StringField, HTMLField, NumberField, BooleanField, ArrayField, SchemaField } },
  abstract: { TypeDataModel },
  applications: {
    api: { HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: {} },
    sheets: { ActorSheetV2: class { static DEFAULT_OPTIONS = {}; }, ItemSheetV2: class { static DEFAULT_OPTIONS = {}; } },
    apps: { DocumentSheetConfig: { registerSheet: (...a) => enregistrements.push(a) } },
    handlebars: { loadTemplates: async (t) => { globalThis.__partiels = t; } },
    ux: { TextEditor: { implementation: { enrichHTML: async (h) => h, getDragEventData: () => ({}) } } }
  },
  utils: { getProperty: (o, p) => p.split(".").reduce((a, k) => a?.[k], o), escapeHTML: (s) => s, deepClone: (o) => structuredClone(o) }
};
const crochets = {};
globalThis.Hooks = { once: (n, f) => (crochets[n] = f), on: (n, f) => (crochets[n] = f) };
globalThis.CONFIG = { Actor: { dataModels: {}, documentClass: class Actor {} }, Item: { dataModels: {}, documentClass: class Item {} } };
const aides = {};
globalThis.Handlebars = { registerHelper: (n, f) => (aides[n] = f) };
globalThis.game = { i18n: { localize: (s) => s } };
globalThis.ui = { notifications: {} };

/* ---- 1. init ---------------------------------------------------------------- */
await import(join(racine, "module/ange-du-chaos.mjs"));
crochets.init();
assert.deepEqual(Object.keys(CONFIG.Actor.dataModels).sort(), ["creature", "personnage", "pnj"]);
assert.equal(Object.keys(CONFIG.Item.dataModels).length, 12);
assert.equal(CONFIG.statusEffects.length, 10);
assert.equal(enregistrements.length, 4);
assert.ok(globalThis.__partiels["adc-section"].endsWith("section.hbs"));
assert.equal(aides.adcSigne(3), "+3");
console.log("✔ init : modèles, états, fiches et partiel enregistrés");

/* ---- 2. schémas : chaque modèle se construit ------------------------------------ */
const modeles = { ...CONFIG.Actor.dataModels, ...CONFIG.Item.dataModels };
for (const [type, M] of Object.entries(modeles)) {
  const schema = M.defineSchema();
  assert.ok(Object.keys(schema).length > 0, type);
}
console.log(`✔ ${Object.keys(modeles).length} schémas construits`);

/* ---- 3. données dérivées du personnage -------------------------------------------- */
const P = CONFIG.Actor.dataModels.personnage;
const sch = P.defineSchema();
assert.equal(Object.keys(sch.competences.fields).length, 36);
assert.equal(Object.keys(sch.caracs.fields).length, 6);

const pj = Object.create(P.prototype);
Object.assign(pj, {
  maison: "garthe", voie: "protecteur",
  caracs: { ref: {base:6}, con: {base:7}, pui: {base:6}, cha: {base:4}, int: {base:4}, vol: {base:5} },
  competences: Object.fromEntries(Object.keys(sch.competences.fields).map(k => [k, { rang: 0 }])),
  merite: 0, bonus: { initiative:0, mouvement:0, defense:0, degats:0, endurance:0, mana:0, nexus:0, horsDestin:0 },
  nexus: { value: 5, max: 5 }, endurance: { value: 20 }, mana: { value: 0 }, horsDestin: { value: 1 },
  parent: { items: [
    { type: "armure", system: { equipee: true, protection: 12, encombrement: 2 } },
    { type: "armure", system: { equipee: false, protection: 30, encombrement: 9 } },
    { type: "bouclier", system: { equipee: true, bonusDefense: 2 } }
  ] }
});
pj.competences.carrure.rang = 6;
pj.competences.esquive.rang = 5;
pj.competences.armures.rang = 4; // score = CON 9 (7+1 formation+1 Garthe... voir ci-dessous) + 4
pj.prepareDerivedData();
const d = pj.derive;
// CON = 7 + 1 (formation) + 1 (Garthe) + 1 (Protecteur) = 10 ; VOL = 5 + 1 = 6 ; REF = 6 + 1 = 7 ; PUI = 6
assert.equal(d.caracs.con.valeur, 10);
assert.equal(d.caracs.vol.valeur, 6);
assert.equal(d.caracs.ref.valeur, 7);
assert.equal(d.enduranceMax, 40 + 6);           // CON+VOL=16 → 40, + Carrure 6
assert.equal(d.seuilFatigue, 9);
assert.equal(pj.endurance.max, 46);
assert.equal(d.encombrement, 2);                 // seule l'armure équipée compte, PR 12 ≤ Armures 14
assert.equal(d.armureTropLourde, false);
assert.equal(d.defensePassive, (7 + 5) + 2 - 2); // Esquive 12 + bouclier 2 - ENC 2
assert.equal(d.bonusDegats, 2);                  // PUI 6
console.log("✔ personnage : Endurance 46, Seuil 9, Défense 12, ENC 2, bonus dégâts +2");

pj.parent.items[0].system.protection = 20;       // > score Armures (10+4 = 14) → +3 d'Encombrement
pj.prepareDerivedData();
assert.equal(pj.derive.armureTropLourde, true);
assert.equal(pj.derive.encombrement, 2 + 3);
console.log("✔ armure trop lourde : +3 d'Encombrement");

pj.merite = 31; pj.prepareDerivedData();
assert.equal(pj.derive.gradeLabel, "Capitaine-Maraudeur");
assert.equal(pj.horsDestin.max, 2);
console.log("✔ grade et Hors-Destin selon le Mérite");

/* ---- 4. templates Handlebars : compilation ----------------------------------------- */
let HB;
try { HB = (await import("handlebars")).default; } catch { HB = null; }
if (!HB) {
  console.log("⚠ module « handlebars » absent : précompilation des templates ignorée");
} else {
  const aidesFoundry = ["selectOptions", "formInput", "adcEq", "adcGt", "adcSigne", "localize"];
  for (const h of aidesFoundry) HB.registerHelper(h, () => "");
  const parcourir = (dir) => readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? parcourir(p) : p.endsWith(".hbs") ? [p] : [];
  });
  let n = 0;
  for (const f of parcourir(join(racine, "templates"))) {
    HB.precompile(readFileSync(f, "utf8"));
    n++;
  }
  console.log(`✔ ${n} templates Handlebars précompilés sans erreur`);
}

/* ---- 5. cohérence des fichiers -------------------------------------------------------- */
const sys = JSON.parse(readFileSync(join(racine, "system.json"), "utf8"));
assert.equal(sys.id, "ange-du-chaos");
assert.deepEqual(Object.keys(sys.documentTypes.Actor).sort(), Object.keys(CONFIG.Actor.dataModels).sort());
assert.deepEqual(Object.keys(sys.documentTypes.Item).sort(), Object.keys(CONFIG.Item.dataModels).sort());
JSON.parse(readFileSync(join(racine, "lang/fr.json"), "utf8"));
console.log("✔ system.json cohérent avec les modèles ; lang/fr.json valide");
console.log("\nBanc d'essai terminé sans erreur.");

/* ---- 6. onglets maison : bascule de classes sur un faux DOM -------------------------- */
{
  const { appliquerOnglet } = await import(join(racine, "module/sheets/onglets.mjs"));
  const el = (tab, actif = false) => {
    const cl = new Set(actif ? ["active"] : []);
    return { dataset: { tab }, classList: { toggle: (c, on) => (on ? cl.add(c) : cl.delete(c)), has: (c) => cl.has(c) } };
  };
  const ids = ["caracteristiques", "profil", "combat", "equipement", "magie", "biographie"];
  const boutons = ids.map((i, n) => el(i, n === 0)), sections = ids.map((i, n) => el(i, n === 0));
  const racine2 = { querySelectorAll: (s) => (s === ".adc-tab" ? boutons : sections) };
  for (const i of ids) {
    assert.equal(appliquerOnglet(racine2, i), true);
    assert.deepEqual(sections.filter(s => s.classList.has("active")).map(s => s.dataset.tab), [i]);
    assert.deepEqual(boutons.filter(s => s.classList.has("active")).map(s => s.dataset.tab), [i]);
  }
  assert.equal(appliquerOnglet(racine2, "inconnu"), false);
  console.log("✔ onglets : les 6 onglets basculent, un onglet inconnu ne casse rien");
}

/* ---- 7. chaque gabarit de fiche = un seul élément racine (exigence d'ApplicationV2) ---- */
for (const f of ["personnage", "pnj"]) {
  const t = readFileSync(join(racine, `templates/actor/${f}.hbs`), "utf8").trim();
  assert.match(t, /^<div class="adc-/, f);
  assert.match(t, /<\/div>$/, f);
}
console.log("✔ gabarits de fiche : racine unique");
