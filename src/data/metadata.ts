/**
 * Auto-generated lightweight metadata - DO NOT EDIT MANUALLY
 * Generated at: 2026-03-16T04:30:18.242Z
 * Run: npx tsx scripts/generate-knowledge.ts
 */

export const stats = {
  totalAlgorithmSets: 79,
  totalAlgorithms: 4229,
  totalMethods: 79,
  totalCubes: 989,
  totalLubes: 422,
  totalRecords: 17,
  totalGlossaryTerms: 170,
  totalTips: 55,
  totalLearningPaths: 17,
} as const;

export interface FeaturedSetSummary {
  id: string;
  name: string;
  puzzle: string;
  description: string;
  algorithmCount: number;
}

export const featuredSets: FeaturedSetSummary[] = [
  { id: 'oll', name: 'OLL', puzzle: '3x3', description: 'Orientation of the Last Layer - 57 cases. These algorithms orient all last layer pieces so the top face is one color. Part of the CFOP method.', algorithmCount: 57 },
  { id: 'pll', name: 'PLL', puzzle: '3x3', description: 'Permutation of the Last Layer - 21 cases. These algorithms permute all last layer pieces to their correct positions. The final step of the CFOP method.', algorithmCount: 21 },
  { id: 'f2l', name: 'F2L', puzzle: '3x3', description: 'First Two Layers - 42 intuitive and algorithmic cases for simultaneously solving the first two layers. The second step of the CFOP method.', algorithmCount: 41 },
  { id: 'coll', name: 'COLL', puzzle: '3x3', description: 'Corners of the Last Layer - 40 cases. These algorithms orient and permute corners while preserving edge orientation, leaving only an EPLL to solve.', algorithmCount: 40 },
  { id: 'cmll', name: 'CMLL', puzzle: '3x3', description: 'Corners of the Last Layer for Roux method - 42 cases. Solves corners while preserving the M-slice and oriented edges. Used in the Roux method.', algorithmCount: 42 },
  { id: 'cll', name: 'CLL', puzzle: '2x2', description: 'Corners of the Last Layer for 2x2 - 42 cases across 7 subsets. Solves the last layer corners in one step after completing the first layer.', algorithmCount: 40 },
];
