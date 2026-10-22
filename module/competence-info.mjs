/**
 * Popup de description d'une compétence (texte du livre, chapitre « Description des compétences »).
 * Le texte vient de `assets/contenu/competences.json` (pack d'assets privé, jamais dans le dépôt) ;
 * s'il manque, la fenêtre indique seulement la caractéristique.
 */
import { SYSTEM_ID, ASSETS, CARACS, COMPETENCES } from "./config.mjs";
import { esc } from "./rolls-html.mjs";

let cache = null;
async function textes() {
  if (cache) return cache;
  try { const r = await fetch(`${ASSETS}/contenu/competences.json`); cache = r.ok ? await r.json() : {}; } catch (e) { cache = {}; }
  return cache;
}

/** Ouvre la fenêtre de description. `info` : { score, rang, libelle } facultatif (compétence de l'acteur). */
export async function decrireCompetence(cle, info = null) {
  const def = COMPETENCES[cle];
  if (!def) return;
  const html = (await textes())[cle];
  const sous = [`${CARACS[def.carac].label}`, info?.libelle ? `${info.libelle}${info.score !== undefined ? ` · score ${info.score}` : ""}` : ""].filter(Boolean).join(" — ");
  const corps = html ?? `<p class="adc-note">La description du livre n'est pas installée (assets/contenu/competences.json). Compétence de ${esc(CARACS[def.carac].label)}.</p>`;
  return foundry.applications.api.DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet", "adc-dialog-info"],
    window: { title: def.label, icon: "fa-solid fa-book-open" },
    position: { width: 520 },
    content: `<div class="adc-dialogue-jet adc-info-comp"><p class="adc-info-sous">${esc(sous)}</p><div class="adc-info-texte">${corps}</div></div>`,
    ok: { label: "Fermer", icon: "fa-solid fa-xmark" },
    rejectClose: false
  });
}
