/**
 * HTML de l'assistant de création (une seule fenêtre). Fonctions pures : (état, contenu) → chaîne HTML.
 */
import { CARACS, COMPETENCES, MAISONS, VOIES } from "./config.mjs";
import { FORMATION_BASE_COMP, COMP_MAISONS, COMP_VOIES } from "./formations.mjs";
import {
  ETAPES, REGLES, erreursEtape, rangs, caracsBase, coutMerite, coutRang, estLoki, estSorcier, somme,
  bonusCaracsDe, traitsDe, listeMaison, listeVoie, aPlat
} from "./creation-data.mjs";
import { deriver } from "./calc.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lbl = (k) => COMPETENCES[k]?.label ?? k;
const GROUPES = Object.keys(CARACS);

const bouton = (act, attrs, texte, cls = "") =>
  `<button type="button" class="adc-asst-btn ${cls}" data-act="${act}" ${Object.entries(attrs).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ")}>${texte}</button>`;
const pas = (phase, cle, d, actif = true) => bouton("pt", { phase, cle, d }, d > 0 ? "+" : "−", `adc-asst-pas ${actif ? "" : "inactif"}`);

function ligne(phase, cle, nom, pts, detail, { plus = true, moins = true, requis = false } = {}) {
  return `<div class="adc-asst-ligne ${requis && !pts ? "manque" : ""}"><span class="adc-asst-nom">${esc(nom)}</span>
    <span class="adc-asst-detail">${detail ?? ""}</span>${pas(phase, cle, -1, moins)}<b class="adc-asst-val">${pts}</b>${pas(phase, cle, +1, plus)}</div>`;
}

function reste(total, utilises, unite = "point") {
  const r = total - utilises;
  return `<div class="adc-asst-reste ${r === 0 ? "ok" : r < 0 ? "trop" : ""}">${r === 0 ? "Tous les points sont répartis" : r > 0 ? `${r} ${unite}${r > 1 ? "s" : ""} à répartir` : `${-r} ${unite}${r < -1 ? "s" : ""} de trop`}</div>`;
}

/** Lignes d'une liste de compétences avec points, rang cumulé et plafond. */
function listePoints(e, phase, liste, total, plafond) {
  const pts = e.pts[phase] ?? {};
  const cumul = rangs(e, phase);
  const lignes = [];
  for (const item of liste) {
    const cles = Array.isArray(item) ? item : [item];
    const ouKey = Array.isArray(item);
    for (const k of cles) {
      const p = pts[k] || 0;
      const autre = ouKey ? cles.some(o => o !== k && (pts[o] || 0) > 0) : false;
      lignes.push(ligne(phase, k, lbl(k) + (ouKey ? " (au choix)" : ""), p, `rang ${cumul[k]}`,
        { plus: somme(pts) < total && cumul[k] < plafond && !autre, moins: p > 0, requis: !ouKey }));
    }
  }
  return `<div class="adc-asst-liste">${lignes.join("")}</div>${reste(total, somme(pts))}
    <p class="adc-asst-aide">Au moins 1 point par compétence de la liste, maximum ${plafond} par compétence.</p>`;
}

const carte = (champ, val, titre, sous, choisi, cls = "") =>
  `<button type="button" class="adc-asst-carte ${choisi ? "choisi" : ""} ${cls}" data-act="choisir" data-champ="${champ}" data-val="${esc(val)}"><strong>${esc(titre)}</strong>${sous ? `<small>${esc(sous)}</small>` : ""}</button>`;

/* ----------------------------------- étapes ----------------------------------- */

function etape1(e) {
  const lignes = GROUPES.map(k => {
    const v = REGLES.caracDepart + e.caracs[k];
    return ligne("caracs", k, CARACS[k].label, v, `départ ${REGLES.caracDepart}`,
      { plus: somme(e.caracs) < REGLES.caracPoints && v < REGLES.caracMaxCreation, moins: e.caracs[k] > 0 });
  }).join("");
  return `<p>Les six caractéristiques commencent à ${REGLES.caracDepart}. Répartis ${REGLES.caracPoints} points, avec un maximum de ${REGLES.caracMaxCreation} pour chacune. Les Maisons, la formation et les Voies ajouteront ensuite leurs bonus.</p>
    <div class="adc-asst-liste">${lignes}</div>${reste(REGLES.caracPoints, somme(e.caracs))}`;
}

