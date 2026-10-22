// Académies de magie : table, académie effective, effets dérivés, assistant.
import assert from "node:assert/strict";
import { ACADEMIES, ACADEMIES_CHOISISSABLES, academieDe, coutMana, sourceEnseignee } from "../module/academies.mjs";
import { cumulerEffets } from "../module/effets.mjs";
import { etatInitial, agir, academieEff, erreursEtape, nomsAvecEffets, rangs } from "../module/creation-data.mjs";
import { vueHTML } from "../module/creation-html.mjs";
import fs from "node:fs";
const c = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).contenu;

assert.equal(Object.keys(ACADEMIES).length, 8);
assert.deepEqual(ACADEMIES.eodh.interdites, ["Sang"]);
assert.deepEqual(ACADEMIES.eodh.enseignees, ["Éléments", "Cycles", "Ombres"]);
assert.equal(academieDe({ voie: "sorcier" }), "eodh");
assert.equal(academieDe({ voie: "sorcier", fortune: "Sœur grise" }), "claire-aube");
assert.equal(academieDe({ voie: "sorcier", academie: "ambre" }), "ambre");
assert.equal(academieDe({ voie: "duelliste" }), "");
assert.equal(academieDe({ voie: "duelliste", academie: "gar-vallon" }), "gar-vallon");
assert.deepEqual(ACADEMIES_CHOISISSABLES.sort(), ["ambre", "arbre-monde", "gar-vallon", "guelfe-blanche", "pendarakh"]);

// effets dérivés
assert.equal(cumulerEffets(["academie:gar-vallon"]).mana, 3);
assert.equal(cumulerEffets(["academie:gar-vallon"]).rang.erudition, 1);
assert.equal(cumulerEffets(["academie:eodh"]).rang.beauParleur ?? 0, 0, "Eodh : le rang vient de la Voie, pas dérivé");
// coût en mana
assert.deepEqual(coutMana("eodh", "Ombres", 3), { mana: 2, reduit: true });
assert.deepEqual(coutMana("eodh", "Éléments", 3), { mana: 3, reduit: false });
assert.deepEqual(coutMana("eodh", "Ombres", 0), { mana: 0, reduit: false });
assert.ok(sourceEnseignee("ambre", "Inanimé") && !sourceEnseignee("ambre", "Sang") && sourceEnseignee("ambre", "Communs"));

// assistant
const e = etatInitial(); e.voie = "sorcier"; e.maison = "garthe";
assert.equal(academieEff(e), "eodh");
assert.equal(rangs(e, "merite").beauParleur, 1, "Eodh : +1 Beau-parleur");
e.fortune = "Académie magique";
assert.ok(erreursEtape(e, 5, c).some(x => /académie/i.test(x)));
agir(e, "academie", { val: "eodh" }, c); assert.equal(e.academie, "", "Eodh non choisissable");
agir(e, "academie", { val: "gar-vallon" }, c);
assert.equal(academieEff(e), "gar-vallon");
assert.equal(rangs(e, "merite").beauParleur, 0, "autre académie : plus de bonus Eodh");
assert.ok(nomsAvecEffets(e, c).includes("academie:gar-vallon"));
assert.ok(!erreursEtape(e, 5, c).some(x => /académie/i.test(x)));
const html = vueHTML({ ...e, etape: 5 }, c); assert.match(html, /Gar-Vallon/);
agir(e, "champ", { champ: "fortune", val: "Coriace" }, c); assert.equal(e.academie, "");
// fortune non Sorcier
const f = etatInitial(); f.voie = "duelliste"; f.fortune = "Académie magique";
assert.ok(erreursEtape(f, 5, c).some(x => /Sorcier/.test(x)));
// contenu : les 4 Fortunes en « A » sont présentes
for (const n of ["Académie magique", "Ambidextrie naturelle", "Artiste martial", "Aura des Puissants"]) assert.ok(c.fortunes.some(x => x.nom === n), n);
console.log("OK : académies de magie.");
