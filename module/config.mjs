/**
 * Données de référence du jeu « L'Ange du Chaos » (Les XII Singes).
 * Source de vérité unique : fiches, tables, wiki et compendiums lisent ce fichier.
 */

export const SYSTEM_ID = "ange-du-chaos";

/** Les 6 caractéristiques. */
export const CARACS = {
  ref: { label: "Réflexes", abbr: "REF" },
  con: { label: "Constitution", abbr: "CON" },
  pui: { label: "Puissance", abbr: "PUI" },
  cha: { label: "Charme", abbr: "CHA" },
  int: { label: "Intelligence", abbr: "INT" },
  vol: { label: "Volonté", abbr: "VOL" }
};

/** Les 36 compétences, rattachées à leur caractéristique (livre de base, p. 36 et chapitre « Description des compétences »). */
export const COMPETENCES = {
  acrobaties:     { label: "Acrobaties",        carac: "ref" },
  armesDeTir:     { label: "Armes de tir",      carac: "ref" },
  equitation:     { label: "Équitation",        carac: "ref" },
  esquive:        { label: "Esquive",           carac: "ref" },
  furtivite:      { label: "Furtivité",         carac: "ref" },
  lames1:         { label: "Lames à une main",  carac: "ref" },

  armures:        { label: "Armures",           carac: "con" },
  athletisme:     { label: "Athlétisme",        carac: "con" },
  bouclier:       { label: "Bouclier",          carac: "con" },
  carrure:        { label: "Carrure",           carac: "con" },
  natation:       { label: "Natation",          carac: "con" },
  resilience:     { label: "Résilience",        carac: "con" },

  armesDHast:     { label: "Armes d'hast",      carac: "pui" },
  corpsACorps:    { label: "Corps à corps",     carac: "pui" },
  force:          { label: "Force",             carac: "pui" },
  intimidation:   { label: "Intimidation",      carac: "pui" },
  lames2:         { label: "Lames à deux mains", carac: "pui" },
  massesEtHaches: { label: "Masses et haches",  carac: "pui" },

  artsDeLaCour:   { label: "Arts de la cour",   carac: "cha" },
  artsDuPlaisir:  { label: "Arts du plaisir",   carac: "cha" },
  artistique:     { label: "Artistique",        carac: "cha" },
  beauParleur:    { label: "Beau-parleur",      carac: "cha" },
  pegre:          { label: "Pègre",             carac: "cha" },
  seduction:      { label: "Séduction",         carac: "cha" },

  artisanat:      { label: "Artisanat",         carac: "int" },
  drogues:        { label: "Drogues",           carac: "int" },
  erudition:      { label: "Érudition",         carac: "int" },
  guerison:       { label: "Guérison",          carac: "int" },
  nature:         { label: "Nature",            carac: "int" },
  serrurerie:     { label: "Serrurerie",        carac: "int" },

  artsDuCombat:   { label: "Arts du combat",    carac: "vol" },
  artsEtranges:   { label: "Arts étranges",     carac: "vol" },
  enquete:        { label: "Enquête",           carac: "vol" },
  perception:     { label: "Perception",        carac: "vol" },
  sagacite:       { label: "Sagacité",          carac: "vol" },
  survie:         { label: "Survie",            carac: "vol" }
};

/** Compétences liées à une catégorie d'arme (pour les jets d'attaque). */
export const COMPETENCES_ARMES = {
  corpsACorps: "Corps à corps",
  lames1: "Lames à une main",
  lames2: "Lames à deux mains",
  massesEtHaches: "Masses et haches",
  armesDHast: "Armes d'hast",
  armesDeTir: "Armes de tir"
};

/** Compétences physiques / mentales (pour les états Épuisé, Aveuglé…). */
export const COMPETENCES_PHYSIQUES = ["ref", "con", "pui"];

/** Niveaux de difficulté (p. 36). */
export const NIVEAUX_DIFFICULTE = [
  { nd: 10, label: "Simple" },
  { nd: 15, label: "Moyen" },
  { nd: 20, label: "Difficile" },
  { nd: 25, label: "Très difficile" },
  { nd: 30, label: "Épique" }
];

