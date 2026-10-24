import assert from "node:assert/strict";
import { coutDuSort, peutLancer, consequencesSort, detailsSortHTML } from "../module/sorts.mjs";
assert.equal(coutDuSort("eodh", { source: "Ombres", mana: 3 }), 2);
assert.equal(coutDuSort("eodh", { source: "Éléments", mana: 3 }), 3);
assert.equal(coutDuSort("", { source: "Ombres", mana: 3 }), 3);
assert.ok(peutLancer(5, 5) && !peutLancer(4, 5) && peutLancer(null, 9));
let c = consequencesSort({ manaActuel: 10, enduranceActuelle: 30, cout: 3, degre: "simple" });
assert.deepEqual([c.mana, c.endurance, c.perte, c.issue], [7, 30, 0, "reussite"]);
c = consequencesSort({ manaActuel: 10, enduranceActuelle: 30, cout: 3, degre: "echec" });
assert.deepEqual([c.mana, c.endurance, c.issue], [7, 30, "echec"]); assert.match(c.ligne, /raté/);
c = consequencesSort({ manaActuel: 10, enduranceActuelle: 2, cout: 4, degre: "catastrophe" });
assert.deepEqual([c.mana, c.endurance, c.perte, c.issue], [6, 0, 4, "catastrophe"]);
c = consequencesSort({ manaActuel: null, enduranceActuelle: 20, cout: 3, degre: "simple" }); assert.equal(c.mana, null);
assert.match(detailsSortHTML({ portee: "10 m", effet: "a\nb" }), /10 m.*a<br>b/s);
console.log("OK : lancer un sort (mana, échec, catastrophe).");

/* ---- difficulté automatique ---- */
import { analyserDifficulte, difficulteDepuisCible, SORTS_DEGATS } from "../module/sorts.mjs";
const A = (effet, difficulte = 0) => analyserDifficulte({ difficulte, effet });
assert.deepEqual([A("", 15).mode, A("", 15).nd], ["fixe", 15]);
assert.equal(A("Difficulté : Défense passive de la cible. Élément : Feu.").mode, "defense");
let a = A("Difficulté : 15 + Volonté de la cible. Une violente attaque");
assert.deepEqual([a.mode, a.base, a.carac], ["carac", 15, "vol"]);
a = A("Difficulté : 10 + Charme de la cible. Avec un test");
assert.deepEqual([a.mode, a.base, a.carac], ["carac", 10, "cha"]);
a = A("Difficulté : Opposé. Le sorcier doit réussir un test d’Arts étranges opposé à la Résilience de la cible.");
assert.deepEqual([a.mode, a.competence], ["opposeCompetence", "resilience"]);
a = A("Difficulté : Opposé. Avec un test d’Arts étranges réussi, opposé à un test de Sagacité de la cible, celle-ci");
assert.deepEqual([a.mode, a.competence], ["opposeCompetence", "sagacite"]);
assert.equal(A("Difficulté : Opposée à un test d’attaque. Ce sort crée un bouclier").mode, "opposeAttaque");
assert.equal(A("Difficulté : Variable. Avec Para-Magica").mode, "variable");
assert.equal(A("Difficulté : Opposé. Il peut faire un test d’Arts étranges opposé au test d’attaque d’un adversaire.").mode, "opposeAttaque");
assert.equal(A("Texte sans difficulté").mode, "inconnu");

const cible = { defense: 14, carac: (c) => ({ vol: 6, cha: 5 }[c] ?? null), competence: (c) => (c === "resilience" ? 11 : null) };
assert.equal(difficulteDepuisCible(A("Difficulté : Défense passive de la cible."), cible).nd, 14);
assert.equal(difficulteDepuisCible(A("Difficulté : 15 + Volonté de la cible."), cible).nd, 21);
assert.equal(difficulteDepuisCible(A("Difficulté : 10 + Charme de la cible."), cible).nd, 15);
assert.equal(difficulteDepuisCible(A("Difficulté : Défense passive de la cible."), null).nd, null);
assert.match(difficulteDepuisCible(A("Difficulté : Défense passive de la cible."), null).note, /cible/);
let r = difficulteDepuisCible(A("Difficulté : Opposé. opposé à la Résilience de la cible."), cible, (score) => ({ total: score + 3 }));
assert.deepEqual([r.nd, r.opposition.total], [14, 14]);
r = difficulteDepuisCible(A("Difficulté : Opposé. opposé à un test de Sagacité de la cible"), cible, (s) => ({ total: s }));
assert.equal(r.nd, null); // score de Sagacité inconnu → à fixer par le Meneur
r = difficulteDepuisCible(A("Difficulté : Opposé. opposé à la Résilience de la cible."), cible, () => ({ total: -2, catastrophe: true }));
assert.equal(r.nd, 1); // la cible rate : le sorcier réussit sauf catastrophe
assert.equal(difficulteDepuisCible(A("Difficulté : Variable."), cible).nd, null);
assert.equal(Object.keys(SORTS_DEGATS).length, 9);
console.log("OK : difficulté automatique des sorts (fixe, Défense passive, carac. de la cible, opposé).");
