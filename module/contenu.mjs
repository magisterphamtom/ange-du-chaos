/**
 * Contenu du livre dans le monde : objets (armes, armures, sorts, drogues…) et bestiaire
 * créés à partir de `assets/contenu/contenu.json` (pack d'assets privé). Réservé au MJ.
 * Les documents créés portent le drapeau `flags.ange-du-chaos.contenu` : relancer la
 * création les remplace (les modifications faites dessus sont perdues).
 */
import { SYSTEM_ID, ASSETS } from "./config.mjs";
import { iconeObjet } from "./icones.mjs";
import { DOSSIER_RACINE, documentsItems, documentsActeurs, documentsPretires, cheminsDistincts } from "./contenu-data.mjs";

export const CONTENU_VERSION = 1;
const URL_CONTENU = `${ASSETS}/contenu/contenu.json`;
const flags = () => ({ [SYSTEM_ID]: { contenu: true } });
const estContenu = (doc) => !!doc.getFlag?.(SYSTEM_ID, "contenu");

async function charger() {
  try { const r = await fetch(URL_CONTENU); return r.ok ? await r.json() : null; } catch (e) { return null; }
}

export function enregistrerReglagesContenu() {
  game.settings.register(SYSTEM_ID, "contenuVersion", { scope: "world", config: false, type: Number, default: 0 });
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
    par[d.doc].push({ ...d.data, folder, flags: flags() });
  }
  await Item.createDocuments(par.Item);
  await Actor.createDocuments(par.Actor);
  await game.settings.set(SYSTEM_ID, "contenuVersion", CONTENU_VERSION);
  ui.notifications.info(`L'Ange du Chaos : ${par.Item.length} objets et ${par.Actor.length} créatures ou personnages créés.`);
  return true;
}

const IMG_DEFAUT = (img) => !img || /^icons\/svg\//.test(img);

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
    try { await corrigerIcones(); } catch (e) { console.error(`${SYSTEM_ID} | Icônes`, e); }
  });
}
