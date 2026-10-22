// Vérifie les formules contre les exemples chiffrés du livre de base.
// Lancer : node tools/test-calc.mjs
import assert from "node:assert/strict";
import { enduranceBase, seuilFatigue, bonusDegats, manaMax, mouvement, gradeSelonMerite, deriver } from "../module/calc.mjs";

let n = 0;
const ok = (nom, fn) => { fn(); n++; console.log("✔", nom); };

ok("Endurance : table complète (p. 83)", () => {
  const attendu = [[5,10],[6,15],[7,15],[8,20],[9,20],[10,25],[11,25],[12,30],[13,30],[14,35],[15,35],
    [16,40],[17,40],[18,45],[19,45],[20,50],[21,55],[22,55],[23,60],[24,60],[25,65],[26,70],[27,75]];
  for (const [s, e] of attendu) assert.equal(enduranceBase(s), e, `CON+VOL=${s}`);
});

ok("Exemple Borréanas : CON 9 + VOL 7, Carrure 6 → 46 END, seuil 9 (p. 85)", () => {
  assert.equal(enduranceBase(16), 40);
  assert.equal(seuilFatigue(46), 9);
});

ok("Exemple Borréanas : Carrure 10 → 50 END, seuil 10 (p. 85)", () => {
  assert.equal(seuilFatigue(50), 10);
});

ok("Seuil de fatigue : paliers de 5", () => {
  const attendu = [[10,2],[14,2],[15,3],[19,3],[20,4],[25,5],[30,6],[35,7],[40,8],[45,9],[50,10],[55,11],[60,12]];
  for (const [e, s] of attendu) assert.equal(seuilFatigue(e), s, `END=${e}`);
});

ok("Bonus aux dégâts (p. 84)", () => {
  const attendu = [[1,-1],[2,-1],[3,0],[4,0],[5,1],[6,2],[7,3],[8,4],[9,6],[10,8],[11,10],[12,10],[13,11],[14,11],[15,12]];
  for (const [p, b] of attendu) assert.equal(bonusDegats(p), b, `PUI=${p}`);
});

ok("Exemple Sylvanthielle : VOL 9 + Arts étranges 7 = 16 → 32 mana (p. 86)", () => {
  assert.equal(manaMax(9 + 7), 32);
});

ok("Mouvement : ⌊(REF+PUI)/2⌋ − Encombrement", () => {
  assert.equal(mouvement(7, 6, 0), 6);
  assert.equal(mouvement(7, 6, 2), 4);
});

ok("Grades : 30 et 50 Mérite", () => {
  assert.equal(gradeSelonMerite(0).id, "maraudeur");
  assert.equal(gradeSelonMerite(29).id, "maraudeur");
  assert.equal(gradeSelonMerite(30).id, "capitaine");
  assert.equal(gradeSelonMerite(49).id, "capitaine");
  assert.equal(gradeSelonMerite(50).id, "ombre");
});

ok("deriver() : personnage complet", () => {
  const src = {
    caracs: { ref: {base:7}, con: {base:8}, pui: {base:6}, cha: {base:4}, int: {base:4}, vol: {base:6} },
    competences: { carrure: {rang:6}, esquive: {rang:7}, artsDuCombat: {rang:5}, artsEtranges: {rang:0} },
    merite: 32, bonus: { initiative: 3 }
  };
  const d = deriver(src, { bonusCaracs: { con: 1, vol: 1, ref: 1 }, encombrement: 1 });
  assert.equal(d.caracs.con.valeur, 9);
  assert.equal(d.caracs.vol.valeur, 7);
  assert.equal(d.enduranceMax, 40 + 6);
  assert.equal(d.seuilFatigue, 9);
  assert.equal(d.competences.esquive.score, 8 + 7);
  assert.equal(d.defensePassive, 15 - 1);
  assert.equal(d.initiative, (7 + 5) + 3 - 1);
  assert.equal(d.gradeLabel, "Capitaine-Maraudeur");
  assert.equal(d.horsDestinMax, 2);
});

console.log(`\n${n} groupes de tests réussis.`);
