// Fabrique les compendiums (packs LevelDB) d'un module de supplément à partir de son data/contenu.json.
// Usage : node tools/construire-packs.mjs <contenu-base.json> <dossier-module> [dossier-cli-node_modules]
// Produit <module>/packs/adversaires (+ packs/pretires s'il y a des prétirés) et met à jour module.json (packs).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { pathToFileURL } from "node:url";
import { documentsItems, documentsActeurs, documentsPretires, cheminsDistincts } from "../module/contenu-data.mjs";
const [base, mod, cliDir = "/tmp/claude-0/pk/node_modules/@foundryvtt/foundryvtt-cli"] = process.argv.slice(2);
const { compilePack } = await import(pathToFileURL(path.join(cliDir, "index.mjs")).href);
const cBase = JSON.parse(fs.readFileSync(base, "utf8")).contenu;
const cMod = JSON.parse(fs.readFileSync(path.join(mod, "data/contenu.json"), "utf8")).contenu;
const id = (s) => crypto.createHash("sha1").update(s).digest("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
const now = Date.now();
const stats = { coreVersion: "14.369", systemId: "ange-du-chaos", systemVersion: "0.29.0", createdTime: now, modifiedTime: now, lastModifiedBy: null };

function documentsPack(docs, nomPack) {
  const out = [], dossiers = new Map();
  for (const chemin of cheminsDistincts(docs)) {
    const [, ...reste] = chemin;
    const parent = reste.length > 1 ? dossiers.get(JSON.stringify(["Actor", ...reste.slice(0, -1)])) : null;
    const fid = id(`${nomPack}|folder|${JSON.stringify(chemin)}`);
    dossiers.set(JSON.stringify(chemin), fid);
    out.push({ _id: fid, _key: `!folders!${fid}`, name: reste.at(-1), type: "Actor", folder: parent ?? null, sorting: "a", sort: 0, color: null, flags: {}, description: "", _stats: stats });
  }
  for (const d of docs) {
    const aid = id(`${nomPack}|${d.data.name}`);
    const items = (d.data.items ?? []).map((it, i) => ({ ...it, _id: id(`${aid}|${i}|${it.name}`), _key: `!actors.items!${aid}.${id(`${aid}|${i}|${it.name}`)}`, sort: i * 10, effects: [], flags: {}, _stats: stats }));
    out.push({ ...d.data, _id: aid, _key: `!actors!${aid}`, items, effects: [], folder: dossiers.get(JSON.stringify(["Actor", ...d.chemin])) ?? null, sort: 0, flags: {}, ownership: { default: 0 }, _stats: stats });
  }
  return out;
}

const items = documentsItems(cBase);
const jeux = {
  adversaires: { label: "Adversaires", docs: documentsActeurs(cMod) },
  pretires: { label: "Personnages prétirés", docs: documentsPretires({ ...cBase, pretires: cMod.pretires ?? [] }, items) }
};
const mj = JSON.parse(fs.readFileSync(path.join(mod, "module.json"), "utf8"));
mj.packs = [];
for (const [nom, j] of Object.entries(jeux)) {
  if (!j.docs.length) continue;
  const docs = documentsPack(j.docs, `${mj.id}.${nom}`);
  const src = fs.mkdtempSync(`/tmp/pack-${nom}-`);
  docs.forEach((d, i) => fs.writeFileSync(path.join(src, `${String(i).padStart(4, "0")}.json`), JSON.stringify(d)));
  const dest = path.join(mod, "packs", nom);
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(path.dirname(dest), { recursive: true });
  await compilePack(src, dest, {});
  mj.packs.push({ name: nom, label: j.label, path: `packs/${nom}`, type: "Actor", system: "ange-du-chaos", ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" } });
  console.log(nom, docs.filter(d => d._key.startsWith("!actors")).length, "acteurs");
}
// le système ne copie plus ce contenu dans le monde : il vit dans les compendiums du module
if (mj.flags?.["ange-du-chaos"]) delete mj.flags["ange-du-chaos"].contenu;
fs.writeFileSync(path.join(mod, "module.json"), JSON.stringify(mj, null, 2));
