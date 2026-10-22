/**
 * Attaque, réactions, dégâts, états et Dernier soupir dans Foundry (règles pures dans combat.mjs).
 * Flux : fenêtre d'attaque → carte du jet → réaction de la cible (Esquive, Parade) ou « Subir » → carte de dégâts → « Appliquer ».
 */
import { donneesDes } from "./des3d.mjs";
import { degatsArme } from "./effets.mjs";
import { SYSTEM_ID, COMPETENCES, COMPETENCES_ARMES } from "./config.mjs";
import { resoudreTest } from "./jets.mjs";
import { carteHTML } from "./rolls-html.mjs";
import {
  ACTIONS_ATTAQUE, LOCALISATIONS, CARACS_PHYSIQUES, COUT_REACTION, calculerDegats, appliquerDegats,
  reactionPossible, resoudreReaction, degreAttaque, dernierSoupir, effetsDesEtats, initiative as calculInitiative
} from "./combat.mjs";
import { attaqueHTML, reactionsHTML, degatsBouton, carteDegatsHTML, carteSoupirHTML } from "./combat-html.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;
const nomEtat = (id) => CONFIG.statusEffects.find(s => s.id === id)?.name ?? id;

/* -------------------------------------------------------------------------- */
/*  Données d'un acteur, quel que soit son type                                */
/* -------------------------------------------------------------------------- */

export function statsActeur(actor) {
  const s = actor.system;
  if (actor.type === "personnage") {
    const d = s.derive ?? {};
    return { pj: true, defense: d.defensePassive ?? 10, protection: d.protection ?? 0, seuil: s.endurance.seuil ?? 0, endurance: s.endurance.value, max: s.endurance.max, bonusDegats: d.bonusDegats ?? 0, carrure: d.competences?.carrure?.score ?? 0 };
  }
  return { pj: false, defense: s.defensePassive ?? 10, protection: s.protection ?? 0, seuil: s.seuilFatigue ?? 0, endurance: s.endurance.value, max: s.endurance.max, bonusDegats: s.bonusDegats ?? 0, carrure: s.endurance.max ?? 0 };
}

const etatsDe = (actor) => new Set(actor?.statuses ?? []);

/** Ce que l'arme (ou l'attaque type d'un PNJ) apporte au jet. */
function infosAttaque(actor, item) {
  if (item) {
    const cle = item.system.competence;
    const c = actor.system.derive?.competences?.[cle];
    if (!c) return null;
    return { nom: item.name, score: c.score, formule: item.system.degats, bloque: !!c.inapte, physique: CARACS_PHYSIQUES.includes(COMPETENCES[cle]?.carac), bonusDegats: statsActeur(actor).bonusDegats + degatsArme(actor.system.derive?.effets ?? {}, { competence: cle, nom: item.name }), cleCompetence: cle };
  }
  const a = actor.system.attaque;
  if (!a) return null;
  return { nom: a.nom || "Attaque", score: a.score, formule: a.degats, bloque: false, physique: true, bonusDegats: actor.system.bonusDegats ?? 0, cleCompetence: null };
}

/* -------------------------------------------------------------------------- */
/*  Messages : mise à jour (relais via le MJ pour les joueurs)                  */
/* -------------------------------------------------------------------------- */

export async function majMessage(message, data) {
  if (game.user.isGM || message.isAuthor) return message.update(data);
  game.socket.emit(`system.${SYSTEM_ID}`, { type: "majMessage", id: message.id, data });
}

function brancherSocket() {
  game.socket.on(`system.${SYSTEM_ID}`, async (msg) => {
    if (!game.users.activeGM?.isSelf) return;
    if (msg?.type === "majMessage") await game.messages.get(msg.id)?.update(msg.data);
  });
}

const flagAttaque = (m) => m.getFlag(SYSTEM_ID, "attaque");
const brancherPas = (dialog) => {
  const form = dialog.element.querySelector("form");
  form?.querySelectorAll("[data-pas]").forEach(b => b.addEventListener("click", () => {
    form.elements.bonus.value = (Number(form.elements.bonus.value) || 0) + Number(b.dataset.pas);
  }));
};

/* -------------------------------------------------------------------------- */
/*  Attaque                                                                    */
/* -------------------------------------------------------------------------- */

