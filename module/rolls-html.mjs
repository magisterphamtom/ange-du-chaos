/**
 * Gabarits HTML de la carte de chat et de la fenêtre de jet (fonctions pures, sans Foundry : testables sous Node).
 * Les images viennent de assets/ (pack privé) ; sans elles, le CSS retombe sur des aplats de couleur.
 */
import { ASSETS, NIVEAUX_DIFFICULTE } from "./config.mjs";

export const LIBELLES_DEGRE = {
  catastrophe: "Catastrophe",
  echec: "Échec",
  simple: "Réussite",
  majeure: "Réussite majeure",
  critique: "Réussite critique"
};

/** Phrase d'ambiance sous le verdict. */
const PHRASES = {
  catastrophe: "Le Seigneur Destin vous hait.",
  echec: "Le Destin se détourne.",
  simple: "La tâche est accomplie.",
  majeure: "Une belle démonstration de talent.",
  critique: "Un succès au-delà des espérances !"
};

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const signe = (n) => (n >= 0 ? "+" : "−") + Math.abs(n);

/** Libellé du score de compétence (livre de base, p. 35 : « Scores des compétences »). */
export function libelleScore(score) {
  if (score <= 4) return "Défaillant";
  if (score <= 9) return "Faible";
  if (score <= 14) return "Compétent";
  if (score <= 19) return "Doué";
  return "Héroïque";
}

/** Un dé du Destin : la chaîne des jets (10 → 10 → 1…) et sa valeur. */
function destinHTML(d, retenu, ecarte) {
  const depart = d.jets[0];
  const teinte = ecarte ? "ombre" : depart === 10 ? "or" : depart === 1 ? "sang" : "norm";
  const signeChaine = depart === 1 ? "−" : "+";
  const de = d.jets.map((j, i) =>
    `${i ? `<span class="adc-sep">${signeChaine}</span>` : ""}<span class="adc-de ${teinte}"><i>${j}</i></span>`).join("");
  return `<div class="adc-destin ${retenu ? "retenu" : ""} ${ecarte ? "ecarte" : ""}">
      <div class="adc-chaine">${de}</div>
      <span class="adc-destin-val">${d.valeur >= 0 ? "+" : "−"}${Math.abs(d.valeur)}</span>
    </div>`;
}

export function carteHTML({ nom, portrait, sousTitre = "", resultat: r, relancable = false, relance = false, actions = "" }) {
  const multiple = r.destins.length > 1;
  const des = r.destins.map((d, i) => destinHTML(d, multiple && i === r.retenu, multiple && i !== r.retenu)).join("");
  const mode = { inspire: "Inspiré", handicap: "Handicapé", normal: "" }[r.mode];
  const verdict = r.degre ? LIBELLES_DEGRE[r.degre] : "";
  const auto = r.double10 ? "Double 10 : la faveur du Seigneur Destin !" : r.double1 ? "Double 1 : le retour de flammes !" : "";
  const marge = r.nd !== null && r.total !== undefined && !r.double10 && !r.double1
    ? `<span class="adc-marge">${r.total - r.nd >= 0 ? "+" : "−"}${Math.abs(r.total - r.nd)} sur le ND</span>` : "";
  const calcul = r.double10 || r.double1 ? "" : `
      <span class="adc-formule"><b>${r.score}</b>${r.bonus ? ` <em>${signe(r.bonus)}</em>` : ""} <em>${signe(r.de)}</em></span>`;
  return `
  <div class="adc-carte adc-carte2 ${r.degre ?? ""}">
    <header class="adc-c-entete">
      ${portrait ? `<img class="adc-c-portrait" src="${esc(portrait)}" alt="" onerror="this.remove()">` : ""}
      <div class="adc-c-titres">
        <span class="adc-c-nom">${esc(nom)}</span>
        <span class="adc-c-sous">${esc(sousTitre)}${mode ? `${sousTitre ? " · " : ""}<b class="mode ${r.mode}">${mode}</b>` : ""}${r.bloque ? " · <b class=\"mode bloque\">Bloqué</b>" : ""}${relance ? " · <b class=\"mode nexus\">Relance</b>" : ""}</span>
      </div>
    </header>
    <div class="adc-c-corps">
      <div class="adc-c-calcul">
        ${r.double10 || r.double1 ? `<span class="adc-total adc-total-auto"><strong>${r.double10 ? "10·10" : "1·1"}</strong></span>` : `<span class="adc-total"><strong>${r.total}</strong></span>`}
        ${r.nd !== null ? `<span class="adc-nd"><small>ND</small><strong>${r.nd}</strong></span>` : ""}
      </div>
      <details class="adc-detail">
        <summary><span class="ferme">Voir le détail du jet</span><span class="ouvert">Masquer le détail</span></summary>
        <div class="adc-destins">${des}</div>
        ${r.double10 || r.double1 ? "" : `<div class="adc-c-calcul adc-c-formule">${calcul}<span class="adc-egal">=</span><b>${r.total}</b></div>`}
      </details>
    </div>
    ${verdict ? `<footer class="adc-c-verdict"><strong>${verdict}</strong><span>${auto || PHRASES[r.degre]}</span>${marge}</footer>` : ""}
    ${actions}
    ${relancable ? `<div class="adc-c-actions"><button type="button" class="adc-btn-relance" data-tooltip="Dépenser 1 point de Nexus pour relancer ce test"><i class="fa-solid fa-rotate"></i> Relancer — 1 Nexus</button></div>` : ""}
  </div>`;
}

