// Banc d'essai de l'assistant de création (logique pure). Usage : node tools/test-creation.mjs [contenu.json]
import fs from "node:fs";
import { etatInitial, erreursEtape, rangs, coutMerite, coutRang, caracsBase, appliquer, REGLES, aPlat, listeMaison, listeVoie } from "../module/creation-data.mjs";
import { FORMATION_BASE_COMP } from "../module/formations.mjs";
import { documentsItems } from "../module/contenu-data.mjs";
import { COMPETENCES } from "../module/config.mjs";
let ko = 0; const t = (c, m) => { if (!c) { ko++; console.error("KO", m); } };

// coût de Mérite
t(coutRang(0) === 1 && coutRang(5) === 1 && coutRang(6) === 2 && coutRang(8) === 2 && coutRang(9) === 3 && coutRang(10) === Infinity, "coûts de rang");

/** Répartit `total` points en respectant min 1 sur la liste puis le reste sur le premier élément sous le plafond. */
function repartir(e, phase, liste, total, plafond) {
  const pts = (e.pts[phase] = {});
  const choix = liste.map(x => (Array.isArray(x) ? x[0] : x));
  for (const k of choix) pts[k] = 1;
  let reste = total - choix.length, i = 0;
  while (reste > 0) { const k = choix[i++ % choix.length]; if (rangs(e, phase)[k] < plafond) { pts[k]++; reste--; } }
}

const e = etatInitial();
t(erreursEtape(e, 1).length > 0, "étape 1 vide invalide");
Object.assign(e.caracs, { ref: 3, con: 3, pui: 3, cha: 2, int: 2, vol: 2 });
t(erreursEtape(e, 1).length === 0, "étape 1 : " + erreursEtape(e, 1));
e.caracs.ref = 4; t(erreursEtape(e, 1).length > 0, "trop de points / plafond");
e.caracs.ref = 3;
e.caracs.pui = 4; e.caracs.cha = 1; t(erreursEtape(e, 1).length > 0, "PUI 8 > 7");
e.caracs.pui = 3; e.caracs.cha = 2;

e.maison = "garthe"; e.talentsMaison = ["Sang fendyr"];
repartir(e, "maison", listeMaison(e), 20, 7);
t(erreursEtape(e, 2).length === 0, "étape 2 : " + erreursEtape(e, 2));
e.pts.maison.beauParleur = 1; t(erreursEtape(e, 2).some(x => /liste/.test(x)), "hors liste refusé");
delete e.pts.maison.beauParleur;
e.talentsMaison = []; t(erreursEtape(e, 2).length === 1, "talent requis");
e.talentsMaison = ["Sang fendyr"];

repartir(e, "base", FORMATION_BASE_COMP, 20, 7);
e.voie = "duelliste"; repartir(e, "voie", listeVoie(e), 20, 9);
t(erreursEtape(e, 3).length === 0, "étape 3 : " + erreursEtape(e, 3));

e.pts.libres = { artsEtranges: 9, enquete: 9, serrurerie: 2 };
t(erreursEtape(e, 4).length === 0, "étape 4 : " + erreursEtape(e, 4));
e.pts.libres = { artsEtranges: 9, enquete: 9, serrurerie: 3 }; t(erreursEtape(e, 4).length > 0, "libres 21");
e.pts.libres = { artsEtranges: 9, enquete: 9, survie: 2 }; t(erreursEtape(e, 4).length === 0, "plafond 9 respecté : " + erreursEtape(e, 4));
e.pts.libres = { artsEtranges: 10, enquete: 10 }; // 10 en Arts étranges : pas de plafond dépassé (pas dans les étapes précédentes)
t(erreursEtape(e, 4).some(x => /dépasse/.test(x)), "10 > 9 refusé");
e.pts.libres = { artsEtranges: 9, enquete: 9, serrurerie: 2 };

e.fortune = "Guerrier né"; e.malediction = "Naïf"; e.art = "Wush’in";
t(erreursEtape(e, 5).length === 0 && erreursEtape(e, 6).length === 0, "étapes 5 et 6");

// Mérite : +1 caractéristique (5) + 3 rangs 0→3 en Nature (3) + une compétence 6→7 (2) + Art martial (3) = 13 ≤ 15
const r0 = rangs(e, "libres");
e.merite.caracs.vol = 1; e.merite.comps = { nature: 3 };
const cl = Object.keys(r0).find(k => r0[k] === 6); if (cl) e.merite.comps[cl] = 1;
e.merite.arts = ["Hache-Ombre"];
t(coutMerite(e) === 5 + 3 + (cl ? 2 : 0) + 3, `coût Mérite ${coutMerite(e)} (cl=${cl}, r0=${cl ? r0[cl] : "-"})`);
t(erreursEtape(e, 7).length === 0, "étape 7 : " + erreursEtape(e, 7));
e.merite.nexus = 1; t(erreursEtape(e, 7).length > 0 || coutMerite(e) <= 15, "budget Mérite");
e.merite.nexus = 0;

