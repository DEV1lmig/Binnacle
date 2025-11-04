/**
 * FRANCHISE-AWARE SEARCH SYSTEM
 * 
 * Ordena resultados de búsqueda por franquicia:
 * 1. Juegos principales (category=0) primero
 * 2. Luego expansiones, spin-offs, etc.
 * 3. Remakes/remasters al final
 * 
 * Dentro de cada categoría, ordena por:
 * - aggregated_rating_count (popularidad/consenso)
 * - aggregated_rating (calidad)
 * - release date (más recientes primero)
 */

/**
 * CATEGORY PRIORITY MAPPING
 * 
 * Basado en IGDB game_type enum
 */
export const GAME_CATEGORY_PRIORITY: Record<number, number> = {
  0: 100,  // main_game (PRIMERA PRIORIDAD)
  3: 90,   // bundle
  10: 85,  // expanded_game
  2: 80,   // expansion
  4: 75,   // standalone_expansion
  6: 70,   // episode
  7: 65,   // season
  11: 60,  // port
  8: 50,   // remake
  9: 50,   // remaster
  1: 40,   // dlc_addon
  5: 30,   // mod
  12: 20,  // fork
  13: 20,  // pack
  14: 10,  // update
};

/**
 * Calcula el score de un juego basado en:
 * 1. Categoría (si es main_game, expansion, etc.)
 * 2. Popularidad (aggregated_rating_count)
 * 3. Calidad (aggregated_rating)
 * 4. Recencia (first_release_date)
 * 
 * Score rango: 0-1000 (mayor = mejor)
 */
export function calculateFranchiseRank(game: {
  category?: number;
  gameType?: number;
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  hypes?: number;
  firstReleaseDate?: number;
  title: string;
}): number {
  let score = 0;

  // COMPONENTE 1: Categoría (0-100)
  // Prioriza main_game, luego expansiones, luego spin-offs
  const categoryScore = GAME_CATEGORY_PRIORITY[game.category ?? 0] ?? 0;
  score += categoryScore;

  // COMPONENTE 2: Popularidad (0-200)
  // aggregated_rating_count = cuántas personas lo han puntuado
  // Juegos con más puntuaciones = más consenso = mejor ranking
  const ratingCount = game.aggregatedRatingCount ?? 0;
  const normalizedCount = Math.min(ratingCount / 100, 100); // Normalizar a 0-100
  const popularityScore = normalizedCount * 2; // 0-200
  score += popularityScore;

  // COMPONENTE 3: Calidad (0-150)
  // aggregated_rating = puntuación promedio de críticos (0-100)
  const quality = game.aggregatedRating ?? 0;
  const qualityScore = (quality / 100) * 150; // 0-150
  score += qualityScore;

  // COMPONENTE 4: Recencia (0-50)
  // Juegos más recientes suben ligeramente
  if (game.firstReleaseDate) {
    const yearsSinceRelease = (Date.now() / 1000 - game.firstReleaseDate) / (365 * 24 * 60 * 60);
    const recencyScore = Math.max(50 - yearsSinceRelease, 0); // Decrece con años
    score += Math.max(recencyScore, 0);
  }

  // COMPONENTE 5: Hype pre-lanzamiento (0-50)
  // Juegos con mucho hype pre-lanzamiento = comunidad interesada
  const hypeScore = Math.min((game.hypes ?? 0) / 10000, 50);
  score += hypeScore;

  return Math.min(score, 1000); // Cap a 1000
}

/**
 * Agrupa juegos por franquicia y los ordena
 * 
 * Resultado:
 * {
 *   "The Legend of Zelda": [
 *     { title: "Breath of the Wild", score: 950 },     // main_game
 *     { title: "Tears of the Kingdom", score: 945 },   // main_game
 *     { title: "Ocarina of Time", score: 930 },        // main_game (clásico)
 *     { title: "Link's Awakening Remake", score: 500 },// remake
 *   ],
 *   "Another Franchise": [...],
 * }
 */
