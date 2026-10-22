/**
 * Dice So Nice : les dés du Destin et des dégâts sont tirés par le système (jets.mjs, combat.mjs) ;
 * on fabrique ici des Roll Foundry portant ces mêmes résultats, pour que les dés s'animent à l'identique.
 * Sans Dice So Nice, les Roll sont simplement ignorés (la carte de chat reste la même).
 */
async function roll1(faces, resultats) {
  if (!resultats.length || typeof Roll === "undefined") return null;
  try {
    const r = new Roll(`${resultats.length}d${faces}`);
    await r.evaluate();
    r.terms[0].results = resultats.map(v => ({ result: v, active: true }));
    r._total = resultats.reduce((a, b) => a + b, 0);
    return r;
  } catch (e) { console.warn("ange-du-chaos | dés 3D", e); return null; }
}

/** Rolls pour un résultat de test (`destins`) et, si fournis, des dés de dégâts (`des`, `faces`). */
export async function rollsDe({ destins = [], des = [], faces = 10 } = {}) {
  const liste = [];
  const destin = await roll1(10, destins.flatMap(d => d.jets));
  if (destin) liste.push(destin);
  const deg = await roll1(faces, des);
  if (deg) liste.push(deg);
  return liste;
}

/** Données à ajouter à ChatMessage.create pour animer les dés. */
export async function donneesDes(source) {
  const rolls = await rollsDe(source);
  return rolls.length ? { rolls: rolls.map(r => r.toJSON()) } : {};
}
