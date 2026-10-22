/**
 * Gestion d'onglets maison, indépendante du mécanisme d'onglets d'ApplicationV2
 * (qui exige des « parts » séparées et lève une erreur si une section est introuvable).
 * Toutes les sections sont dans un même gabarit ; on se contente de basculer une classe.
 */

/**
 * Affiche l'onglet demandé et masque les autres.
 * @param {HTMLElement} racine  élément contenant `.adc-tab` (boutons) et `.adc-onglet` (sections)
 * @param {string} actif        identifiant de l'onglet à afficher
 * @returns {boolean}           false si aucune section ne correspond (rien n'est alors modifié)
 */
export function appliquerOnglet(racine, actif) {
  const sections = [...racine.querySelectorAll(".adc-onglet")];
  if (!sections.some(s => s.dataset.tab === actif)) return false;
  for (const bouton of racine.querySelectorAll(".adc-tab")) {
    bouton.classList.toggle("active", bouton.dataset.tab === actif);
  }
  for (const section of sections) {
    section.classList.toggle("active", section.dataset.tab === actif);
  }
  return true;
}
