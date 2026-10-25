/**
 * Contenu du livre dans le monde : objets (armes, armures, sorts, drogues…) et bestiaire
 * créés à partir de `assets/contenu/contenu.json` (pack d'assets privé). Réservé au MJ.
 * Les documents créés portent le drapeau `flags.ange-du-chaos.contenu` : relancer la
 * création les remplace (les modifications faites dessus sont perdues).
 */
import { SYSTEM_ID, ASSETS, ADVERSAIRES, adversaireDe } from "./config.mjs";
import { contenusExtensions } from "./extensions.mjs";
import { fusionnerContenus } from "./extensions-regles.mjs";
import { iconeObjet } from "./icones.mjs";
import { DOSSIER_RACINE, normNom, acteursSupplements, documentsItems, documentsActeurs, documentsPretires, cheminsDistincts } from "./contenu-data.mjs";

export const CONTENU_VERSION = 1;
const URL_CONTENU = `${ASSETS}/contenu/contenu.json`;
const flags = () => ({ [SYSTEM_ID]: { contenu: true } });
const estContenu = (doc) => !!doc.getFlag?.(SYSTEM_ID, "contenu");

async function charger() {
  try {
    const r = await fetch(URL_CONTENU);
    const base = r.ok ? await r.json() : null;
    const extras = await contenusExtensions();
    if (!base && !extras.length) return null;
    return { ...(base ?? {}), contenu: fusionnerContenus(base?.contenu ?? {}, extras) };
  } catch (e) { return null; }
}

export function enregistrerReglagesContenu() {
  game.settings.register(SYSTEM_ID, "contenuVersion", { scope: "world", config: false, type: Number, default: 0 });
  game.settings.register(SYSTEM_ID, "illustrationsSig", { scope: "world", config: false, type: String, default: "" });
  game.settings.register(SYSTEM_ID, "acteursRanges", { scope: "world", config: false, type: Number, default: 0 });
  game.settings.register(SYSTEM_ID, "supplementsRetires", { scope: "world", config: false, type: Number, default: 0 });
}

/** Donne portrait et jeton aux adversaires du livre déjà créés (quand de nouvelles illustrations arrivent). */
export async function illustrerActeurs() {
  if (!game.user.isGM) return 0;
  const sig = Object.keys(ADVERSAIRES).sort().join(",") + "|illustrations-entieres";
  if (game.settings.get(SYSTEM_ID, "illustrationsSig") === sig) return 0;
  const maj = [];
  for (const a of game.actors) {
    if (!["pnj", "creature"].includes(a.type) || !estContenu(a)) continue;
    const ill = adversaireDe(a.name);
    if (!ill) continue;
    const defaut = !a.img || /^icons\/svg\//.test(a.img);
    const dejaJeton = a.prototypeToken?.texture?.src === ill.jeton;
    const surJeton = a.img === ill.jeton;   // ancien portrait = jeton rond : remplacé par l'illustration entière
    if (!defaut && !surJeton && dejaJeton) continue;
    const m = { _id: a.id, "prototypeToken.texture.src": ill.jeton };
    if (defaut || surJeton) m.img = ill.illustration;
    maj.push(m);
  }
  if (maj.length) await Actor.updateDocuments(maj);
  await game.settings.set(SYSTEM_ID, "illustrationsSig", sig);
  if (maj.length) ui.notifications.info(`L'Ange du Chaos : ${maj.length} adversaires illustrés (portrait et jeton).`);
  return maj.length;
}