e.infos.nom = ""; t(erreursEtape(e, 9).length === 1, "nom requis");
e.infos.nom = "Maeve"; e.infos.historique = "Née dans la soie.\nPuis la forteresse.";
t(erreursEtape(e, 9).length === 0, "étape 9");

const chemin = process.argv[2] ?? "assets/contenu/contenu.json";
if (fs.existsSync(chemin)) {
  const c = JSON.parse(fs.readFileSync(chemin, "utf8")).contenu;
  const { update, items } = appliquer(e, c, documentsItems);
  const s = update.system;
  t(s.caracs.vol.base === 4 + 2 + 1 && s.caracs.ref.base === 7, "caractéristiques de base");
  t(Object.values(s.competences).reduce((a, x) => a + x.rang, 0) === 20 + 20 + 20 + 20 + 3 + (cl ? 1 : 0), "total des rangs");
  t(s.merite === 15 && s.monnaie.argent === 300, "mérite et monnaie");
  const types = items.map(i => i.type).sort();
  t(items.some(i => i.name === "Sang fendyr") && items.some(i => i.name === "Mon corps est une arme") && items.some(i => i.name === "Guerrier né"), "talents et fortune");
  t(items.filter(i => i.type === "artmartial").length === 2, "deux Arts martiaux");
  t(!items.some(i => i.type === "sort"), "pas de sorts pour un non-Sorcier");
  console.log({ nom: update.name, items: types, bio: s.biographie.historique });
  // Sorcier : 5 sorts + 3 communs
  const f = etatInitial(); f.voie = "sorcier"; f.maison = "eodh";
  t(erreursEtape(f, 6).length === 2, "sorcier : art + sorts requis");
  f.art = "Wush’in"; f.sorts = c.sorts.filter(x => x.niveau === "apprenti" && REGLES.sourcesSorcier.includes(x.source)).slice(0, 5).map(x => x.nom);
  t(f.sorts.length === 5 && erreursEtape(f, 6).length === 0, "sorcier étape 6 : " + erreursEtape(f, 6));
  f.infos.nom = "Syl";
  const r = appliquer(f, c, documentsItems);
  t(r.items.filter(i => i.type === "sort").length === 8, "5 sorts + 3 communs : " + r.items.filter(i => i.type === "sort").length);
  t(r.update.system.competences.beauParleur.rang === 1, "Eodh : +1 Beau-parleur");
  // Loki
  const l = etatInitial(); l.maison = "loki"; l.talentsMaison = ["Coeur de Loki", "Sens de Loki (un sens au choix : vue, odorat, goût, toucher, ouïe)"];
  l.fortune = ""; l.malediction = "";
  t(erreursEtape(l, 5).length === 0, "Loki : ni Fortune ni choix de Malédiction");
  const rl = appliquer({ ...l, infos: { ...l.infos, nom: "Gher" } }, c, documentsItems);
  t(rl.items.some(i => i.name === "Esprit protecteur"), "Loki : Esprit protecteur");
} else console.log("contenu.json absent : tests d'application ignorés.");
// Interface : chaque étape se rend sans erreur et l'action « agir » respecte les budgets.
{
  const { vueHTML } = await import("../module/creation-html.mjs");
  const { agir } = await import("../module/creation-data.mjs");
  const c = fs.existsSync(chemin) ? JSON.parse(fs.readFileSync(chemin, "utf8")).contenu : {};
  const v = etatInitial();
  for (let n = 1; n <= 9; n++) { v.etape = n; const h = vueHTML(v, c); t(h.includes("adc-asst-corps") && !h.includes("undefined"), `rendu étape ${n}`); }
  for (let i = 0; i < 40; i++) agir(v, "pt", { phase: "caracs", cle: "ref", d: 1 });
  t(v.caracs.ref === 3, "REF plafonné à 7 : " + v.caracs.ref);
  for (const k of ["con", "pui", "cha", "int", "vol"]) for (let i = 0; i < 9; i++) agir(v, "pt", { phase: "caracs", cle: k, d: 1 });
  t(Object.values(v.caracs).reduce((a, b) => a + b, 0) === 15, "15 points maximum");
  agir(v, "choisir", { champ: "maison", val: "loki" }, c);
  t(!c.maisons || v.talentsMaison.length === 2, "Loki : 2 talents automatiques");
  agir(v, "choisir", { champ: "maison", val: "eodh" }, c);
  t(v.talentsMaison.length === 0, "changer de Maison réinitialise");
  for (let i = 0; i < 30; i++) agir(v, "pt", { phase: "maison", cle: "esquive", d: 1 });
  t(v.pts.maison.esquive === 7, "plafond de Maison 7 : " + v.pts.maison.esquive);
  agir(v, "pt", { phase: "maison", cle: "artsDuCombat", d: 1 }); agir(v, "pt", { phase: "maison", cle: "artsEtranges", d: 1 });
  t(!(v.pts.maison.artsDuCombat && v.pts.maison.artsEtranges), "« X ou Y » : une seule des deux");
}
if (ko) { console.error(`ÉCHEC : ${ko}`); process.exit(1); }
console.log("OK : logique de création.");
