// Banc d'essai des drogues (p. 121-128). Usage : node tools/test-drogues.mjs [chemin contenu.json]
import fs from "node:fs";
import { ndDrogue, trouverDrogue, etatVide, prendreDose, terminer, finPositif, basculerManque, appliquerSevrage, effetsDrogues, modifsDrogues, estSortDeSoin, DROGUES } from "../module/drogues.mjs";
import { effetsDesEtats } from "../module/combat.mjs";
let ko = 0; const t = (c, m) => { if (!c) { ko++; console.error("KO", m); } };

// ND
t(ndDrogue("Douce", "10") === 10 && ndDrogue("Dure", "15") === 15 && ndDrogue("Létale", "20") === 20 && ndDrogue("Dure", "") === 15, "ND de Résilience");
// reconnaissance de toutes les drogues du livre
const chemin = process.argv[2] ?? "/tmp/claude-0/adc/pack/assets/contenu/contenu.json";
if (fs.existsSync(chemin)) {
  const c = JSON.parse(fs.readFileSync(chemin, "utf8")).contenu;
  for (const d of c.drogues) t(trouverDrogue(d.nom), `drogue inconnue : ${d.nom}`);
  t(c.drogues.length === Object.keys(DROGUES).length, "10 drogues du livre, 10 fiches d'effets");
  const soins = c.sorts.filter(x => estSortDeSoin({ nom: x.nom, effet: x.effet })).map(x => x.nom);
  for (const n of ["Toucher de la Guelfe blanche", "Bénédiction de la Guelfe blanche", "Caresse de la Sylve", "Toucher de la Sylve", "Caresse de Vérania", "Étreinte de Vérania", "Secret du sang", "Ruisseaux de sang"]) t(soins.includes(n), `sort de soin non repéré : ${n}`);
  t(!soins.includes("Boule de feu") && soins.length <= 10, `trop de faux positifs : ${soins.join(", ")}`);
}
t(trouverDrogue("Herbe Loki n° 22")?.cle === "herbe loki" && trouverDrogue("Brume Feu")?.cle === "brume-feu" && trouverDrogue("Cristal d’Ambre")?.cle === "cristal d'ambre", "variantes de noms");

