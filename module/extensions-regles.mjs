/**
 * Extensions de contenu (suppléments vendus sous forme de modules Foundry) — fonctions pures.
 * Un module déclare ses données dans son module.json :
 *   "flags": { "ange-du-chaos": { "contenu": "data/contenu.json", "wiki": "data/guides.json" } }
 *  - contenu : { contenu: { adversaires: [...], pretires: [...], armes: [...] … } } — les listes sont AJOUTÉES à celles du livre de base ;
 *  - wiki : { guides: [{ nom, journaux: [{ name, pages: [{ name, html }] }] }] } — ajoutés au wiki du Meneur.
 */

/** Ajoute les listes des extensions à celles de la base (les noms déjà présents ne sont pas dupliqués). */
export function fusionnerContenus(base, extras) {
  const res = { ...(base ?? {}) };
  for (const ex of extras ?? []) {
    for (const [cle, liste] of Object.entries(ex ?? {})) {
      if (!Array.isArray(liste)) continue;
      const cur = Array.isArray(res[cle]) ? [...res[cle]] : [];
      const noms = new Set(cur.map(x => x?.nom).filter(Boolean));
      for (const x of liste) if (!(x?.nom && noms.has(x.nom))) { cur.push(x); if (x?.nom) noms.add(x.nom); }
      res[cle] = cur;
    }
  }
  return res;
}

/** Guides des extensions (liste à plat). */
export const fusionnerGuides = (base, extras) => [...(base ?? []), ...(extras ?? []).flatMap(e => Array.isArray(e?.guides) ? e.guides : [])];

/** Signature des extensions installées (pour régénérer le wiki quand elles changent). */
export const signatureExtensions = (liste) => (liste ?? []).map(m => `${m.id}@${m.version}`).sort().join("|");