function etape2(e, c) {
  const cartes = Object.entries(MAISONS).map(([k, m]) => carte("maison", k, m.label, `+1 ${CARACS[m.bonus].label}`, e.maison === k)).join("");
  let corps = "";
  if (e.maison) {
    const mai = (c.maisons ?? []).find(x => x.cle === e.maison);
    const tal = mai?.talents ?? [];
    const loki = estLoki(e);
    corps = `<div class="adc-asst-texte">${mai?.description ?? ""}</div>
      <h4>Compétences de la Maison</h4>${listePoints(e, "maison", listeMaison(e), REGLES.ptsMaison, REGLES.maxMaison)}
      <h4>${loki ? "Talents du Loki (imposés)" : "Talent secret (1 au choix)"}</h4>
      <div class="adc-asst-choix">${tal.map(t => `<button type="button" class="adc-asst-carte large ${e.talentsMaison.includes(t.nom) ? "choisi" : ""}" ${loki ? "" : `data-act="talent" data-val="${esc(t.nom)}"`}><strong>${esc(t.nom)}</strong><small>${esc(t.description)}</small></button>`).join("") || "<em>Contenu du livre introuvable (pack d'assets).</em>"}</div>`;
  }
  return `<p>Chaque agent du Chaos est affilié à une Maison, sauf s'il joue un Loki.</p><div class="adc-asst-cartes">${cartes}</div>${corps}`;
}

function etape3(e, c) {
  const cartes = Object.entries(VOIES).map(([k, v]) => carte("voie", k, v.label, `+1 ${CARACS[v.bonus].label}`, e.voie === k)).join("");
  let voie = "";
  if (e.voie) {
    const v = (c.voies ?? []).find(x => x.cle === e.voie);
    voie = `<div class="adc-asst-texte">${v?.description ?? ""}</div>
      <h4>Compétences de la Voie</h4>${listePoints(e, "voie", listeVoie(e), REGLES.ptsVoie, REGLES.maxVoie)}
      ${v ? `<details class="adc-asst-details"><summary>Talent : ${esc(v.talent?.nom)}</summary>${v.talent?.description ?? ""}</details>` : ""}`;
  }
  return `<h4>Formation de base du Maraudeur-Fantôme <small>+1 Réflexes, Constitution, Volonté</small></h4>
    ${listePoints(e, "base", FORMATION_BASE_COMP, REGLES.ptsBase, REGLES.maxBase)}
    <h4>Voie de formation spéciale</h4><div class="adc-asst-cartes">${cartes}</div>${voie}`;
}

function etape4(e) {
  const cumul = rangs(e, "libres");
  const blocs = GROUPES.map(g => {
    const l = Object.entries(COMPETENCES).filter(([, d]) => d.carac === g).map(([k]) => {
      const p = e.pts.libres[k] || 0;
      return ligne("libres", k, lbl(k), p, `rang ${cumul[k]}`, { plus: somme(e.pts.libres) < REGLES.ptsLibres && cumul[k] < REGLES.maxLibres, moins: p > 0 });
    }).join("");
    return `<div class="adc-asst-groupe"><h5>${CARACS[g].label}</h5>${l}</div>`;
  }).join("");
  return `<p>Répartis ${REGLES.ptsLibres} points dans toutes les compétences, avec un maximum de ${REGLES.maxLibres} par compétence (tous points confondus).</p>${reste(REGLES.ptsLibres, somme(e.pts.libres))}<div class="adc-asst-grille">${blocs}</div>`;
}

function selection(champ, liste, courant, vide) {
  const sel = liste.find(x => x.nom === courant);
  return `<select data-champ="${champ}"><option value="">${vide}</option>${liste.map(x => `<option value="${esc(x.nom)}" ${x.nom === courant ? "selected" : ""}>${esc(x.nom)}</option>`).join("")}</select>
    <div class="adc-asst-texte">${sel ? sel.description : ""}</div>`;
}

function etape5(e, c) {
  const loki = estLoki(e);
  const fortunes = (c.fortunes ?? []);
  const mal = (c.maledictions ?? []).filter(x => x.nom !== "Esprit protecteur");
  const esp = (c.maledictions ?? []).find(x => x.nom === "Esprit protecteur");
  return `<p>Une Fortune et une Malédiction définissent ce qui distingue ton agent.</p>
    <h4>Fortune</h4>${loki ? "<p><em>Un personnage Loki ne peut pas choisir de Fortune.</em></p>" : selection("fortune", fortunes, e.fortune, "— Choisir une Fortune —")}
    <h4>Malédiction</h4>${loki ? `<p><strong>Esprit protecteur</strong> (obligatoire).</p><div class="adc-asst-texte">${esc(esp?.description)}</div>` : selection("malediction", mal, e.malediction, "— Choisir une Malédiction —")}`;
}

function artDescr(a) {
  if (!a) return "";
  return `<h5>${esc(a.effetPermanent?.nom)}</h5>${a.effetPermanent?.description ?? ""}<h5>${esc(a.coupSpecial?.nom)} <small>${esc(a.coupSpecial?.actions)} · ${esc(a.coupSpecial?.duree)} · 1 Nexus</small></h5>${a.coupSpecial?.description ?? ""}`;
}

