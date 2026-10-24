/**
 * Contenu du livre → données de documents Foundry. Fonctions pures (testables sans Foundry).
 * Les textes viennent de `assets/contenu/contenu.json` (pack d'assets privé, jamais dans le dépôt).
 */
import { iconeObjet, iconeFichier } from "./icones.mjs";
import { deriver } from "./calc.mjs";
export const DOSSIER_RACINE = "L'Ange du Chaos — Contenu";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Texte brut (retours à la ligne) → paragraphes HTML. */
export const para = (t) => String(t ?? "").split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("");
const DISPOS = new Set(["courant", "commun", "rare", "introuvable", "nd"]);
const dispo = (d) => (DISPOS.has(d) ? d : "nd");
const TYPES = new Set(["P", "T", "I"]);

const TITRES_SORTS = { apprenti: "Apprenti", expert: "Expert", maitre: "Maître" };

/** Chaque entrée : { dossier: [chemin…], doc: données du document }. */
export function documentsItems(c) {
  const out = [];
  const add = (type, chemin, name, system, extra = {}) => out.push({ doc: "Item", chemin, data: { name, type, img: iconeObjet(type, system, name), system, ...extra } });

  for (const a of c.armes ?? []) {
    add("arme", ["Armes", a.unique ? "Armes magiques uniques" : a.categorie === "tir" ? "À distance" : "De contact"], a.nom, {
      categorie: a.categorie, competence: a.competence, degats: a.degats || "",
      typeDegats: TYPES.has(a.typeDegats) ? a.typeDegats : "I", capacites: a.capacites || "",
      puissanceRequise: a.puissanceRequise || 0, porteeEffective: a.porteeEffective || "", porteeMax: a.porteeMax || "",
      disponibilite: dispo(a.disponibilite), cout: a.cout || "", description: para(a.description)
    }, a.runes?.length ? { flags: { "ange-du-chaos": { runesIncluses: a.runes } } } : {});
  }
  for (const a of c.armures ?? []) {
    add("armure", ["Armures"], a.nom, {
      protection: a.protection, encombrement: a.encombrement || 0, localisation: a.localisation || "To",
      categorieProtection: TYPES.has(a.types?.[0]) ? a.types[0] : "", capacites: a.capacites || "",
      disponibilite: dispo(a.disponibilite), cout: a.cout || "",
      description: a.types?.length ? `<p>Protection contre : ${esc(a.types.join(", "))}.</p>` : ""
    });
  }
  for (const b of c.boucliers ?? []) {
    add("bouclier", ["Boucliers"], b.nom, {
      bonusDefense: b.bonusDefense || 0, resistance: b.resistance || 0, capacites: b.capacites || "", cout: b.cout || "",
      description: `<p>Dégâts : ${esc(b.degats)} (${esc(b.typeDegats)}). Disponibilité : ${esc(b.dispo)}.</p>`
    });
  }
  for (const e of c.equipement ?? []) {
    add("equipement", ["Équipement"], e.nom, { quantite: 1, cout: e.cout || "", disponibilite: dispo(e.dispo), description: para(e.description) });
  }
  for (const d of c.drogues ?? []) {
    add("drogue", ["Drogues"], d.nom, {
      toxicite: d.toxicite || "", addiction: d.addiction || "", dependance: d.dependance || "", origine: d.origine || "",
      rarete: d.rarete || "", prix: d.prix || "", inoculation: d.inoculation || "", duree: d.duree || "", manque: d.manque || "",
      effets: para(d.effets), description: ""
    });
  }
  for (const s of c.sorts ?? []) {
    add("sort", ["Sorts", s.source, TITRES_SORTS[s.niveau] ?? "Apprenti"], s.nom, {
      source: s.source, niveau: TITRES_SORTS[s.niveau] ? s.niveau : "apprenti", mana: s.mana || 0, difficulte: s.difficulte || 0,
      portee: s.portee || "", incantation: s.incantation || "", cible: s.cible || "", duree: s.duree || "", degats: "",
      effet: para(s.effet), description: ""
    });
  }
  for (const a of c.artsmartiaux ?? []) {
    add("artmartial", ["Arts martiaux"], a.nom, {
      effetPermanent: { nom: a.effetPermanent?.nom || "", description: para(a.effetPermanent?.description) },
      coupSpecial: { nom: a.coupSpecial?.nom || "", actions: a.coupSpecial?.actions || "", duree: a.coupSpecial?.duree || "", description: para(a.coupSpecial?.description) },
      description: ""
    });
  }
  for (const t of c.talents ?? []) {
    add("talent", ["Talents"], t.nom, { origine: t.origine || "", description: t.description || "", paliers: "" });
  }
  for (const m of c.maladies ?? []) {
    add("maladie", ["Maladies"], m.nom, { virulence: m.virulence, duree: m.duree || "", effet: para(m.effet), active: false, description: "" });
  }
  for (const m of c.materiaux ?? []) {
    const rang = { mediocre: "Médiocre", standard: "Standard", superieur: "Supérieur", ultime: "Ultime" }[m.rang] ?? m.rang;
    add("equipement", ["Matériaux", rang], m.nom, {
      quantite: 1, cout: m.cout || "", disponibilite: dispo(m.dispo),
      description: `<p><b>Armes :</b> ${esc(m.armes)}</p><p><b>Armures :</b> ${esc(m.armures)}</p>${m.texte ? `<p>${esc(m.texte)}</p>` : ""}<p><i>Choisissez ce matériau sur la fiche de l'arme ou de l'armure.</i></p>`
    }, { img: iconeFichier(`icones/lingot-${m.rang}`) });
  }
  for (const f of c.fortunes ?? []) add("fortune", ["Fortunes"], f.nom, { description: para(f.description) });
  for (const f of c.maledictions ?? []) add("malediction", ["Malédictions"], f.nom, { description: para(f.description) });
  for (const r of c.runes ?? []) {
    add("rune", ["Runes", r.cible === "arme" ? "Runes d'armes" : "Runes d'armures"], r.nom, {
      cle: r.cle, rang: r.rang, cible: r.cible, emplacements: r.emplacements || 1, objetId: "", active: false, effet: para(r.effet), description: ""
    });
  }
  for (const g of c.gemmelites ?? []) {
    add("gemmelite", ["Gemmelites"], g.nom, {
      grade: g.grade, source: "", sortNom: "", niveauSort: "apprenti", charges: { value: 1, max: 1 }, motDePouvoir: "", effet: para(g.effet), description: ""
    });
  }
  for (const m of c.maisons ?? []) {
    add("maison", ["Maisons"], m.nom, { cle: m.cle, description: m.description || "", competences: m.competences || "", talentsSecrets: m.talentsSecrets || "" });
  }
  for (const v of c.voies ?? []) {
    add("voie", ["Voies"], v.nom, { cle: v.cle, description: v.description || "", competences: v.competences || "", talent: `<h3>${esc(v.talent?.nom)}</h3>${v.talent?.description || ""}` });
  }
  return out;
}

