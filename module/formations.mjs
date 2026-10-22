/**
 * Listes de compétences des étapes de création (p. 44-62) : règles de jeu, sans texte du livre.
 * Un élément est une clé de compétence, ou un tableau de clés « au choix » (X ou Y).
 */
export const FORMATION_BASE_COMP = [
  "armesDeTir",
  "furtivite",
  "lames1",
  "athletisme",
  "carrure",
  "natation",
  "resilience",
  "corpsACorps",
  "perception",
  "survie"
];

export const COMP_MAISONS = {
  "eodh": [
    "esquive",
    "furtivite",
    "lames1",
    "artsDuPlaisir",
    "beauParleur",
    "seduction",
    "erudition",
    "corpsACorps",
    [
      "artsDuCombat",
      "artsEtranges"
    ],
    "sagacite"
  ],
  "garthe": [
    "armesDeTir",
    "esquive",
    "furtivite",
    "lames1",
    "athletisme",
    "carrure",
    "force",
    "nature",
    "perception",
    "survie"
  ],
  "melfynn": [
    "esquive",
    "lames1",
    "artsDeLaCour",
    "artsDuPlaisir",
    "beauParleur",
    "resilience",
    "drogues",
    "guerison",
    "corpsACorps",
    [
      "artsDuCombat",
      "artsEtranges"
    ]
  ],
  "tremayne": [
    "lames1",
    "armures",
    "athletisme",
    "bouclier",
    "carrure",
    "nature",
    "corpsACorps",
    "massesEtHaches",
    "perception",
    "survie"
  ],
  "norghal": [
    "lames1",
    "beauParleur",
    "pegre",
    "natation",
    "artisanat",
    "erudition",
    "intimidation",
    [
      "artsDuCombat",
      "artsEtranges"
    ],
    "perception",
    "sagacite"
  ],
  "benerys": [
    "lames1",
    "armures",
    "athletisme",
    "carrure",
    "resilience",
    "drogues",
    [
      "armesDHast",
      "lames2"
    ],
    "corpsACorps",
    "force",
    "artsDuCombat"
  ],
  "loki": [
    "esquive",
    "artsDuPlaisir",
    "seduction",
    "carrure",
    "nature",
    "corpsACorps",
    "lames2",
    "massesEtHaches",
    "perception",
    "survie"
  ]
};

export const COMP_VOIES = {
  "protecteur": [
    "lames1",
    "armures",
    "bouclier",
    "carrure",
    "resilience",
    "corpsACorps",
    "force",
    "intimidation",
    "lames2",
    "artsDuCombat"
  ],
  "duelliste": [
    "esquive",
    "lames1",
    "armures",
    "athletisme",
    "bouclier",
    "corpsACorps",
    "lames2",
    "massesEtHaches",
    "artsDuCombat",
    "perception"
  ],
  "tireur": [
    "acrobaties",
    "armesDeTir",
    "esquive",
    "furtivite",
    "athletisme",
    "resilience",
    "corpsACorps",
    "artsDuCombat",
    "perception",
    "survie"
  ],
  "assassin": [
    "esquive",
    "furtivite",
    "lames1",
    "corpsACorps",
    "pegre",
    "artisanat",
    "serrurerie",
    "drogues",
    "artsDuCombat",
    "perception"
  ],
  "conspirateur": [
    "esquive",
    "lames1",
    "artsDuPlaisir",
    "artsDeLaCour",
    "beauParleur",
    "seduction",
    "artsDuCombat",
    "enquete",
    "perception",
    "sagacite"
  ],
  "sorcier": [
    "esquive",
    "lames1",
    "resilience",
    "artisanat",
    "drogues",
    "erudition",
    "guerison",
    "artsEtranges",
    "perception",
    "sagacite"
  ]
};