export async function attaquer(actor, item = null) {
  const info = infosAttaque(actor, item);
  if (!info) return ui.notifications.warn("Cette arme n'a pas de compétence utilisable.");
  const cible = game.user.targets.first()?.actor ?? null;
  const st = cible ? statsActeur(cible) : null;
  const etatsCible = etatsDe(cible);
  const eff = effetsDesEtats(etatsDe(actor), { physique: info.physique, fx: actor.system.derive?.effets ?? {}, cle: info.cleCompetence, carac: info.cleCompetence ? COMPETENCES[info.cleCompetence]?.carac : null });
  const nexusBloque = !!actor.system.derive?.effets?.drogues?.nexusBloque;
  const nexusDispo = actor.system.nexus?.value ?? 0;
  const auSolEtat = etatsCible.has("faceContreTerre");

  const params = await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"],
    window: { title: `Attaque : ${info.nom}`, icon: "fa-solid fa-khanda" },
    position: { width: 480 },
    content: attaqueHTML({
      nom: info.nom, score: info.score, formule: info.formule, cible: cible?.name ?? null,
      defense: st ? st.defense - (auSolEtat ? 10 : 0) : null, protection: st?.protection ?? 0, notes: eff.notes, nexus: (eff.sansInspiration || nexusBloque) ? 0 : nexusDispo, auto: { sol: auSolEtat }
    }),
    render: (e, dialog) => brancherPas(dialog),
    ok: {
      label: "Attaquer", icon: "fa-solid fa-khanda",
      callback: (e, b) => {
        const f = b.form.elements;
        return {
          action: f.action.value, nd: Number(f.nd.value) || 0, loc: f.loc.value, bonus: Number(f.bonus.value) || 0,
          dos: f.dos.checked, sol: f.sol.checked, submerge: f.submerge.checked,
          inspire: f.inspire.checked, handicap: f.handicap.checked, nonLetal: f.nonLetal.checked, nexus: !!f.nexus?.checked
        };
      }
    },
    rejectClose: false
  });
  if (!params) return null;

  const action = ACTIONS_ATTAQUE[params.action];
  const loc = LOCALISATIONS[params.loc];
  const nd = params.nd + loc.defense;
  let inspire = eff.inspire || params.inspire || params.dos || params.sol || params.submerge || action.inspire;
  let handicap = params.handicap || action.handicap || eff.handicap;
  if (eff.sansInspiration) inspire = false;
  if (params.nexus && nexusDispo > 0 && !eff.sansInspiration && !nexusBloque) {
    if (handicap) handicap = false; else inspire = true;
    await actor.update({ "system.nexus.value": nexusDispo - 1 });
  }
  const resultat = resoudreTest({ score: info.score, bonus: params.bonus, nd, inspire, handicap, bloque: info.bloque || eff.bloque });
  const touche = !!resultat.reussite;

  const flags = {
    attaquantUuid: actor.uuid, cibleUuid: cible?.uuid ?? null, total: resultat.total, nd, degre: resultat.degre, touche,
    formule: info.formule, bonusDegats: info.bonusDegats, ajust: action.degats, desEnPlus: loc.des + (params.sol ? 1 : 0),
    nonLetal: params.nonLetal, loc: params.loc, nom: info.nom, protection: st?.protection ?? 0, resolu: false
  };
  const actions = touche ? (cible ? reactionsHTML({ cibleNom: cible.name, peutReagir: reactionPossible(st) && !etatsCible.has("surpris") }) : degatsBouton()) : "";
  return ChatMessage.create({
    ...(await donneesDes(resultat)),
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteHTML({ nom: `${info.nom} — ${action.label}`, portrait: actor.img, sousTitre: cible ? `contre ${cible.name}` : "", resultat, actions }),
    flags: { [SYSTEM_ID]: { attaque: flags } }
  });
}

/* -------------------------------------------------------------------------- */
/*  Réactions                                                                  */
/* -------------------------------------------------------------------------- */

