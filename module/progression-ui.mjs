/**
 * Progression au Mérite dans Foundry : fenêtre d'achats (compétences, caractéristiques, Nexus, Arts martiaux, sorts),
 * et annonce dans le chat quand un personnage franchit un grade.
 */
import { SYSTEM_ID, CARACS, COMPETENCES, NIVEAUX_SORT } from "./config.mjs";
import { optionsAchat, passageDeGrade } from "./progression.mjs";
import { carteDestinHTML } from "./destin-html.mjs";
import { gradeSelonMerite } from "./calc.mjs";
import { academieDe } from "./academies.mjs";

const { DialogV2 } = foundry.applications.api;
const esc = foundry.utils.escapeHTML;
const GENRES = { competence: "Compétence", carac: "Caractéristique", nexus: "Nexus", art: "Art martial", sort: "Sort" };

const itemsContenu = (type) => game.items.filter(i => i.type === type && i.getFlag(SYSTEM_ID, "contenu"));

/** Contexte des achats possibles pour un acteur. */
export function contexteAchats(actor) {
  const s = actor.system, d = s.derive ?? {};
  const academie = d.academie ?? academieDe({ voie: s.voie, academie: s.academie });
  return {
    disponible: (s.merite ?? 0) - (s.meriteDepense ?? 0),
    grade: d.grade ?? gradeSelonMerite(s.merite ?? 0).id,
    caracs: Object.fromEntries(Object.keys(CARACS).map(k => [k, s.caracs[k].base])),
    rangs: Object.fromEntries(Object.keys(COMPETENCES).map(k => [k, s.competences[k].rang])),
    sorcier: s.voie === "sorcier" || !!academie,
    academie,
    sortsPossedes: actor.items.filter(i => i.type === "sort").map(i => i.name),
    artsPossedes: actor.items.filter(i => i.type === "artmartial").map(i => i.name),
    sortsDispo: itemsContenu("sort").map(i => ({ nom: i.name, source: i.system.source, niveau: i.system.niveau })),
    artsDispo: itemsContenu("artmartial").map(i => ({ nom: i.name })),
    libellesCaracs: Object.fromEntries(Object.entries(CARACS).map(([k, v]) => [k, v.label])),
    libellesComps: Object.fromEntries(Object.entries(COMPETENCES).map(([k, v]) => [k, v.label]))
  };
}

async function appliquer(actor, o) {
  const s = actor.system;
  const maj = { "system.meriteDepense": (s.meriteDepense ?? 0) + o.cout };
  if (o.type === "competence") maj[`system.competences.${o.cle}.rang`] = s.competences[o.cle].rang + 1;
  else if (o.type === "carac") maj[`system.caracs.${o.cle}.base`] = s.caracs[o.cle].base + 1;
  else if (o.type === "nexus") { maj["system.bonus.nexus"] = (s.bonus?.nexus ?? 0) + 1; maj["system.nexus.value"] = (s.nexus?.value ?? 0) + 1; }
  else if (o.type === "art" || o.type === "sort") {
    const type = o.type === "art" ? "artmartial" : "sort";
    const modele = itemsContenu(type).find(i => i.name === o.cle);
    if (!modele) return ui.notifications.warn(`« ${o.cle} » est introuvable dans les objets du monde (Recréer le contenu du livre).`);
    const data = modele.toObject(); delete data._id; delete data.folder; delete data.sort;
    await actor.createEmbeddedDocuments("Item", [data]);
  }
  await actor.update(maj);
  const reste = (s.merite ?? 0) - (s.meriteDepense ?? 0) - o.cout;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteDestinHTML({ genre: "progression", nom: actor.name, portrait: actor.img, titre: "Progression au Mérite", texte: `${esc(GENRES[o.type])} : <b>${esc(o.label)}</b>`, lignes: [`Coût : <b>${o.cout}</b> Mérite`], pied: `Mérite restant : ${reste}` })
  });
}

