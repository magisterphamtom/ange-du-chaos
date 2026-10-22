/**
 * États préjudiciables au fil du combat (livre p. 112-115) — fonctions pures, sans Foundry.
 * Le livre ne donne pas de durée chiffrée : un état dure jusqu'à ce qu'on s'en défasse (action + test, ou 1 Nexus)
 * ou jusqu'à la prochaine période de repos. Ici : rappel au début du tour, et résolution des tentatives.
 */

/** Effet de chaque état + remède (compétence, ND, action). `soigneur` : le test est fait par un autre personnage. */
export const FICHES_ETATS = {
  aveugle: {
    effet: "Handicap sur tous les tests physiques",
    remede: { comp: "carrure", nd: 15, action: "complexe", note: "Seulement après une blessure aux yeux ; dans le noir, il suffit d'éclairer (torche : action complexe)." }
  },
  demoralise: {
    effet: "Aucune Inspiration possible",
    remede: { comp: "artsDuPlaisir", nd: 15, action: "1 heure", note: "Une heure d'activité appréciée (bon repas, fumée Loki…), puis test." }
  },
  enManque: { effet: "Handicap selon la drogue (voir Drogues & dépendances)", remede: null },
  epuise: { effet: "Handicap sur tous les tests physiques (Endurance au seuil de fatigue ou moins)", remede: null },
  etourdi: {
    effet: "Une seule action simple par tour",
    remede: { comp: "carrure", nd: 15, action: "complexe", note: "Reprendre conscience de son environnement." }
  },
  faceContreTerre: {
    effet: "Défense passive −10, Handicap aux Parades et Esquives, les attaquants ont l'Inspiration",
    remede: { auto: true, action: "mouvement", note: "Se relever demande une action de Mouvement, sans bouger davantage." }
  },
  pisseLeSang: {
    effet: "Perd 3 Endurance à chaque rang d'initiative",
    remede: { comp: "guerison", nd: 15, action: "complexe", soigneur: true, note: "Test de Guérison d'un autre personnage (ou du sien). Majeure : +3 END, critique : +6, catastrophe : −6 END." }
  },
  surpris: {
    effet: "Perd une action simple à sa prochaine initiative, aucune Réaction possible",
    remede: { comp: "artsDuCombat", nd: 10, action: "complexe", note: "Retrouver une parfaite perception de la situation." }
  },
  trouilleBleue: {
    effet: "« Bloqué » : les 10 ne se relancent plus",
    remede: { comp: "sagacite", nd: 15, action: "complexe", note: "Repousser la peur." }
  },
  portesDameMort: { effet: "Endurance à 0 : mourant (Dernier soupir)", remede: null }
};

/** Rappel de début de tour : liste des états actifs avec effet et remède éventuel. */
export function rappelDuTour(ids, nomsEtats = {}) {
  return [...ids].filter(id => FICHES_ETATS[id]).map(id => ({
    id, nom: nomsEtats[id] ?? id, effet: FICHES_ETATS[id].effet, remede: FICHES_ETATS[id].remede
  }));
}

/** Un test de remède est-il permis ? (pas de nouvelle tentative après une catastrophe, jusqu'au repos) */
export const peutTenter = (id, verrous = []) => !!FICHES_ETATS[id]?.remede && !verrous.includes(id);

/**
 * Résultat d'une tentative selon le degré du test.
 * @returns {{ leve:boolean, verrou:boolean, endurance:number, texte:string }}
 */
export function issueRemede(id, degre) {
  const f = FICHES_ETATS[id];
  if (!f?.remede) return { leve: false, verrou: false, endurance: 0, texte: "Aucun remède par test." };
  if (f.remede.auto) return { leve: true, verrou: false, endurance: 0, texte: "Il se relève." };
  const reussi = degre !== "echec" && degre !== "catastrophe";
  if (id === "pisseLeSang") {
    if (degre === "catastrophe") return { leve: false, verrou: false, endurance: -6, texte: "Catastrophe : le blessé perd 6 Endurance. Un nouveau test est possible." };
    if (!reussi) return { leve: false, verrou: false, endurance: 0, texte: "Le saignement continue. Un nouveau test est possible." };
    const gain = degre === "critique" ? 6 : degre === "majeure" ? 3 : 0;
    return { leve: true, verrou: false, endurance: gain, texte: gain ? `Le saignement s'arrête et le blessé récupère ${gain} Endurance.` : "Le saignement s'arrête." };
  }
  if (degre === "catastrophe") return { leve: false, verrou: true, endurance: 0, texte: "Catastrophe : l'état dure jusqu'à la prochaine période de repos (le Nexus peut encore l'annuler)." };
  if (!reussi) return { leve: false, verrou: false, endurance: 0, texte: "Raté : l'état persiste, on peut retenter." };
  return { leve: true, verrou: false, endurance: 0, texte: "L'état est levé." };
}

/** Ne garde que les verrous dont l'état est toujours actif. */
export const nettoyerVerrous = (verrous = [], actifs = []) => verrous.filter(v => actifs.includes(v));
