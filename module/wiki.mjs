/**
 * Wiki du livre de base : journaux « Joueurs » et « Meneur de jeu » créés à l'ouverture du monde.
 *
 * Le contenu (texte extrait du livre + illustrations) est PRIVÉ : il vit dans `assets/wiki/wiki.json`
 * (pack d'assets, hors dépôt). Sans ce fichier, le système fonctionne normalement et prévient le MJ.
 *
 * Réglages : « Ouverture du wiki » (client). API : `game.adc.creerWiki()` / `game.adc.ouvrirWiki()`.
 */
import { SYSTEM_ID, ASSETS } from "./config.mjs";
import { guidesExtensions, signatureActuelle } from "./extensions.mjs";
import { fusionnerGuides } from "./extensions-regles.mjs";

/** À incrémenter quand le contenu de wiki.json change : le MJ obtient alors une régénération automatique. */
export const WIKI_VERSION = 2;
const WIKI_URL = `${ASSETS}/wiki/wiki.json`;
const GUIDES_URL = `${ASSETS}/wiki/guides.json`;
const IMG = `${ASSETS}/wiki`;
const RUNE = (r) => `${ASSETS}/runes/${r}.webp`;
const { DOCUMENT_OWNERSHIP_LEVELS: NIVEAU, JOURNAL_ENTRY_PAGE_FORMATS: FORMAT } = CONST;

export function enregistrerReglagesWiki() {
  game.settings.register(SYSTEM_ID, "wikiOuverture", {
    name: "Ouverture du wiki",
    hint: "Ouvre automatiquement l'accueil de votre wiki en entrant dans le monde : le wiki des Joueurs pour les joueurs, le wiki du Meneur de jeu pour le MJ.",
    scope: "client", config: true, type: String, default: "toujours",
    choices: { premiere: "Une seule fois par monde", toujours: "À chaque ouverture du monde", jamais: "Jamais" }
  });
  game.settings.register(SYSTEM_ID, "wikiVu", { scope: "client", config: false, type: String, default: "" });
  game.settings.register(SYSTEM_ID, "wikiVersion", { scope: "world", config: false, type: Number, default: 0 });
  game.settings.register(SYSTEM_ID, "wikiExtensions", { scope: "world", config: false, type: String, default: "" });
}

const enveloppe = (html) => `<div class="adc-wiki">${html}</div>`;
const lien = (doc) => `@UUID[${doc.uuid}]{${doc.name}}`;
const page = (name, html, i) => ({
  name, type: "text", sort: (i + 1) * 100000,
  title: { show: true, level: 1 },
  text: { content: enveloppe(html), format: FORMAT.HTML }
});