export function documentsActeurs(c) {
  return (c.adversaires ?? []).map(a => ({
    doc: "Actor", chemin: [a.section ?? a.plan ?? "Bestiaire"],
    data: {
      name: a.nom, type: a.pnj ? "pnj" : "creature",
      system: {
        categorie: a.categorie, ...(a.pnj ? {} : { plan: a.plan ?? "", espece: a.espece ?? "" }),
        caracs: { ref: 5, con: 5, int: 5, pui: 5, cha: 5, vol: 5, ...(a.caracs ?? {}) },
        endurance: { value: a.endurance, max: a.endurance }, seuilFatigue: a.seuilFatigue ?? Math.round((a.endurance ?? 0) / 5),
        protection: a.protection ?? 0, protectionNom: a.protectionNom ?? "", defensePassive: a.defensePassive,
        initiative: a.initiative, mouvement: a.mouvement,
        nexus: a.nexus ?? 0, actions: a.actions ?? 1, reaction: !!a.reaction, artsEtranges: a.artsEtranges ?? 0,
        attaque: { nom: a.attaque?.nom || "Attaque", score: a.attaque?.score ?? 10, degats: a.attaque?.degats || "2d6", note: a.attaqueNote ?? "" },
        attaquesSup: (a.attaquesSup ?? []).map(w => ({ nom: w.nom || "Attaque", score: w.score ?? 10, degats: w.degats || "2d6" })),
        competences: (a.competences ?? []).map(k => ({ nom: k.nom, score: k.score })),
        talents: a.talents || "",
        notes: a.notes || ""
      }
    }
  }));
}

/** Liste des chemins de dossiers distincts (pour les créer d'abord), par type de document. */
export function cheminsDistincts(docs) {
  const s = new Set();
  for (const d of docs) for (let i = 1; i <= d.chemin.length; i++) s.add(JSON.stringify([d.doc, ...d.chemin.slice(0, i)]));
  return [...s].map(x => JSON.parse(x));
}

/* -------------------------------------------------------------------------- */
/*  Prétirés (Le Monde des Plans, p. 212-237)                                  */
/* -------------------------------------------------------------------------- */

export const DOSSIER_PRETIRES = "Prétirés";

/** Nom normalisé pour rapprocher les noms de la fiche de ceux du livre (accents, casse, apostrophes ignorés). */
export const normNom = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^a-z0-9]+/g, " ").trim();

/** Noms de la fiche prétirée → nom du livre (quand ils diffèrent). */
const ALIAS_PRETIRES = {
  "favorite de morion": "favori de morion", "secret des arcanes": "secrets des arcanes", "wu shin": "wush in",
  "epee batarde": "epee longue", "encre et plume d oie": "encre et plumes d oie de quoi ecrire 10 pages",
  "10 feuilles de parchemin": "feuille de papier ou de parchemin par 10", "poing": "poing coude", "fils de la terre": "fils fille de la terre"
};