function etape6(e, c) {
  const arts = c.artsmartiaux ?? [];
  const a = arts.find(x => x.nom === e.art);
  let sorts = "";
  if (estSorcier(e)) {
    const dispo = (c.sorts ?? []).filter(s => s.niveau === "apprenti" && REGLES.sourcesSorcier.includes(s.source));
    const par = {};
    for (const s of dispo) (par[s.source] ??= []).push(s);
    sorts = `<h4>Sorts d'Apprenti <small>${e.sorts.length}/${REGLES.sortsSorcier} · sources de l'académie d'Eodh · les 3 sorts communs sont acquis</small></h4>` +
      Object.entries(par).map(([src, l]) => `<div class="adc-asst-groupe"><h5>Source : ${esc(src)}</h5><div class="adc-asst-choix">${l.map(s => `<button type="button" class="adc-asst-carte ${e.sorts.includes(s.nom) ? "choisi" : ""}" data-act="sort" data-val="${esc(s.nom)}"><strong>${esc(s.nom)}</strong><small>${s.mana} mana · ND ${s.difficulte || "var."}</small></button>`).join("")}</div></div>`).join("");
  }
  return `<p>L'Art martial personnalise ton style de combat.</p><h4>Art martial</h4>
    <select data-champ="art"><option value="">— Choisir un Art martial —</option>${arts.map(x => `<option value="${esc(x.nom)}" ${x.nom === e.art ? "selected" : ""}>${esc(x.nom)}</option>`).join("")}</select>
    <div class="adc-asst-texte">${artDescr(a)}</div>${sorts}`;
}

function etape7(e, c) {
  const cumulBase = rangs(e, "libres"), cumul = rangs(e, "merite");
  const depense = coutMerite(e), restant = REGLES.merite - depense;
  const blocs = GROUPES.map(g => {
    const caracB = REGLES.caracDepart + e.caracs[g] + e.merite.caracs[g];
    const l = Object.entries(COMPETENCES).filter(([, d]) => d.carac === g).map(([k]) => {
      const n = e.merite.comps[k] || 0, r = cumul[k], cout = coutRang(r);
      return ligne("meriteComp", k, lbl(k), n, `rang ${r}${cout !== Infinity ? ` · +1 = ${cout}` : " · max"}`, { plus: cout <= restant && r < 10, moins: n > 0 });
    }).join("");
    const cg = e.merite.caracs[g] || 0;
    const tete = ligne("meriteCarac", g, `${CARACS[g].label} +1 (5)`, cg, `base ${caracB}`, { plus: restant >= 5 && caracB < REGLES.caracMaxMerite, moins: cg > 0 });
    return `<div class="adc-asst-groupe"><h5>${CARACS[g].label}</h5>${tete}${l}</div>`;
  }).join("");
  const arts = (c.artsmartiaux ?? []).filter(a => a.nom !== e.art);
  const lesArts = `<h4>Arts martiaux supplémentaires <small>3 points chacun</small></h4><div class="adc-asst-choix">${arts.map(a => `<button type="button" class="adc-asst-carte ${e.merite.arts.includes(a.nom) ? "choisi" : ""}" data-act="meriteArt" data-val="${esc(a.nom)}"><strong>${esc(a.nom)}</strong></button>`).join("")}</div>`;
  let sorts = "";
  if (estSorcier(e)) {
    const pris = new Set([...e.sorts, ...e.merite.sorts]);
    const dispo = (c.sorts ?? []).filter(s => s.niveau === "apprenti" && s.source !== "Communs" && s.source !== "Sang" && !pris.has(s.nom) || e.merite.sorts.includes(s.nom));
    sorts = `<h4>Sorts d'Apprenti supplémentaires <small>3 points chacun (hors sources interdites par l'académie d'Eodh)</small></h4><div class="adc-asst-choix">${dispo.map(s => `<button type="button" class="adc-asst-carte ${e.merite.sorts.includes(s.nom) ? "choisi" : ""}" data-act="meriteSort" data-val="${esc(s.nom)}"><strong>${esc(s.nom)}</strong><small>${esc(s.source)}</small></button>`).join("")}</div>`;
  }
  const nx = e.merite.nexus || 0;
  return `<p>Tu disposes de ${REGLES.merite} points de Mérite. Rang +1 : 1 point jusqu'au rang 6, 2 points jusqu'au rang 9, 3 points pour le rang de Maître (10). Caractéristique ou Nexus +1 : 5 points.</p>
    <div class="adc-asst-reste ${restant === 0 ? "ok" : restant < 0 ? "trop" : ""}">Mérite : ${depense} dépensés, ${restant} restants</div>
    ${ligne("meriteNexus", "nexus", "Nexus +1 (5)", nx, `Nexus ${5 + nx}`, { plus: restant >= 5, moins: nx > 0 })}
    <div class="adc-asst-grille">${blocs}</div>${lesArts}${sorts}`;
}