/** Les 6 Maisons du Chaos + le Loki (p. 44-54). `bonus` = caractéristique +1. */
export const MAISONS = {
  eodh:     { label: "Maison d'Eodh",     bonus: "cha" },
  garthe:   { label: "Maison Garthe",     bonus: "con" },
  melfynn:  { label: "Maison Melfynn",    bonus: "vol" },
  tremayne: { label: "Maison Trémayne",   bonus: "pui" },
  norghal:  { label: "Maison Norghal",    bonus: "int" },
  benerys:  { label: "Maison Bénérys",    bonus: "ref" },
  loki:     { label: "Loki de Streywenn", bonus: "pui" }
};

/** Les 6 voies spéciales de formation (p. 56-62). */
export const VOIES = {
  protecteur:   { label: "Protecteur",     bonus: "con" },
  duelliste:    { label: "Duelliste",      bonus: "pui" },
  tireur:       { label: "Tireur d'élite", bonus: "ref" },
  assassin:     { label: "Assassin",       bonus: "int" },
  conspirateur: { label: "Conspirateur",   bonus: "cha" },
  sorcier:      { label: "Sorcier",        bonus: "vol" }
};

/** Formation de base du Maraudeur-Fantôme : +1 REF, CON, VOL (p. 55). */
export const FORMATION_BASE = ["ref", "con", "vol"];

/** Grades (p. 55 et 82). */
export const GRADES = [
  { id: "maraudeur", label: "Maraudeur-Fantôme",    merite: 0,  horsDestin: 1 },
  { id: "capitaine", label: "Capitaine-Maraudeur",  merite: 30, horsDestin: 2 },
  { id: "ombre",     label: "Ombre du Chaos",       merite: 50, horsDestin: 3 }
];

/** Points de Nexus de départ (p. 85). */
export const NEXUS_DEPART = 5;

/** États préjudiciables (p. 113-115). `id` sert de status Foundry. */
export const ETATS = [
  { id: "aveugle",       name: "Aveuglé",          img: "icons/svg/blind.svg" },
  { id: "demoralise",    name: "Démoralisé",       img: "icons/svg/downgrade.svg" },
  { id: "enManque",      name: "En manque !",      img: "icons/svg/poison.svg" },
  { id: "epuise",        name: "Épuisé",           img: "icons/svg/degen.svg" },
  { id: "etourdi",       name: "Étourdi",          img: "icons/svg/daze.svg" },
  { id: "faceContreTerre", name: "Face contre terre", img: "icons/svg/falling.svg" },
  { id: "pisseLeSang",   name: "Pisse le sang",    img: "icons/svg/blood.svg" },
  { id: "surpris",       name: "Surpris",          img: "icons/svg/eye.svg" },
  { id: "trouilleBleue", name: "Trouille bleue",   img: "icons/svg/terror.svg" },
  { id: "portesDameMort", name: "Aux portes de Dame Mort", img: "icons/svg/skull.svg" },
  { id: "zen",           name: "Zen",              img: "icons/svg/aura.svg" },
  { id: "contrecoupZen", name: "Contrecoup du Zen", img: "icons/svg/downgrade.svg" }
];

/** Types de dégâts des armes : Pointe, Taille, Impact (p. 130). */
export const TYPES_DEGATS = { P: "Pointe", T: "Taille", I: "Impact" };

/** Disponibilité = ND du test de Pègre pour s'en procurer (p. 130). */
export const DISPONIBILITES = {
  courant: "Courant (ND 10)",
  commun: "Commun (ND 15)",
  rare: "Rare (ND 20)",
  introuvable: "Introuvable (ND 25)",
  nd: "—"
};

/** Catégories d'adversaires (p. 177-179). */
export const CATEGORIES_ADVERSAIRE = {
  negligeable: { label: "Menace négligeable", talents: 0 },
  brute:       { label: "Brute",              talents: 1 },
  coriace:     { label: "Coriace",            talents: 3 },
  defi:        { label: "Défi",               talents: 5 },
  epique:      { label: "Épique",             talents: 99 }
};

