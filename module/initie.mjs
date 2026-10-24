/**
 * Voie de l'Initié : Zen et Talents d'Initié (Guide du Meneur de jeu, p. 212-217).
 * Chaque talent a un bouton sur la fiche ; le Nexus est dépensé, les tests lancés, les cartes postées.
 */
import { SYSTEM_ID } from "./config.mjs";
import { carteDestinHTML } from "./destin-html.mjs";
import { lancerTest } from "./rolls.mjs";
import { lancerDegatsDe } from "./attaque.mjs";
import { reposer } from "./destin.mjs";
import { actionInitie, ND_ZEN, ND_CRI, DEGATS_CRI, PROTECTION_ARMURE_INITIE, toursHandicapApresZen, issueDevier } from "./initie-regles.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

const carte = (actor, titre, texte, lignes = [], pied = "") => ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor }),
  content: carteDestinHTML({ genre: "nexus", nom: actor.name, portrait: actor.img, titre, texte, lignes, pied })
});

/** Dépense 1 Nexus ; false (avec avertissement) si impossible. */
async function payerNexus(actor) {
  if (actor.system.derive?.effets?.drogues?.nexusBloque) { ui.notifications.warn(`${actor.name} est sous Mithass noir : le Nexus (et le Zen) est inaccessible.`); return false; }
  const n = actor.system.nexus?.value ?? 0;
  if (n < 1) { ui.notifications.warn(`${actor.name} n'a plus de point de Nexus.`); return false; }
  await actor.update({ "system.nexus.value": n - 1 });
  return true;
}
const resteNexus = (actor) => `Nexus : ${actor.system.nexus.value} / ${actor.system.nexus.max}`;
const resultatDe = (msg) => msg?.flags?.[SYSTEM_ID]?.jet?.resultat ?? null;
const reussi = (r) => !!r && r.reussite !== false && r.degre !== "echec" && r.degre !== "catastrophe";
const degreDe = (r) => (r?.degre === "critique" || r?.degre === "majeure" ? r.degre : "simple");
const enZen = (actor) => actor.statuses?.has("zen");

/** Point d'entrée : exécute l'action du talent d'Initié (d'après son nom). */
export async function actionTalentInitie(actor, item) {
  const cle = actionInitie(item.name);
  if (!cle) return null;
  return ({ zen, cri, devier, armure, transe })[cle](actor, item);
}

async function zen(actor) {
  if (enZen(actor)) return sortirDuZen(actor);
  if (!(await payerNexus(actor))) return;
  const msg = await lancerTest(actor, "competence", "artsDuCombat", { nd: ND_ZEN, titre: "Entrer dans le Zen" });
  if (!msg) { await actor.update({ "system.nexus.value": actor.system.nexus.value + 1 }); return; } // test annulé : Nexus rendu
  const r = resultatDe(msg);
  if (!reussi(r)) return carte(actor, "Le Zen se dérobe", "Le test échoue : l'Initié n'entre pas dans le Zen, et le point de Nexus est perdu.", [], resteNexus(actor));
  const tours = actor.system.derive?.caracs?.vol?.valeur ?? 1;
  await actor.toggleStatusEffect("zen", { active: true });
  await actor.toggleStatusEffect("surpris", { active: false });
  await actor.toggleStatusEffect("contrecoupZen", { active: false });
  await actor.setFlag(SYSTEM_ID, "zen", { tours });
  return carte(actor, "Entrée dans le Zen", `Le monde ralentit autour de ${esc(actor.name)}.`, [
    `Dure <b>${tours}</b> tour(s) (rang de Volonté)`,
    "Agit en premier à chaque tour (si plusieurs Initiés, comparer l'initiative)",
    "<b>+1 action simple</b> par tour · immunisé à Surpris",
    "Les adversaires non-Initiés ont un <b>dé de Handicap</b> sur leurs attaques et défenses",
    "Dégâts subis : Résilience ND 20, sinon expulsé du Zen"
  ], resteNexus(actor));
}

