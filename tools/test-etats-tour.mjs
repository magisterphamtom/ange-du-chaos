// Banc d'essai : états au fil du combat. Usage : node tools/test-etats-tour.mjs
import { FICHES_ETATS, rappelDuTour, peutTenter, issueRemede, nettoyerVerrous } from "../module/etats-tour.mjs";
import { ETATS, COMPETENCES } from "../module/config.mjs";
let ko = 0; const t = (c, m) => { if (!c) { ko++; console.error("KO", m); } };
for (const e of ETATS) t(FICHES_ETATS[e.id], `état sans fiche : ${e.id}`);
for (const [id, f] of Object.entries(FICHES_ETATS)) if (f.remede?.comp) t(COMPETENCES[f.remede.comp], `compétence inconnue pour ${id}`);
const r = rappelDuTour(new Set(["etourdi", "epuise", "inconnu"]), { etourdi: "Étourdi" });
t(r.length === 2 && r[0].nom === "Étourdi" && r[0].remede.nd === 15, "rappel");
t(FICHES_ETATS.surpris.remede.nd === 10 && FICHES_ETATS.surpris.remede.comp === "artsDuCombat", "Surpris : Arts du combat ND 10");
t(FICHES_ETATS.trouilleBleue.remede.comp === "sagacite", "Trouille bleue : Sagacité");
t(issueRemede("etourdi", "simple").leve && !issueRemede("etourdi", "echec").leve, "étourdi simple/échec");
const c = issueRemede("etourdi", "catastrophe"); t(!c.leve && c.verrou, "catastrophe : verrou jusqu'au repos");
t(peutTenter("etourdi", []) && !peutTenter("etourdi", ["etourdi"]) && !peutTenter("epuise", []), "peutTenter");
t(issueRemede("faceContreTerre", null).leve, "se relever sans test");
t(issueRemede("pisseLeSang", "simple").endurance === 0 && issueRemede("pisseLeSang", "majeure").endurance === 3 && issueRemede("pisseLeSang", "critique").endurance === 6, "saignement : +0/+3/+6");
const cs = issueRemede("pisseLeSang", "catastrophe"); t(!cs.leve && cs.endurance === -6 && !cs.verrou, "saignement catastrophe : −6, on peut retenter");
t(!issueRemede("pisseLeSang", "echec").leve, "saignement raté");
t(nettoyerVerrous(["etourdi", "surpris"], ["surpris"]).join() === "surpris", "verrous nettoyés");
if (ko) { console.error(ko + " échec(s)"); process.exit(1); }
console.log("OK : états au fil du combat.");