/** Une fois : range les créatures du livre déjà créées dans leurs sous-dossiers (Animaux, Créatures, Humanoïdes, Ténébreux, Humains). */
export async function rangerActeurs() {
  if (!game.user.isGM || game.settings.get(SYSTEM_ID, "acteursRanges") >= 1) return 0;
  const r = await fetch(URL_CONTENU); const base = r.ok ? await r.json() : null;
  const liste = (base?.contenu?.adversaires ?? []).filter(a => a.famille);
  if (!liste.length) return 0;
  const racine = game.folders.find(f => f.type === "Actor" && estContenu(f) && f.name === DOSSIER_RACINE && !f.folder);
  if (!racine) return 0;
  const sous = async (nom, parent) => game.folders.find(f => f.type === "Actor" && estContenu(f) && f.name === nom && f.folder?.id === parent.id)
    ?? await Folder.create({ name: nom, type: "Actor", folder: parent.id, flags: flags() });
  const cache = new Map(), maj = [];
  for (const a of liste) {
    const acteur = game.actors.find(x => estContenu(x) && normNom(x.name) === normNom(a.nom));
    if (!acteur) continue;
    const section = a.section ?? a.plan ?? "Bestiaire";
    if (!cache.has(section)) cache.set(section, await sous(section, racine));
    const cleF = `${section}|${a.famille}`;
    if (!cache.has(cleF)) cache.set(cleF, await sous(a.famille, cache.get(section)));
    if (acteur.folder?.id !== cache.get(cleF).id) maj.push({ _id: acteur.id, folder: cache.get(cleF).id });
  }
  if (maj.length) await Actor.updateDocuments(maj);
  await game.settings.set(SYSTEM_ID, "acteursRanges", 1);
  if (maj.length) ui.notifications.info(`L'Ange du Chaos : ${maj.length} fiches rangées par famille (Animaux, Créatures, Humanoïdes, Ténébreux, Humains).`);
  return maj.length;
}

/** Une fois : retire du monde les créatures et prétirés des suppléments (ils vivent désormais dans les compendiums des modules). */
export async function retirerSupplements() {
  if (!game.user.isGM || game.settings.get(SYSTEM_ID, "supplementsRetires") >= 1) return 0;
  const r = await fetch(URL_CONTENU); const base = r.ok ? await r.json() : null;
  if (!base?.contenu?.adversaires?.length) return 0;
  const cibles = acteursSupplements(game.actors.map(a => ({ id: a.id, name: a.name, contenu: estContenu(a) })), base.contenu.adversaires);
  if (cibles.length) await Actor.deleteDocuments(cibles.map(c => c.id));
  // dossiers du contenu devenus vides
  for (let tour = 0; tour < 6; tour++) {
    const vides = game.folders.filter(f => f.type === "Actor" && estContenu(f) && f.name !== DOSSIER_RACINE
      && !f.contents.length && !f.children?.length).map(f => f.id);
    if (!vides.length) break;
    await Folder.deleteDocuments(vides);
  }
  await game.settings.set(SYSTEM_ID, "supplementsRetires", 1);
  if (cibles.length) ui.notifications.info(`L'Ange du Chaos : ${cibles.length} fiches de suppléments retirées du monde (elles sont dans les compendiums des modules).`);
  return cibles.length;
}

/** Crée (ou recrée) les dossiers, objets et créatures du livre. */
export async function creerContenu({ confirmer = false } = {}) {
  if (!game.user.isGM) return false;
  const data = await charger();
  if (!data?.contenu) {
    ui.notifications.warn("Contenu de L'Ange du Chaos : pack d'assets privés introuvable (assets/contenu/contenu.json).");
    return false;
  }
  const anciensI = game.items.filter(estContenu), anciensA = game.actors.filter(estContenu);
  const anciensF = game.folders.filter(f => estContenu(f));
  if (confirmer && (anciensI.length || anciensA.length)) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      classes: [SYSTEM_ID, "adc-dialog-jet"],
      window: { title: "Recréer le contenu du livre", icon: "fa-solid fa-book" },
      position: { width: 420 },
      content: `<div class="adc-dialogue-jet"><p>Les objets et créatures du livre déjà créés vont être <strong>remplacés</strong> : vos modifications seront perdues. Continuer ?</p></div>`
    });
    if (!ok) return false;
  }
  if (anciensI.length) await Item.deleteDocuments(anciensI.map(d => d.id));
  if (anciensA.length) await Actor.deleteDocuments(anciensA.map(d => d.id));
  const ids = anciensF.map(f => f.id).filter(id => game.folders.has(id));
  if (ids.length) await Folder.deleteDocuments(ids, { deleteSubfolders: true, deleteContents: true });

  const docsItems = documentsItems(data.contenu);
  const docs = [...docsItems, ...documentsActeurs(data.contenu), ...documentsPretires(data.contenu, docsItems)];
  const dossiers = new Map();      // clé JSON du chemin → id
  const racines = new Map();       // type de document → id du dossier racine
  for (const type of ["Item", "Actor"]) {
    const racine = await Folder.create({ name: DOSSIER_RACINE, type, flags: flags() });
    racines.set(type, racine.id);
  }
  for (const chemin of cheminsDistincts(docs)) {          // les chemins courts viennent avant les longs
    const [type, ...reste] = chemin;
    const parentCle = JSON.stringify([type, ...reste.slice(0, -1)]);
    const parent = reste.length > 1 ? dossiers.get(parentCle) : racines.get(type);
    const f = await Folder.create({ name: reste.at(-1), type, folder: parent, flags: flags() });
    dossiers.set(JSON.stringify(chemin), f.id);
  }
  const par = { Item: [], Actor: [] };
  for (const d of docs) {
    const folder = dossiers.get(JSON.stringify([d.doc, ...d.chemin]));
    par[d.doc].push({ ...d.data, folder, flags: { [SYSTEM_ID]: { ...(d.data.flags?.[SYSTEM_ID] ?? {}), contenu: true } } });
  }
  await Item.createDocuments(par.Item);
  await Actor.createDocuments(par.Actor);
  await game.settings.set(SYSTEM_ID, "contenuVersion", CONTENU_VERSION);
  ui.notifications.info(`L'Ange du Chaos : ${par.Item.length} objets et ${par.Actor.length} créatures ou personnages créés.`);
  return true;
}

