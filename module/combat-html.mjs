/**
 * Gabarits HTML du combat : fenêtre d'attaque, boutons de réaction, carte de dégâts, Dernier soupir.
 * Fonctions pures (sans Foundry), testables sous Node.
 */
import { esc } from "./rolls-html.mjs";
import { ACTIONS_ATTAQUE, LOCALISATIONS } from "./combat.mjs";

export function attaqueHTML({ nom, score, formule, cible = null, defense = null, protection = 0, notes = [], nexus = 0, auto = {} }) {
  const actions = Object.entries(ACTIONS_ATTAQUE).map(([id, a], i) => `
    <label class="adc-choix adc-choix-court"><input type="radio" name="action" value="${id}" ${i === 0 ? "checked" : ""}>
      <span><b>${a.label}</b><small>${esc(a.detail)}</small></span></label>`).join("");
  const loc = Object.entries(LOCALISATIONS).map(([id, l]) =>
    `<option value="${id}">${esc(l.label)}${l.defense ? ` (Défense +${l.defense}${l.des ? `, +${l.des} dés` : ""})` : ""}</option>`).join("");
  const bascule = (nomChamp, titre, detail, coche = false, classe = "") => `
    <label class="adc-bascule ${classe}"><input type="checkbox" name="${nomChamp}" ${coche ? "checked" : ""}><span><b>${titre}</b><small>${detail}</small></span></label>`;
  return `
  <form class="adc-dialogue-jet adc-form-attaque">
    <div class="adc-d-tete">
      <div class="adc-d-medaillon"><strong>${score}</strong></div>
      <div class="adc-d-titre"><h2>${esc(nom)}</h2><span>Dégâts ${esc(formule)}${cible ? ` · cible : ${esc(cible)}` : " · aucune cible désignée"}</span></div>
    </div>
    ${notes.length ? `<p class="adc-note sang">${notes.map(esc).join(" · ")}</p>` : ""}
    <fieldset><legend>Action</legend><div class="adc-choix-liste adc-choix-ligne">${actions}</div></fieldset>
    <fieldset><legend>Difficulté</legend>
      <div class="adc-selecteur"><label>${defense !== null ? `Défense passive de la cible : ${defense}${protection ? ` · Protection ${protection}` : ""}` : "ND (Défense passive de l'adversaire)"}
        <input type="number" name="nd" value="${defense ?? 12}" ${defense !== null ? "" : ""}></label></div>
      <div class="adc-selecteur"><label>Partie du corps visée<select name="loc">${loc}</select></label></div>
    </fieldset>
    <fieldset><legend>Position</legend>
      <div class="adc-bascules adc-trois">
        ${bascule("dos", "De dos", "Inspiration")}
        ${bascule("sol", "Au sol", "Inspiration, +1 dé", !!auto.sol)}
        ${bascule("submerge", "Submergé", "Inspiration")}
      </div>
    </fieldset>
    <fieldset><legend>Options</legend>
      <div class="adc-bascules">
        ${bascule("inspire", "Inspiration", "Autre source", false, "inspire")}
        ${bascule("handicap", "Handicap", "Autre source", false, "handicap")}
        ${bascule("nonLetal", "Non létal", "1 PV au minimum")}
        ${nexus > 0 ? bascule("nexus", "Nexus", `Inspiration (${nexus})`, false, "nexus") : ""}
      </div>
      <div class="adc-pas"><button type="button" data-pas="-1" aria-label="Moins">−</button><input type="number" name="bonus" value="0" step="1"><button type="button" data-pas="1" aria-label="Plus">+</button></div>
    </fieldset>
  </form>`;
}

/** Boutons de réaction affichés sous une attaque qui touche. */
export function reactionsHTML({ cibleNom, peutReagir = true }) {
  return `<div class="adc-c-actions adc-reactions">
    <span class="adc-reac-titre">Réaction de ${esc(cibleNom)} <small>(−3 Endurance)</small></span>
    <div class="adc-reac-btns">
      <button type="button" class="adc-btn-reaction" data-reaction="esquive" ${peutReagir ? "" : "disabled"}><i class="fa-solid fa-person-running"></i> Esquive</button>
      <button type="button" class="adc-btn-reaction" data-reaction="parade" ${peutReagir ? "" : "disabled"}><i class="fa-solid fa-shield-halved"></i> Parade</button>
      <button type="button" class="adc-btn-reaction subir" data-reaction="subir"><i class="fa-solid fa-hand-fist"></i> Subir</button>
    </div></div>`;
}