async function chargerDonnees() {
  try {
    const r = await fetch(WIKI_URL);
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

/** Guides et campagnes (facultatif) : { guides: [{ nom, journaux: [{ name, pages: [{ name, html }] }] }] }. */
async function chargerGuides() {
  let base = [];
  try {
    const r = await fetch(GUIDES_URL);
    if (r.ok) { const d = await r.json(); base = Array.isArray(d?.guides) ? d.guides : []; }
  } catch (e) { base = []; }
  return fusionnerGuides(base, await guidesExtensions());
}

function estWiki(doc) { return !!doc.getFlag?.(SYSTEM_ID, "wiki"); }

/** Crée (ou recrée) les journaux du wiki. Réservé au MJ. */
export async function creerWiki() {
  if (!game.user.isGM) return false;
  const data = await chargerDonnees();
  if (!data) {
    ui.notifications.warn("Wiki de L'Ange du Chaos : pack d'assets privés introuvable (assets/wiki/wiki.json). Décompressez-le dans le dossier du système.");
    return false;
  }

  // Nettoyage d'une version précédente.
  const anciens = game.journal.filter(estWiki).map(j => j.id);
  if (anciens.length) await JournalEntry.deleteDocuments(anciens);
  const anciensDossiers = game.folders.filter(f => f.type === "JournalEntry" && estWiki(f)).map(f => f.id);
  if (anciensDossiers.length) await Folder.deleteDocuments(anciensDossiers, { deleteSubfolders: true, deleteContents: true });

  const flags = (extra = {}) => ({ [SYSTEM_ID]: { wiki: true, ...extra } });
  const racine = await Folder.create({ name: "L'Ange du Chaos — Wiki", type: "JournalEntry", flags: flags() });
  const dJ = await Folder.create({ name: "Joueurs", type: "JournalEntry", folder: racine.id, flags: flags() });
  const dM = await Folder.create({ name: "Meneur de jeu", type: "JournalEntry", folder: racine.id, flags: flags() });

  const creerChapitres = async (liste, dossier, ownership, groupe) => {
    const docs = [];
    let i = 0;
    for (const ch of liste) {
      const doc = await JournalEntry.create({
        name: ch.name, folder: dossier.id, sort: (++i) * 100000, ownership,
        pages: ch.pages.map((p, k) => page(p.name, p.html, k)),
        flags: flags({ groupe })
      });
      docs.push(doc);
    }
    return docs;
  };
  const chJ = await creerChapitres(data.joueurs, dJ, { default: NIVEAU.OBSERVER }, "joueurs");
  const chM = await creerChapitres(data.mj, dM, { default: NIVEAU.NONE }, "mj");

  // Cartes et aides de jeu (MJ) : images du pack privé.
  const galerie = `
    <h2>Cartes</h2>
    <figure class="adc-carte-fig"><img src="${IMG}/cartes/terres_de_l_ouest.webp" alt="Terres de l'Ouest"><figcaption>Les Terres de l'Ouest</figcaption></figure>
    <figure class="adc-carte-fig"><img src="${IMG}/cartes/cite_des_nuages.webp" alt="La Cité des nuages"><figcaption>La Cité des nuages</figcaption></figure>`;
  const ecran = `<h2>Écran du MJ</h2><figure class="adc-carte-fig"><img src="${IMG}/cartes/ecran_mj.webp" alt="Écran du MJ (recto)"><figcaption>Écran du Meneur de jeu (recto)</figcaption></figure>`;
  const pnj = `<h2>Visages du Chaos</h2><div class="adc-galerie">
    <figure><img src="${IMG}/pnj/cellendhyll.webp" alt=""><figcaption>Cellendhyll</figcaption></figure>
    <figure><img src="${IMG}/pnj/estree.webp" alt=""><figcaption>Estrée</figcaption></figure>
    <figure><img src="${IMG}/pnj/xelshalee.webp" alt=""><figcaption>Xelshalee</figcaption></figure></div>`;
  const aides = await JournalEntry.create({
    name: "Cartes et aides de jeu", folder: dM.id, sort: (chM.length + 1) * 100000, ownership: { default: NIVEAU.NONE },
    pages: [page("Cartes", galerie, 0), page("Écran du MJ", ecran, 1), page("Visages du Chaos", pnj, 2)],
    flags: flags({ groupe: "mj" })
  });

  // Guides et campagnes (MJ) : un sous-dossier par guide, un journal par partie.
  const guides = await chargerGuides();
  const liensGuides = [];
  if (guides.length) {
    const dG = await Folder.create({ name: "Guides et campagnes", type: "JournalEntry", folder: dM.id, flags: flags() });
    for (const g of guides) {
      const sous = await Folder.create({ name: g.nom, type: "JournalEntry", folder: dG.id, flags: flags() });
      liensGuides.push({ nom: g.nom, docs: await creerChapitres(g.journaux, sous, { default: NIVEAU.NONE }, "mj") });
    }
  }

  // Accueils (liens vers tous les chapitres).
  const liste = (docs) => `<ul class="adc-sommaire">${docs.map(d => `<li>${lien(d)}</li>`).join("")}</ul>`;
  const logo = `<img class="adc-logo-wiki" src="${ASSETS}/ornements/logo.webp" alt="L'Ange du Chaos" onerror="this.remove()">`;
  const runes = `<div class="adc-runes-ligne">${["sang", "feu", "air", "eau", "terre", "sylve", "lumiere", "ombre", "cycles", "inanime"]
    .map(r => `<img src="${RUNE(r)}" alt="">`).join("")}</div>`;
  await JournalEntry.create({
    name: "Bienvenue, Maraudeur-Fantôme", folder: racine.id, sort: 1, ownership: { default: NIVEAU.OBSERVER },
    pages: [page("Accueil", `${logo}
      <p>Ce wiki reprend les chapitres du <strong>livre de base</strong> de <em>L'Ange du Chaos : le jeu de rôle</em> (éditions Les XII Singes) pour les consulter sans quitter la table virtuelle.
      Contenu réservé à un usage strictement personnel.</p>${runes}
      <h2>Règles pour les joueurs</h2>${liste(chJ)}`, 0)],
    flags: flags({ accueil: "joueurs" })
  });
  await JournalEntry.create({
    name: "Accueil du Meneur de jeu", folder: dM.id, sort: 1, ownership: { default: NIVEAU.NONE },
    pages: [page("Accueil", `${logo}<h2>Guide du Meneur de jeu</h2>${liste(chM)}
      <h2>Aides de jeu</h2><ul class="adc-sommaire"><li>${lien(aides)}</li></ul>
      ${liensGuides.length ? `<h2><img src="${ASSETS}/icones/guide.webp" alt="" style="height:1.3em;vertical-align:middle" onerror="this.remove()"> Guides et campagnes</h2>${liensGuides.map(g => `<h3>${g.nom}</h3>${liste(g.docs)}`).join("")}` : ""}`, 0)],
    flags: flags({ accueil: "mj" })
  });

  await game.settings.set(SYSTEM_ID, "wikiVersion", WIKI_VERSION);
  await game.settings.set(SYSTEM_ID, "wikiExtensions", signatureActuelle());
  ui.notifications.info("Wiki de L'Ange du Chaos créé dans l'onglet Journaux.");
  return true;
}

/** Ouvre l'accueil du wiki (force = ignore le réglage d'ouverture). */
export async function ouvrirWiki(force = false, quel = null) {
  const mode = game.settings.get(SYSTEM_ID, "wikiOuverture");
  if (!force) {
    if (mode === "jamais") return;
    if (mode === "premiere" && game.settings.get(SYSTEM_ID, "wikiVu") === game.world.id) return;
  }
  const genre = quel ?? (game.user.isGM ? "mj" : "joueurs");
  const entree = game.journal.find(j => j.getFlag(SYSTEM_ID, "accueil") === genre);
  if (!entree) return false;
  await entree.sheet.render({ force: true });
  if (!force && mode === "premiere") await game.settings.set(SYSTEM_ID, "wikiVu", game.world.id);
  return true;
}

export function initialiserWiki() {
  game.adc = Object.assign(game.adc ?? {}, { creerWiki, ouvrirWiki: (quel) => ouvrirWiki(true, quel), ouvrirWikiJoueurs: () => ouvrirWiki(true, "joueurs"), ouvrirWikiMJ: () => ouvrirWiki(true, "mj") });

  // Habillage « parchemin » des journaux du wiki.
  Hooks.on("renderJournalEntrySheet", (app) => {
    try { if (app.document && estWiki(app.document)) app.element.classList.add("adc-wiki-sheet"); } catch (e) { /* sans effet */ }
  });

  // Bouton dans l'onglet Journaux.
  Hooks.on("renderJournalDirectory", (app, html) => {
    try {
      const el = html instanceof HTMLElement ? html : html?.[0];
      if (!el || el.querySelector(".adc-wiki-btn")) return;
      const cible = el.querySelector(".header-actions") ?? el.querySelector(".directory-header");
      if (!cible) return;
      const bouton = (libelle, icone, genre) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "adc-wiki-btn";
        b.innerHTML = `<i class="fa-solid ${icone}"></i> ${libelle}`;
        b.addEventListener("click", async () => {
          const ok = await ouvrirWiki(true, genre);
          if (ok === false && game.user.isGM) await creerWiki().then(() => ouvrirWiki(true, genre));
        });
        cible.append(b);
      };
      if (game.user.isGM) { bouton("Wiki Meneur", "fa-book-skull", "mj"); bouton("Wiki Joueurs", "fa-book-open", "joueurs"); }
      else bouton("Wiki", "fa-book-open", "joueurs");
    } catch (e) { /* sans effet */ }
  });

  // Ouverture du monde : le MJ crée le wiki si besoin, chacun ouvre l'accueil selon son réglage.
  Hooks.once("ready", async () => {
    try {
      if (game.user.isGM) {
        const existe = game.journal.some(estWiki);
        if (!existe || game.settings.get(SYSTEM_ID, "wikiVersion") < WIKI_VERSION || game.settings.get(SYSTEM_ID, "wikiExtensions") !== signatureActuelle()) await creerWiki();
      }
      if (!(await ouvrirWiki()) && !game.user.isGM) {
        // Le MJ n'a pas encore créé le wiki : on ouvre l'accueil dès qu'il apparaît.
        const id = Hooks.on("createJournalEntry", (doc) => {
          if (doc.getFlag(SYSTEM_ID, "accueil") === "joueurs") { Hooks.off("createJournalEntry", id); ouvrirWiki(); }
        });
      }
    } catch (e) { console.error(`${SYSTEM_ID} | Wiki`, e); }
  });
}
