/**
 * Nexus, Hors-Destin, périodes de repos et début de session (livre de base, p. 85-87 et 115).
 * L'interface (fenêtres, cartes) est dans destin-html.mjs ; ici, la logique et les mises à jour d'acteur.
 */
import { SYSTEM_ID } from "./config.mjs";
import { menuHTML, reposHTML, carteDestinHTML, USAGES_NEXUS, USAGES_DESTIN, CONDITIONS_REPOS, SOINS } from "./destin-html.mjs";
import { relancerTest } from "./rolls.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;

const poster = (actor, genre, titre, extra = {}) => ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor }),
  content: carteDestinHTML({ genre, nom: actor.name, portrait: actor.img, titre, ...extra })
});

const bornes = (n, min, max) => Math.max(min, Math.min(max, n));

/** Dépense 1 Nexus (hors jet) : choix de l'usage, mise à jour, carte de chat. */
export async function depenserNexus(actor) {
  const dispo = actor.system.nexus.value;
  if (actor.system.derive?.effets?.drogues?.nexusBloque) return ui.notifications.warn(`${actor.name} est sous Mithass noir : le Nexus (et le Zen) est inaccessible.`);
  if (dispo < 1) return ui.notifications.warn(`${actor.name} n'a plus de point de Nexus.`);

  const talents = actor.items.filter(i => ["talent", "artmartial"].includes(i.type));
  const etats = (actor.statuses ? [...actor.statuses] : []);
  const extra = `
    <fieldset class="adc-extra"><legend>Précisions</legend>
      <div class="adc-selecteur"><label>Talent ou Art martial
        <select name="objet"><option value="">—</option>${talents.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select></label></div>
      <div class="adc-selecteur"><label>État à annuler
        <select name="etat"><option value="">—</option>${etats.map(e => `<option value="${esc(e)}">${esc(CONFIG.statusEffects.find(s => s.id === e)?.name ?? e)}</option>`).join("")}</select></label></div>
    </fieldset>`;
  const rep = await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"],
    window: { title: "Dépenser un point de Nexus", icon: "fa-solid fa-bolt" },
    position: { width: 440 },
    content: menuHTML({ titre: "Nexus", restant: dispo, unite: "point", usages: USAGES_NEXUS.filter(u => u.id !== "relance" && u.id !== "inspiration"), extra }),
    ok: { label: "Dépenser 1 Nexus", icon: "fa-solid fa-bolt", callback: (e, b) => ({ usage: b.form.elements.usage.value, objet: b.form.elements.objet.value, etat: b.form.elements.etat.value }) },
    rejectClose: false
  });
  if (!rep) return null;

  const maj = { "system.nexus.value": dispo - 1 };
  let texte = "", lignes = [];
  if (rep.usage === "degats") {
    const end = actor.system.endurance;
    const rendu = Math.min(10, end.max - end.value);
    maj["system.endurance.value"] = end.value + rendu;
    texte = "Le Nexus détourne le coup : les dégâts subis sont réduits de 10.";
    lignes = [`Endurance rendue : <b>${rendu}</b> (${end.value} → ${end.value + rendu})`];
  } else if (rep.usage === "etat") {
    const nomEtat = rep.etat ? (CONFIG.statusEffects.find(s => s.id === rep.etat)?.name ?? rep.etat) : "un état préjudiciable";
    texte = `Le Nexus écarte <b>${esc(nomEtat)}</b> grâce à sa force intérieure (p. 112).`;
    if (rep.etat) {
      await actor.toggleStatusEffect?.(rep.etat, { active: false });
      lignes = ["L'état est retiré de la fiche."];
    } else lignes = ["Précisez l'état au Meneur : rien n'a été retiré."];
  } else if (rep.usage === "talent") {
    const obj = actor.items.get(rep.objet);
    texte = obj ? `Le Nexus active <b>${esc(obj.name)}</b>.` : "Le Nexus active un Talent ou un Art martial.";
  }
  await actor.update(maj);
  await poster(actor, "nexus", "Point de Nexus dépensé", {
    texte, lignes, pied: `Nexus : ${dispo - 1} / ${actor.system.nexus.max}`
  });
  return rep;
}

/** Dépense 1 point de Hors-Destin. */
export async function depenserHorsDestin(actor) {
  const dispo = actor.system.horsDestin.value;
  if (dispo < 1) return ui.notifications.warn(`${actor.name} n'a plus de point de Hors-Destin.`);
  const rep = await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"],
    window: { title: "Dépenser un point de Hors-Destin", icon: "fa-solid fa-feather-pointed" },
    position: { width: 460 },
    content: menuHTML({ titre: "Hors-Destin", restant: dispo, unite: "point", usages: USAGES_DESTIN }),
    ok: { label: "Dépenser 1 Hors-Destin", icon: "fa-solid fa-feather-pointed", callback: (e, b) => ({ usage: b.form.elements.usage.value }) },
    rejectClose: false
  });
  if (!rep) return null;
  const u = USAGES_DESTIN.find(x => x.id === rep.usage);
  const maj = { "system.horsDestin.value": dispo - 1 };
  const lignes = [];
  if (rep.usage === "mort") {
    maj["system.bonus.horsDestin"] = (actor.system.bonus?.horsDestin ?? 0) - 1;
    lignes.push("Ce point est définitivement perdu : le maximum de Hors-Destin baisse de 1.");
  }
  await actor.update(maj);
  await poster(actor, "destin", "Hors-Destin", {
    texte: `<b>${esc(u.titre)}</b> — ${esc(u.detail)}`,
    lignes,
    pied: `Hors-Destin : ${dispo - 1} / ${actor.system.horsDestin.max}`
  });
  return rep;
}

