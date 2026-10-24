/**
 * Gemmelite : libère le sort stocké sans test d'Arts étranges (livre de base p. 169).
 * Le sort est considéré lancé avec le degré lié au grade du cristal ; une charge est dépensée.
 */
import { SYSTEM_ID } from "./config.mjs";
import { degreGemmelite } from "./runes.mjs";
import { SORTS_DEGATS, SORTS_ETATS } from "./sorts.mjs";
import { lancerDegatsDe } from "./attaque.mjs";

const esc = foundry.utils.escapeHTML;
const LIBELLE = { simple: "réussite simple", majeure: "réussite majeure", critique: "réussite critique" };
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").toLowerCase().trim();

export async function libererGemmelite(actor, gemme) {
  const s = gemme.system;
  if (!s.sortNom) return ui.notifications.warn("Cette gemmelite ne contient aucun sort : indiquez le sort stocké sur sa fiche.");
  if (s.charges.value < 1) return ui.notifications.warn("La gemmelite est inerte : plus aucune charge.");
  const degre = degreGemmelite(s.grade, s.niveauSort);
  if (!degre) return ui.notifications.warn("Une gemmelite de ce grade ne peut pas stocker un sort de ce niveau.");

  const sort = actor.items.find(i => i.type === "sort" && norm(i.name) === norm(s.sortNom))
    ?? game.items.find(i => i.type === "sort" && norm(i.name) === norm(s.sortNom));
  const cible = game.user.targets.first()?.actor ?? null;
  await gemme.update({ "system.charges.value": s.charges.value - 1 });

  const reste = s.charges.value - 1;
  const details = sort ? `<div class="adc-c-sort">${sort.system.effet || ""}</div>` : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="adc-carte adc-carte2 ${degre === "critique" ? "critique" : degre === "majeure" ? "majeure" : "simple"}"><div class="adc-c-corps adc-c-texte">
      <h3>${esc(gemme.name)} — ${esc(s.sortNom)}</h3>
      <p>Mot de pouvoir prononcé : le sort est lancé sans test d'Arts étranges, avec une <b>${LIBELLE[degre]}</b>. Appliquez les effets du sort à ce degré.</p>
      ${details}
      <p><small>Charges restantes : ${reste} / ${s.charges.max}${reste === 0 ? " — le cristal devient inerte." : ""}</small></p></div></div>`
  });

  // Sorts offensifs connus : dégâts et états comme pour un sort lancé.
  const auto = SORTS_DEGATS[s.sortNom] ?? SORTS_DEGATS[sort?.name];
  if (auto) {
    const d = auto.attaque ? degre : "simple";
    await lancerDegatsDe({ nom: s.sortNom, formule: auto.formule, bonusDegats: 0, ajust: 0, desEnPlus: 0, loc: "aucune", nonLetal: false, ignoreArmure: !!auto.ignoreArmure, note: auto.note }, actor, cible, d);
  }
  const etat = SORTS_ETATS[s.sortNom];
  if (etat && cible) await cible.toggleStatusEffect?.(etat, { active: true });
}
