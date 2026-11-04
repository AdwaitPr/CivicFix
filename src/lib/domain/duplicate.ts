export interface DuplicateScoringParams {
  distanceMeters: number;
  radiusMeters: number;
  trigramSimilarity: number;
  ageHours: number;
  windowHours: number;
}

/**
 * Calculates trigram similarity between two strings (approximate PostgreSQL pg_trgm).
 */
export function calculateTrigramSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();

  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  // Short string fallback (< 12 chars)
  if (Math.min(normA.length, normB.length) < 12) {
    if (normA.includes(normB) || normB.includes(normA)) {
      return 0.5;
    }
  }

  const getTrigrams = (str: string): Set<string> => {
    const padded = `  ${str} `;
    const trigrams = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const setA = getTrigrams(normA);
  const setB = getTrigrams(normB);

  let intersection = 0;
  for (const tri of setA) {
    if (setB.has(tri)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Number((intersection / union).toFixed(3));
}

/**
 * Computes deterministic multi-factor duplicate score in [0, 1]
 */
export function computeCompositeDuplicateScore(params: DuplicateScoringParams): number {
  const geoScore = Math.max(0, 1.0 - params.distanceMeters / params.radiusMeters);
  const timeScore = Math.max(0, 1.0 - params.ageHours / params.windowHours);
  const composite = 0.45 * geoScore + 0.4 * params.trigramSimilarity + 0.15 * timeScore;
  return Number(composite.toFixed(3));
}

/**
 * Evaluates whether a report candidate should be flagged for human duplicate review.
 */
export function isDuplicateCandidate(params: DuplicateScoringParams): boolean {
  const composite = computeCompositeDuplicateScore(params);
  if (composite >= 0.45) return true;
  if (params.distanceMeters <= 15.0 && params.ageHours <= 24.0) return true;
  return false;
}