function etape8(e) {
  const d = traitsDe(e, deriver);
  const cb = caracsBase(e), bc = bonusCaracsDe(e);
  const car = GROUPES.map(k => `<div class="adc-asst-trait"><span>${CARACS[k].label}</span><b>${cb[k] + bc[k]}</b><small>${cb[k]} + ${bc[k]}</small></div>`).join("");
  const t = (nom, v, note = "") => `<div class="adc-asst-trait"><span>${nom}</span><b>${v}</b>${note ? `<small>${note}</small>` : ""}</div>`;
  return `<p>Calculés automatiquement à partir de tes choix, comme sur la fiche.</p><h4>Caractéristiques finales</h4><div class="adc-asst-traits">${car}</div>
    <h4>Traits secondaires</h4><div class="adc-asst-traits">${t("Endurance", d.enduranceMax, `Seuil de fatigue ${d.seuilFatigue}`)}${t("Initiative", d.initiative)}${t("Mouvement", d.mouvement)}${t("Défense passive", d.defensePassive)}${t("Bonus aux dégâts", d.bonusDegats >= 0 ? `+${d.bonusDegats}` : d.bonusDegats)}${t("Mana", d.manaMax)}${t("Nexus", d.nexusMax)}${t("Hors-Destin", d.horsDestinMax)}${t("Encombrement", d.encombrement)}</div>
    <p class="adc-asst-aide">Grade de départ : ${esc(d.gradeLabel)}. Les bonus des Talents (Initiative, dégâts…) ne sont pas encore appliqués automatiquement : ajoute-les dans les bonus de la fiche.</p>`;
}

function etape9(e) {
  const i = e.infos;
  const champ = (k, nom, ph = "") => `<label>${nom}<input type="text" data-info="${k}" value="${esc(i[k])}" placeholder="${esc(ph)}"></label>`;
  const zone = (k, nom, ph) => `<label>${nom}<textarea data-info="${k}" rows="4" placeholder="${esc(ph)}">${esc(i[k])}</textarea></label>`;
  return `<p>Il te faut un nom, une histoire, une personnalité. Tu auras 300 £A de pécule : l'équipement se choisit sur la fiche (armes maniées et armure de cuir gras fournies).</p>
    ${champ("nom", "Nom du personnage", "Nom")}
    <div class="adc-asst-ligne4">${champ("genre", "Genre")}${champ("age", "Âge")}${champ("taille", "Taille")}${champ("poids", "Poids")}${champ("cheveux", "Cheveux")}${champ("yeux", "Yeux")}${champ("peau", "Peau")}</div>
    ${zone("historique", "Historique", "Naissance, enfance, ce qui t'a mené au Chaos…")}${zone("physionomie", "Physionomie", "Apparence, style, ce qui émane de lui…")}${zone("personnalite", "Personnalité", "Traits de caractère, valeurs, défauts…")}`;
}

const CORPS = { 1: etape1, 2: etape2, 3: etape3, 4: etape4, 5: etape5, 6: etape6, 7: etape7, 8: etape8, 9: etape9 };

export function vueHTML(e, contenu = {}) {
  const n = e.etape;
  const erreurs = erreursEtape(e, n, contenu);
  const pills = ETAPES.map(s => `<button type="button" class="adc-asst-pill ${s.id === n ? "actif" : ""} ${s.id < n ? "fait" : ""}" data-act="aller" data-n="${s.id}" ${s.id > n ? "disabled" : ""}><span>${s.id}</span>${esc(s.titre)}</button>`).join("");
  const aucun = !(contenu.maisons?.length);
  return `<nav class="adc-asst-etapes">${pills}</nav>
    <section class="adc-asst-corps"><h3>Étape ${n} — ${esc(ETAPES[n - 1].titre)}</h3>
      ${aucun && n > 1 ? `<p class="adc-asst-alerte">Le pack d'assets (contenu du livre) est introuvable : Talents, Fortunes, Arts martiaux et sorts ne seront pas proposés.</p>` : ""}
      ${CORPS[n](e, contenu)}</section>
    <footer class="adc-asst-pied"><ul class="adc-asst-erreurs">${erreurs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <div>${n > 1 ? bouton("precedent", {}, "← Précédent") : ""}${n < 9 ? bouton("suivant", {}, "Suivant →", erreurs.length ? "inactif" : "primaire") : bouton("terminer", {}, "Créer le personnage", erreurs.length ? "inactif" : "primaire")}</div></footer>`;
}