async function choisirParade(cible) {
  if (cible.type !== "personnage") return { score: cible.system.attaque?.score ?? 10, nom: "Parade" };
  const options = [];
  for (const it of cible.items) {
    if (it.type === "arme" && it.system.equipee) options.push({ cle: it.system.competence, nom: it.name });
    if (it.type === "bouclier" && it.system.equipee) options.push({ cle: "bouclier", nom: it.name });
  }
  if (!options.length) options.push({ cle: "corpsACorps", nom: "À mains nues" });
  const unique = options.length === 1 ? options[0] : await DialogV2.prompt({
    classes: [SYSTEM_ID, "adc-dialog-jet"], window: { title: "Parer avec…" }, position: { width: 360 },
    content: `<div class="adc-dialogue-jet"><fieldset><legend>Parade</legend><div class="adc-choix-liste">${options.map((o, i) =>
      `<label class="adc-choix"><input type="radio" name="p" value="${i}" ${i === 0 ? "checked" : ""}><span><b>${esc(o.nom)}</b><small>${esc(COMPETENCES[o.cle]?.label ?? o.cle)}</small></span></label>`).join("")}</div></fieldset></div>`,
    ok: { label: "Parer", callback: (e, b) => options[Number(b.form.elements.p.value)] }, rejectClose: false
  });
  if (!unique) return null;
  const c = cible.system.derive?.competences?.[unique.cle];
  return { score: c?.score ?? 10, nom: `Parade (${COMPETENCES[unique.cle]?.label ?? unique.cle})`, bloque: !!c?.inapte };
}

export async function reagir(message, mode) {
  const f = flagAttaque(message);
  if (!f || f.resolu) return;
  const cible = await fromUuid(f.cibleUuid);
  const attaquant = await fromUuid(f.attaquantUuid);
  if (!cible) return;
  const st = statsActeur(cible);

  if (mode === "subir") {
    await majMessage(message, { [`flags.${SYSTEM_ID}.attaque.resolu`]: true });
    return lancerDegatsDe(f, attaquant, cible, f.degre);
  }

  if (!reactionPossible(st) || etatsDe(cible).has("surpris")) {
    return ui.notifications.warn(`${cible.name} ne peut pas réagir (Seuil de fatigue atteint ou Surpris).`);
  }
  let score, nom, bloque = false;
  if (mode === "esquive") {
    score = cible.type === "personnage" ? cible.system.derive.competences.esquive.score : st.defense;
    nom = "Esquive";
    bloque = cible.type === "personnage" ? !!cible.system.derive.competences.esquive.inapte : false;
  } else {
    const p = await choisirParade(cible);
    if (!p) return;
    ({ score, nom, bloque = false } = p);
  }
  const eff = effetsDesEtats(etatsDe(cible), { physique: true, fx: cible.system?.derive?.effets ?? {}, carac: "ref", cle: "esquive" });
  const handicap = eff.handicap || etatsDe(cible).has("faceContreTerre");
  await cible.update({ "system.endurance.value": Math.max(0, st.endurance - COUT_REACTION) });

  const r = resoudreReaction({ totalAttaque: f.total, scoreReaction: score, bloque: bloque || eff.bloque, handicap });
  const resultat = { ...r, nd: f.total + 1, degre: r.evite ? (r.degre === "catastrophe" ? "catastrophe" : "simple") : (r.catastrophe ? "catastrophe" : "echec") };
  await ChatMessage.create({
    ...(await donneesDes(r)),
    speaker: ChatMessage.getSpeaker({ actor: cible }),
    content: carteHTML({ nom: `${nom} contre ${f.nom}`, portrait: cible.img, sousTitre: `Réaction −${COUT_REACTION} Endurance · doit dépasser ${f.total}`, resultat })
  });
  await majMessage(message, { [`flags.${SYSTEM_ID}.attaque.resolu`]: true });
  if (r.evite) {
    return ChatMessage.create({ content: `<div class="adc-carte adc-carte2 simple"><footer class="adc-c-verdict"><strong>${esc(cible.name)} évite le coup</strong></footer></div>` });
  }
  const degre = degreAttaque(f.total, Math.max(r.total, -999));
  return lancerDegatsDe(f, attaquant, cible, degre);
}

/* -------------------------------------------------------------------------- */
/*  Dégâts                                                                     */
/* -------------------------------------------------------------------------- */