/** Fenêtre de progression ; elle se rouvre après chaque achat jusqu'à fermeture. */
export async function ouvrirProgression(actor) {
  if (!actor.isOwner) return;
  for (;;) {
    const c = contexteAchats(actor);
    const opts = optionsAchat(c);
    const s = actor.system;
    const grade = s.derive?.gradeLabel ?? "";
    const prochain = s.merite < 30 ? `${30 - s.merite} Mérite avant Capitaine-Maraudeur` : s.merite < 50 ? `${50 - s.merite} Mérite avant Ombre du Chaos` : "Grade maximal";
    const genres = Object.keys(GENRES).filter(g => opts.some(o => o.type === g));
    const content = `<div class="adc-dialogue-jet adc-prog">
      <p class="adc-info-sous">${esc(grade)} · Mérite total ${s.merite} · dépensé ${s.meriteDepense ?? 0} · <b>disponible ${c.disponible}</b></p>
      <p class="adc-note">${esc(prochain)}. Prix : compétence 1 (jusqu'au rang 6), 2 (jusqu'à 9), 3 (Maître) ; Art martial ou sort 3 ; caractéristique ou Nexus 5.</p>
      <fieldset><legend>Que veux-tu acheter ?</legend>
        <div class="adc-selecteur"><label>Catégorie<select name="genre">${genres.map(g => `<option value="${g}">${GENRES[g]}</option>`).join("")}</select></label></div>
        <div class="adc-selecteur"><label>Achat<select name="achat"></select></label></div>
        <p class="adc-note adc-prog-raison"></p>
      </fieldset></div>`;
    const choix = await DialogV2.prompt({
      classes: [SYSTEM_ID, "adc-dialog-jet"],
      window: { title: `Progression : ${actor.name}`, icon: "fa-solid fa-ranking-star" },
      position: { width: 520 },
      content,
      render: (event, dialog) => {
        const f = dialog.element.querySelector("form") ?? dialog.element;
        const g = f.querySelector("[name=genre]"), a = f.querySelector("[name=achat]"), r = f.querySelector(".adc-prog-raison");
        const bouton = dialog.element.querySelector("button[data-action=ok]");
        const remplir = () => {
          const liste = opts.filter(o => o.type === g.value);
          a.innerHTML = liste.map((o, i) => `<option value="${opts.indexOf(o)}" ${o.possible ? "" : "disabled"}>${esc(o.label)} — ${o.cout} Mérite${o.possible ? "" : ` (${esc(o.raison)})`}</option>`).join("");
          const premier = [...a.options].find(x => !x.disabled);
          if (premier) a.value = premier.value;
          maj();
        };
        const maj = () => {
          const o = opts[Number(a.value)];
          r.textContent = o ? (o.possible ? `Coût : ${o.cout} Mérite.` : o.raison) : "";
          if (bouton) bouton.disabled = !o?.possible;
        };
        g.addEventListener("change", remplir); a.addEventListener("change", maj);
        remplir();
      },
      ok: { label: "Acheter", icon: "fa-solid fa-coins", callback: (e, b) => opts[Number(b.form.elements.achat.value)] },
      rejectClose: false
    });
    if (!choix || !choix.possible) return;
    await appliquer(actor, choix);
  }
}

/** Annonce le passage de grade (Mérite total modifié à la main ou par le MJ). */
export function initialiserProgression() {
  Hooks.on("preUpdateActor", (actor, changes, options) => {
    if (actor.type === "personnage" && foundry.utils.getProperty(changes, "system.merite") !== undefined) options.adcMeriteAvant = actor.system.merite ?? 0;
  });
  Hooks.on("updateActor", async (actor, changes, options) => {
    if (options.adcMeriteAvant === undefined || !game.users.activeGM?.isSelf) return;
    const avant = gradeSelonMerite(options.adcMeriteAvant).id, apres = gradeSelonMerite(actor.system.merite ?? 0).id;
    const lignes = passageDeGrade(avant, apres);
    if (!lignes.length) return;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: carteDestinHTML({ genre: "progression", nom: actor.name, portrait: actor.img, titre: `Nouveau grade : ${actor.system.derive?.gradeLabel ?? apres}`, lignes: lignes.map(esc), pied: "Les achats de sorts se font dans « Progression » (onglet Combat)" })
    });
  });
  Hooks.once("ready", () => { game.adc = Object.assign(game.adc ?? {}, { ouvrirProgression }); });
}
