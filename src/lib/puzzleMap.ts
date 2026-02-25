/** Mapping from internal puzzle names to cubing.js puzzle IDs */
const PUZZLE_MAP: Record<string, string> = {
  '3x3': '3x3x3',
  '2x2': '2x2x2',
  '4x4': '4x4x4',
  '5x5': '5x5x5',
  '6x6': '6x6x6',
  pyraminx: 'pyraminx',
  megaminx: 'megaminx',
  skewb: 'skewb',
  'square-1': 'square1',
};

export function getCubingPuzzle(puzzle: string): string {
  return PUZZLE_MAP[puzzle] ?? PUZZLE_MAP[puzzle.toLowerCase()] ?? '3x3x3';
}

/** Returns a stickering hint for cubing.js based on the algorithm set name and subset */
export function getStickering(
  setName: string,
  subset?: string,
): string | undefined {
  const lower = setName.toLowerCase();

  // 2-Look OLL: Edge Orientation cases have no cross yet → full OLL stickering
  // Corner Orientation cases already have a cross → use "OLL" but with
  // experimentalSetupAlg to show cross pre-formed (handled in modal via setup)
  if (lower === '2-look oll') {
    if (subset?.toLowerCase().includes('corner')) return 'OLL';
    return 'OLL';
  }
  // 2-Look PLL: Corner Permutation cases have edges unsolved → PLL stickering
  // Edge Permutation cases have corners already solved → PLL stickering
  if (lower === '2-look pll') return 'PLL';

  if (lower.includes('oll') && !lower.includes('coll') && !lower.includes('ollcp'))
    return 'OLL';
  if (lower.includes('pll') || lower.includes('epll') || lower.includes('apll'))
    return 'PLL';
  if (lower.includes('f2l') || lower.includes('cls') || lower.includes('vls') || lower.includes('sbls') || lower.includes('vhls'))
    return 'Cross';
  return undefined;
}
