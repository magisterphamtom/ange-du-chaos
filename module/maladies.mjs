/**
 * Maladies (livre de base p. 118) : test de Résilience opposé à la virulence.
 *  Réussite : aucun symptôme (majeure : immunisé 24 h ; critique : immunité totale).
 *  Échec : effets pendant la durée d'infection, puis nouveau test ; catastrophe : durée doublée.
 *  Un médecin tente de guérir par un test de Guérison dont le ND est la virulence (après une période de repos).
 */
import { SYSTEM_ID } from "./config.mjs";
import { carteDestinHTML } from "./destin-html.mjs";
import { lancerTest } from "./rolls.mjs";

const esc = foundry.utils.escapeHTML;

export async function resisterMaladie(actor, maladie) {
  const s = maladie.system;
  const msg = await lancerTest(actor, "competence", "resilience", { nd: s.virulence, titre: `Résister : ${maladie.name}` });
  if (!msg) return null;
  const r = msg.flags?.[SYSTEM_ID]?.jet?.resultat;
  const ok = !!r && r.reussite !== false && r.degre !== "echec" && r.degre !== "catastrophe";
  let texte, lignes = [];
  if (ok) {
    texte = `${esc(actor.name)} résiste : aucun symptôme.`;
    if (r.degre === "critique") lignes.push("Réussite critique : <b>immunité totale</b> à cette maladie.");
    else if (r.degre === "majeure") lignes.push("Réussite majeure : immunisé pour les <b>24 prochaines heures</b>.");
    if (maladie.system.active) await maladie.update({ "system.active": false });
  } else {
    await maladie.update({ "system.active": true });
    texte = `${esc(actor.name)} est infecté : les effets s'appliquent.`;
    const duree = s.duree ? esc(s.duree) : "la durée d'infection";
    lignes.push(r?.degre === "catastrophe" ? `Catastrophe : durée d'infection <b>doublée</b> (${duree} × 2).` : `Durée d'infection : <b>${duree}</b>. À la fin, nouveau test de Résilience.`);
    lignes.push("Un médecin peut tenter un test de Guérison (ND " + s.virulence + ") après une période de repos : simple = effets annulés 24 h, majeure = guérison, critique = immunité.");
  }
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: carteDestinHTML({ genre: "nexus", nom: actor.name, portrait: actor.img, titre: maladie.name, texte, lignes, pied: `Virulence ${s.virulence}` })
  });
}
