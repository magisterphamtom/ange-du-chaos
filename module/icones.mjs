/**
 * Icônes des objets : choix pur (testable sans Foundry) d'une image selon le type et le nom.
 * Les images sont dans assets/icones (style argent / or / violet sombre du jeu).
 */
const BASE = "systems/ange-du-chaos/assets";
const SORTS = { "Éléments": "air", Cycles: "cycles", "Inanimé": "inanime", "Lumière": "lumiere", Ombres: "ombre", Sang: "sang", Sylve: "sylve" };
const ARMES = { corpsACorps: "poing", lames1: "lames1", lames2: "lames2", massesEtHaches: "masse", armesDHast: "hast", armesDeTir: "arc" };
const n = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function iconeArme(nom, competence) {
  const x = n(nom);
  if (/hache|francisque/.test(x)) return "hache";
  if (/arbalete/.test(x)) return "arbalete";
  if (/dague|couteau|poignard|stylet/.test(x)) return "dague";
  if (/(arc|fronde)\b/.test(x) || /arc /.test(x)) return "arc";
  if (/pistolet|arquebuse|mousquet|fusil|canon/.test(x)) return "jet";
  return ARMES[competence] ?? "lames1";
}
export function iconeArmure(nom, localisation) {
  const x = n(nom), loc = String(localisation ?? "");
  if (/jambiere|pantalon/.test(x) || loc === "JD, JG") return "jambes";
  if (/epaulette|brassard/.test(x) || loc === "BD, BG") return "bras";
  if (/maille|anneaux|haubert/.test(x)) return "armure-mailles";
  if (/plaque|harnois|plastron|cuirasse|ecaille|acier/.test(x)) return "armure-lourde";
  return "armure-legere";
}
export function iconeEquipement(nom) {
  const x = n(nom);
  if (/ane|poney|cheval|etalon|ecurie|selle/.test(x)) return "monture";
  if (/barque|barge|bateau|navire/.test(x)) return "bateau";
  if (/charrette|chariot|carrosse|diligence/.test(x)) return "vehicule";
  if (/torche|bougie|lampe|huile/.test(x)) return "torche";
  if (/vetement/.test(x)) return "vetement";
  return "sac";
}
export function iconeSort(source) { return SORTS[source] ?? "mana"; }

/** Chemin complet de l'image d'un objet (type du système + données). */
export function iconeObjet(type, sys = {}, nom = "") {
  let f;
  switch (type) {
    case "arme": f = `icones/${iconeArme(nom, sys.competence)}`; break;
    case "armure": f = `icones/${iconeArmure(nom, sys.localisation)}`; break;
    case "bouclier": f = "icones/bouclier"; break;
    case "equipement": f = `icones/${iconeEquipement(nom)}`; break;
    case "drogue": f = "icones/drogue"; break;
    case "sort": { const s = SORTS[sys.source]; f = s ? `runes/${s}` : "icones/mana"; break; }
    case "artmartial": f = "icones/art-martial"; break;
    case "talent": f = "icones/talent"; break;
    case "fortune": f = "icones/fortune"; break;
    case "malediction": f = "icones/malediction"; break;
    case "maison": f = sys.cle === "loki" ? "icones/loki" : "icones/maison"; break;
    case "rune": f = "icones/rune"; break;
    case "gemmelite": f = "icones/gemmelite"; break;
    case "voie": f = sys.cle ? `voies/${sys.cle}` : "icones/talent"; break;
    default: f = "icones/sac";
  }
  return `${BASE}/${f}.webp`;
}
