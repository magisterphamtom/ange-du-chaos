/**
 * Fiche d'objet générique : le formulaire est construit depuis le schéma du DataModel,
 * pour que chaque type d'objet (arme, sort, Maison…) ait sa fiche sans template dédié.
 */

import { SYSTEM_ID, ASSETS } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const fields = foundry.data.fields;

/** Transforme un schéma en liste de champs à plat (un niveau de SchemaField). */
function aplatir(schema, chemin = "") {
  const out = [];
  for (const [nom, champ] of Object.entries(schema.fields)) {
    const path = chemin ? `${chemin}.${nom}` : nom;
    if (champ instanceof fields.SchemaField) out.push(...aplatir(champ, path));
    else out.push({ path, champ });
  }
  return out;
}

export class ObjetSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SYSTEM_ID, "sheet", "item"],
    position: { width: 560, height: 620 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    corps: { template: `systems/${SYSTEM_ID}/templates/item/objet.hbs`, scrollable: [""] }
  };

  get title() {
    return this.item.name;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    context.item = item;
    context.editable = this.isEditable;
    context.assets = ASSETS;

    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const liste = [];
    for (const { path, champ } of aplatir(item.system.schema)) {
      const valeur = foundry.utils.getProperty(item.system, path);
      const base = { path, champ, name: `system.${path}`, label: champ.label || path, valeur };

      if (champ instanceof fields.HTMLField) {
        liste.push({
          ...base, genre: "html",
          enrichi: await TextEditor.enrichHTML(valeur ?? "", { secrets: item.isOwner, relativeTo: item })
        });
      } else if (champ instanceof fields.BooleanField) {
        liste.push({ ...base, genre: "boolean" });
      } else if (champ instanceof fields.NumberField) {
        liste.push({ ...base, genre: "number" });
      } else if (champ instanceof fields.StringField && champ.choices && typeof champ.choices === "object") {
        liste.push({
          ...base, genre: "select",
          options: Object.entries(champ.choices).map(([v, l]) => ({ valeur: v, label: l, choisi: v === valeur }))
        });
      } else {
        liste.push({ ...base, genre: "texte" });
      }
    }
    context.champs = liste;
    context.typeLabel = game.i18n.localize(`TYPES.Item.${item.type}`);
    return context;
  }
}