export function groupByFranchiseAndRank(games: Array<{
  id: number;
  title: string;
  category?: number;
  franchises?: string; // JSON array string
  franchise?: string; // mainfranchise
  aggregatedRating?: number;
  aggregatedRatingCount?: number;
  hypes?: number;
  firstReleaseDate?: number;
}>): Map<string, Array<{
  id: number;
  title: string;
  category?: number;
  score: number;
  rank: number;
}>> {
  const grouped = new Map<string, Array<any>>();

  for (const game of games) {
    // Extraer franquicias
    let franchises: string[] = [];
    
    if (game.franchise) {
      franchises.push(game.franchise);
    }
    
    if (game.franchises) {
      try {
        const parsed = JSON.parse(game.franchises);
        if (Array.isArray(parsed)) {
          franchises.push(...parsed.map((f: any) => typeof f === 'string' ? f : f.name));
        }
      } catch (e) {
        // Ignorar error de parse
      }
    }

    // Si no tiene franquicia explícita, usa el título como clave
    if (franchises.length === 0) {
      // Intentar extraer franquicia del título
      const titleFranchise = extractFranchiseFromTitle(game.title);
      franchises.push(titleFranchise);
    }

    // Calcular score
    const score = calculateFranchiseRank(game);

    // Agrupar por cada franquicia
    for (const franchise of franchises) {
      if (!grouped.has(franchise)) {
        grouped.set(franchise, []);
      }
      grouped.get(franchise)!.push({
        id: game.id,
        title: game.title,
        category: game.category,
        score,
      });
    }
  }

  // Ordenar cada grupo por score (descendente)
  for (const [_, games] of grouped) {
    games.sort((a, b) => b.score - a.score);
    
    // Asignar rank
    games.forEach((game, index) => {
      game.rank = index + 1;
    });
  }

  return grouped;
}

/**
 * Extrae la franquicia del título
 * Ejemplos:
 * - "The Legend of Zelda: Breath of the Wild" → "The Legend of Zelda"
 * - "Super Mario Bros. Wonder" → "Super Mario"
 * - "Pokémon Scarlet" → "Pokémon"
 */
export function extractFranchiseFromTitle(title: string): string {
  // Palabras comunes que indican spin-off/versión
  const spinOffPatterns = [
    /(.+?)\s*(?:Remake|Remaster|HD|Anniversary|Edition|Version|Expansion|DLC|Mobile|Spin-off)/i,
    /(.+?)\s*[:–]\s*(?:The|A|An)/i, // Título con subtítulo
    /^(.+?)\s+(?:I{1,3}|IV|V|VI|VII|VIII|IX|X)(?:\s|$|:)/i, // Números romanos
  ];

  for (const pattern of spinOffPatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Si nada coincide, retornar todo el título
  return title;
}

/**
 * Ejemplo de uso:
 * 
 * const games = [
 *   { id: 1, title: "The Legend of Zelda: Breath of the Wild", category: 0, aggregatedRatingCount: 250 },
 *   { id: 2, title: "The Legend of Zelda: Tears of the Kingdom", category: 0, aggregatedRatingCount: 180 },
 *   { id: 3, title: "Cadence of Hyrule", category: 0, aggregatedRatingCount: 80 },
 *   { id: 4, title: "The Legend of Zelda: Link's Awakening Remake", category: 8, aggregatedRatingCount: 120 },
 * ];
 * 
 * const grouped = groupByFranchiseAndRank(games);
 * 
 * // Resultado:
 * // "The Legend of Zelda": [
 * //   { id: 1, title: "...", score: 950, rank: 1 },  // main + popular
 * //   { id: 2, title: "...", score: 920, rank: 2 },  // main + popular
 * //   { id: 3, title: "...", score: 600, rank: 3 },  // main pero menos popular
 * //   { id: 4, title: "...", score: 480, rank: 4 },  // remake (categoría baja)
 * // ]
 */