export async function lancerDegatsDe(f, attaquant, cible, degre) {
  const d = calculerDegats({
    formule: f.formule, degre, bonusDegats: f.bonusDegats, ajust: f.ajust, desEnPlus: f.desEnPlus,
    protection: cible ? statsActeur(cible).protection : 0, ignoreArmure: false
  });
  const loc = LOCALISATIONS[f.loc] ?? LOCALISATIONS.aucune;
  const effets = [];
  if (loc.effet === "aveugle") effets.push("Œil touché : état Aveuglé");
  if (loc.effet === "etourdi") effets.push("Entrejambe : état Étourdi");
  if (loc.effet === "membre") effets.push("Si les dégâts dépassent la Carrure de la cible, le membre est brisé");
  if (f.nonLetal) effets.push("Dégâts non létaux");
  return ChatMessage.create({
    ...(await donneesDes({ des: d.des, faces: d.faces })),
    speaker: ChatMessage.getSpeaker({ actor: attaquant }),
    content: carteDegatsHTML({ nom: attaquant?.name ?? "", portrait: attaquant?.img, titre: `Dégâts — ${f.nom}`, cibleNom: cible?.name ?? "", degre, d, appliquable: !!cible, localisation: f.loc !== "aucune" ? loc.label : "", effets }),
    flags: { [SYSTEM_ID]: { degats: { cibleUuid: cible?.uuid ?? null, net: d.net, nonLetal: f.nonLetal, loc: f.loc, appliques: false } } }
  });
}

/** Bouton « Lancer les dégâts » (attaque sans cible désignée). */
export async function degatsSansCible(message) {
  const f = flagAttaque(message);
  if (!f || f.resolu) return;
  await majMessage(message, { [`flags.${SYSTEM_ID}.attaque.resolu`]: true });
  return lancerDegatsDe(f, await fromUuid(f.attaquantUuid), null, f.degre);
}

/** Bouton « Appliquer » : retire l'Endurance de la cible. */
export async function appliquerALaCible(message) {
  const g = message.getFlag(SYSTEM_ID, "degats");
  if (!g || g.appliques) return;
  const cible = await fromUuid(g.cibleUuid);
  if (!cible) return ui.notifications.warn("Cible introuvable.");
  const st = statsActeur(cible);
  const r = appliquerDegats({ endurance: st.endurance, seuil: st.seuil, degats: g.net, nonLetal: g.nonLetal });
  await cible.update({ "system.endurance.value": r.apres });
  const loc = LOCALISATIONS[g.loc];
  if (loc?.effet === "aveugle") await cible.toggleStatusEffect?.("aveugle", { active: true });
  if (loc?.effet === "etourdi") await cible.toggleStatusEffect?.("etourdi", { active: true });
  await majMessage(message, { [`flags.${SYSTEM_ID}.degats.appliques`]: true });
  const lignes = [`${esc(cible.name)} : Endurance <b>${r.avant} → ${r.apres}</b>`];
  if (loc?.effet === "membre" && g.net > st.carrure) lignes.push("Le membre est brisé (dégâts supérieurs à la Carrure).");
  if (r.inconscient) lignes.push("Inconscient, stabilisé à 1 point (dégâts non létaux).");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: cible }),
    content: `<div class="adc-carte adc-carte2 adc-carte-destin echec"><div class="adc-c-corps adc-c-texte"><ul class="adc-c-lignes">${lignes.map(l => `<li>${l}</li>`).join("")}</ul></div></div>`
  });
}

/* -------------------------------------------------------------------------- */
/*  États automatiques, Dernier soupir, hémorragie, initiative                  */
/* -------------------------------------------------------------------------- */

async function synchroniserEtats(actor, changes) {
  if (foundry.utils.getProperty(changes, "system.endurance.value") === undefined) return;
  const st = statsActeur(actor);
  const epuise = st.endurance <= st.seuil;
  const portes = st.endurance <= 0;
  if (etatsDe(actor).has("epuise") !== epuise) await actor.toggleStatusEffect?.("epuise", { active: epuise });
  if (etatsDe(actor).has("portesDameMort") !== portes) await actor.toggleStatusEffect?.("portesDameMort", { active: portes });
  if (portes) {
    if (actor.type === "personnage") await lancerDernierSoupir(actor);
    else await actor.token?.combatant?.update?.({ defeated: true });
  }
}