/** Période de repos de 8 h (p. 115). */
export async function reposer(actor) {
  const d = actor.system.derive;
  const carrure = d?.competences?.carrure?.score ?? 0; // score (CON + rang) : p. 115, exemple de Syl
  const arts = d?.competences?.artsEtranges?.score ?? 0;
  const rep = await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"],
    window: { title: `Repos : ${actor.name}`, icon: "fa-solid fa-bed" },
    position: { width: 460 },
    content: reposHTML({ carrure, artsEtranges: arts, nom: actor.name }),
    ok: { label: "Prendre le repos", icon: "fa-solid fa-bed", callback: (e, b) => ({ condition: b.form.elements.condition.value, soin: b.form.elements.soin.value }) },
    rejectClose: false
  });
  if (!rep) return null;

  const cond = CONDITIONS_REPOS.find(c => c.id === rep.condition);
  const soin = SOINS.find(s => s.id === rep.soin);
  const end = actor.system.endurance, mana = actor.system.mana, nexus = actor.system.nexus;

  let gainEnd = carrure + cond.mod;
  let note = "";
  if (soin.pv === null) { gainEnd = 0; note = "Plaies infectées : aucune récupération d'Endurance."; }
  else gainEnd += soin.pv;
  // Un résultat négatif aggrave l'état du personnage (p. 116).
  const nouvelleEnd = bornes(end.value + gainEnd, 0, end.max);
  const gainMana = Math.max(0, arts + cond.mod);
  const nouveauMana = bornes(mana.value + (mana.max ? gainMana : 0), 0, mana.max);

  await actor.update({
    "system.endurance.value": nouvelleEnd,
    "system.mana.value": nouveauMana,
    "system.nexus.value": nexus.max
  });
  // Tout état préjudiciable disparaît au repos, sauf « En manque ! » (p. 112).
  const retires = [];
  for (const e of [...(actor.statuses ?? [])]) {
    if (e === "enManque") continue;
    await actor.toggleStatusEffect?.(e, { active: false });
    retires.push(CONFIG.statusEffects.find(x => x.id === e)?.name ?? e);
  }
  await actor.unsetFlag?.(SYSTEM_ID, "secondSouffle");
  await actor.unsetFlag?.(SYSTEM_ID, "verrous");
  const lignes = [
    `Endurance : <b>${end.value} → ${nouvelleEnd}</b> / ${end.max} (${gainEnd >= 0 ? "+" : ""}${gainEnd})`,
    ...(mana.max ? [`Mana : <b>${mana.value} → ${nouveauMana}</b> / ${mana.max}`] : []),
    `Nexus : <b>${nexus.max}</b> / ${nexus.max}`,
    ...(note ? [note] : []),
    ...(nouvelleEnd === 0 ? ["Endurance à 0 : Aux portes de Dame Mort."] : []),
    ...(retires.length ? [`États levés : ${esc(retires.join(", "))}`] : [])
  ];
  await poster(actor, "repos", "Période de repos", { texte: esc(cond.label), lignes, pied: "8 heures de repos" });
  return rep;
}

/** Début de session : le Hors-Destin est au maximum (le MJ le fait pour tout le groupe). */
export async function nouvelleSession(acteurs = null) {
  const liste = acteurs ?? game.actors.filter(a => a.type === "personnage" && a.hasPlayerOwner);
  for (const a of liste) {
    await a.update({ "system.horsDestin.value": a.system.horsDestin.max });
  }
  await ChatMessage.create({
    content: carteDestinHTML({ genre: "destin", nom: "Table de jeu", titre: "Nouvelle session", texte: "Les points de Hors-Destin sont rendus à chaque personnage.",
      lignes: liste.map(a => `${esc(a.name)} : <b>${a.system.horsDestin.max}</b>`) })
  });
}

/** Branche le bouton « Relancer » des cartes de jet. */
function brancherCarte(message, html) {
  const bouton = html.querySelector?.(".adc-btn-relance");
  if (!bouton) return;
  const flags = message.getFlag(SYSTEM_ID, "jet");
  const actor = game.actors.get(flags?.actorId);
  if (!actor?.isOwner || flags?.relance || actor.system.nexus.value < 1) { bouton.remove(); return; }
  bouton.addEventListener("click", (ev) => { ev.preventDefault(); relancerTest(message); });
}

export function initialiserDestin() {
  Hooks.on("renderChatMessageHTML", brancherCarte);
  Hooks.once("ready", () => {
    game.adc = Object.assign(game.adc ?? {}, { depenserNexus, depenserHorsDestin, reposer, nouvelleSession });
  });
}
