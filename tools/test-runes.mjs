// Runes et gemmelite : tests. Lancer : node tools/test-runes.mjs
import assert from "node:assert/strict";
import { RUNES, cataloguePlat, cleDepuisNom, effetsRunesArmures, effetsRunesArme, effetsRunesDefense, degreGemmelite } from "../module/runes.mjs";
const cat = cataloguePlat();
assert.equal(cat.filter(r => r.cible === "arme").length, 15);
assert.equal(cat.filter(r => r.cible === "armure").length, 11);
assert.deepEqual(cleDepuisNom("Rune acérée (Apprenti)"), { cle: "acere", rang: "apprenti" });
assert.deepEqual(cleDepuisNom("Rune du manteau du démon (Maître)"), { cle: "manteauDuDemon", rang: "maitre" });
assert.deepEqual(cleDepuisNom("Rune de feu (Expert)"), { cle: "feu", rang: "expert" });
const r = (id, cle, rang, objetId, active = true) => ({ id, type: "rune", name: cle, system: { cle, rang, cible: RUNES[cle].cible, objetId, active } });
const armure = { id: "A1", type: "armure", system: { equipee: true } }, epee = { id: "E1", type: "arme", system: { equipee: true } };
let items = [armure, epee, r("r1", "renforcement", "expert", "A1"), r("r2", "poidsPlume", "apprenti", "A1"), r("r3", "colosse", "expert", "A1", false),
  r("r4", "acere", "apprenti", "E1"), r("r5", "feu", "expert", "E1"), r("r6", "defense", "maitre", "E1")];
let a = effetsRunesArmures(items);
assert.equal(a.protection, 3); assert.equal(a.encombrement, -1); assert.equal(a.endurance, 0, "rune inactive : sans effet");
let w = effetsRunesArme(items, "E1");
assert.equal(w.degatsPlus, 2); assert.equal(w.elem.length, 1); assert.equal(w.elem[0].faces, 6);
assert.equal(effetsRunesArme(items, "AUTRE").degatsPlus, 0);
const d = effetsRunesDefense(items);
assert.equal(d.inspireParade, true); assert.equal(d.handicapAttaquants, true);
// armure non portée : ses runes ne comptent pas
armure.system.equipee = false;
assert.equal(effetsRunesArmures(items).protection, 0);
// gemmelite
assert.equal(degreGemmelite("commune", "apprenti"), "simple");
assert.equal(degreGemmelite("commune", "expert"), null);
assert.equal(degreGemmelite("rare", "apprenti"), "majeure");
assert.equal(degreGemmelite("rare", "expert"), "simple");
assert.equal(degreGemmelite("pure", "apprenti"), "critique");
assert.equal(degreGemmelite("pure", "expert"), "majeure");
assert.equal(degreGemmelite("pure", "maitre"), null);
console.log("✔ runes (26 au catalogue), cumul des effets, gemmelite : tests terminés sans erreur.");