export async function lancerDernierSoupir(actor) {
  const st = statsActeur(actor);
  const deja = !!actor.getFlag?.(SYSTEM_ID, "secondSouffle");
  const r = dernierSoupir({ scoreCarrure: st.carrure, seuil: st.seuil, secondSouffleUtilise: deja });
  if (r.issue === "souffle") await actor.setFlag(SYSTEM_ID, "secondSouffle", true);
  if (r.endurance) await actor.update({ "system.endurance.value": r.endurance });
  await ChatMessage.create({
    ...(await donneesDes(r)),
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteSoupirHTML({ nom: actor.name, portrait: actor.img, r, issue: r.issue, endurance: r.endurance })
  });
  return r;
}

/** Initiative : 1 dé du Destin + score d'initiative (p. 102). */
function brancherInitiative() {
  const Combatant = CONFIG.Combatant.documentClass;
  const originale = Combatant.prototype.getInitiativeRoll;
  Combatant.prototype.getInitiativeRoll = function (formula) {
    const actor = this.actor;
    if (!actor || !["personnage", "pnj", "creature"].includes(actor.type)) return originale.call(this, formula);
    const score = actor.type === "personnage" ? (actor.system.derive?.initiative ?? 0) : (actor.system.initiative ?? 0);
    const eff = effetsDesEtats(etatsDe(actor), { physique: false, fx: actor.system?.derive?.effets ?? {}, init: true });
    const r = initiativeActeur(score, actor, eff);
    return new Roll(String(r));
  };
}
function initiativeActeur(score, actor, eff) {
  const r = calculInitiative({ score, joueur: actor.hasPlayerOwner, bloque: eff.bloque, inspire: eff.inspire, handicap: eff.handicap });
  return r.valeur;
}

/** Hémorragie : « Pisse le sang » retire 3 Endurance à chaque rang d'initiative (p. 114). */
async function hemorragie(combat, prior, current) {
  if (!game.users.activeGM?.isSelf) return;
  const actor = combat.combatants.get(current?.combatantId)?.actor;
  if (!actor || !etatsDe(actor).has("pisseLeSang")) return;
  const st = statsActeur(actor);
  await actor.update({ "system.endurance.value": Math.max(0, st.endurance - 3) });
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="adc-carte adc-carte2 catastrophe"><div class="adc-c-corps adc-c-texte"><p><b>${esc(actor.name)}</b> pisse le sang : −3 Endurance (${st.endurance} → ${Math.max(0, st.endurance - 3)}).</p></div></div>` });
}

/* -------------------------------------------------------------------------- */
/*  Branchement des boutons des cartes                                         */
/* -------------------------------------------------------------------------- */

async function brancherCarte(message, html) {
  const f = flagAttaque(message);
  const g = message.getFlag(SYSTEM_ID, "degats");
  const boutons = [...html.querySelectorAll(".adc-btn-reaction")];
  if (!boutons.length) return;
  const proprietaire = async (uuid) => { const a = uuid ? await fromUuid(uuid) : null; return a?.isOwner ?? false; };
  const mj = game.user.isGM;

  if (f) {
    if (f.resolu) return html.querySelectorAll(".adc-reactions").forEach(n => n.remove());
    const okCible = mj || await proprietaire(f.cibleUuid);
    const okAtt = mj || await proprietaire(f.attaquantUuid);
    for (const b of boutons) {
      const mode = b.dataset.reaction;
      const permis = mode === "degats" ? okAtt : okCible;
      if (!permis) { b.disabled = true; continue; }
      b.addEventListener("click", (ev) => { ev.preventDefault(); b.disabled = true; mode === "degats" ? degatsSansCible(message) : reagir(message, mode); });
    }
  } else if (g) {
    if (g.appliques) return html.querySelectorAll(".adc-reactions").forEach(n => n.remove());
    const ok = mj || await proprietaire(g.cibleUuid);
    for (const b of boutons) {
      if (!ok) { b.disabled = true; continue; }
      b.addEventListener("click", (ev) => { ev.preventDefault(); b.disabled = true; appliquerALaCible(message); });
    }
  }
}

export function initialiserCombat() {
  Hooks.on("renderChatMessageHTML", brancherCarte);
  Hooks.on("updateActor", (actor, changes) => {
    if (!game.users.activeGM?.isSelf) return;
    return synchroniserEtats(actor, changes);
  });
  Hooks.on("combatTurnChange", hemorragie);
  Hooks.once("ready", () => {
    brancherSocket();
    brancherInitiative();
    game.adc = Object.assign(game.adc ?? {}, { attaquer, lancerDernierSoupir });
  });
}
