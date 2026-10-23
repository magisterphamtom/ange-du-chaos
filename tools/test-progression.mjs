// Banc d'essai : progression au Mérite. Usage : node tools/test-progression.mjs
import { coutCompetence, niveauPermis, sourcePermise, optionsAchat, passageDeGrade, PRIX } from "../module/progression.mjs";
let ko = 0; const t = (c, m) => { if (!c) { ko++; console.error("KO", m); } };
t([0, 5, 6, 8, 9, 10].map(coutCompetence).join() === "1,1,2,2,3,Infinity", "coût des rangs : 1 jusqu'à 6, 2 jusqu'à 9, 3 pour Maître");
t(niveauPermis("maraudeur", "apprenti") && !niveauPermis("maraudeur", "expert") && niveauPermis("capitaine", "expert") && !niveauPermis("capitaine", "maitre") && niveauPermis("ombre", "maitre"), "sorts selon le grade");
t(!sourcePermise("eodh", "Sang") && sourcePermise("eodh", "Lumière") && sourcePermise("eodh", "Communs") && sourcePermise("tenebres", "Sang"), "sources interdites (Eodh : Sang)");
const base = { disponible: 5, grade: "maraudeur", caracs: { ref: 5, vol: 10 }, rangs: { esquive: 4, carrure: 9, athletisme: 10 }, sorcier: true, academie: "eodh", sortsPossedes: ["Éclair"], artsPossedes: [],
  sortsDispo: [{ nom: "Éclair", source: "Éléments", niveau: "apprenti" }, { nom: "Secret du sang", source: "Sang", niveau: "apprenti" }, { nom: "Armure", source: "Éléments", niveau: "expert" }, { nom: "Avatar", source: "Éléments", niveau: "maitre" }, { nom: "Lien", source: "Communs", niveau: "apprenti" }, { nom: "Vent", source: "Éléments", niveau: "apprenti" }],
  artsDispo: [{ nom: "Wush’in" }] };
const o = optionsAchat(base); const get = (ty, cle) => o.find(x => x.type === ty && x.cle === cle);
t(get("competence", "esquive").cout === 1 && get("competence", "carrure").cout === 3 && !get("competence", "athletisme").possible, "compétences : prix et rang max");
t(get("carac", "ref").cout === 5 && get("carac", "ref").possible && !get("carac", "vol").possible, "caractéristique : 5, max 10");
t(get("nexus", "nexus").possible, "Nexus 5 avec 5 disponibles");
t(get("art", "Wush’in").cout === 3, "art martial 3");
t(!get("sort", "Éclair") && !get("sort", "Lien"), "sorts déjà connus ou communs absents");
t(get("sort", "Vent").possible && get("sort", "Vent").cout === 3, "sort d'Apprenti 3");
t(!get("sort", "Secret du sang").possible && /interdite/.test(get("sort", "Secret du sang").raison), "Eodh : pas de Sang");
t(/Capitaine/.test(get("sort", "Armure").raison) && /Ombre/.test(get("sort", "Avatar").raison), "Expert / Maître verrouillés");
const cap = optionsAchat({ ...base, grade: "capitaine" }); t(cap.find(x => x.cle === "Armure").possible && !cap.find(x => x.cle === "Avatar").possible, "Capitaine : Expert oui, Maître non");
t(/Réservé/.test(optionsAchat({ ...base, sorcier: false }).find(x => x.cle === "Vent").raison), "non sorcier : pas de sorts");
t(optionsAchat({ ...base, disponible: 1 }).find(x => x.type === "carac" && x.cle === "ref").raison === "Il manque 4 Mérite", "pas assez de Mérite");
t(passageDeGrade("maraudeur", "capitaine").some(l => /Expert/.test(l)) && passageDeGrade("capitaine", "ombre").some(l => /Maître/.test(l)) && passageDeGrade("ombre", "ombre").length === 0 && passageDeGrade("maraudeur", "ombre").length === 4, "passage de grade");
t(PRIX.art === 3 && PRIX.nexus === 5, "prix");
if (ko) { console.error(ko + " échec(s)"); process.exit(1); }
console.log("OK : progression au Mérite.");
