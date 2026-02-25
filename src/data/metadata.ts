/**
 * Lightweight metadata — pre-computed stats and featured set summaries.
 * Does NOT import the full data bundle (3.3MB).
 * Kept in sync with the generation script.
 */

export const stats = {
  totalAlgorithmSets: 78,
  totalAlgorithms: 4277,
  totalMethods: 76,
  totalCubes: 975,
  totalLubes: 31,
  totalRecords: 17,
  totalGlossaryTerms: 120,
  totalTips: 25,
  totalLearningPaths: 8,
} as const;

export interface FeaturedSetSummary {
  id: string;
  name: string;
  puzzle: string;
  description: string;
  algorithmCount: number;
}

export const featuredSets: FeaturedSetSummary[] = [
  { id: 'oll', name: 'OLL', puzzle: '3x3', description: 'Orientation of the Last Layer — orient all last-layer pieces in one step.', algorithmCount: 57 },
  { id: 'pll', name: 'PLL', puzzle: '3x3', description: 'Permutation of the Last Layer — permute all last-layer pieces in one step.', algorithmCount: 21 },
  { id: 'f2l', name: 'F2L', puzzle: '3x3', description: 'First Two Layers — pair corners and edges to fill the first two layers simultaneously.', algorithmCount: 41 },
  { id: 'coll', name: 'COLL', puzzle: '3x3', description: 'Corners of the Last Layer — orient and permute corners when edges are already oriented.', algorithmCount: 42 },
  { id: 'cmll', name: 'CMLL', puzzle: '3x3', description: 'Corners of the Last Layer (Roux) — orient and permute corners ignoring M-slice edges.', algorithmCount: 42 },
  { id: 'cll', name: 'CLL', puzzle: '2x2', description: 'Corners of the Last Layer — solve all corner positions and orientations in one step.', algorithmCount: 42 },
];
