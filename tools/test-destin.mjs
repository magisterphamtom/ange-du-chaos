// Banc d'essai du Nexus, du Hors-Destin, du repos et de la relance (bouchons de Foundry).
import assert from "node:assert/strict";
let reponses = [];
const messages = [];
globalThis.foundry = { applications: { api: { DialogV2: { prompt: async () => reponses.shift() } } }, utils: { escapeHTML: (s) => String(s) } };
globalThis.ui = { notifications: { warn: (m) => { throw new Error("warn: " + m); } } };
globalThis.CONFIG = { statusEffects: [{ id: "epuise", name: "Épuisé" }] };
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async (d) => { messages.push(d); return { ...d, getFlag: (s, k) => d.flags?.[s]?.[k], update: async () => {} }; } };
const defaut = (o, chemin, v) => { const k = chemin.split("."); let c = o; for (const x of k.slice(0, -1)) c = c[x] ??= {}; c[k.at(-1)] = v; };
const acteur = (system) => ({ id: "a1", name: "Vallyne", img: "x.webp", system, items: { filter: () => [], get: () => null },
  statuses: new Set(), isOwner: true, update: async function (m) { for (const [k, v] of Object.entries(m)) defaut(this, k.replace(/^system\./, "system."), v); } });
const a = acteur({ nexus: { value: 5, max: 5 }, horsDestin: { value: 1, max: 1 }, bonus: { horsDestin: 0 },
  endurance: { value: 38, max: 46 }, mana: { value: 4, max: 16 },
  derive: { competences: { carrure: { rang: 6, score: 12 }, artsEtranges: { score: 8, rang: 2, inapte: false }, esquive: { score: 9, rang: 3 } }, caracs: {} } });
globalThis.game = { actors: { get: (id) => (id === "a1" ? a : null), filter: () => [a] } };
globalThis.Hooks = { on() {}, once() {} };
const { depenserNexus, depenserHorsDestin, reposer, nouvelleSession } = await import("../module/destin.mjs");
const { lancerTest, relancerTest } = await import("../module/rolls.mjs");

// Nexus : dégâts −10
reponses = [{ usage: "degats", objet: "", etat: "" }];
await depenserNexus(a);
assert.equal(a.system.nexus.value, 4); assert.equal(a.system.endurance.value, 46);
// Hors-Destin : éviter la mort
reponses = [{ usage: "mort" }];
await depenserHorsDestin(a);
assert.equal(a.system.horsDestin.value, 0); assert.equal(a.system.bonus.horsDestin, -1);
// Repos : auberge (+3), pas de soigneur : END plafonnée, mana +11, Nexus plein
a.system.endurance.value = 20;
reponses = [{ condition: "auberge", soin: "aucun" }];
await reposer(a);
assert.equal(a.system.endurance.value, 35); assert.equal(a.system.mana.value, 15); assert.equal(a.system.nexus.value, 5);
// Repos hostile + catastrophe de soins : aucune récupération
a.system.endurance.value = 10;
reponses = [{ condition: "hostile", soin: "catastrophe" }];
await reposer(a);
assert.equal(a.system.endurance.value, 10);
// Nouvelle session
await nouvelleSession([a]);
assert.equal(a.system.horsDestin.value, a.system.horsDestin.max);
// Jet avec Nexus (Inspiration) puis relance
a.system.nexus.value = 3;
reponses = [{ nd: 15, bonus: 0, inspire: false, handicap: false, nexus: true }];
const m = await lancerTest(a, "competence", "esquive");
assert.equal(a.system.nexus.value, 2);
assert.equal(m.flags["ange-du-chaos"].jet.params.inspire, true);
assert.match(m.content, /Relancer — 1 Nexus/);
await relancerTest(m);
assert.equal(a.system.nexus.value, 1);
console.log("OK : Nexus, Hors-Destin, repos, session et relance.");