/** Armes absentes de la liste du livre (profil de la fiche prétirée, bonus de Puissance retiré). */
const ARMES_PRETIRES = {
  "bec de corbin": { categorie: "contact", competence: "massesEtHaches", degats: "3d6", typeDegats: "P", capacites: "Perforant" },
  "couteau de chasse": { categorie: "contact", competence: "lames1", degats: "2d6+1", typeDegats: "T", capacites: "" }
};

const COMPETENCES_ARMES_PNJ = { armesDeTir: "tir" };

/**
 * Prétirés → documents Acteur (type « personnage ») avec leurs objets, repris des objets du livre.
 * @param {object} c       contenu du pack (avec `pretires`)
 * @param {object[]} items documents d'objets déjà calculés par documentsItems(c)
 */
export function documentsPretires(c, items = documentsItems(c)) {
  const index = new Map();
  for (const it of items) index.set(`${it.data.type}|${normNom(it.data.name)}`, it.data);
  const trouve = (type, nom) => {
    const n = normNom(nom);
    return index.get(`${type}|${n}`) ?? index.get(`${type}|${ALIAS_PRETIRES[n] ?? n}`) ?? null;
  };
  const copie = (d, extra = {}) => ({ name: d.name, type: d.type, img: d.img, system: { ...structuredClone(d.system), ...extra } });

  return (c.pretires ?? []).map(p => {
    const objets = [];
    const manques = [];
    const ajoute = (type, nom, fallback, extra) => {
      const d = trouve(type, nom);
      if (d) objets.push(copie(d, extra));
      else { manques.push(`${type} ${nom}`); objets.push({ name: nom, type, img: iconeObjet(type, fallback, nom), system: { ...fallback, ...extra } }); }
    };
    const desc = (t) => ({ description: `<p>${esc(t)}</p>` });
    ajoute("talent", p.talentSecret.nom, { origine: `Talent secret de la Maison`, description: `<p>${esc(p.talentSecret.effet)}</p>`, paliers: "" });
    ajoute("talent", p.talentVoie, { origine: "Voie", description: "", paliers: "" });
    ajoute("fortune", p.fortune.nom, desc(p.fortune.effet));
    ajoute("malediction", p.malediction.nom, desc(p.malediction.effet));
    for (const a of p.artsMartiaux ?? []) ajoute("artmartial", a, { effetPermanent: { nom: "", description: "" }, coupSpecial: { nom: "", actions: "", duree: "", description: "" }, description: "" });
    for (const w of p.armes ?? []) {
      const n = normNom(w.nom);
      const f = ARMES_PRETIRES[n];
      ajoute("arme", w.nom, { ...(f ?? { categorie: "contact", competence: "lames1", degats: w.degats, typeDegats: "T", capacites: w.capacites }), puissanceRequise: 0, porteeEffective: "", porteeMax: "", disponibilite: "commun", cout: "", description: "" }, { equipee: true });
    }
    // Armures : seule la pièce de torse est portée (la protection retenue est la plus forte).
    (p.armures ?? []).forEach((a, i) => ajoute("armure", a.nom, { protection: a.pr, encombrement: 0, localisation: "To", categorieProtection: "", capacites: "", disponibilite: "commun", cout: "", description: "" }, { equipee: i === 0 }));
    for (const e of p.equipement ?? []) ajoute("equipement", e, { quantite: 1, cout: "", disponibilite: "commun", description: "" });

    const caracs = Object.fromEntries(Object.entries(p.caracsBase).map(([k, v]) => [k, { base: v }]));
    const competences = Object.fromEntries(Object.entries(p.rangs).map(([k, v]) => [k, { rang: v }]));
    const bonus = { ref: 1, con: 1, vol: 1, pui: 0, cha: 0, int: 0 };
    const bonusMaison = { eodh: "cha", garthe: "con", melfynn: "vol", tremayne: "pui", norghal: "int", benerys: "ref", loki: "pui" }[p.maison];
    const bonusVoie = { protecteur: "con", duelliste: "pui", tireur: "ref", assassin: "int", conspirateur: "cha", sorcier: "vol" }[p.voie];
    if (bonusMaison) bonus[bonusMaison]++;
    if (bonusVoie) bonus[bonusVoie]++;
    const d = deriver({ caracs, competences }, { bonusCaracs: bonus });
    const histoire = para(p.histoire);
    return {
      doc: "Actor", chemin: [DOSSIER_PRETIRES], manques,
      data: {
        name: p.nom, type: "personnage",
        system: {
          identite: { genre: p.identite.genre, taille: p.identite.taille, poids: p.identite.poids, cheveux: p.identite.cheveux, yeux: p.identite.yeux, peau: p.identite.peau },
          maison: p.maison, voie: p.voie, caracs, competences, merite: 0,
          endurance: { value: p.controle.endurance }, mana: { value: d.manaMax }, nexus: { value: p.controle.nexus, max: p.controle.nexus }, horsDestin: { value: 1 },
          monnaie: { or: 0, argent: p.argent ?? 300, bronze: 0 },
          biographie: { historique: histoire }, notes: p.note ? `<p>${esc(p.note)}</p>` : ""
        },
        items: objets
      }
    };
  });
}
