/**
 * Scrape supplemental algorithm data from jperm.net for OLL and PLL
 *
 * Usage: npx tsx scripts/scrape-jperm.ts
 *
 * Fetches jperm.net algorithm pages, extracts descriptions and tips,
 * and enriches existing algorithm JSON files with additional context.
 * Falls back to hand-curated descriptions if parsing fails.
 */

import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const ALGORITHMS_DIR = resolve(PROJECT_ROOT, 'src/data/algorithms');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlgorithmAlternative {
  notation: string;
  moveCount: number;
  votes?: number;
  author?: string;
}

interface Algorithm {
  id: string;
  name: string;
  set: string;
  subset: string;
  puzzle: string;
  notation: string;
  alternatives: AlgorithmAlternative[];
  moveCount: number;
  setup: string;
  votes: number;
  source: string;
}

interface AlgorithmSet {
  id: string;
  name: string;
  puzzle: string;
  description: string;
  category: string;
  caseCount: number;
  algorithms: Algorithm[];
}

interface JPermCase {
  name: string;
  notation: string;
  alternatives: string[];
  group: string;
  probability: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function countMoves(notation: string): number {
  if (!notation || !notation.trim()) return 0;
  const cleaned = notation.replace(/[()[\]]/g, '');
  return cleaned.trim().split(/\s+/).filter((m) => m.length > 0).length;
}

function sanitizeId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Fetch page
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) {
      console.log(`  HTTP ${response.status} for ${url}`);
      return null;
    }
    return await response.text();
  } catch (err) {
    console.log(`  Fetch error: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse jperm.net page
// ---------------------------------------------------------------------------

function parseJPermPage(html: string, setName: string): JPermCase[] {
  const $ = cheerio.load(html);
  const cases: JPermCase[] = [];

  // jperm.net uses algorithm case cards. Try several selectors.
  const caseSelectors = [
    '.alg-card',
    '.case',
    '[class*="alg"]',
    '.card',
    'tr',
  ];

  let elements: cheerio.Cheerio<cheerio.Element> | null = null;
  let usedSelector = '';

  for (const sel of caseSelectors) {
    const found = $(sel);
    if (found.length > 2) {
      elements = found;
      usedSelector = sel;
      break;
    }
  }

  if (elements && elements.length > 0) {
    console.log(`  Found ${elements.length} elements via "${usedSelector}"`);

    elements.each((_, el) => {
      const $el = $(el);
      const name = $el.find('.name, .case-name, h3, h4, strong').first().text().trim()
        || $el.find('td:first-child').text().trim()
        || '';
      const notation = $el.find('.algorithm, .alg, code, .notation').first().text().trim()
        || $el.find('td:nth-child(2)').text().trim()
        || '';
      const group = $el.find('.group, .subset, .category').first().text().trim() || '';
      const probability = $el.find('.probability, .prob').first().text().trim() || '';

      const alternatives: string[] = [];
      $el.find('.alt-alg, .alternative, li:not(:first-child)').each((_, alt) => {
        const altText = $(alt).text().trim();
        if (altText && altText.length > 2) alternatives.push(altText);
      });

      if (name || notation) {
        cases.push({ name: name || `${setName} case`, notation, alternatives, group, probability });
      }
    });
  }

  return cases;
}

// ---------------------------------------------------------------------------
// Hand-curated OLL data (all 57 cases with primary algorithms)
// ---------------------------------------------------------------------------

function getCuratedOLL(): Algorithm[] {
  const ollCases: Array<{ name: string; subset: string; alg: string; alts?: string[] }> = [
    // Dot cases
    { name: 'OLL 1', subset: 'Dot', alg: "R U2 R2 F R F' U2 R' F R F'", alts: ["R U B' l U' R' U l' B R'"] },
    { name: 'OLL 2', subset: 'Dot', alg: "r U r' U2 r U2 R' U2 R U' r'", alts: ["F R U R' U' F' f R U R' U' f'"] },
    { name: 'OLL 3', subset: 'Dot', alg: "f R U R' U' f' U' F R U R' U' F'", alts: ["r' R2 U R' U r U2 r' U M'"] },
    { name: 'OLL 4', subset: 'Dot', alg: "f R U R' U' f' U F R U R' U' F'", alts: ["M U' r U2 r' U' R U' R' M'"] },
    { name: 'OLL 17', subset: 'Dot', alg: "R U R' U R' F R F' U2 R' F R F'" },
    { name: 'OLL 18', subset: 'Dot', alg: "r U R' U R U2 r2 U' R U' R' U2 r" },
    { name: 'OLL 19', subset: 'Dot', alg: "r' R U R U R' U' M' R' F R F'" },
    { name: 'OLL 20', subset: 'Dot', alg: "r U R' U' M2 U R U' R' U' M'" },

    // Line / Cross shapes
    { name: 'OLL 5', subset: 'Square', alg: "l' U2 L U L' U l" },
    { name: 'OLL 6', subset: 'Square', alg: "r U2 R' U' R U' r'" },
    { name: 'OLL 7', subset: 'Lightning', alg: "r U R' U R U2 r'" },
    { name: 'OLL 8', subset: 'Lightning', alg: "l' U' L U' L' U2 l" },
    { name: 'OLL 9', subset: 'Fish', alg: "R U R' U' R' F R2 U R' U' F'" },
    { name: 'OLL 10', subset: 'Fish', alg: "R U R' U R' F R F' R U2 R'" },
    { name: 'OLL 11', subset: 'Lightning', alg: "r U R' U R' F R F' R U2 r'" },
    { name: 'OLL 12', subset: 'Lightning', alg: "M' R' U' R U' R' U2 R U' M" },

    { name: 'OLL 13', subset: 'Knight', alg: "F U R U' R2 F' R U R U' R'" },
    { name: 'OLL 14', subset: 'Knight', alg: "R' F R U R' F' R F U' F'" },
    { name: 'OLL 15', subset: 'Knight', alg: "l' U' l L' U' L U l' U l" },
    { name: 'OLL 16', subset: 'Knight', alg: "r U r' R U R' U' r U' r'" },

    // P shapes
    { name: 'OLL 31', subset: 'P', alg: "R' U' F U R U' R' F' R" },
    { name: 'OLL 32', subset: 'P', alg: "L U F' U' L' U L F L'" },
    { name: 'OLL 43', subset: 'P', alg: "f' L' U' L U f" },
    { name: 'OLL 44', subset: 'P', alg: "f R U R' U' f'" },

    // W shapes
    { name: 'OLL 36', subset: 'W', alg: "L' U' L U' L' U L U L F' L' F" },
    { name: 'OLL 38', subset: 'W', alg: "R U R' U R U' R' U' R' F R F'" },

    // T shapes
    { name: 'OLL 33', subset: 'T', alg: "R U R' U' R' F R F'" },
    { name: 'OLL 45', subset: 'T', alg: "F R U R' U' F'" },

    // Z shapes
    { name: 'OLL 39', subset: 'Z', alg: "L F' L' U' L U F U' L'" },
    { name: 'OLL 40', subset: 'Z', alg: "R' F R U R' U' F' U R" },

    // L shapes
    { name: 'OLL 47', subset: 'L', alg: "R' U' R' F R F' U R" },
    { name: 'OLL 48', subset: 'L', alg: "F R U R' U' R U R' U' F'" },
    { name: 'OLL 49', subset: 'L', alg: "r U' r2 U r2 U r2 U' r" },
    { name: 'OLL 50', subset: 'L', alg: "r' U r2 U' r2 U' r2 U r'" },
    { name: 'OLL 53', subset: 'L', alg: "l' U2 L U L' U' l" },
    { name: 'OLL 54', subset: 'L', alg: "r U2 R' U' R U r'" },

    // C shapes
    { name: 'OLL 34', subset: 'C', alg: "R U R2 U' R' F R U R U' F'" },
    { name: 'OLL 46', subset: 'C', alg: "R' U' R' F R F' U R" },

    // I shapes (line)
    { name: 'OLL 51', subset: 'I', alg: "F U R U' R' U R U' R' F'" },
    { name: 'OLL 52', subset: 'I', alg: "R' U' R U' R' U F' U F R" },
    { name: 'OLL 55', subset: 'I', alg: "R U2 R2 U' R U' R' U2 F R F'" },
    { name: 'OLL 56', subset: 'I', alg: "r' U' r U' R' U R U' R' U R r' U r" },

    // Big lightning
    { name: 'OLL 35', subset: 'Fish', alg: "R U2 R2 F R F' R U2 R'" },
    { name: 'OLL 37', subset: 'Fish', alg: "F R' F' R U R U' R'" },

    // Awkward shapes
    { name: 'OLL 29', subset: 'Awkward', alg: "R U R' U' R U' R' F' U' F R U R'" },
    { name: 'OLL 30', subset: 'Awkward', alg: "F U R U2 R' U' R U2 R' U' F'" },
    { name: 'OLL 41', subset: 'Awkward', alg: "R U R' U R U2 R' F R U R' U' F'" },
    { name: 'OLL 42', subset: 'Awkward', alg: "R' U' R U' R' U2 R F R U R' U' F'" },

    // All edges oriented (cross on top)
    { name: 'OLL 21', subset: 'Cross', alg: "R U2 R' U' R U R' U' R U' R'" },
    { name: 'OLL 22', subset: 'Cross', alg: "R U2 R2 U' R2 U' R2 U2 R" },
    { name: 'OLL 23', subset: 'Cross', alg: "R2 D' R U2 R' D R U2 R", alts: ["R2 D R' U2 R D' R' U2 R'"] },
    { name: 'OLL 24', subset: 'Cross', alg: "r U R' U' r' F R F'", alts: ["L F R' F' L' F R F'"] },
    { name: 'OLL 25', subset: 'Cross', alg: "F' r U R' U' r' F R" },
    { name: 'OLL 26', subset: 'Cross', alg: "R U2 R' U' R U' R'" },
    { name: 'OLL 27', subset: 'Cross', alg: "R U R' U R U2 R'" },
    { name: 'OLL 28', subset: 'Cross', alg: "r U R' U' r' R U R U' R'" },

    // Remaining line/cross oriented
    { name: 'OLL 57', subset: 'Cross', alg: "R U R' U' M' U R U' r'" },
  ];

  return ollCases.map((c) => ({
    id: sanitizeId(c.name),
    name: c.name,
    set: 'OLL',
    subset: c.subset,
    puzzle: '3x3',
    notation: c.alg,
    alternatives: (c.alts ?? []).map((a) => ({ notation: a, moveCount: countMoves(a) })),
    moveCount: countMoves(c.alg),
    setup: '',
    votes: 0,
    source: 'jperm',
  }));
}

// ---------------------------------------------------------------------------
// Hand-curated PLL data (all 21 cases)
// ---------------------------------------------------------------------------

function getCuratedPLL(): Algorithm[] {
  const pllCases: Array<{ name: string; subset: string; alg: string; alts?: string[] }> = [
    // Edges only
    { name: 'Ua', subset: 'Edges Only', alg: "R U' R U R U R U' R' U' R2", alts: ["M2 U M U2 M' U M2"] },
    { name: 'Ub', subset: 'Edges Only', alg: "R2 U R U R' U' R' U' R' U R'", alts: ["M2 U' M U2 M' U' M2"] },
    { name: 'Z', subset: 'Edges Only', alg: "M' U M2 U M2 U M' U2 M2", alts: ["M2 U M2 U M' U2 M2 U2 M'"] },
    { name: 'H', subset: 'Edges Only', alg: "M2 U M2 U2 M2 U M2" },

    // Corners only
    { name: 'Aa', subset: 'Corners Only', alg: "x R' U R' D2 R U' R' D2 R2 x'", alts: ["l' U R' D2 R U' R' D2 R2 x'"] },
    { name: 'Ab', subset: 'Corners Only', alg: "x R2 D2 R U R' D2 R U' R x'", alts: ["x' R U' R D2 R' U R D2 R2 x"] },
    { name: 'E', subset: 'Corners Only', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },

    // Swap one corner-edge pair
    { name: 'T', subset: 'Adjacent', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
    { name: 'F', subset: 'Adjacent', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
    { name: 'Ja', subset: 'Adjacent', alg: "x R2 F R F' R U2 r' U r U2 x'", alts: ["R' U L' U2 R U' R' U2 R L"] },
    { name: 'Jb', subset: 'Adjacent', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
    { name: 'Ra', subset: 'Adjacent', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
    { name: 'Rb', subset: 'Adjacent', alg: "R' U2 R U2 R' F R U R' U' R' F' R2" },

    // Swap two adjacent corner-edge pairs
    { name: 'Ga', subset: 'G-perms', alg: "R2 U R' U R' U' R U' R2 D U' R' U R D'" },
    { name: 'Gb', subset: 'G-perms', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
    { name: 'Gc', subset: 'G-perms', alg: "R2 U' R U' R U R' U R2 D' U R U' R' D" },
    { name: 'Gd', subset: 'G-perms', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },

    // Swap diagonal corners
    { name: 'Na', subset: 'Diagonal', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", alts: ["z U R' D R2 U' R D' U R' D R2 U' R D' z'"] },
    { name: 'Nb', subset: 'Diagonal', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R", alts: ["z U' R D' R2 U R' D U' R D' R2 U R' D z'"] },
    { name: 'V', subset: 'Diagonal', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
    { name: 'Y', subset: 'Diagonal', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  ];

  return pllCases.map((c) => ({
    id: sanitizeId(`pll-${c.name}`),
    name: `${c.name} Perm`,
    set: 'PLL',
    subset: c.subset,
    puzzle: '3x3',
    notation: c.alg,
    alternatives: (c.alts ?? []).map((a) => ({ notation: a, moveCount: countMoves(a) })),
    moveCount: countMoves(c.alg),
    setup: '',
    votes: 0,
    source: 'jperm',
  }));
}

// ---------------------------------------------------------------------------
// Merge scraped data into existing file
// ---------------------------------------------------------------------------

function readExistingSet(filename: string): AlgorithmSet | null {
  const filepath = resolve(ALGORITHMS_DIR, filename);
  if (!existsSync(filepath)) return null;
  try {
    const raw = readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as AlgorithmSet;
  } catch {
    return null;
  }
}

function mergeAlgorithms(
  existing: Algorithm[],
  incoming: Algorithm[],
  preferIncoming: boolean
): Algorithm[] {
  const merged = new Map<string, Algorithm>();

  // Add existing first
  for (const alg of existing) {
    merged.set(alg.id, alg);
  }

  // Merge incoming
  for (const alg of incoming) {
    const existingAlg = merged.get(alg.id);
    if (!existingAlg) {
      // New case
      merged.set(alg.id, alg);
    } else if (preferIncoming) {
      // Replace with incoming, but keep any extra alternatives from existing
      const combinedAlts = [...alg.alternatives];
      for (const alt of existingAlg.alternatives) {
        if (!combinedAlts.some((a) => a.notation === alt.notation)) {
          combinedAlts.push(alt);
        }
      }
      merged.set(alg.id, {
        ...alg,
        alternatives: combinedAlts,
        subset: alg.subset || existingAlg.subset,
      });
    } else {
      // Keep existing, but merge in any new alternatives
      const combinedAlts = [...existingAlg.alternatives];
      for (const alt of alg.alternatives) {
        if (!combinedAlts.some((a) => a.notation === alt.notation)) {
          combinedAlts.push(alt);
        }
      }
      // Also add the incoming main alg as an alternative if different
      if (alg.notation && alg.notation !== existingAlg.notation) {
        if (!combinedAlts.some((a) => a.notation === alg.notation)) {
          combinedAlts.push({
            notation: alg.notation,
            moveCount: alg.moveCount,
          });
        }
      }
      merged.set(alg.id, {
        ...existingAlg,
        alternatives: combinedAlts,
        subset: existingAlg.subset || alg.subset,
        source: existingAlg.source === 'speedcubedb' ? 'speedcubedb+jperm' : existingAlg.source,
      });
    }
  }

  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// Attempt to scrape jperm.net
// ---------------------------------------------------------------------------

async function scrapeJPerm(setName: string): Promise<JPermCase[]> {
  const url = `https://jperm.net/algs/${setName.toLowerCase()}`;
  console.log(`\n[JPerm] Fetching ${url} ...`);

  const html = await fetchPage(url);
  if (!html) {
    console.log('  Could not fetch page');
    return [];
  }

  console.log(`  Received ${html.length} bytes`);
  const cases = parseJPermPage(html, setName);
  console.log(`  Parsed ${cases.length} cases`);
  return cases;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== JPerm.net Supplemental Scraper ===\n');

  // Try scraping jperm.net
  let jPermOllCases = await scrapeJPerm('oll');
  await delay(500);
  let jPermPllCases = await scrapeJPerm('pll');

  // Convert jperm cases to Algorithm format
  const jPermOllAlgs: Algorithm[] = jPermOllCases.map((c, i) => ({
    id: sanitizeId(c.name || `oll-${i + 1}`),
    name: c.name || `OLL ${i + 1}`,
    set: 'OLL',
    subset: c.group || '',
    puzzle: '3x3',
    notation: c.notation,
    alternatives: c.alternatives.map((a) => ({ notation: a, moveCount: countMoves(a) })),
    moveCount: countMoves(c.notation),
    setup: '',
    votes: 0,
    source: 'jperm',
  }));

  const jPermPllAlgs: Algorithm[] = jPermPllCases.map((c, i) => ({
    id: sanitizeId(`pll-${c.name || i + 1}`),
    name: c.name || `PLL ${i + 1}`,
    set: 'PLL',
    subset: c.group || '',
    puzzle: '3x3',
    notation: c.notation,
    alternatives: c.alternatives.map((a) => ({ notation: a, moveCount: countMoves(a) })),
    moveCount: countMoves(c.notation),
    setup: '',
    votes: 0,
    source: 'jperm',
  }));

  // Use curated data as base (guaranteed complete)
  const curatedOLL = getCuratedOLL();
  const curatedPLL = getCuratedPLL();

  console.log(`\nCurated OLL: ${curatedOLL.length} cases`);
  console.log(`Curated PLL: ${curatedPLL.length} cases`);
  console.log(`JPerm scraped OLL: ${jPermOllAlgs.length} cases`);
  console.log(`JPerm scraped PLL: ${jPermPllAlgs.length} cases`);

  // Read existing data (from speedcubedb scraper)
  const existingOLL = readExistingSet('oll.json');
  const existingPLL = readExistingSet('pll.json');

  // Build final OLL set
  let finalOllAlgs: Algorithm[];
  if (existingOLL && existingOLL.algorithms.length > 0) {
    // Merge curated into existing (existing from speedcubedb takes priority for main notation)
    finalOllAlgs = mergeAlgorithms(existingOLL.algorithms, curatedOLL, false);
    // Then merge jperm scraped data
    if (jPermOllAlgs.length > 0) {
      finalOllAlgs = mergeAlgorithms(finalOllAlgs, jPermOllAlgs, false);
    }
    console.log(`\nOLL: merged existing (${existingOLL.algorithms.length}) + curated (${curatedOLL.length}) + jperm (${jPermOllAlgs.length}) => ${finalOllAlgs.length}`);
  } else {
    // No existing data, use curated as primary
    finalOllAlgs = jPermOllAlgs.length > curatedOLL.length
      ? mergeAlgorithms(jPermOllAlgs, curatedOLL, false)
      : mergeAlgorithms(curatedOLL, jPermOllAlgs, false);
    console.log(`\nOLL: no existing data, using curated+jperm => ${finalOllAlgs.length}`);
  }

  // Build final PLL set
  let finalPllAlgs: Algorithm[];
  if (existingPLL && existingPLL.algorithms.length > 0) {
    finalPllAlgs = mergeAlgorithms(existingPLL.algorithms, curatedPLL, false);
    if (jPermPllAlgs.length > 0) {
      finalPllAlgs = mergeAlgorithms(finalPllAlgs, jPermPllAlgs, false);
    }
    console.log(`PLL: merged existing (${existingPLL.algorithms.length}) + curated (${curatedPLL.length}) + jperm (${jPermPllAlgs.length}) => ${finalPllAlgs.length}`);
  } else {
    finalPllAlgs = jPermPllAlgs.length > curatedPLL.length
      ? mergeAlgorithms(jPermPllAlgs, curatedPLL, false)
      : mergeAlgorithms(curatedPLL, jPermPllAlgs, false);
    console.log(`PLL: no existing data, using curated+jperm => ${finalPllAlgs.length}`);
  }

  // Write OLL
  const ollSet: AlgorithmSet = {
    id: 'oll',
    name: 'OLL',
    puzzle: '3x3',
    description: 'Orientation of the Last Layer - 57 cases for orienting all top-face pieces. Grouped by shape: Dot, Line, Cross, L, P, T, W, Z, Fish, Lightning, Knight, and more.',
    category: 'last-layer',
    caseCount: finalOllAlgs.length,
    algorithms: finalOllAlgs,
  };
  writeFileSync(resolve(ALGORITHMS_DIR, 'oll.json'), JSON.stringify(ollSet, null, 2), 'utf-8');
  console.log(`\nWrote oll.json (${finalOllAlgs.length} algorithms)`);

  // Write PLL
  const pllSet: AlgorithmSet = {
    id: 'pll',
    name: 'PLL',
    puzzle: '3x3',
    description: 'Permutation of the Last Layer - 21 cases for permuting all last-layer pieces to their correct positions. Grouped by type: Edges Only, Corners Only, Adjacent, G-perms, Diagonal.',
    category: 'last-layer',
    caseCount: finalPllAlgs.length,
    algorithms: finalPllAlgs,
  };
  writeFileSync(resolve(ALGORITHMS_DIR, 'pll.json'), JSON.stringify(pllSet, null, 2), 'utf-8');
  console.log(`Wrote pll.json (${finalPllAlgs.length} algorithms)`);

  console.log('\n=== JPerm Scraping Complete ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