/** Contenu de la fenêtre de jet. */
export function dialogueHTML({ infos, nd = null, etat = { handicap: false, notes: [], sansInspiration: false }, nexus = 0 }) {
  const puces = [`<label class="adc-nd-puce"><input type="radio" name="nd" value="" ${nd === null ? "checked" : ""}><span><b>—</b><small>Libre</small></span></label>`]
    .concat(NIVEAUX_DIFFICULTE.map(n =>
      `<label class="adc-nd-puce"><input type="radio" name="nd" value="${n.nd}" ${n.nd === nd ? "checked" : ""}><span><b>${n.nd}</b><small>${esc(n.label.replace('Très difficile', 'Très diff.'))}</small></span></label>`)).join("");
  const expert = infos.rang >= 7
    ? `<p class="adc-note or">Rang Expert : réussite automatique jusqu'au ND 15, si le Meneur l'accepte.</p>` : "";
  return `
  <div class="adc-dialogue-jet">
    <div class="adc-d-tete">
      <div class="adc-d-medaillon"><strong>${infos.score}</strong></div>
      <div class="adc-d-titre">
        <h2>${esc(infos.nom)}</h2>
        <span>${esc(infos.detail ?? "")}${infos.type === "competence" ? ` · ${libelleScore(infos.score)}` : ""}</span>
      </div>
    </div>
    ${infos.bloque ? `<p class="adc-note sang">Inapte : un 10 ne se relance pas.</p>` : ""}
    ${expert}
    <fieldset><legend>Niveau de difficulté</legend><div class="adc-nd-rangee">${puces}</div></fieldset>
    <fieldset><legend>Le regard du Seigneur Destin</legend>
      <div class="adc-bascules">
        <label class="adc-bascule inspire"><input type="checkbox" name="inspire"><span><b>Inspiration</b><small>2 dés, on garde le meilleur</small></span></label>
        <label class="adc-bascule handicap"><input type="checkbox" name="handicap" ${etat.handicap ? "checked" : ""}><span><b>Handicap</b><small>2 dés, on garde le pire</small></span></label>
      </div>
      <p class="adc-note">${etat.notes.length ? esc(etat.notes.join(" · ")) + ". " : ""}Inspiration et Handicap s'annulent.</p>
    </fieldset>
    ${nexus > 0 ? `<fieldset class="adc-fs-nexus"><legend>Nexus</legend>
      <label class="adc-bascule nexus"><input type="checkbox" name="nexus"><span><b>Dépenser 1 Nexus</b><small>Inspiration, ou annule un Handicap (${nexus} restant${nexus > 1 ? "s" : ""})</small></span></label>
    </fieldset>` : ""}
    <fieldset><legend>Bonus / malus</legend>
      <div class="adc-pas"><button type="button" data-pas="-1" aria-label="Moins">−</button><input type="number" name="bonus" value="0" step="1"><button type="button" data-pas="1" aria-label="Plus">+</button></div>
    </fieldset>
  </div>`;
}
