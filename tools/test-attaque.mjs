// Banc d'essai du flux d'attaque (bouchons de Foundry) : attaque → réaction → dégâts → application → états.
import assert from "node:assert/strict";
let reponses = [];
const messages = [];
const hooks = {};
const acteurs = {};
const poser = (o, chemin, v) => { const k = chemin.split("."); let c = o; for (const x of k.slice(0, -1)) c = c[x] ??= {}; c[k.at(-1)] = v; };
const lire = (o, chemin) => chemin.split(".").reduce((c, k) => c?.[k], o);
globalThis.foundry = { applications: { api: { DialogV2: { prompt: async () => reponses.shift() } } }, utils: { escapeHTML: (s) => String(s), getProperty: lire } };
globalThis.ui = { notifications: { warn: (m) => { throw new Error("warn: " + m); } } };
globalThis.CONFIG = { statusEffects: [{ id: "epuise", name: "Épuisé" }, { id: "portesDameMort", name: "Portes" }] };
globalThis.Hooks = { on: (n, f) => { hooks[n] = f; }, once: () => {} };
let seqDes = [];
const realRandom = Math.random;
Math.random = () => (seqDes.length ? seqDes.shift() : 0.5);
const mkMessage = (d) => ({ ...d, id: "m" + messages.length, isAuthor: true, getFlag: function (s, k) { return this.flags?.[s]?.[k]; },
  update: async function (u) { for (const [k, v] of Object.entries(u)) poser(this, k, v); } });
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async (d) => { const m = mkMessage(d); messages.push(m); return m; } };
const acteur = (uuid, type, name, system) => {
  const a = { uuid, id: uuid, type, name, img: "x.webp", system, items: [], statuses: new Set(), isOwner: true, hasPlayerOwner: type === "personnage", flags: {},
    getFlag: function (s, k) { return this.flags[k]; }, setFlag: async function (s, k, v) { this.flags[k] = v; }, unsetFlag: async () => {},
    update: async function (m) { const nested = {}; for (const [k, v] of Object.entries(m)) { poser(this, k, v); poser(nested, k, v); } await hooks.updateActor?.(this, nested); },
    toggleStatusEffect: async function (id, { active }) { active ? this.statuses.add(id) : this.statuses.delete(id); } };
  acteurs[uuid] = a; return a;
};
const arme = { type: "arme", name: "Épée longue", system: { competence: "lames1", degats: "3d6", equipee: true } };
const pj = acteur("A1", "personnage", "Greylock", {
  nexus: { value: 3, max: 5 }, endurance: { value: 46, max: 46, seuil: 9 },
  derive: { bonusDegats: 2, protection: 0, defensePassive: 14, competences: { lames1: { score: 19, rang: 8, inapte: false }, esquive: { score: 12, rang: 4 }, carrure: { score: 12, rang: 6 } } } });
pj.items = [{ ...arme, id: "w1" }]; pj.items.get = (id) => pj.items.find(i => i.id === id);
const gob = acteur("N1", "pnj", "Ikshite", { endurance: { value: 14, max: 14 }, seuilFatigue: 4, protection: 2, defensePassive: 12, bonusDegats: 1, attaque: { nom: "Sabre", score: 14, degats: "2d6" } });
globalThis.game = { user: { isGM: true, targets: { first: () => ({ actor: gob }) } }, users: { activeGM: { isSelf: true } },
  socket: { on() {}, emit() {} }, messages: { get: (id) => messages.find(m => m.id === id) } };
globalThis.fromUuid = async (u) => acteurs[u] ?? null;
const { attaquer, reagir, appliquerALaCible, lancerDernierSoupir, initialiserCombat } = await import("../module/attaque.mjs");
initialiserCombat();
assert.ok(hooks.updateActor && hooks.renderChatMessageHTML && hooks.combatTurnChange);

// Attaque brutale : handicap, +5 dégâts ; dé Destin forcé à 10 puis 1 (critique : 19 + 11 = 30 contre 12)
reponses = [{ action: "attaque", nd: 12, loc: "aucune", bonus: 0, dos: false, sol: false, submerge: false, inspire: false, handicap: false, nonLetal: false, nexus: false }];
seqDes = [0.95, 0.0]; // 10 puis 1
const m = await attaquer(pj, pj.items[0]);
const f = m.flags["ange-du-chaos"].attaque;
assert.equal(f.total, 19 + 11); assert.equal(f.degre, "critique"); assert.equal(f.touche, true);
assert.match(m.content, /data-reaction="esquive"/);
// Subir : dégâts 3d6 + 2d6 (critique) + 2
seqDes = Array(5).fill(0.99);
await reagir(m, "subir");
const carte = messages.at(-1);
assert.equal(carte.flags["ange-du-chaos"].degats.net, 30 + 2 - 2);   // 5 dés à 6 + bonus 2 − protection 2
assert.equal(m.flags["ange-du-chaos"].attaque.resolu, true);
await appliquerALaCible(carte);
assert.equal(gob.system.endurance.value, 0);
assert.ok(gob.statuses.has("epuise") && gob.statuses.has("portesDameMort"));
// Réaction d'Esquive : coûte 3 Endurance et peut tout éviter
const gobAtt = await (async () => {
  reponses = [{ action: "attaque", nd: 14, loc: "aucune", bonus: 0, dos: false, sol: false, submerge: false, inspire: false, handicap: false, nonLetal: false, nexus: false }];
  globalThis.game.user.targets = { first: () => ({ actor: pj }) };
  seqDes = [0.4]; // 5 + 14 = 19 contre 14
  return attaquer(gob, null);
})();
assert.equal(gobAtt.flags["ange-du-chaos"].attaque.touche, true);
seqDes = [0.95, 0.9, 0.0]; // Esquive : 10 + 10... évite largement
await reagir(gobAtt, "esquive");
assert.equal(pj.system.endurance.value, 43);
assert.match(messages.at(-1).content, /évite le coup/);
// PJ sous le Seuil de fatigue : plus de réaction
pj.system.endurance.value = 9;
const m3 = await (async () => { reponses = [{ action: "attaque", nd: 14, loc: "aucune", bonus: 0, dos: false, sol: false, submerge: false, inspire: false, handicap: false, nonLetal: false, nexus: false }]; seqDes = [0.4]; return attaquer(gob, null); })();
assert.match(m3.content, /disabled/);
// Dernier soupir déclenché automatiquement à 0
seqDes = [0.5];
await pj.update({ "system.endurance.value": 0 });
assert.equal(pj.system.endurance.value, 1);          // 12 + 6 = 18 : stabilisé à 1 point
assert.ok(!pj.statuses.has("portesDameMort"));        // sorti des Portes
assert.ok(messages.some(x => /Dernier soupir/.test(x.content)));
Math.random = realRandom;
console.log("OK : attaque, réaction, dégâts, application, états et Dernier soupir.");
