/** Hash entier 32 bits déterministe (inspiré de xxhash/FNV) pour une cellule
 * de grille (gx, gy) + un "sel" permettant de tirer plusieurs valeurs
 * indépendantes pour la même cellule (rareté, position, etc.). Toujours le
 * même résultat pour les mêmes entrées, sur n'importe quel appareil : c'est
 * ce qui permet d'avoir un monde entier de coffres "déjà là" sans jamais
 * rien stocker tant qu'ils ne sont pas ouverts. */
export function hashCell(gx: number, gy: number, salt: number): number {
  let h = 0x811c9dc5 ^ salt;
  h = Math.imul(h ^ gx, 0x01000193);
  h ^= h >>> 13;
  h = Math.imul(h ^ gy, 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Nombre pseudo-aléatoire déterministe dans [0, 1) pour une cellule donnée. */
export function rand01(gx: number, gy: number, salt: number): number {
  return hashCell(gx, gy, salt) / 4294967296;
}