export function degatsBouton() {
  return `<div class="adc-c-actions adc-reactions"><button type="button" class="adc-btn-reaction subir" data-reaction="degats"><i class="fa-solid fa-burst"></i> Lancer les dégâts</button></div>`;
}

/** Carte de dégâts : dés, somme, Protection, total net. */
export function carteDegatsHTML({ nom, portrait, titre, cibleNom, degre, d, appliquable = true, localisation = "", effets = [] }) {
  const des = d.des.map(v => `<span class="adc-de-degat">${v}</span>`).join("");
  const parties = [
    `${d.des.length}d${d.faces}${d.fixe ? ` ${d.fixe > 0 ? "+" : "−"} ${Math.abs(d.fixe)}` : ""}`,
    ...(d.bonusDegats ? [`bonus ${d.bonusDegats > 0 ? "+" : "−"}${Math.abs(d.bonusDegats)}`] : []),
    ...(d.ajust ? [`action ${d.ajust > 0 ? "+" : "−"}${Math.abs(d.ajust)}`] : [])
  ].join(" · ");
  return `
  <div class="adc-carte adc-carte2 adc-carte-degats ${degre}">
    <header class="adc-c-entete">
      ${portrait ? `<img class="adc-c-portrait" src="${esc(portrait)}" alt="" onerror="this.remove()">` : ""}
      <div class="adc-c-titres"><span class="adc-c-nom">${esc(titre)}</span><span class="adc-c-sous">${esc(nom)}${cibleNom ? ` → ${esc(cibleNom)}` : ""}</span></div>
    </header>
    <div class="adc-c-corps">
      <div class="adc-c-calcul">
        <span class="adc-total adc-total-degats"><strong>${d.net}</strong></span>
      </div>
      <details class="adc-detail">
        <summary><span class="ferme">Voir le détail des dégâts</span><span class="ouvert">Masquer le détail</span></summary>
        <div class="adc-des-degats">${des}</div>
        <p class="adc-c-ligne">${parties}</p>
        <p class="adc-c-ligne">Total ${d.brut}${d.protection ? ` − Protection ${d.protection}` : ""} = <b>${d.net}</b></p>
      </details>
      ${localisation ? `<p class="adc-c-ligne">Visée : ${esc(localisation)}</p>` : ""}
      ${effets.length ? `<ul class="adc-c-lignes">${effets.map(e => `<li>${e}</li>`).join("")}</ul>` : ""}
    </div>
    <footer class="adc-c-verdict"><strong>${d.absorbe ? "Absorbé par l'armure" : `${d.net} point${d.net > 1 ? "s" : ""} de dégâts`}</strong></footer>
    ${appliquable && d.net > 0 ? `<div class="adc-c-actions adc-reactions"><button type="button" class="adc-btn-reaction subir" data-reaction="appliquer"><i class="fa-solid fa-droplet"></i> Appliquer à ${esc(cibleNom || "la cible")}</button></div>` : ""}
  </div>`;
}

const ISSUES = {
  mort: ["Catastrophe : mort", "Le personnage meurt définitivement."],
  agonie: ["Échec", "Aux portes de Dame Mort pendant 3 tours : sans soins, il meurt."],
  stabilise: ["Stabilisé", "1 point d'Endurance, inconscient jusqu'aux soins."],
  conscient: ["Stabilisé et conscient", "1 point d'Endurance ; il peut agir, toujours Épuisé."],
  souffle: ["Second souffle !", "Endurance remontée au Seuil de fatigue + 1."]
};

export function carteSoupirHTML({ nom, portrait, r, issue, endurance, secondSouffleDeja = false }) {
  const [titre, texte] = ISSUES[issue];
  const classe = issue === "mort" ? "catastrophe" : issue === "agonie" ? "echec" : issue === "souffle" ? "critique" : "simple";
  return `
  <div class="adc-carte adc-carte2 adc-carte-destin ${classe}">
    <header class="adc-c-entete">
      ${portrait ? `<img class="adc-c-portrait" src="${esc(portrait)}" alt="" onerror="this.remove()">` : ""}
      <div class="adc-c-titres"><span class="adc-c-nom">Aux portes de Dame Mort</span><span class="adc-c-sous">${esc(nom)} · Dernier soupir (Carrure ND 15)</span></div>
    </header>
    <div class="adc-c-corps adc-c-texte">
      <p>${esc(texte)}</p>
      ${issue === "souffle" && secondSouffleDeja ? "" : ""}
      <p class="adc-c-ligne">Test : ${r.total} contre ND 15</p>
    </div>
    <footer class="adc-c-verdict"><strong>${esc(titre)}</strong>${endurance ? `<span>Endurance : ${endurance}</span>` : ""}</footer>
  </div>`;
}