const IMG_DEFAUT = (img) => !img || /^icons\/svg\//.test(img) || /\/voies\/(protecteur|duelliste|tireur|assassin|conspirateur|sorcier)\.webp$/.test(img);

/** Donne leur icône aux objets du monde (et des fiches) qui ont encore l'image par défaut de Foundry. */
export async function corrigerIcones() {
  if (!game.user.isGM) return 0;
  const maj = (it) => ({ _id: it.id, img: iconeObjet(it.type, it.system, it.name) });
  const monde = game.items.filter(i => IMG_DEFAUT(i.img)).map(maj);
  if (monde.length) await Item.updateDocuments(monde);
  let n = monde.length;
  for (const a of game.actors) {
    const l = a.items.filter(i => IMG_DEFAUT(i.img)).map(maj);
    if (l.length) { await a.updateEmbeddedDocuments("Item", l); n += l.length; }
  }
  return n;
}

export function initialiserContenu() {
  game.adc = Object.assign(game.adc ?? {}, { creerContenu: (opts = { confirmer: true }) => creerContenu(opts) });

  // Boutons dans les onglets Objets et Acteurs.
  const bouton = (app, html) => {
    try {
      if (!game.user.isGM) return;
      const el = html instanceof HTMLElement ? html : html?.[0];
      if (!el || el.querySelector(".adc-contenu-btn")) return;
      const cible = el.querySelector(".header-actions") ?? el.querySelector(".directory-header");
      if (!cible) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "adc-contenu-btn";
      b.innerHTML = `<i class="fa-solid fa-book"></i> Contenu du livre`;
      b.addEventListener("click", () => creerContenu({ confirmer: true }));
      cible.append(b);
    } catch (e) { /* sans effet */ }
  };
  Hooks.on("renderItemDirectory", bouton);
  Hooks.on("renderActorDirectory", bouton);

  // Première ouverture du monde : le MJ crée le contenu une fois.
  Hooks.once("ready", async () => {
    try {
      if (game.user.isGM && game.settings.get(SYSTEM_ID, "contenuVersion") < CONTENU_VERSION
        && !game.items.some(estContenu)) await creerContenu();
    } catch (e) { console.error(`${SYSTEM_ID} | Contenu`, e); }
    try { await retirerSupplements(); } catch (e) { console.error(`${SYSTEM_ID} | Suppléments`, e); }
    try { await rangerActeurs(); } catch (e) { console.error(`${SYSTEM_ID} | Rangement`, e); }
    try { await illustrerActeurs(); } catch (e) { console.error(`${SYSTEM_ID} | Illustrations`, e); }
    try { await corrigerIcones(); } catch (e) { console.error(`${SYSTEM_ID} | Icônes`, e); }
  });
}
