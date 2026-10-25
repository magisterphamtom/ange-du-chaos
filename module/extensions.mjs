/**
 * Extensions de contenu : modules Foundry actifs qui déclarent des données pour L'Ange du Chaos
 * (voir extensions-regles.mjs pour le format). Le système ne contient que le livre de base ; les suppléments
 * (bestiaire, prétirés, guides de campagne…) arrivent par modules séparés.
 */
import { SYSTEM_ID } from "./config.mjs";
import { signatureExtensions } from "./extensions-regles.mjs";

/** Modules actifs qui déclarent du contenu : [{ id, title, version, contenu, wiki }]. */
export function extensionsActives() {
  return [...game.modules].filter(([, m]) => m.active && m.flags?.[SYSTEM_ID]).map(([id, m]) => {
    const f = m.flags[SYSTEM_ID] ?? {};
    return { id, title: m.title ?? id, version: m.version ?? "0", contenu: f.contenu ?? null, wiki: f.wiki ?? null };
  }).filter(e => e.contenu || e.wiki);
}

export const signatureActuelle = () => signatureExtensions(extensionsActives());

const lire = async (id, chemin) => {
  try { const r = await fetch(`modules/${id}/${chemin}`); return r.ok ? await r.json() : null; } catch (e) { return null; }
};

/** Données de contenu des extensions : liste de { adversaires: [...], … }. */
export async function contenusExtensions() {
  const res = [];
  for (const e of extensionsActives()) if (e.contenu) { const d = await lire(e.id, e.contenu); if (d?.contenu) res.push(d.contenu); }
  return res;
}

/** Guides de wiki des extensions : liste de { guides: [...] }. */
export async function guidesExtensions() {
  const res = [];
  for (const e of extensionsActives()) if (e.wiki) { const d = await lire(e.id, e.wiki); if (d) res.push(d); }
  return res;
}
