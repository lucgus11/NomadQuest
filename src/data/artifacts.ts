import type { ArtifactDefinition, ArtifactRarity } from "@/types";

export const ARTIFACTS: ArtifactDefinition[] = [
  {
    id: "shard-of-dawn",
    name: "Éclat de l'Aube",
    description: "Un fragment de cristal qui capte la première lumière du jour.",
    rarity: "commun",
    icon: "Gem",
    loreFragment:
      "Les nomades des premiers âges le portaient pour ne jamais perdre le nord.",
  },
  {
    id: "rusted-compass",
    name: "Boussole Rouillée",
    description: "Elle n'indique plus le nord, mais un lieu oublié.",
    rarity: "commun",
    icon: "Compass",
    loreFragment: "Son aiguille tremble légèrement à l'approche des reliques.",
  },
  {
    id: "moss-covered-coin",
    name: "Pièce Moussue",
    description: "Une monnaie ancienne, effacée par le temps et la pluie.",
    rarity: "commun",
    icon: "Coins",
    loreFragment: "Aucune civilisation connue ne revendique cette frappe.",
  },
  {
    id: "wanderers-boot-charm",
    name: "Grigri du Vagabond",
    description: "Porte-bonheur cousu de fils usés, censé alléger la marche.",
    rarity: "commun",
    icon: "Footprints",
    loreFragment: "On dit qu'il use ses fils un peu plus à chaque kilomètre parcouru.",
  },
  {
    id: "storm-glass",
    name: "Verre de Tempête",
    description: "Le sable se fige en spirale à l'intérieur, comme figé par la foudre.",
    rarity: "rare",
    icon: "CloudLightning",
    loreFragment: "Forgé, selon la légende, au cœur d'un orage qui a duré sept nuits.",
  },
  {
    id: "lantern-of-embers",
    name: "Lanterne des Braises",
    description: "Une flamme froide danse à l'intérieur sans jamais s'éteindre.",
    rarity: "rare",
    icon: "Flame",
    loreFragment: "Les marcheurs de nuit s'en servaient pour repousser le brouillard.",
  },
  {
    id: "cartographers-eye",
    name: "Œil du Cartographe",
    description: "Une lentille polie qui révèle les détails cachés d'une carte.",
    rarity: "rare",
    icon: "Eye",
    loreFragment: "Quiconque la porte voit le terrain se dessiner avant même d'y marcher.",
  },
  {
    id: "heart-of-the-mountain",
    name: "Cœur de la Montagne",
    description: "Une pierre dense et chaude, comme si elle battait encore.",
    rarity: "épique",
    icon: "Mountain",
    loreFragment: "Extraite d'un sommet que plus personne ne sait situer.",
  },
  {
    id: "tide-callers-shell",
    name: "Conque de l'Appel des Marées",
    description: "Elle résonne d'un chant océanique même loin de toute côte.",
    rarity: "épique",
    icon: "Shell",
    loreFragment: "Certains jurent l'avoir entendue prévenir d'un danger imminent.",
  },
  {
    id: "chrono-fragment",
    name: "Fragment Chronal",
    description: "Un éclat métallique qui semble exister dans deux instants à la fois.",
    rarity: "légendaire",
    icon: "Hourglass",
    loreFragment: "Une relique interdite selon les archives — si tant est qu'elles existent.",
  },
  {
    id: "crown-of-the-lost-nomad",
    name: "Couronne du Nomade Perdu",
    description: "Simple cerclage de fer, mais tous ceux qui l'ont porté ont fini par tout explorer.",
    rarity: "légendaire",
    icon: "Crown",
    loreFragment: "On raconte qu'elle choisit son porteur — pas l'inverse.",
  },
];

export const RARITY_WEIGHTS: Record<ArtifactRarity, number> = {
  commun: 60,
  rare: 28,
  épique: 10,
  légendaire: 2,
};

export const RARITY_COLORS: Record<ArtifactRarity, string> = {
  commun: "text-slate-300 border-slate-500/40",
  rare: "text-signal-400 border-signal-500/40",
  épique: "text-fuchsia-300 border-fuchsia-400/40",
  légendaire: "text-relic-400 border-relic-500/50",
};

export function getArtifactById(id: string): ArtifactDefinition | undefined {
  return ARTIFACTS.find((a) => a.id === id);
}

/** Tire un artefact aléatoire, pondéré par rareté ; les coffres légendaires
 * augmentent fortement les chances d'obtenir du rare/épique/légendaire. */
export function rollArtifact(
  boost: "commun" | "rare" | "légendaire" = "commun"
): ArtifactDefinition {
  const weights: Record<ArtifactRarity, number> = { ...RARITY_WEIGHTS };
  if (boost === "rare") {
    weights.commun = 30;
    weights.rare = 45;
    weights.épique = 20;
    weights.légendaire = 5;
  } else if (boost === "légendaire") {
    weights.commun = 5;
    weights.rare = 30;
    weights.épique = 40;
    weights.légendaire = 25;
  }

  const pool = ARTIFACTS.flatMap((a) =>
    Array.from({ length: weights[a.rarity] }, () => a)
  );
  return pool[Math.floor(Math.random() * pool.length)];
}
