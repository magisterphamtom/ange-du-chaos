// Tests + simulation du moteur de jets. Lancer : node tools/test-jets.mjs
import assert from "node:assert/strict";
import { lancerDestin, resoudreTest } from "../module/jets.mjs";

/** RNG scripté : renvoie les faces données dans l'ordre. */
const script = (...faces) => { let i = 0; return () => (faces[i++] - 1 + 0.5) / 10; };

/* ---- exemples du livre ---- */
let r = lancerDestin({ rng: script(10, 10, 1) });
assert.equal(r.valeur, 21); // 10 + 10 + 1
r = resoudreTest({ score: 15, rng: script(10, 10, 1) });
assert.equal(r.total, 36); // 15 + 21 (le livre écrit 37 : voir ETAT.md, ambiguïté de l'exemple)
r = lancerDestin({ rng: script(1, 10, 8) });
assert.equal(r.valeur, -19);
r = resoudreTest({ score: 15, rng: script(1, 10, 8) });
assert.equal(r.total, -4);
assert.equal(r.catastrophe, true);
assert.equal(lancerDestin({ rng: script(10, 1) }).valeur, 11); // « +11 »
assert.equal(lancerDestin({ rng: script(5) }).valeur, 5);
assert.equal(lancerDestin({ rng: script(1, 10, 10, 3) }).valeur, -24);
assert.equal(lancerDestin({ rng: script(10, 7), bloque: true }).valeur, 10); // bloqué : pas de relance
console.log("✔ exemples du livre (chaînes de 10 et de 1, bloqué)");

/* ---- degrés (score 10, ND 15) ---- */
const deg = (face, o = {}) => resoudreTest({ score: 10, nd: 15, rng: script(face), ...o });
assert.equal(deg(4).degre, "echec");      // 14
assert.equal(deg(5).degre, "simple");     // 15
assert.equal(deg(9).degre, "simple");     // 19
assert.equal(resoudreTest({ score: 12, nd: 15, rng: script(8) }).degre, "majeure");   // 20 = ND+5
assert.equal(resoudreTest({ score: 17, nd: 15, rng: script(8) }).degre, "critique");  // 25 = ND+10
assert.equal(deg(5, { bonus: 5 }).degre, "majeure");
// catastrophe : total <= 0
assert.equal(resoudreTest({ score: 2, nd: 10, rng: script(1, 2) }).catastrophe, true); // 2 + (-3) = -1
assert.equal(resoudreTest({ score: 4, nd: 10, rng: script(1, 3) }).catastrophe, true); // 4 - 4 = 0
assert.equal(resoudreTest({ score: 5, nd: 10, rng: script(1, 3) }).catastrophe, false); // 5 - 4 = 1
console.log("✔ degrés et catastrophe");

/* ---- Inspiration / Handicap ---- */
let t = resoudreTest({ score: 10, nd: 15, inspire: true, rng: script(3, 8) });
assert.equal(t.destins.length, 2); assert.equal(t.de, 8); assert.equal(t.mode, "inspire");
t = resoudreTest({ score: 10, nd: 15, handicap: true, rng: script(3, 8) });
assert.equal(t.de, 3); assert.equal(t.mode, "handicap");
t = resoudreTest({ score: 10, nd: 15, inspire: true, handicap: true, rng: script(3) });
assert.equal(t.destins.length, 1); assert.equal(t.mode, "normal"); // s'annulent
// double 10 : critique automatique ; double 1 : catastrophe automatique
t = resoudreTest({ score: 1, nd: 30, inspire: true, rng: script(10, 5, 10, 5) });
assert.equal(t.double10, true); assert.equal(t.degre, "critique"); assert.equal(t.reussite, true);
t = resoudreTest({ score: 30, nd: 5, inspire: true, rng: script(1, 5, 1, 5) });
assert.equal(t.double1, true); assert.equal(t.degre, "catastrophe"); assert.equal(t.reussite, false);
// Inspiration : un 10 relancé est comparé à sa valeur finale
t = resoudreTest({ score: 10, inspire: true, rng: script(10, 4, 9) });
assert.equal(t.de, 14);
console.log("✔ Inspiration, Handicap, annulation, doubles 10 et 1");

/* ---- simulation : 1 000 000 de dés (graine fixe) ---- */
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry(20261019);
const N = 1_000_000;
let somme = 0, nbSourire = 0, nbCruel = 0, min = Infinity, max = -Infinity;
for (let i = 0; i < N; i++) {
  const d = lancerDestin({ rng });
  somme += d.valeur; min = Math.min(min, d.valeur); max = Math.max(max, d.valeur);
  if (d.oeil === "sourire") nbSourire++; if (d.oeil === "cruel") nbCruel++;
}
// Espérance théorique : chaîne F = 0,9×5 + 0,1×(10+F) = 6,11 ; E = 0,8×5,5 + 0,1×(10+F) − 0,1×(1+F) = 5,3
const theo = 5.3;
const moyenne = somme / N;
console.log(`  moyenne ${moyenne.toFixed(3)} (min ${min}, max ${max}) ; 10 initial ${(nbSourire / N * 100).toFixed(2)} % ; 1 initial ${(nbCruel / N * 100).toFixed(2)} %`);
assert.ok(Math.abs(nbSourire / N - 0.1) < 0.002 && Math.abs(nbCruel / N - 0.1) < 0.002);
assert.ok(Math.abs(moyenne - theo) < 0.05, `moyenne ${moyenne} vs théorique ${theo}`);
console.log(`✔ simulation : fréquences des « yeux » conformes, moyenne ${moyenne.toFixed(3)} ≈ théorique ${theo.toFixed(3)}`);

// Probabilité de réussite à ND 15, score 12 : comparaison Inspiration / normal / Handicap
const proba = (o) => { let ok = 0; for (let i = 0; i < 200000; i++) if (resoudreTest({ score: 12, nd: 15, rng, ...o }).reussite) ok++; return ok / 200000; };
const pN = proba({}), pI = proba({ inspire: true }), pH = proba({ handicap: true });
console.log(`  réussite score 12 vs ND 15 : normal ${(pN * 100).toFixed(1)} %, inspiré ${(pI * 100).toFixed(1)} %, handicapé ${(pH * 100).toFixed(1)} %`);
assert.ok(pI > pN && pN > pH);
console.log("✔ Inspiration > normal > Handicap");
console.log("\nTests du moteur de jets terminés sans erreur.");
