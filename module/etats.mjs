/**
 * États préjudiciables au fil du combat : rappel dans le chat à chaque début de tour,
 * tentative de s'en défaire (test + ND du livre p. 113-115), levée au repos (voir destin.mjs).
 */
import { SYSTEM_ID, COMPETENCES } from "./config.mjs";
import { FICHES_ETATS, rappelDuTour, peutTenter, issueRemede, nettoyerVerrous } from "./etats-tour.mjs";
import { carteDestinHTML } from "./destin-html.mjs";
import { lancerTest } from "./rolls.mjs";

const esc = foundry.utils.escapeHTML;
const nomEtat = (id) => CONFIG.statusEffects.find(s => s.id === id)?.name ?? id;
const verrousDe = (actor) => nettoyerVerrous(actor.getFlag(SYSTEM_ID, "verrous") ?? [], [...(actor.statuses ?? [])]);

const poster = (actor, titre, texte, lignes = [], pied = "") => ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor }),
  content: carteDestinHTML({ genre: "etat", nom: actor.name, portrait: actor.img, titre, texte, lignes, pied })
});

/** Tente de se défaire d'un état : test de la compétence du livre, puis levée selon le degré. */
export async function tenterRemede(actor, etat) {
  const f = FICHES_ETATS[etat];
  if (!f?.remede) return ui.notifications.info(`${nomEtat(etat)} : pas de remède par test.`);
  if (!actor.statuses?.has(etat)) return ui.notifications.info(`${actor.name} n'est pas ${nomEtat(etat).toLowerCase()}.`);
  if (!peutTenter(etat, verrousDe(actor))) return ui.notifications.warn(`${actor.name} garde « ${nomEtat(etat)} » jusqu'à la prochaine période de repos (le Nexus peut encore l'annuler).`);

  let degre = null, auteur = actor;
  if (!f.remede.auto) {
    // Pisse le sang : un autre personnage (jeton sélectionné) soigne ; sinon le blessé tente lui-même.
    if (f.remede.soigneur) {
      const autre = canvas?.tokens?.controlled?.map(t => t.actor).find(a => a && a.id !== actor.id && a.type === "personnage");
      if (autre) auteur = autre;
    }
    const msg = await lancerTest(auteur, "competence", f.remede.comp, { nd: f.remede.nd, titre: `${nomEtat(etat)} : ${COMPETENCES[f.remede.comp].label} ND ${f.remede.nd}` });
    if (!msg) return null;
    degre = msg.getFlag(SYSTEM_ID, "jet")?.resultat?.degre;
  }
  const r = issueRemede(etat, degre);
  if (r.leve) await actor.toggleStatusEffect?.(etat, { active: false });
  if (r.endurance) {
    const end = actor.system.endurance;
    await actor.update({ "system.endurance.value": Math.max(0, Math.min(end.max, end.value + r.endurance)) });
  }
  if (r.verrou) await actor.setFlag(SYSTEM_ID, "verrous", [...new Set([...verrousDe(actor), etat])]);
  const lignes = [esc(r.texte), ...(r.endurance ? [`Endurance : <b>${r.endurance > 0 ? "+" : ""}${r.endurance}</b>`] : [])];
  await poster(actor, nomEtat(etat), r.leve ? "Il s'en défait." : "L'état persiste.", lignes, auteur !== actor ? `Soigneur : ${esc(auteur.name)}` : "");
  return r;
}

/** Carte de rappel au début du tour d'un combattant. */
async function rappelDeTour(combat, prior, current) {
  if (!game.users.activeGM?.isSelf) return;
  const actor = combat.combatants.get(current?.combatantId)?.actor;
  if (!actor) return;
  const noms = Object.fromEntries(CONFIG.statusEffects.map(s => [s.id, s.name]));
  const liste = rappelDuTour(actor.statuses ?? [], noms);
  if (!liste.length) return;
  const verrous = verrousDe(actor);
  const lignes = liste.map(e => {
    const peut = peutTenter(e.id, verrous);
    const bouton = e.remede ? (peut
      ? ` <button type="button" class="adc-btn-etat" data-actor="${esc(actor.uuid)}" data-etat="${esc(e.id)}" title="${esc(e.remede.note ?? "")}">${e.remede.auto ? "Se relever (Mouvement)" : `Se défaire : ${esc(COMPETENCES[e.remede.comp].label)} ND ${e.remede.nd}`}</button>`
      : ` <em>(jusqu'au repos)</em>`) : "";
    return `<b>${esc(e.nom)}</b> : ${esc(e.effet)}.${bouton}`;
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteDestinHTML({ genre: "etat", nom: actor.name, portrait: actor.img, titre: "Début de tour : états en cours", lignes, pied: "1 Nexus annule un état à tout moment" })
  });
}

function brancherRappel(message, html) {
  for (const b of html.querySelectorAll?.(".adc-btn-etat") ?? []) {
    b.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const actor = await fromUuid(b.dataset.actor);
      if (!actor || !(game.user.isGM || actor.isOwner)) return ui.notifications.warn("Seul le propriétaire du personnage ou le MJ peut le faire.");
      b.disabled = true;
      const r = await tenterRemede(actor, b.dataset.etat);
      if (!r || !r.leve) b.disabled = false;
    });
  }
}

export function initialiserEtats() {
  Hooks.on("combatTurnChange", rappelDeTour);
  Hooks.on("renderChatMessageHTML", brancherRappel);
  // Un verrou « jusqu'au repos » tombe dès que l'état disparaît (Nexus, MJ…) ; le repos efface tout (destin.mjs).
  Hooks.on("deleteActiveEffect", (effet) => {
    if (!game.users.activeGM?.isSelf) return;
    const actor = effet.parent;
    if (actor?.documentName !== "Actor") return;
    const actifs = [...(actor.statuses ?? [])];
    const v = actor.getFlag(SYSTEM_ID, "verrous") ?? [];
    const reste = nettoyerVerrous(v, actifs);
    if (reste.length !== v.length) actor.setFlag(SYSTEM_ID, "verrous", reste);
  });
  Hooks.once("ready", () => { game.adc = Object.assign(game.adc ?? {}, { tenterRemede }); });
}
