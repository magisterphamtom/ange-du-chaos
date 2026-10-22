// Banc d'essai des effets de Talents / Fortunes / Malédictions. Usage : node tools/test-effets.mjs
import { cumulerEffets, degatsArme, norm } from "../module/effets.mjs";
import { deriver } from "../module/calc.mjs";
import { iconeObjet } from "../module/icones.mjs";
let ko = 0; const t = (c, m) => { if (!c) { ko++; console.error("KO", m); } };

const src = { caracs: { ref: { base: 5 }, con: { base: 5 }, pui: { base: 5 }, cha: { base: 4 }, int: { base: 4 }, vol: { base: 5 } }, competences: { artsDuCombat: { rang: 4 }, carrure: { rang: 3 }, furtivite: { rang: 2 }, beauParleur: { rang: 1 } }, merite: 15, bonus: {}, nexus: { max: 5 } };
const nu = deriver(src, {});

// bonus plats
const roc = cumulerEffets(["Résistant comme le roc"]);
t(deriver(src, { effets: roc }).enduranceMax === nu.enduranceMax + 5, "Résistant comme le roc : +5 Endurance");
const duel = cumulerEffets(["Mon corps est une arme"]);
const d1 = deriver(src, { effets: duel });
t(d1.initiative === nu.initiative + 3 && d1.bonusDegats === nu.bonusDegats + 1, "Mon corps est une arme : +3 Init, +1 dégâts");
t(deriver(src, { effets: cumulerEffets(["Mon corps est une arme"], "capitaine") }).initiative === nu.initiative + 5, "grade Capitaine : +5");
t(deriver(src, { effets: cumulerEffets(["Mon corps est une arme"], "ombre") }).bonusDegats === nu.bonusDegats + 5, "grade Ombre : +5");
// forgé
const forge = cumulerEffets(["Forgé dans les flammes"], "capitaine");
t(forge.endurance === 10 && forge.protectionArmures === 2 && forge.encombrementArmures === -1, "Forgé dans les flammes (Capitaine)");
// rangs et scores
const aura = deriver(src, { effets: cumulerEffets(["Aura de Mystère"]) });
t(aura.competences.beauParleur.rang === 2 && aura.competences.beauParleur.score === nu.competences.beauParleur.score + 1 && aura.competences.seduction.rang === 1, "Aura de Mystère : +1 rang");
t(deriver(src, { effets: cumulerEffets(["L’ombre mortelle"]) }).competences.furtivite.score === nu.competences.furtivite.score + 3, "L'ombre mortelle : +3 Furtivité");
t(deriver(src, { effets: cumulerEffets(["Marque de Kashgar"]) }).horsDestinMax === nu.horsDestinMax + 1, "Marque de Kashgar : +1 Hors-Destin");
// cumul + inconnu
const cum = cumulerEffets(["Résistant comme le roc", "Bon gaillard", "Nom inconnu"]);
t(cum.endurance === 10 && cum.handicap.includes("furtivite") && cum.sources.length === 2, "cumul, nom inconnu ignoré");
t(cumulerEffets(["Coriace"]).protectionNaturelle === 1 && cumulerEffets(["Insensible"]).immunise[0] === "trouilleBleue", "Coriace / Insensible");
t(cumulerEffets(["Naïf"]).handicap[0] === "sagacite", "Naïf : Handicap Sagacité");
t(cumulerEffets(["Même pas mal"]).ignoreEpuise === true, "Même pas mal");
// dégâts conditionnels
const sang = cumulerEffets(["Sang fendyr", "Œil de faucon"]);
t(degatsArme(sang, { competence: "armesDeTir", nom: "Arc long" }) === 3 + 1, "arc : +3 Sang fendyr +1 Œil de faucon");
t(degatsArme(sang, { competence: "armesDeTir", nom: "Arbalète légère" }) === 1, "arbalète : seulement +1 distance");
t(degatsArme(sang, { competence: "lames1", nom: "Épée" }) === 0, "arme de contact : rien");
t(degatsArme(cumulerEffets(["Frappe d’acier"]), { competence: "corpsACorps", nom: "Poings" }) === 2, "Frappe d'acier : +2 armes naturelles");
t(norm("L’ombre mortelle") === "l'ombre mortelle" && norm("Œil de faucon") === "oeil de faucon", "normalisation des noms");
// icônes
t(iconeObjet("arme", { competence: "armesDeTir" }, "Arbalète légère").endsWith("icones/arbalete.webp"), "icône arbalète");
t(iconeObjet("arme", { competence: "massesEtHaches" }, "Hache de guerre").endsWith("icones/hache.webp"), "icône hache");
t(iconeObjet("armure", { localisation: "JD, JG" }, "Jambières de cuir").endsWith("icones/jambes.webp"), "icône jambières");
t(iconeObjet("sort", { source: "Sang" }, "x").endsWith("runes/sang.webp") && iconeObjet("sort", { source: "Communs" }, "x").endsWith("icones/mana.webp"), "icônes de sorts");
t(iconeObjet("voie", { cle: "assassin" }, "x").endsWith("voies/assassin.webp") && iconeObjet("maison", { cle: "loki" }, "x").endsWith("icones/loki.webp"), "icônes de voie et de Maison");
t(iconeObjet("equipement", {}, "Cheval de guerre").endsWith("icones/monture.webp"), "icône monture");
if (ko) { console.error(`ÉCHEC : ${ko}`); process.exit(1); }
console.log("OK : effets et icônes.");
