/**
 * Effets chiffrés des Talents, Fortunes et Malédictions (livre de base) : table par nom,
 * cumul pour un personnage. Fonctions pures, sans Foundry.
 * Les valeurs données en tableau [Maraudeur, Capitaine, Ombre] évoluent avec le grade.
 * Les effets sont DÉRIVÉS des objets possédés : retirer l'objet retire le bonus, rien n'est écrit sur la fiche.
 */
export const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").replace(/œ/gi, "oe").toLowerCase().replace(/\s+/g, " ").trim();

/*
  Champs d'un effet :
   endurance, initiative, degats (tous), degatsDistance, degatsArc, degatsNaturelles, mouvement,
   protectionNaturelle, protectionArmures, encombrementArmures, horsDestin (par session),
   rang {compétence: n}, score {compétence: n} (bonus au test), handicap [compétences], ignoreEpuise, immunise [états]
*/
export const EFFETS = {
  // — Talents secrets de Maison
  "aura de mystere": { rang: { artsDeLaCour: 1, beauParleur: 1, seduction: 1 } },
  "enfant de streywenn": { rang: { furtivite: 1, nature: 1, survie: 1 } },
  "sang fendyr": { degatsArc: 3 },
  "sourire melfynn": { rang: { artsDeLaCour: 1, beauParleur: 1, sagacite: 1 } },
  "souple comme le roseau": { rang: { esquive: 1, athletisme: 1, corpsACorps: 1 } },
  "resistant comme le roc": { endurance: 5 },
  "intuition de la licorne": { rang: { perception: 1, sagacite: 1, enquete: 1 } },
  "meme pas mal": { ignoreEpuise: true },
  // — Talents de Voie (évoluent avec le grade)
  "forge dans les flammes": { endurance: [5, 10, 15], protectionArmures: [1, 2, 3], encombrementArmures: -1 },
  "mon corps est une arme": { initiative: [3, 5, 10], degats: [1, 3, 5] },
  "oeil de faucon": { initiative: [3, 5, 10], degatsDistance: [1, 3, 5] },
  "l'ombre mortelle": { score: { furtivite: [3, 5, 5] } },
  // — Fortunes
  "bon gaillard": { endurance: 5, handicap: ["furtivite"] },
  "coriace": { protectionNaturelle: 1 },
  "frappe d'acier": { degatsNaturelles: 2 },
  "insensible": { immunise: ["trouilleBleue"] },
  "marque de kashgar": { horsDestin: 1 },
  // — Académies de magie (rang dérivé ; voir academies.mjs)
  "academie:guelfe-blanche": { rang: { guerison: 1 } },
  "academie:gar-vallon": { rang: { erudition: 1 }, mana: 3 },
  "academie:pendarakh": { rang: { survie: 1 } },
  "academie:claire-aube": { rang: { esquive: 1 } },
  "academie:ambre": { rang: { artisanat: 1 } },
  "academie:arbre-monde": { rang: { nature: 1 } },
  "academie:tenebres": { rang: { intimidation: 1 } },
  // — Malédictions
  "naif": { handicap: ["sagacite"] }
};

const indexGrade = (g) => ({ maraudeur: 0, capitaine: 1, ombre: 2 }[g] ?? 0);
const val = (v, i) => (Array.isArray(v) ? (v[Math.min(i, v.length - 1)] ?? 0) : (v ?? 0));

/** Cumule les effets d'une liste de noms (Talents, Fortune, Malédiction) au grade donné. */
export function cumulerEffets(noms, grade = "maraudeur") {
  const i = indexGrade(grade);
  const t = { endurance: 0, initiative: 0, degats: 0, degatsDistance: 0, degatsArc: 0, degatsNaturelles: 0, mouvement: 0,
    protectionNaturelle: 0, protectionArmures: 0, encombrementArmures: 0, horsDestin: 0, mana: 0,
    rang: {}, score: {}, handicap: [], ignoreEpuise: false, immunise: [], sources: [] };
  for (const nom of noms ?? []) {
    const e = EFFETS[norm(nom)];
    if (!e) continue;
    t.sources.push(nom);
    for (const k of ["endurance", "initiative", "degats", "degatsDistance", "degatsArc", "degatsNaturelles", "mouvement",
      "protectionNaturelle", "protectionArmures", "encombrementArmures", "horsDestin", "mana"]) t[k] += val(e[k], i);
    for (const [c, n] of Object.entries(e.rang ?? {})) t.rang[c] = (t.rang[c] ?? 0) + val(n, i);
    for (const [c, n] of Object.entries(e.score ?? {})) t.score[c] = (t.score[c] ?? 0) + val(n, i);
    for (const c of e.handicap ?? []) if (!t.handicap.includes(c)) t.handicap.push(c);
    for (const c of e.immunise ?? []) if (!t.immunise.includes(c)) t.immunise.push(c);
    if (e.ignoreEpuise) t.ignoreEpuise = true;
  }
  return t;
}

/** Dégâts supplémentaires d'une arme selon ses effets (arc, distance, armes naturelles). */
export function degatsArme(effets, { competence, nom = "" } = {}) {
  let n = 0;
  const arc = /\barc\b/.test(norm(nom));
  if (competence === "armesDeTir") { n += effets.degatsDistance; if (arc) n += effets.degatsArc; }
  if (competence === "corpsACorps") n += effets.degatsNaturelles;
  return n;
}
