/**
 * Jets dans Foundry : fenêtre de dialogue, résolution (moteur pur dans jets.mjs) et carte de chat.
 */
import { SYSTEM_ID, CARACS, COMPETENCES } from "./config.mjs";
import { CARACS_PHYSIQUES, effetsDesEtats } from "./combat.mjs";
import { carteHTML, dialogueHTML, esc } from "./rolls-html.mjs";
import { resoudreTest } from "./jets.mjs";
import { donneesDes } from "./des3d.mjs";
import { coutDuSort, peutLancer, consequencesSort, detailsSortHTML, analyserDifficulte, difficulteDepuisCible, SORTS_DEGATS, SORTS_ETATS } from "./sorts.mjs";
import { statsActeur, lancerDegatsDe } from "./attaque.mjs";
import { academieDe } from "./academies.mjs";
import { estSortDeSoin } from "./drogues.mjs";
import { niveauPermis } from "./progression.mjs";

const { DialogV2 } = foundry.applications.api;

/** Informations de test pour une caractéristique ou une compétence d'un acteur. */
export function infosTest(actor, type, cle) {
  const d = actor.system.derive;
  if (type === "competence") {
    const c = d?.competences?.[cle];
    if (!c) return null;
    return { type, nom: COMPETENCES[cle].label, carac: COMPETENCES[cle].carac, score: c.score, rang: c.rang ?? 0, bloque: !!c.inapte, physique: CARACS_PHYSIQUES.includes(COMPETENCES[cle].carac), detail: c.libelle };
  }
  const c = d?.caracs?.[cle];
  if (!c) return null;
  return { type, nom: CARACS[cle].label, carac: cle, score: c.valeur, rang: 0, bloque: false, physique: CARACS_PHYSIQUES.includes(cle), detail: c.libelle };
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


/** Ce qu'un sort a besoin de savoir de sa cible (PJ : valeurs calculées ; PNJ / créature : leur profil). */
function infosCible(acteur) {
  const norm = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const d = acteur.system.derive;
  return {
    defense: statsActeur(acteur).defense,
    carac: (cle) => (acteur.type === "personnage" ? d?.caracs?.[cle]?.valeur ?? null : null),
    competence: (cle) => {
      if (acteur.type === "personnage") return d?.competences?.[cle]?.score ?? null;
      const nom = norm(COMPETENCES[cle]?.label);
      const c = (acteur.system.competences ?? []).find(x => norm(x.nom) === nom);
      return c ? Number(c.score) : null;
    }
  };
}

/**
 * Lance un test et publie la carte de chat.
 * @param {Actor} actor
 * @param {"competence"|"carac"} type
 * @param {string} cle
 * @param {object} [options]  { rapide: true } saute la fenêtre (Maj + clic)
 */
export async function lancerTest(actor, type, cle, { rapide = false, sort = null, nd: ndForce = null, titre = null } = {}) {
  const infos = infosTest(actor, type, cle);
  if (!infos) return null;

  // Sort : mana à payer avant tout (p. 150) ; la fenêtre propose le ND du sort.
  let coutSort = 0;
  const dr = actor.system.derive?.effets?.drogues ?? {};
  // Brume-Feu : les sorts coûtent de l'Endurance ; Mithass noir : plus de sorts du tout.
  const surEndurance = !!dr.sortEndurance;
  const manaActeur = surEndurance ? (actor.system.endurance?.value ?? 0) : (actor.system.mana?.max ? actor.system.mana.value : null);
  if (sort) {
    const gradeActeur = actor.system.derive?.grade;
    if (actor.type === "personnage" && gradeActeur && sort.niveau && !niveauPermis(gradeActeur, sort.niveau)) { ui.notifications.warn(`${actor.name} n'a pas le grade pour un sort ${sort.niveau === "expert" ? "d'Expert (Capitaine-Maraudeur)" : "de Maître (Ombre du Chaos)"}.`); return null; }
    if (dr.sortBloque) { ui.notifications.warn(`${actor.name} est sous Mithass noir : impossible de lancer un sort.`); return null; }
    if (dr.sortSansSoin && estSortDeSoin(sort)) { ui.notifications.warn(`${actor.name} est sous Brume-Feu : aucun sort de soin n'est possible.`); return null; }
    const acad = actor.system.derive?.academie ?? academieDe({ voie: actor.system.voie, academie: actor.system.academie });
    coutSort = coutDuSort(acad, sort);
    if (!peutLancer(manaActeur, coutSort)) { ui.notifications.warn(`${actor.name} n'a pas assez ${surEndurance ? "d'Endurance" : "de mana"} pour ${sort.nom} (${coutSort} requis, ${manaActeur} disponible).`); return null; }
    infos.nom = `Sort : ${sort.nom}`;
  }

  // États préjudiciables (p. 112-115) : Handicap, blocage, plus d'Inspiration.
  const etat = effetsDesEtats(new Set(actor.statuses ?? []), { physique: infos.physique, fx: actor.system.derive?.effets ?? {}, cle: type === "competence" ? cle : null, carac: infos.carac });
  infos.bloque = infos.bloque || etat.bloque;
  const nexusDispo = (etat.sansInspiration || dr.nexusBloque) ? 0 : (actor.system.nexus?.value ?? 0);
  // Sort : difficulté lue dans le livre (fixe, Défense passive de la cible, « 15 + Volonté », test opposé…).
  let ndAuto = null, noteND = "", cibleSort = null;
  if (sort) {
    cibleSort = game.user.targets.first()?.actor ?? null;
    const auto = difficulteDepuisCible(analyserDifficulte(sort), cibleSort ? infosCible(cibleSort) : null,
      (score) => resoudreTest({ score }));
    ndAuto = auto.nd; noteND = auto.note;
    if (!auto.nd && auto.note) ui.notifications.info(auto.note);
  }
  const ndDepart = ndForce ?? ndAuto ?? (sort && sort.difficulte > 0 ? sort.difficulte : null);
  if (titre) infos.nom = titre;
  const params = rapide
    ? { nd: ndDepart, bonus: 0, inspire: etat.inspire, handicap: etat.handicap, nexus: false }
    : await demanderParametres(infos, { etat, nexus: nexusDispo, nd: ndDepart });
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
  let actionsSort = "";
  if (sort) {
    const conseq = consequencesSort({ manaActuel: manaActeur, enduranceActuelle: actor.system.endurance?.value ?? 0, cout: coutSort, degre: resultat.degre });
    const maj = {};
    if (surEndurance) {
      // Brume-Feu : le coût est payé en Endurance ; la catastrophe en retire autant en plus.
      maj["system.endurance.value"] = Math.max(0, (conseq.mana ?? 0) - conseq.perte);
    } else {
      if (conseq.mana !== null) maj["system.mana.value"] = conseq.mana;
      if (conseq.perte) maj["system.endurance.value"] = conseq.endurance;
    }
    if (Object.keys(maj).length) await actor.update(maj);
    affichage.sousTitre = [affichage.sousTitre, noteND, surEndurance ? conseq.ligne.replace(/mana/g, "Endurance") : conseq.ligne].filter(Boolean).join(" · ");
    if (conseq.issue === "reussite") actionsSort = detailsSortHTML(sort, esc);
  }
  const carte = await ChatMessage.create({
    ...(await donneesDes(resultat)),
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteHTML({ ...affichage, resultat, actions: actionsSort, relancable: (actor.system.nexus.value ?? 0) >= 1 && !sort }),
    flags: { [SYSTEM_ID]: { jet: { type, cle, resultat, actorId: actor.id, params: { nd: params.nd, bonus: params.bonus, inspire: params.inspire, handicap: params.handicap }, score: infos.score, bloque: infos.bloque, affichage } } }
  });

  // Sort offensif réussi : dégâts lancés automatiquement (formule du livre, cible désignée).
  const auto = sort && SORTS_DEGATS[sort.nom];
  if (auto && actionsSort && resultat.reussite !== false) {
    const degre = auto.attaque && resultat.degre && resultat.degre !== "echec" ? resultat.degre : "simple";
    await lancerDegatsDe({ nom: sort.nom, formule: auto.formule, bonusDegats: 0, ajust: 0, desEnPlus: 0, loc: "aucune", nonLetal: false, ignoreArmure: !!auto.ignoreArmure, note: auto.note }, actor, cibleSort, degre);
  }
  // État infligé par le sort (Crépuscule : Aveuglé, Visage de Nocta : Trouille bleue, Foudres d'Eodh : Étourdi).
  const etatSort = sort && SORTS_ETATS[sort.nom];
  if (etatSort && actionsSort && resultat.reussite !== false && cibleSort) await cibleSort.toggleStatusEffect?.(etatSort, { active: true });
  return carte;
}

/** Relance un test déjà publié en dépensant 1 point de Nexus (p. 85). */
export async function relancerTest(message) {
  const jet = message.getFlag(SYSTEM_ID, "jet");
  const actor = game.actors.get(jet?.actorId);
  if (!jet || !actor || jet.relance) return null;
  const dispo = actor.system.nexus.value;
  if (actor.system.derive?.effets?.drogues?.nexusBloque) return ui.notifications.warn(`${actor.name} est sous Mithass noir : le Nexus est inaccessible.`);
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
    ...(await donneesDes(resultat)),
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteHTML({ ...jet.affichage, sousTitre: "", resultat, relance: true, relancable: false }),
    flags: { [SYSTEM_ID]: { jet: { ...jet, resultat, relance: true } } }
  });
}
