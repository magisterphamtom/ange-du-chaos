import assert from "node:assert/strict";
import { fusionnerContenus, fusionnerGuides, signatureExtensions } from "../module/extensions-regles.mjs";
const base = { adversaires: [{ nom: "A" }, { nom: "B" }], armes: [{ nom: "Épée" }] };
const r = fusionnerContenus(base, [{ adversaires: [{ nom: "C" }, { nom: "A" }], pretires: [{ nom: "P1" }] }, { adversaires: [{ nom: "D" }] }]);
assert.deepEqual(r.adversaires.map(x => x.nom), ["A", "B", "C", "D"]);
assert.deepEqual(r.pretires.map(x => x.nom), ["P1"]); assert.equal(r.armes.length, 1); assert.equal(base.adversaires.length, 2);
assert.deepEqual(fusionnerContenus(undefined, undefined), {});
assert.equal(fusionnerGuides([{ nom: "x" }], [{ guides: [{ nom: "y" }] }, null, {}]).length, 2);
assert.equal(signatureExtensions([{ id: "b", version: "1.0" }, { id: "a", version: "2" }]), "a@2|b@1.0");
console.log("test-extensions : OK");
// retrait des suppléments du monde
{
  const { acteursSupplements } = await import("../module/contenu-data.mjs");
  const acts = [{ id: "1", name: "Goule", contenu: true }, { id: "2", name: "Wendigo de Sang", contenu: true }, { id: "3", name: "Mon PNJ", contenu: false }];
  const r = acteursSupplements(acts, [{ nom: "Goule" }]);
  if (r.length !== 1 || r[0].id !== "2" || acteursSupplements(acts, []).length) { console.log("KO retrait suppléments"); process.exitCode = 1; } else console.log("OK retrait suppléments");
}
