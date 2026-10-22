/**
 * Gabarits HTML du Nexus, du Hors-Destin et du repos (fonctions pures, testables sous Node).
 */
import { esc } from "./rolls-html.mjs";

/** Ce qu'on peut faire avec un point de Nexus (livre de base, p. 85). */
export const USAGES_NEXUS = [
  { id: "relance", titre: "Relancer un test", detail: "Utilisez le bouton « Relancer » de la carte du jet concerné." },
  { id: "inspiration", titre: "Inspiration ou fin d'un Handicap", detail: "Cochez la case Nexus dans la fenêtre du test." },
  { id: "degats", titre: "Réduire de 10 les dégâts subis", detail: "Rend jusqu'à 10 points d'Endurance." },
  { id: "etat", titre: "Annuler un état préjudiciable", detail: "Retire l'état de la fiche." },
  { id: "talent", titre: "Utiliser un Talent ou un Art martial", detail: "Annonce le Talent ou le coup spécial dans le chat." }
];

/** Les usages du Hors-Destin (p. 86-87). */
export const USAGES_DESTIN = [
  { id: "epique", titre: "Action épique", detail: "Prenez la place du Meneur : décrivez une action sans jet. Le groupe l'approuve ou non, le point est perdu dans les deux cas." },
  { id: "equipement", titre: "Équipement caché", detail: "Votre personnage a justement l'objet qu'il faut." },
  { id: "relation", titre: "Relation locale", detail: "Votre personnage connaît quelqu'un qui peut l'aider." },
  { id: "seduction", titre: "Séduction", detail: "Votre personnage séduit l'élu(e) de son cœur, malgré tout." },
  { id: "impossible", titre: "Réussir l'impossible", detail: "Réussite automatique jusqu'au ND 30, dans la mesure des capacités humaines." },
  { id: "mort", titre: "Éviter la mort", detail: "Pour vous ou un autre joueur. Ce point est définitivement perdu." }
];

/** Conditions de repos (p. 115). */
export const CONDITIONS_REPOS = [
  { id: "soins", label: "Maison de soins, Temple de la Guelfe blanche", mod: 10 },
  { id: "luxe", label: "Confort luxueux, nourriture de qualité (hôtel)", mod: 5 },
  { id: "auberge", label: "Lieu confortable, chauffé, nourriture (auberge)", mod: 3 },
  { id: "inconfortable", label: "Lieu inconfortable (étable, forêt sauvage, caverne)", mod: -3 },
  { id: "inhospitalier", label: "Lieu inhospitalier (marais, désert, glacier)", mod: -5 },
  { id: "hostile", label: "Lieu hostile (territoire ennemi, dangers permanents)", mod: -10 }
];

/** Récupération apportée par un soigneur (test de Guérison ND 15). */
export const SOINS = [
  { id: "aucun", label: "Pas de soigneur", pv: 0 },
  { id: "simple", label: "Guérison ND 15 réussie : +5", pv: 5 },
  { id: "majeure", label: "Réussite majeure : +10", pv: 10 },
  { id: "critique", label: "Réussite critique : +15", pv: 15 },
  { id: "catastrophe", label: "Catastrophe : plaies infectées, aucune récupération", pv: null }
];

const choix = (nom, liste, coche) => liste.map((o, i) => `
  <label class="adc-choix"><input type="radio" name="${nom}" value="${esc(o.id)}" ${(coche ?? liste[0].id) === o.id ? "checked" : ""}>
    <span><b>${esc(o.titre ?? o.label)}</b>${o.detail ? `<small>${esc(o.detail)}</small>` : o.mod !== undefined ? `<small>Récupération d'Endurance ${o.mod > 0 ? "+" : ""}${o.mod}</small>` : ""}</span></label>`).join("");

export function menuHTML({ titre, restant, unite, usages, nom = "usage", extra = "" }) {
  return `
  <div class="adc-dialogue-jet">
    <div class="adc-d-tete">
      <div class="adc-d-medaillon"><strong>${restant}</strong></div>
      <div class="adc-d-titre"><h2>${esc(titre)}</h2><span>${restant} ${esc(unite)} disponible${restant > 1 ? "s" : ""}</span></div>
    </div>
    <fieldset><legend>Choisir l’usage du point</legend><div class="adc-choix-liste">${choix(nom, usages)}</div></fieldset>
    ${extra}
  </div>`;
}

export function reposHTML({ carrure, artsEtranges, nom }) {
  return `
  <div class="adc-dialogue-jet">
    <div class="adc-d-tete">
      <div class="adc-d-medaillon"><strong>8 h</strong></div>
      <div class="adc-d-titre"><h2>Période de repos</h2><span>${esc(nom)} · Carrure ${carrure}${artsEtranges ? ` · Arts étranges ${artsEtranges}` : ""}</span></div>
    </div>
    <fieldset><legend>Conditions du repos</legend><div class="adc-choix-liste">${choix("condition", CONDITIONS_REPOS, "auberge")}</div></fieldset>
    <fieldset><legend>Soigneur</legend>
      <div class="adc-selecteur"><select name="soin">${SOINS.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</select></div>
    </fieldset>
    <p class="adc-note">Récupère : Endurance (Carrure ± conditions ± soins), Mana (Arts étranges ± conditions), tout le Nexus.</p>
  </div>`;
}

/** Carte de chat compacte pour un point dépensé ou un repos. */
export function carteDestinHTML({ genre, nom, portrait, titre, texte = "", lignes = [], pied = "" }) {
  return `
  <div class="adc-carte adc-carte2 adc-carte-destin ${esc(genre)}">
    <header class="adc-c-entete">
      ${portrait ? `<img class="adc-c-portrait" src="${esc(portrait)}" alt="" onerror="this.remove()">` : ""}
      <div class="adc-c-titres"><span class="adc-c-nom">${esc(titre)}</span><span class="adc-c-sous">${esc(nom)}</span></div>
    </header>
    <div class="adc-c-corps adc-c-texte">
      ${texte ? `<p>${texte}</p>` : ""}
      ${lignes.length ? `<ul class="adc-c-lignes">${lignes.map(l => `<li>${l}</li>`).join("")}</ul>` : ""}
    </div>
    ${pied ? `<footer class="adc-c-verdict"><strong>${pied}</strong></footer>` : ""}
  </div>`;
}
