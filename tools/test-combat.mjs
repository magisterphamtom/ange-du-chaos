import assert from "node:assert/strict";
import { analyserDegats, degreAttaque, calculerDegats, appliquerDegats, reactionPossible, resoudreReaction, dernierSoupir, initiative, effetsDesEtats } from "../module/combat.mjs";
const seq = (a) => { let i = 0; return () => (a[i++] - 1 + 0.5) / 10; }; // d10
const seq6 = (a) => { let i = 0; return () => (a[i++] - 1 + 0.5) / 6; };

// Analyse des dégâts
assert.deepEqual(analyserDegats("2d6+1"), { n: 2, faces: 6, fixe: 1 });
assert.deepEqual(analyserDegats("3D8 - 2"), { n: 3, faces: 8, fixe: -2 });
assert.deepEqual(analyserDegats("d6"), { n: 1, faces: 6, fixe: 0 });
// Degrés d'attaque (exemples du livre : Greylock 30 vs 12 ⇒ critique ; Shen 20 vs 15 ⇒ majeure)
assert.equal(degreAttaque(30, 12), "critique");
assert.equal(degreAttaque(20, 15), "majeure");
assert.equal(degreAttaque(14, 15), "echec");
assert.equal(degreAttaque(15, 15), "simple");
// Dégâts : Greylock 4d6 + 2d6 + 7 ; Shen 3d8 + 1d8 + 7
const g = calculerDegats({ formule: "4d6", degre: "critique", bonusDegats: 7, rng: seq6([6, 6, 6, 6, 6, 6]) });
assert.equal(g.des.length, 6); assert.equal(g.brut, 36 + 7);
const s = calculerDegats({ formule: "3d8", degre: "majeure", bonusDegats: 7, rng: () => 0.99 });
assert.equal(s.des.length, 4); assert.equal(s.brut, 32 + 7);
// Protection, plancher à 0, armure ignorée
assert.equal(calculerDegats({ formule: "1d6", degre: "simple", protection: 5, rng: () => 0 }).net, 0);
assert.equal(calculerDegats({ formule: "2d6+1", degre: "simple", bonusDegats: 2, protection: 3, rng: seq6([3, 4]) }).net, 3 + 4 + 1 + 2 - 3);
assert.equal(calculerDegats({ formule: "2d6", degre: "simple", protection: 4, ignoreArmure: true, rng: seq6([3, 3]) }).net, 6);
// Frappe brutale +5, tête +2 dés
assert.equal(calculerDegats({ formule: "1d6", degre: "simple", ajust: 5, desEnPlus: 2, rng: seq6([1, 1, 1]) }).brut, 8);
// Endurance : seuil, 0, non létal
assert.deepEqual(appliquerDegats({ endurance: 46, seuil: 9, degats: 40 }), { avant: 46, apres: 6, epuise: true, portes: false, inconscient: false });
assert.equal(appliquerDegats({ endurance: 5, seuil: 3, degats: 9 }).portes, true);
const nl = appliquerDegats({ endurance: 5, seuil: 3, degats: 9, nonLetal: true });
assert.equal(nl.apres, 1); assert.equal(nl.portes, false); assert.equal(nl.inconscient, true);
// Réactions : strictement supérieur
assert.equal(reactionPossible({ endurance: 10, seuil: 9 }), true);
assert.equal(reactionPossible({ endurance: 9, seuil: 9 }), false);
const r1 = resoudreReaction({ totalAttaque: 15, scoreReaction: 10, rng: seq([5]) }); // 15, égalité : l'attaquant gagne
assert.equal(r1.evite, false); assert.equal(r1.degreSiTouche, "simple");
const r2 = resoudreReaction({ totalAttaque: 15, scoreReaction: 10, rng: seq([6]) }); // 16
assert.equal(r2.evite, true);
// Dernier soupir
assert.equal(dernierSoupir({ scoreCarrure: 10, seuil: 9, rng: seq([5]) }).issue, "stabilise");      // 15 = ND, simple
assert.equal(dernierSoupir({ scoreCarrure: 12, seuil: 9, rng: seq([8]) }).issue, "conscient");      // 20, majeure
assert.deepEqual(((x) => [x.issue, x.endurance])(dernierSoupir({ scoreCarrure: 12, seuil: 9, rng: seq([10, 3]) })), ["souffle", 10]); // 25 critique
assert.equal(dernierSoupir({ scoreCarrure: 12, seuil: 9, secondSouffleUtilise: true, rng: seq([10, 3]) }).issue, "conscient");
assert.equal(dernierSoupir({ scoreCarrure: 10, seuil: 9, rng: seq([2]) }).issue, "agonie");
assert.equal(dernierSoupir({ scoreCarrure: 3, seuil: 9, rng: seq([1, 10, 8]) }).issue, "mort");
// Initiative : départage par score puis PJ avant PNJ
const a = initiative({ score: 12, joueur: true, rng: seq([5]) }), b = initiative({ score: 14, joueur: false, rng: seq([3]) });
assert.equal(a.rang, 17); assert.equal(b.rang, 17); assert.ok(b.valeur > a.valeur);
const c = initiative({ score: 12, joueur: true, rng: seq([5]) }), d = initiative({ score: 12, joueur: false, rng: seq([5]) });
assert.ok(c.valeur > d.valeur);
// États
const e = effetsDesEtats(new Set(["epuise", "trouilleBleue", "demoralise"]), { physique: true });
assert.deepEqual([e.handicap, e.bloque, e.sansInspiration], [true, true, true]);
assert.equal(effetsDesEtats(new Set(["epuise"]), { physique: false }).handicap, false);
console.log("OK : règles de combat.");
