/**
 * Jets dans Foundry : fenêtre de dialogue, résolution (moteur pur dans jets.mjs) et carte de chat.
 */
import { SYSTEM_ID, CARACS, COMPETENCES } from "./config.mjs";
import { CARACS_PHYSIQUES, effetsDesEtats } from "./combat.mjs";
import { carteHTML, dialogueHTML } from "./rolls-html.mjs";
import { resoudreTest } from "./jets.mjs";

const { DialogV2 } = foundry.applications.api;

/** Informations de test pour une caractéristique ou une compétence d'un acteur. */
export function infosTest(actor, type, cle) {
  const d = actor.system.derive;
  if (type === "competence") {
    const c = d?.competences?.[cle];
    if (!c) return null;
    return { type, nom: COMPETENCES[cle].label, score: c.score, rang: c.rang ?? 0, bloque: !!c.inapte, physique: CARACS_PHYSIQUES.includes(COMPETENCES[cle].carac), detail: c.libelle };
  }
  const c = d?.caracs?.[cle];
  if (!c) return null;
  return { type, nom: CARACS[cle].label, score: c.valeur, rang: 0, bloque: false, physique: CARACS_PHYSIQUES.includes(cle), detail: c.libelle };
}

async function demanderParametres(infos, { nd = null, etat, nexus = 0 } = {}) {
  return DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"],
    window: { title: `Test : ${infos.nom}`, icon: "fa-solid fa-dice-d20" },
    position: { width: 400 },
    content: dialogueHTML({ infos, nd, etat, nexus }),
    render: (event, dialog) => {
      const form = dialog.element.querySelector("form");
      form?.querySelectorAll("[data-pas]").forEach(b => b.addEventListener("click", () => {
        const champ = form.elements.bonus;
        champ.value = (Number(champ.value) || 0) + Number(b.dataset.pas);
      }));
    },
    ok: {
      label: "Lancer le dé du Destin",
      icon: "fa-solid fa-dice-d20",
      callback: (event, bouton) => {
        const f = bouton.form.elements;
        return {
          nd: f.nd.value === "" ? null : Number(f.nd.value),
          bonus: Number(f.bonus.value) || 0,
          inspire: f.inspire.checked,
          handicap: f.handicap.checked,
          nexus: !!f.nexus?.checked
        };
      }
    },
    rejectClose: false
  });
}

/**
 * Lance un test et publie la carte de chat.
 * @param {Actor} actor
 * @param {"competence"|"carac"} type
 * @param {string} cle
 * @param {object} [options]  { rapide: true } saute la fenêtre (Maj + clic)
 */
export async function lancerTest(actor, type, cle, { rapide = false } = {}) {
  const infos = infosTest(actor, type, cle);
  if (!infos) return null;

  // États préjudiciables (p. 112-115) : Handicap, blocage, plus d'Inspiration.
  const etat = effetsDesEtats(new Set(actor.statuses ?? []), { physique: infos.physique, fx: actor.system.derive?.effets ?? {}, cle: type === "competence" ? cle : null });
  infos.bloque = infos.bloque || etat.bloque;
  const nexusDispo = etat.sansInspiration ? 0 : (actor.system.nexus?.value ?? 0);
  const params = rapide
    ? { nd: null, bonus: 0, inspire: false, handicap: etat.handicap, nexus: false }
    : await demanderParametres(infos, { etat, nexus: nexusDispo });
  if (params && etat.sansInspiration) params.inspire = false;
  if (!params) return null;

  // Un point de Nexus donne l'Inspiration ou annule un Handicap (p. 85).
  let nexusDepense = false;
  if (params.nexus && nexusDispo > 0) {
    nexusDepense = true;
    if (params.handicap) params.handicap = false; else params.inspire = true;
    await actor.update({ "system.nexus.value": nexusDispo - 1 });
  }

  const resultat = resoudreTest({ score: infos.score, bloque: infos.bloque, nd: params.nd, bonus: params.bonus, inspire: params.inspire, handicap: params.handicap });
  const affichage = { nom: infos.nom, portrait: actor.img, sousTitre: nexusDepense ? "Nexus" : "" };
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteHTML({ ...affichage, resultat, relancable: (actor.system.nexus.value ?? 0) >= 1 }),
    flags: { [SYSTEM_ID]: { jet: { type, cle, resultat, actorId: actor.id, params: { nd: params.nd, bonus: params.bonus, inspire: params.inspire, handicap: params.handicap }, score: infos.score, bloque: infos.bloque, affichage } } }
  });
}

/** Relance un test déjà publié en dépensant 1 point de Nexus (p. 85). */
export async function relancerTest(message) {
  const jet = message.getFlag(SYSTEM_ID, "jet");
  const actor = game.actors.get(jet?.actorId);
  if (!jet || !actor || jet.relance) return null;
  const dispo = actor.system.nexus.value;
  if (dispo < 1) return ui.notifications.warn(`${actor.name} n'a plus de point de Nexus.`);
  await actor.update({ "system.nexus.value": dispo - 1 });

  const resultat = resoudreTest({ score: jet.score, bloque: jet.bloque, ...jet.params });
  // L'ancienne carte perd son bouton ; la nouvelle fait foi.
  try {
    await message.update({
      content: carteHTML({ ...jet.affichage, resultat: jet.resultat }),
      [`flags.${SYSTEM_ID}.jet.relance`]: true
    });
  } catch (e) { console.warn(`${SYSTEM_ID} | ancienne carte non modifiable`, e); }
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteHTML({ ...jet.affichage, sousTitre: "", resultat, relance: true, relancable: false }),
    flags: { [SYSTEM_ID]: { jet: { ...jet, resultat, relance: true } } }
  });
}
