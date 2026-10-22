/**
 * Assistant de création de personnage : une seule fenêtre, 9 étapes (p. 43), relançable depuis la fiche.
 */
import { SYSTEM_ID, ASSETS } from "./config.mjs";
import { etatInitial, erreursEtape, agir, appliquer } from "./creation-data.mjs";
import { vueHTML } from "./creation-html.mjs";
import { documentsItems } from "./contenu-data.mjs";

const { ApplicationV2 } = foundry.applications.api;
const FLAG = "creation";
let _contenu = null;

async function chargerContenu() {
  if (_contenu) return _contenu;
  try {
    const r = await fetch(`${ASSETS}/contenu/contenu.json`);
    _contenu = r.ok ? (await r.json()).contenu : {};
  } catch (e) { _contenu = {}; }
  return _contenu;
}

export class AssistantCreation extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "adc-assistant-creation",
    classes: [SYSTEM_ID, "adc-assistant"],
    position: { width: 940, height: 760 },
    window: { title: "Création de personnage", resizable: true, icon: "fa-solid fa-wand-magic-sparkles" }
  };

  /** @param actor acteur « personnage » à remplir (créé vide si absent) */
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor;
    this.etat = foundry.utils.deepClone(actor?.getFlag?.(SYSTEM_ID, FLAG)?.etat ?? etatInitial());
    this.contenu = {};
  }

  async _prepareContext() {
    this.contenu = await chargerContenu();
    return {};
  }

  async _renderHTML() {
    return vueHTML(this.etat, this.contenu);
  }

  _replaceHTML(html, content) {
    const haut = content.querySelector(".adc-asst-corps")?.scrollTop ?? 0;
    content.innerHTML = html;
    const corps = content.querySelector(".adc-asst-corps");
    if (corps) corps.scrollTop = haut;
  }

  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    const el = this.element;
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-act]");
      if (!b || b.classList.contains("inactif") || b.disabled) return;
      this.#agir(b.dataset.act, { ...b.dataset });
    });
    el.addEventListener("change", (ev) => {
      const s = ev.target.closest("select[data-champ]");
      if (s) this.#agir("champ", { champ: s.dataset.champ, val: s.value });
    });
    el.addEventListener("input", (ev) => {
      const i = ev.target.closest("[data-info]");
      if (i) agir(this.etat, "info", { cle: i.dataset.info, val: i.value });   // sans re-rendu : on garde le curseur
    });
  }

  #agir(act, d) {
    const e = this.etat;
    if (act === "suivant") { if (!erreursEtape(e, e.etape, this.contenu).length) e.etape = Math.min(9, e.etape + 1); }
    else if (act === "precedent") e.etape = Math.max(1, e.etape - 1);
    else if (act === "aller") e.etape = Math.min(e.etape, Number(d.n));
    else if (act === "terminer") { this.#terminer(); return; }
    else agir(e, act, d, this.contenu);
    this.render();
  }

  async #terminer() {
    const e = this.etat;
    for (let n = 1; n <= 9; n++) {
      const err = erreursEtape(e, n, this.contenu);
      if (err.length) { e.etape = n; ui.notifications.warn(`Étape ${n} incomplète : ${err[0]}`); return this.render(); }
    }
    const { update, items } = appliquer(e, this.contenu, documentsItems);
    let actor = this.actor;
    if (!actor) actor = await Actor.create({ name: update.name, type: "personnage" });
    else {
      const anciens = actor.items.filter(i => i.getFlag(SYSTEM_ID, FLAG)).map(i => i.id);
      if (anciens.length) await actor.deleteEmbeddedDocuments("Item", anciens);
    }
    await actor.update({ ...update, [`flags.${SYSTEM_ID}.${FLAG}`]: { termine: true, etat: e } });
    await actor.createEmbeddedDocuments("Item", items.map(d => ({ ...d, flags: { [SYSTEM_ID]: { [FLAG]: true } } })));
    ui.notifications.info(`${update.name} est prêt : ${items.length} éléments ajoutés à la fiche.`);
    this.close();
    actor.sheet?.render({ force: true });
  }
}

/** Ouvre l'assistant (sur un personnage existant, ou pour en créer un nouveau). */
export function ouvrirAssistant(actor = null) {
  return new AssistantCreation(actor).render({ force: true });
}

export function initialiserCreation() {
  game.adc = Object.assign(game.adc ?? {}, { assistant: ouvrirAssistant });

  // Bouton « Assistant de création » dans l'onglet Acteurs (crée un nouveau personnage).
  Hooks.on("renderActorDirectory", (app, html) => {
    try {
      const el = html instanceof HTMLElement ? html : html?.[0];
      if (!el || el.querySelector(".adc-asst-lancer")) return;
      const cible = el.querySelector(".header-actions") ?? el.querySelector(".directory-header");
      if (!cible) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "adc-asst-lancer";
      b.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Créer un agent`;
      b.addEventListener("click", () => ouvrirAssistant());
      cible.append(b);
    } catch (e) { /* sans effet */ }
  });
}
