// Banc d'essai du wiki : exécute creerWiki() avec des bouchons de Foundry et le vrai wiki.json (pack d'assets).
// Usage : node tools/test-wiki.mjs [chemin/vers/wiki.json]
import fs from "node:fs";
const chemin = process.argv[2] ?? "assets/wiki/wiki.json";
if (!fs.existsSync(chemin)) { console.log("wiki.json absent : test ignoré (pack d'assets privés non installé)."); process.exit(0); }
const data = JSON.parse(fs.readFileSync(chemin, "utf8"));
const creations = { Folder: [], JournalEntry: [] };
let n = 0;
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, OBSERVER: 2 }, JOURNAL_ENTRY_PAGE_FORMATS: { HTML: 1 } };
globalThis.ui = { notifications: { warn: console.warn, info: (m) => console.log("info:", m) } };
const mk = (type) => ({ create: async (d) => { const doc = { ...d, id: `${type}${++n}`, uuid: `${type}.${n}`, getFlag: (s, k) => d.flags?.[s]?.[k] }; creations[type].push(doc); return doc; },
  deleteDocuments: async () => {} });
globalThis.Folder = mk("Folder"); globalThis.JournalEntry = mk("JournalEntry");
const reglages = {};
globalThis.game = { user: { isGM: true }, modules: new Map(), journal: [], folders: [], world: { id: "w" },
  settings: { set: async (s, k, v) => { reglages[k] = v; }, get: (s, k) => reglages[k], register() {} } };
const guides = process.argv[3] && fs.existsSync(process.argv[3]) ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : null;
globalThis.fetch = async (url) => /guides\.json/.test(url) ? ({ ok: !!guides, json: async () => guides }) : ({ ok: true, json: async () => data });
globalThis.Hooks = { on() {}, once() {}, off() {} };
const { creerWiki, WIKI_VERSION } = await import("../module/wiki.mjs");
const ok = await creerWiki();
const entrees = creations.JournalEntry;
const pages = entrees.reduce((s, e) => s + e.pages.length, 0);
console.log({ ok, dossiers: creations.Folder.length, entrees: entrees.length, pages, version: reglages.wikiVersion, attendue: WIKI_VERSION });
if (!ok || entrees.length < 10 || pages < 50) { console.error("ÉCHEC"); process.exit(1); }
const accueil = entrees.find(e => e.flags?.["ange-du-chaos"]?.accueil === "joueurs");
if (!/@UUID\[JournalEntry\.\d+\]/.test(accueil.pages[0].text.content)) { console.error("Liens d'accueil absents"); process.exit(1); }
if (guides) {
  const mj = entrees.find(e => e.flags?.["ange-du-chaos"]?.accueil === "mj");
  const nb = guides.guides.reduce((s, g) => s + g.journaux.length, 0);
  if (!/Guides et campagnes/.test(mj.pages[0].text.content) || entrees.filter(e => e.flags?.["ange-du-chaos"]?.groupe === "mj").length < nb) { console.error("Guides absents de l'accueil MJ"); process.exit(1); }
  console.log(`OK : ${nb} journaux de guides créés, accueil MJ avec liens.`);
}
console.log("OK : wiki créé, accueil avec liens.");