async function sortirDuZen(actor) {
  const prevu = actor.getFlag(SYSTEM_ID, "zen")?.tours ?? 1;
  const tours = await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"], window: { title: "Sortir du Zen", icon: "fa-solid fa-yin-yang" }, position: { width: 380 },
    content: `<div class="adc-dialogue-jet"><fieldset><legend>Tours passés dans le Zen</legend><input type="number" name="t" value="${prevu}" min="0" step="1"></fieldset></div>`,
    ok: { label: "Sortir du Zen", callback: (e, b) => Number(b.form.elements.t.value) || 0 }, rejectClose: false
  });
  if (tours === null || tours === undefined) return;
  const duree = toursHandicapApresZen(tours);
  await actor.toggleStatusEffect("zen", { active: false });
  await actor.unsetFlag(SYSTEM_ID, "zen");
  if (duree > 0) { await actor.toggleStatusEffect("contrecoupZen", { active: true }); await actor.setFlag(SYSTEM_ID, "contrecoupZen", { tours: duree }); }
  return carte(actor, "Sortie du Zen", `${esc(actor.name)} reprend son souffle.`,
    [duree > 0 ? `Contrecoup : <b>un dé de Handicap</b> sur tous ses tests pendant <b>${duree}</b> tour(s) (moitié de ${tours}). Retirez l'état « Contrecoup du Zen » ensuite.` : "Aucun contrecoup."]);
}

async function cri(actor, item) {
  if (!(await payerNexus(actor))) return;
  const msg = await lancerTest(actor, "competence", "artsDuCombat", { nd: ND_CRI, titre: item.name });
  if (!msg) { await actor.update({ "system.nexus.value": actor.system.nexus.value + 1 }); return; }
  const r = resultatDe(msg);
  if (!reussi(r)) return carte(actor, item.name, "Le cri se perd dans le vacarme : aucun effet.", [], resteNexus(actor));
  const cible = game.user.targets.first()?.actor ?? null;
  await carte(actor, item.name, "Un hurlement jaillit du Nexus : cône de <b>3 m × 5 m</b>, <b>4d6</b> dégâts, les victimes sont jetées au sol (Face contre terre).",
    [cible ? `Cible désignée : ${esc(cible.name)}` : "Désignez les cibles du cône (la première est utilisée pour le calcul)"], resteNexus(actor));
  await lancerDegatsDe({ nom: item.name, formule: DEGATS_CRI, bonusDegats: 0, ajust: 0, desEnPlus: 0, loc: "aucune", nonLetal: false, ignoreArmure: false, note: "Cône 3 m × 5 m : chaque créature touchée est jetée au sol" }, actor, cible, "simple");
  if (cible) await cible.toggleStatusEffect?.("faceContreTerre", { active: true });
}

async function devier(actor, item) {
  const contact = await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"], window: { title: item.name, icon: "fa-solid fa-hand" }, position: { width: 380 },
    content: `<div class="adc-dialogue-jet"><fieldset><legend>Attaque subie</legend><div class="adc-choix-liste">
      <label class="adc-choix"><input type="radio" name="t" value="distance" checked><span><b>À distance</b> (projectile)</span></label>
      <label class="adc-choix"><input type="radio" name="t" value="contact"><span><b>De contact</b> (lame, arme)</span></label></div></fieldset></div>`,
    ok: { label: "Réagir (1 Nexus)", callback: (e, b) => b.form.elements.t.value === "contact" }, rejectClose: false
  });
  if (contact === null || contact === undefined) return;
  if (!(await payerNexus(actor))) return;
  const msg = await lancerTest(actor, "competence", "artsDuCombat", { titre: `${item.name} — test opposé` });
  if (!msg) { await actor.update({ "system.nexus.value": actor.system.nexus.value + 1 }); return; }
  const r = resultatDe(msg);
  await carte(actor, item.name, reussi(r) ? esc(issueDevier(contact, degreDe(r))) : "Le test opposé est perdu : l'attaque touche normalement.",
    ["Le test est à opposer au total de l'attaque (comparez avec le Meneur)."], resteNexus(actor));
}

async function armure(actor, item) {
  if (!(await payerNexus(actor))) return;
  return carte(actor, item.name, "Le corps de l'Initié se nimbe d'un halo bleuté aux reflets d'acier.",
    [`<b>+${PROTECTION_ARMURE_INITIE} Protection</b> contre les dégâts de l'attaque subie (une seule attaque)`], resteNexus(actor));
}

async function transe(actor, item) {
  if (!(await payerNexus(actor))) return;
  await carte(actor, item.name, "Une heure de méditation intense : l'Initié bénéficie des effets d'une période de repos pour l'Endurance.", [], resteNexus(actor));
  return reposer(actor);
}