// dose : réussite → positif seul ; échec → les deux ; catastrophe → dépendance
let e = prendreDose(etatVide(), { nom: "Pesquann", negatif: false });
let fx = effetsDrogues(e);
t(fx.ignoreEpuise && fx.handicap.length === 0, "Pesquann réussi : ignore Épuisé, pas de Handicap");
e = prendreDose(etatVide(), { nom: "Pesquann", negatif: true });
fx = effetsDrogues(e);
t(fx.handicap.length === 1 && modifsDrogues(fx, { carac: "ref" }).handicap.length === 1 && modifsDrogues(fx, { carac: "vol", cle: "perception" }).handicap.length === 1 && modifsDrogues(fx, { carac: "pui" }).handicap.length === 0, "Pesquann raté : Handicap REF et VOL seulement");
e = prendreDose(etatVide(), { nom: "Herbe Loki n° 22", negatif: false, dependant: true });
t(e.dependances.length === 1 && !e.dependances[0].manque, "catastrophe : dépendance");
// pas de cumul
const e2 = prendreDose(e, { nom: "Herbe Loki n° 22", negatif: false });
t(e2.actives.length === 1 && e2.dependances.length === 1, "une seconde dose n'ajoute rien");
// négatif déjà subi reste
t(prendreDose(prendreDose(etatVide(), { nom: "Pentii", negatif: true }), { nom: "Pentii", negatif: false }).actives[0].negatif, "le négatif reste");
// inspiration
fx = effetsDrogues(e);
t(modifsDrogues(fx, { carac: "cha", cle: "seduction" }).inspire.length === 1 && modifsDrogues(fx, { carac: "int" }).inspire.length === 0, "Herbe Loki : Inspiration en Charme");
// manque
let m = basculerManque(e, "Herbe Loki n° 22");
fx = effetsDrogues({ actives: [], dependances: m.dependances });
t(modifsDrogues(fx, { carac: "int", cle: "erudition" }).handicap.length === 1 && modifsDrogues(fx, { carac: "cha" }).handicap.length === 0, "En manque : Handicap en Intelligence");
t(prendreDose(m, { nom: "Herbe Loki n° 22" }).dependances[0].manque === false, "une dose met fin au manque");
// compétences ciblées
fx = effetsDrogues(prendreDose(etatVide(), { nom: "Licorne pourpre", negatif: true }));
t(modifsDrogues(fx, { carac: "cha", cle: "seduction" }).inspire.length === 1 && modifsDrogues(fx, { carac: "cha", cle: "artsDeLaCour" }).inspire.length === 0 && modifsDrogues(fx, { carac: "int" }).handicap.length === 1 && modifsDrogues(fx, { carac: "vol" }).handicap.length === 1, "Licorne pourpre");
// initiative
fx = effetsDrogues(prendreDose(etatVide(), { nom: "Poudre de lotus", negatif: true }));
t(modifsDrogues(fx, { init: true }).inspire.length === 1 && modifsDrogues(fx, { init: true }).handicap.length === 1, "Lotus : initiative");
const fl = finPositif(prendreDose(etatVide(), { nom: "Poudre de lotus", negatif: true }), "Poudre de lotus");
t(fl.actives.length === 1 && !fl.actives[0].positif && effetsDrogues(fl).inspire.length === 0 && effetsDrogues(fl).handicap.length === 1, "fin du positif seul : le négatif reste");
t(finPositif(prendreDose(etatVide(), { nom: "Pesquann" }), "Pesquann").actives.length === 0, "fin du positif sans négatif : plus rien");
// Mithass, Brume-Feu
fx = effetsDrogues(prendreDose(etatVide(), { nom: "Mithass noir", negatif: true }));
t(fx.seuilZero && fx.nexusBloque && fx.sortBloque, "Mithass noir complet");
fx = effetsDrogues(prendreDose(etatVide(), { nom: "Mithass noir", negatif: false }));
t(fx.seuilZero && !fx.nexusBloque && !fx.sortBloque, "Mithass noir réussi : seulement le positif");
fx = effetsDrogues(prendreDose(etatVide(), { nom: "Brume-Feu", negatif: true }));
t(fx.sortEndurance && fx.sortSansSoin && modifsDrogues(fx, { carac: "vol", cle: "artsEtranges" }).inspire.length === 1 && modifsDrogues(fx, { physique: true, carac: "con" }).handicap.length === 1, "Brume-Feu");
t(estSortDeSoin({ nom: "Soin des blessures", effet: "" }) && estSortDeSoin({ nom: "X", effet: "la cible récupère 5 points d'Endurance" }), "repère les sorts de soin");
t(estSortDeSoin({ nom: "Boule de feu", effet: "inflige des dégâts" }) === false, "boule de feu n'est pas un soin");
// immunité
fx = effetsDrogues(prendreDose(etatVide(), { nom: "Bleu-Songe" }));
t(fx.immunise.includes("trouilleBleue") && fx.immunise.includes("demoralise"), "Bleu-Songe : immunités");
// intégration avec les états
const etat = effetsDesEtats(new Set(["demoralise"]), { physique: false, fx: { ...fx, immunise: fx.immunise, drogues: fx }, carac: "vol" });
t(etat.inspire && !etat.sansInspiration, "Bleu-Songe : Démoralisé sans effet, Inspiration en Volonté");
const sans = effetsDesEtats(new Set(["demoralise"]), { physique: false, fx: { drogues: effetsDrogues(prendreDose(etatVide(), { nom: "Pentii" })) }, carac: "vol" });
t(sans.sansInspiration && !sans.inspire, "Démoralisé annule l'Inspiration (Pentii sans immunité propagée)");
const ep = effetsDesEtats(new Set(["epuise"]), { physique: true, fx: { ignoreEpuise: true }, carac: "con" });
t(!ep.handicap, "ignoreEpuise inchangé");
// sevrage
let sv = appliquerSevrage(m, "Herbe Loki n° 22", "simple");
t(sv.sevre && sv.etat.dependances.length === 0 && !sv.degoute, "sevrage réussi");
t(appliquerSevrage(m, "Herbe Loki n° 22", "critique").degoute, "dégoût sur critique");
sv = appliquerSevrage(m, "Herbe Loki n° 22", "echec");
t(!sv.sevre && sv.etat.dependances.length === 1 && !sv.etat.dependances[0].permanente, "sevrage raté : on retente");
sv = appliquerSevrage(m, "Herbe Loki n° 22", "catastrophe");
t(sv.etat.dependances[0].permanente, "catastrophe : permanente");
t(terminer(prendreDose(etatVide(), { nom: "Pentii" }), "pentii").actives.length === 0, "terminer");

if (ko) { console.error(`${ko} échec(s)`); process.exit(1); }
console.log("test-drogues : tout est bon");