/** Sources de magie (à compléter après lecture du chapitre Arts étranges, p. 147-171). */
export const NIVEAUX_SORT = { apprenti: "Apprenti", expert: "Expert", maitre: "Maître" };

/** Coût en mana minimal d'un sort Expert / Maître (p. 82). */
export const COUT_MANA_NIVEAU = { expert: 4, maitre: 5 };


/* ----------------------------- Assets visuels (privés) --------------------- */
/** Dossier d'assets (illustrations officielles) : jamais dans le dépôt, voir .gitignore. */
export const ASSETS = `systems/${SYSTEM_ID}/assets`;

/** Les 10 runes des sources de magie. Clé = nom de fichier dans assets/runes. */
export const RUNES = {
  air: "Air", cycles: "Cycles", eau: "Eau", feu: "Feu", inanime: "Inanimé",
  lumiere: "Lumière", ombre: "Ombre", sang: "Sang", sylve: "Sylve", terre: "Terre"
};

/** Retrouve la rune d'un texte libre (« Source du Sang », « magie de l'ombre »…). */
export function runeDe(texte) {
  const t = String(texte ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return Object.keys(RUNES).find(k => t.includes(k)) ?? null;
}

/** Illustration de Voie (ou de Maison Loki) affichée en filigrane dans l'en-tête. */
export function artDe(voie, maison) {
  if (voie && VOIES[voie]) return `${ASSETS}/voies/${voie}.webp`;
  if (maison === "loki") return `${ASSETS}/voies/loki.webp`;
  return null;
}

/* Illustrations officielles des adversaires et PNJ (pack d'assets privés). */
export const ADVERSAIRES = {
  arkanost: "bestiaire", chimere_de_sang: "bestiaire", ghonaki: "bestiaire", goule: "bestiaire",
  mante: "bestiaire", sangh: "bestiaire", serpentere: "bestiaire", squazz: "bestiaire",
  cellendhyll: "pnj", estree: "pnj", xelshalee: "pnj",
  // illustrations réalisées pour le système (jetons ronds)
  ...Object.fromEntries(["animal_de_monte", "animal_feroce", "bete_de_somme", "centaure", "chasseur_ikshite", "conteur_rhitan", "cristalik",
    "djiina", "egle_messager", "fendyr", "guerrier_demon_tenebreux", "guerrier_hamachii", "guerrier_picte", "guerrier_smaugh", "guerrier_thog",
    "khan_de_tribu_vorpal", "khelash_des_iles", "maitre_d_armes_khelash", "maitre_de_chasse_arikari", "monture_de_guerre", "oiseau_de_proie",
    "petit_animal", "sorcier_thog", "taride", "tireur_d_elite_fendyr", "traqueur_arikari", "vorpal",
    "assassin_type", "bandit", "beret_rouge", "brako_chef_de_bande", "brasseur_d_ecume", "chef_de_bande", "enrage", "frere_grieger",
    "inquisiteur_de_l_orage", "maitre_assassin", "mercenaire_sentinelle", "paladin_bleu", "reine_de_sang", "samson_grieger", "shenn_gath",
    "soldat_tenebreux", "sorcier_de_sang_tenebreux", "surineur", "templier_de_l_orage"].map(k => [k, "jeton"]))
};

/** Retrouve l'adversaire connu d'après le nom d'un acteur (accents et casse ignorés). */
export function adversaireDe(nom) {
  const n = String(nom ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "_");
  const cle = Object.keys(ADVERSAIRES).filter(k => n.includes(k)).sort((x, y) => y.length - x.length)[0];   // la clé la plus précise gagne (khan_de_tribu_vorpal avant vorpal)
  if (!cle) return null;
  const jeton = `${ASSETS}/tokens/${cle}.webp`;
  return { cle, illustration: ADVERSAIRES[cle] === "jeton" ? jeton : `${ASSETS}/wiki/${ADVERSAIRES[cle]}/${cle}.webp`, filigrane: `${ASSETS}/filigranes/${cle}.webp`, jeton };
}
