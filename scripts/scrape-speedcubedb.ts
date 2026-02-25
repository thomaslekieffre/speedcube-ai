/**
 * Scrape algorithm sets from speedcubedb.com
 *
 * Usage: npx tsx scripts/scrape-speedcubedb.ts
 *
 * TEXT-BASED parsing approach:
 *   1. Fetch the main set page to discover individual case links
 *   2. Fetch each individual case page (with polite delays)
 *   3. Extract ALL text content via cheerio $('body').text()
 *   4. Parse with regex to find case names, algorithms, votes, movecounts, setup
 *   5. Only overwrite existing files if we scraped MORE algorithms
 *
 * Page data patterns (from the extracted text):
 *   Case name:   "OLL 1", "PLL Aa", "F2L 5", "CLL AS 1", etc.
 *   Subset info:  "3x3 - OLL - Dot Case"
 *   Setup:        "Setup: F R' F' R U2' F R' F' R2' U2' R'"
 *   Algorithm:    "R U2 R2 F R F' U2 R' F R F'"
 *   Votes:        "Community Votes: 140"
 *   Movecount:    "Movecount: 11 ETM" or "11 ETM / 11 STM"
 *   Face moves:   "Face Moves: 3GEN (R U F)"
 */

import * as cheerio from 'cheerio';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const ALGORITHMS_DIR = resolve(PROJECT_ROOT, 'src/data/algorithms');

mkdirSync(ALGORITHMS_DIR, { recursive: true });

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

// ---------------------------------------------------------------------------
// Set definitions
// ---------------------------------------------------------------------------

interface SetDefinition {
  name: string;        // Display name (e.g., "OLL", "PLL", "CLL")
  puzzle: string;      // "3x3", "2x2", "4x4", etc.
  path: string;        // URL path: /a/{path}  (e.g., "3x3/OLL")
  category: string;
  description: string;
  fileId?: string;     // Override the output filename (sanitized name used otherwise)
  /** For sets that are sub-pages (like OLLCP1..57, VLSUB, etc.) */
  subPages?: string[];
  /**
   * Case link pattern - helps extract links from the main page.
   * The prefix that appears in individual case hrefs, e.g., "OLL_" for /a/3x3/OLL/OLL_1
   */
  caseLinkPattern?: string;
  /** Max cases to fetch individually (to avoid hammering huge sets) */
  maxCases?: number;
}

const SETS: SetDefinition[] = [
  // ===== 3x3 last-layer =====
  {
    name: 'OLL', puzzle: '3x3', path: '3x3/OLL', category: 'last-layer',
    description: 'Orientation of the Last Layer - 57 cases',
    caseLinkPattern: 'OLL/OLL_',
  },
  {
    name: 'PLL', puzzle: '3x3', path: '3x3/PLL', category: 'last-layer',
    description: 'Permutation of the Last Layer - 21 cases',
    caseLinkPattern: 'PLL/PLL_',
  },
  {
    name: 'F2L', puzzle: '3x3', path: '3x3/F2L', category: 'f2l',
    description: 'First Two Layers - 41 cases',
    caseLinkPattern: 'F2L/F2L_',
  },
  {
    name: 'COLL', puzzle: '3x3', path: '3x3/COLL', category: 'last-layer',
    description: 'Corners of the Last Layer with edges oriented - 40 cases',
    caseLinkPattern: 'COLL/',
  },
  {
    name: 'CMLL', puzzle: '3x3', path: '3x3/CMLL', category: 'last-layer',
    description: 'Corners of the Last Layer (Roux) - 42 cases',
    caseLinkPattern: 'CMLL/',
  },
  {
    name: 'WV', puzzle: '3x3', path: '3x3/WV', category: 'last-layer',
    description: 'Winter Variation - 27 cases',
    caseLinkPattern: 'WV/WV_',
  },
  {
    name: 'SV', puzzle: '3x3', path: '3x3/SV', category: 'last-layer',
    description: 'Summer Variation - 27 cases',
    caseLinkPattern: 'SV/SV_',
  },
  {
    name: 'OLLCP', puzzle: '3x3', path: '3x3/OLLCP', category: 'last-layer',
    description: 'OLL with Corner Permutation - up to 331 cases across 57 sub-pages',
    // OLLCP is organized as sub-pages: OLLCP1 .. OLLCP57
    subPages: Array.from({ length: 57 }, (_, i) => `3x3/OLLCP${i + 1}`),
    maxCases: 400,
  },
  {
    name: 'VLS', puzzle: '3x3', path: '3x3/VLS', category: 'last-layer',
    description: 'Valk Last Slot - 216 cases across 7 sub-pages',
    // VLS sub-pages: VLSUB, VLSUBUL, VLSUF, VLSUFUB, VLSUFUL, VLSUL, VLSNoEdges
    subPages: ['3x3/VLSUB', '3x3/VLSUBUL', '3x3/VLSUF', '3x3/VLSUFUB', '3x3/VLSUFUL', '3x3/VLSUL', '3x3/VLSNoEdges'],
    maxCases: 250,
  },
  {
    name: '1LLL', puzzle: '3x3', path: '3x3/1LLL', category: 'last-layer',
    description: 'One-Look Last Layer - 57 cases',
    maxCases: 60,
  },

  // ZBLL subsets
  {
    name: 'ZBLL U', puzzle: '3x3', path: '3x3/ZBLLU', category: 'last-layer',
    description: 'ZBLL U subset - 72 cases', fileId: 'zbll-u',
    caseLinkPattern: 'ZBLLU/ZBLL_U_',
  },
  {
    name: 'ZBLL T', puzzle: '3x3', path: '3x3/ZBLLT', category: 'last-layer',
    description: 'ZBLL T subset - 72 cases', fileId: 'zbll-t',
    caseLinkPattern: 'ZBLLT/ZBLL_T_',
  },
  {
    name: 'ZBLL L', puzzle: '3x3', path: '3x3/ZBLLL', category: 'last-layer',
    description: 'ZBLL L subset - 72 cases', fileId: 'zbll-l',
    caseLinkPattern: 'ZBLLL/ZBLL_L_',
  },
  {
    name: 'ZBLL H', puzzle: '3x3', path: '3x3/ZBLLH', category: 'last-layer',
    description: 'ZBLL H subset - 40 cases', fileId: 'zbll-h',
    caseLinkPattern: 'ZBLLH/ZBLL_H_',
  },
  {
    name: 'ZBLL Pi', puzzle: '3x3', path: '3x3/ZBLLPi', category: 'last-layer',
    description: 'ZBLL Pi subset - 72 cases', fileId: 'zbll-pi',
    caseLinkPattern: 'ZBLLPi/ZBLL_Pi_',
  },
  {
    name: 'ZBLL S', puzzle: '3x3', path: '3x3/ZBLLS', category: 'last-layer',
    description: 'ZBLL S subset - 72 cases', fileId: 'zbll-s',
    caseLinkPattern: 'ZBLLS/ZBLL_S_',
  },
  {
    name: 'ZBLL AS', puzzle: '3x3', path: '3x3/ZBLLAS', category: 'last-layer',
    description: 'ZBLL AS (anti-sune) subset - 72 cases', fileId: 'zbll-as',
    caseLinkPattern: 'ZBLLAS/ZBLL_AS_',
  },

  // ===== 2x2 =====
  {
    name: 'CLL', puzzle: '2x2', path: '2x2/CLL', category: 'last-layer',
    description: 'Corners of the Last Layer (2x2) - 40 cases',
    caseLinkPattern: 'CLL/',
  },
  {
    name: 'EG-1', puzzle: '2x2', path: '2x2/EG1', category: 'last-layer',
    description: 'EG-1: CLL with one bar on bottom - 29 cases', fileId: 'eg1',
    caseLinkPattern: 'EG1/',
  },
  {
    name: 'EG-2', puzzle: '2x2', path: '2x2/EG2', category: 'last-layer',
    description: 'EG-2: CLL with opposite bar on bottom - 29 cases', fileId: 'eg-2',
    caseLinkPattern: 'EG2/',
  },
  {
    name: '2x2 OLL', puzzle: '2x2', path: '2x2/OrtegaOLL', category: 'last-layer',
    description: 'Orientation of the Last Layer (2x2 Ortega) - 7 cases', fileId: 'oll-2x2',
  },
  {
    name: 'PBL', puzzle: '2x2', path: '2x2/OrtegaPBL', category: 'last-layer',
    description: 'Permutation of Both Layers (2x2 Ortega) - 6 cases',
  },

  // ===== 4x4 =====
  {
    name: 'OLL Parity', puzzle: '4x4', path: '4x4/OLLParity', category: 'parity',
    description: 'OLL Parity algorithms for 4x4', fileId: 'oll-parity',
  },
  {
    name: 'PLL Parity', puzzle: '4x4', path: '4x4/PLLParity', category: 'parity',
    description: 'PLL Parity algorithms for 4x4', fileId: 'pll-parity',
  },

  // ===== Other puzzles =====
  {
    name: 'L4E', puzzle: 'pyraminx', path: 'pyra/L4E', category: 'last-layer',
    description: 'Last 4 Edges for Pyraminx',
    caseLinkPattern: 'L4E/',
  },
  {
    name: 'Mega OLL', puzzle: 'megaminx', path: 'mega/MegaminxOLL', category: 'last-layer',
    description: 'OLL algorithms for Megaminx', fileId: 'mega-oll',
  },

  // ===== 3x3 additional sets =====
  {
    name: 'Anti PLL', puzzle: '3x3', path: '3x3/AntiPLL', category: 'last-layer',
    description: 'Anti PLL - algorithms to avoid PLL skip situations', fileId: 'anti-pll',
    caseLinkPattern: 'AntiPLL/',
  },
  {
    name: 'SBLS', puzzle: '3x3', path: '3x3/SBLS', category: 'f2l',
    description: 'Summer/Bacon Last Slot - insert last F2L pair with OLL influence',
    caseLinkPattern: 'SBLS/',
  },
  {
    name: 'ELL', puzzle: '3x3', path: '3x3/ELL', category: 'last-layer',
    description: 'Edge orientation and permutation of the Last Layer - used in Roux',
    caseLinkPattern: 'ELL/',
  },
  {
    name: 'CSP', puzzle: '3x3', path: '3x3/CSP', category: 'last-layer',
    description: 'Corner Swap + Permutation - combine corner and edge permutation',
    caseLinkPattern: 'CSP/',
  },

  // ===== Pyraminx =====
  {
    name: 'L3E', puzzle: 'pyraminx', path: 'pyra/L3E', category: 'last-layer',
    description: 'Last 3 Edges for Pyraminx - advanced',
    caseLinkPattern: 'L3E/',
  },

  // ===== Skewb =====
  {
    name: 'Sarah', puzzle: 'skewb', path: 'Skewb/Sarah', category: 'last-layer',
    description: 'Sarah beginner method algorithms for Skewb',
    caseLinkPattern: 'Sarah/',
  },
  {
    name: "Sarah's Advanced", puzzle: 'skewb', path: 'Skewb/SarahsAdvanced', category: 'last-layer',
    description: 'Advanced Sarah method algorithms for Skewb', fileId: 'sarahs-advanced',
    caseLinkPattern: 'SarahsAdvanced/',
  },

  // ===== Square-1 =====
  {
    name: 'SQ1 CS', puzzle: 'square-1', path: 'SQ1/SQ1CS', category: 'cubeshape',
    description: 'Square-1 Cube Shape algorithms', fileId: 'sq1-cs',
  },
  {
    name: 'SQ1 CO', puzzle: 'square-1', path: 'SQ1/SQ1CO', category: 'last-layer',
    description: 'Square-1 Corner Orientation', fileId: 'sq1-co',
  },
  {
    name: 'SQ1 EO', puzzle: 'square-1', path: 'SQ1/SQ1EO', category: 'last-layer',
    description: 'Square-1 Edge Orientation', fileId: 'sq1-eo',
  },
  {
    name: 'SQ1 CP', puzzle: 'square-1', path: 'SQ1/SQ1CP', category: 'last-layer',
    description: 'Square-1 Corner Permutation', fileId: 'sq1-cp',
  },
  {
    name: 'SQ1 EP', puzzle: 'square-1', path: 'SQ1/SQ1EP', category: 'last-layer',
    description: 'Square-1 Edge Permutation', fileId: 'sq1-ep',
  },
  {
    name: 'SQ1 Parity', puzzle: 'square-1', path: 'SQ1/SQ1Parity', category: 'parity',
    description: 'Square-1 Parity algorithms', fileId: 'sq1-parity',
  },

  // ===== 3x3 additional sets (batch 2) =====
  {
    name: 'CLS', puzzle: '3x3', path: '3x3/CLS', category: 'f2l',
    description: 'Corners of Last Slot - orient corners while inserting last F2L pair',
    caseLinkPattern: 'CLS/',
  },
  {
    name: 'FRUF', puzzle: '3x3', path: '3x3/FRUF', category: 'last-layer',
    description: 'F R U F\' last-layer algorithms - 42 cases', fileId: 'fruf',
    caseLinkPattern: 'FRUF/',
  },
  {
    name: 'EO4A', puzzle: '3x3', path: '3x3/EO4A', category: 'last-layer',
    description: 'Edge Orientation 4 Algorithms - simplified EO subset', fileId: 'eo4a',
    caseLinkPattern: 'EO4A/',
  },

  // ===== 5x5 =====
  {
    name: '5x5 L2E', puzzle: '5x5', path: '5x5/L2E', category: 'last-layer',
    description: 'Last 2 Edges algorithms for 5x5', fileId: '5x5-l2e',
  },
  {
    name: '5x5 L2C', puzzle: '5x5', path: '5x5/L2C', category: 'last-layer',
    description: 'Last 2 Centres algorithms for 5x5', fileId: '5x5-l2c',
  },

  // ===== 6x6 =====
  {
    name: '6x6 L2E', puzzle: '6x6', path: '6x6/6x6L2E', category: 'last-layer',
    description: 'Last 2 Edges algorithms for 6x6', fileId: '6x6-l2e',
  },
  {
    name: '6x6 L2C', puzzle: '6x6', path: '6x6/6x6L2C', category: 'last-layer',
    description: 'Last 2 Centres algorithms for 6x6', fileId: '6x6-l2c',
  },

  // ===== Square-1 additional =====
  {
    name: 'SQ1 Lin PLL', puzzle: 'square-1', path: 'SQ1/SQ1LinPLL', category: 'last-layer',
    description: 'Square-1 Lin PLL algorithms - 21 cases', fileId: 'sq1-lin-pll',
  },

  // ===== Megaminx additional =====
  {
    name: 'Mega PLL', puzzle: 'megaminx', path: 'Megaminx/MegaminxPLL', category: 'last-layer',
    description: 'PLL algorithms for Megaminx', fileId: 'mega-pll',
  },
  {
    name: 'Mega CO', puzzle: 'megaminx', path: 'Megaminx/MegaminxCO', category: 'last-layer',
    description: 'Corner Orientation for Megaminx', fileId: 'mega-co',
  },
  {
    name: 'Mega CP', puzzle: 'megaminx', path: 'Megaminx/MegaminxCP', category: 'last-layer',
    description: 'Corner Permutation for Megaminx', fileId: 'mega-cp',
  },
  {
    name: 'Mega EO', puzzle: 'megaminx', path: 'Megaminx/MegaminxEO', category: 'last-layer',
    description: 'Edge Orientation for Megaminx', fileId: 'mega-eo',
  },
  {
    name: 'Mega EP', puzzle: 'megaminx', path: 'Megaminx/MegaminxEP', category: 'last-layer',
    description: 'Edge Permutation for Megaminx', fileId: 'mega-ep',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const CASE_PAGE_DELAY_MS = 500;
const SET_DELAY_MS = 1000;

function countMoves(notation: string): number {
  if (!notation || !notation.trim()) return 0;
  // Remove parentheses and brackets
  const cleaned = notation.replace(/[()[\]]/g, '');
  // Split on whitespace and count non-empty tokens
  const moves = cleaned.trim().split(/\s+/).filter((m) => m.length > 0);
  return moves.length;
}

function sanitizeId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Check how many algorithms an existing JSON file has, if it exists.
 */
function getExistingAlgorithmCount(fileId: string): number {
  const filepath = resolve(ALGORITHMS_DIR, `${fileId}.json`);
  if (!existsSync(filepath)) return 0;
  try {
    const raw = readFileSync(filepath, 'utf-8');
    const data = JSON.parse(raw) as AlgorithmSet;
    return data.algorithms?.length ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Fetch a single page (with retry)
// ---------------------------------------------------------------------------

async function fetchPage(url: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`      Retry attempt ${attempt} for ${url}`);
        await delay(1500 * attempt);
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!response.ok) {
        console.error(`      HTTP ${response.status} for ${url}`);
        if (response.status === 429 || response.status >= 500) continue;
        return null;
      }
      const html = await response.text();
      // Check for "Category not found" error in the page
      if (html.includes('Category') && html.includes('not found')) {
        const errorMatch = html.match(/Category\s*\[([^\]]+)\]\s*not found/);
        if (errorMatch) {
          console.error(`      Page error: Category [${errorMatch[1]}] not found`);
          return null;
        }
      }
      return html;
    } catch (err) {
      console.error(`      Fetch error for ${url}:`, (err as Error).message);
      if (attempt === retries) return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Text extraction: strip HTML to get all visible text
// ---------------------------------------------------------------------------

function extractText(html: string): string {
  const $ = cheerio.load(html);
  // Remove script and style elements
  $('script, style, noscript').remove();
  return $('body').text();
}

// ---------------------------------------------------------------------------
// Extract case links from a set page
// ---------------------------------------------------------------------------

function extractCaseLinks(html: string, setDef: SetDefinition): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    // Normalize URL (handles absolute, root-relative, and relative hrefs)
    let fullUrl: string;
    if (href.startsWith('http')) {
      fullUrl = href;
    } else if (href.startsWith('/')) {
      fullUrl = `https://speedcubedb.com${href}`;
    } else {
      fullUrl = `https://speedcubedb.com/${href}`;
    }
    // Ensure consistent format
    fullUrl = fullUrl.replace(/([^:])\/\//g, '$1/');

    // Filter: must be under /a/ and be deeper than the set page itself
    // e.g., for path "3x3/OLL", we want links like /a/3x3/OLL/OLL_1
    const setPathSegment = `/a/${setDef.path}`;
    if (!fullUrl.includes('/a/')) return;

    // If we have a caseLinkPattern, use it for precise matching
    if (setDef.caseLinkPattern && fullUrl.includes(setDef.caseLinkPattern)) {
      if (!seen.has(fullUrl)) {
        seen.add(fullUrl);
        links.push(fullUrl);
      }
      return;
    }

    // General fallback: link must be under the set path and have more segments
    if (fullUrl.includes(setPathSegment + '/') || fullUrl.includes(setPathSegment.replace(/ /g, '%20') + '/')) {
      const afterSet = fullUrl.split(setPathSegment)[1] || '';
      // Must have something after the set path (the case identifier)
      if (afterSet.length > 1 && afterSet !== '/') {
        if (!seen.has(fullUrl)) {
          seen.add(fullUrl);
          links.push(fullUrl);
        }
      }
    }
  });

  return links;
}

// ---------------------------------------------------------------------------
// Parse text content of an individual case page
// ---------------------------------------------------------------------------

interface ParsedAlgorithm {
  notation: string;
  votes: number;
  moveCount: number;
}

interface ParsedCase {
  name: string;
  subset: string;
  setup: string;
  algorithms: ParsedAlgorithm[];
}

/**
 * Determine if a string looks like cube algorithm notation.
 * Must contain typical cube moves: R, U, L, D, F, B (with optional ', 2, w modifiers)
 */
function looksLikeAlgorithm(s: string): boolean {
  if (!s || s.length < 2 || s.length > 200) return false;
  // SQ1 notation: uses / and number pairs like "1,0 / 3,0 / -1,-1"
  if (looksLikeSQ1(s)) return true;
  // Must contain at least 2 move-like tokens
  const movePattern = /[RULDFBMESrludfbxyz](?:w)?[2']?/g;
  const matches = s.match(movePattern);
  if (!matches || matches.length < 2) return false;
  // Should not contain too many non-move characters
  const cleaned = s.replace(/[RULDFBMESrludfbxyz'2w\s()[\]]/gi, '');
  // Allow some non-move chars (for wide moves like Rw, 2R etc.) but not too many
  return cleaned.length <= s.length * 0.3;
}

function looksLikeSQ1(s: string): boolean {
  // SQ1 notation: slashes separating number pairs like "1,0 / 3,0 / -1,-1 / -2,1"
  // Must have at least one "/" and contain digit-comma-digit patterns
  if (!s.includes('/')) return false;
  const pairPattern = /-?\d+\s*,\s*-?\d+/g;
  const pairs = s.match(pairPattern);
  return !!pairs && pairs.length >= 1;
}

/**
 * Parse a speedcubedb page using the actual DOM structure.
 *
 * SpeedCubeDB uses:
 *   <div class="row singlealgorithm g-0" data-alg="CLS FDR00" data-subgroup="Trapped Corner">
 *     <h2><a ...>CLS FDR00</a></h2>
 *     <div class="setup-case">setup: ...</div>
 *     <div class="formatted-alg">R U2 R' ...</div>   (one per algorithm variant)
 *     <div class="alg-details">Community Votes: N  Movecount: N ETM</div>
 *   </div>
 */
function parseTextContent(html: string, setDef: SetDefinition): ParsedCase[] {
  const $ = cheerio.load(html);
  const cases: ParsedCase[] = [];

  // --- Strategy 0 (primary): Parse div.singlealgorithm containers ---
  const algContainers = $('div.singlealgorithm');

  if (algContainers.length > 0) {
    algContainers.each((_, el) => {
      const $el = $(el);

      // Case name from data-alg attribute or from h2 > a text
      let caseName = $el.attr('data-alg') || '';
      if (!caseName) {
        caseName = $el.find('h2 a').first().text().trim();
      }
      if (!caseName) return;

      // Subset from data-subgroup attribute
      const subset = $el.attr('data-subgroup') || '';

      // Setup from .setup-case
      let setup = '';
      const setupEl = $el.find('.setup-case');
      if (setupEl.length > 0) {
        setup = setupEl.text().trim().replace(/^setup:\s*/i, '');
      }

      // Algorithms from .formatted-alg inside list-group-items
      const algs: ParsedAlgorithm[] = [];
      $el.find('li.list-group-item').each((_, li) => {
        const $li = $(li);
        // Primary: .formatted-alg text
        let notation = $li.find('.formatted-alg').text().trim();
        // Fallback: data-alg attribute on cubedb element
        if (!notation) {
          const cubedbEl = $li.find('[data-alg]');
          if (cubedbEl.length > 0) {
            notation = cubedbEl.attr('data-alg') || '';
          }
        }
        if (!notation) return;

        // Get votes and movecount from .alg-details
        let votes = 0;
        let moveCount = 0;
        const details = $li.find('.alg-details');
        if (details.length > 0) {
          const detailText = details.text();
          const votesMatch = detailText.match(/Community\s+Votes:\s*(-?\d+)/i);
          if (votesMatch) votes = parseInt(votesMatch[1], 10);
          const movesMatch = detailText.match(/(\d+)\s*ETM/i);
          if (movesMatch) moveCount = parseInt(movesMatch[1], 10);
        }

        algs.push({
          notation,
          votes,
          moveCount: moveCount || countMoves(notation),
        });
      });

      // Fallback: if no list-group-items, look for .formatted-alg directly
      if (algs.length === 0) {
        $el.find('.formatted-alg').each((_, fEl) => {
          const notation = $(fEl).text().trim();
          if (notation) {
            algs.push({ notation, votes: 0, moveCount: countMoves(notation) });
          }
        });
      }

      if (caseName && algs.length > 0) {
        cases.push({ name: caseName, subset, setup, algorithms: algs });
      }
    });

    if (cases.length > 0) return cases;
  }

  // --- Strategy 1 (legacy): Parse via h3 elements ---
  const h3Elements = $('h3');

  for (let idx = 0; idx < h3Elements.length; idx++) {
    const h3 = $(h3Elements[idx]);
    const link = h3.find('a');

    let caseName = '';
    if (link.length > 0) {
      caseName = link.text().trim();
    } else {
      caseName = h3.text().trim();
    }
    caseName = caseName.replace(/^\[|\]$/g, '').trim();
    if (!caseName || caseName === 'Filter:') continue;

    let subset = '';
    const nextP = h3.next('p');
    if (nextP.length > 0) {
      const pText = nextP.text().trim();
      const parts = pText.split(' - ').map((s) => s.trim());
      if (parts.length >= 3) {
        subset = parts.slice(2).join(' - ');
      } else if (parts.length === 2) {
        subset = parts[1];
      }
    }

    let setup = '';
    const sectionTexts: string[] = [];
    let sibling = h3.next();
    while (sibling.length > 0 && !sibling.is('h3')) {
      sectionTexts.push(sibling.text().trim());
      sibling = sibling.next();
    }
    const sectionText = sectionTexts.join('\n');

    const setupMatch = sectionText.match(/Setup:\s*([^\n]+)/i);
    if (setupMatch) {
      setup = setupMatch[1].trim();
    }

    const algs = parseAlgorithmsFromText(sectionText);
    if (algs.length > 0) {
      cases.push({ name: caseName, subset, setup, algorithms: algs });
    }
  }

  // --- Strategy 2: If nothing found, try full text parsing ---
  if (cases.length === 0) {
    const fullText = extractText(html);
    const textCases = parseFullText(fullText, setDef);
    cases.push(...textCases);
  }

  return cases;
}

/**
 * Parse algorithm entries from a section of text content.
 * Looks for patterns like:
 *   "R U2 R2 F R F' U2 R' F R F'"  (algorithm text)
 *   "Community Votes: 140"
 *   "Movecount: 11 ETM"
 *
 * Or combined patterns:
 *   "R U2 R2 F R F' U2 R' F R F' | Votes: 140 | Moves: 11 ETM"
 */
function parseAlgorithmsFromText(text: string): ParsedAlgorithm[] {
  const algs: ParsedAlgorithm[] = [];

  // Split into lines and process
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Pattern 1: Combined format "ALG | Votes: N | Moves: N ETM"
  for (const line of lines) {
    const combined = line.match(/^(.+?)\s*\|\s*Votes:\s*(\d+)\s*\|\s*Moves:\s*(\d+)/);
    if (combined) {
      const notation = combined[1].trim();
      if (looksLikeAlgorithm(notation)) {
        algs.push({
          notation,
          votes: parseInt(combined[2], 10),
          moveCount: parseInt(combined[3], 10),
        });
      }
    }
  }
  if (algs.length > 0) return algs;

  // Pattern 2: Look for "Community Votes: N" near algorithm-like text
  // Parse in chunks: an algorithm line followed by metadata lines
  let currentAlg: string | null = null;
  let currentVotes = 0;
  let currentMoves = 0;

  for (const line of lines) {
    // Check for votes
    const votesMatch = line.match(/Community\s+Votes:\s*(\d+)/i);
    if (votesMatch) {
      currentVotes = parseInt(votesMatch[1], 10);
      // If we had a pending algorithm, finalize it
      if (currentAlg) {
        algs.push({
          notation: currentAlg,
          votes: currentVotes,
          moveCount: currentMoves || countMoves(currentAlg),
        });
        currentAlg = null;
        currentVotes = 0;
        currentMoves = 0;
      }
      continue;
    }

    // Check for movecount
    const moveMatch = line.match(/Movecount:\s*(\d+)\s*ETM/i);
    if (moveMatch) {
      currentMoves = parseInt(moveMatch[1], 10);
      continue;
    }

    // Check for face moves line (skip it)
    if (line.match(/Face\s+Moves:/i) || line.match(/^\d+GEN/i)) continue;

    // Check if it looks like an algorithm
    if (looksLikeAlgorithm(line)) {
      // If we had a pending algorithm without votes, save it
      if (currentAlg) {
        algs.push({
          notation: currentAlg,
          votes: currentVotes,
          moveCount: currentMoves || countMoves(currentAlg),
        });
      }
      currentAlg = line;
      currentVotes = 0;
      currentMoves = 0;
    }
  }

  // Don't forget the last one
  if (currentAlg) {
    algs.push({
      notation: currentAlg,
      votes: currentVotes,
      moveCount: currentMoves || countMoves(currentAlg),
    });
  }

  return algs;
}

/**
 * Fallback full-text parser: tries to parse the entire page text
 * to extract cases when DOM-based parsing fails.
 */
function parseFullText(text: string, _setDef: SetDefinition): ParsedCase[] {
  const cases: ParsedCase[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Look for lines that could be case names followed by algorithm data
  let currentCase: ParsedCase | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect case name patterns: "OLL 1", "PLL Aa", "F2L 5", "CLL AS 1", "ZBLL U 1", etc.
    // These are typically short lines with the set name and a case identifier
    const caseNameMatch = line.match(
      /^(OLL|PLL|F2L|COLL|CMLL|WV|SV|OLLCP\d*|VLS|1LLL|ZBLL\s*\w+|CLL|EG[12]?|L4E|Mega(?:minx)?\s*OLL|OLL\s*Parity|PLL\s*Parity|Ortega\s*OLL|Ortega\s*PBL|PBL)\s+(.+)$/i
    );
    if (caseNameMatch) {
      if (currentCase && currentCase.algorithms.length > 0) {
        cases.push(currentCase);
      }
      currentCase = {
        name: line,
        subset: '',
        setup: '',
        algorithms: [],
      };
      continue;
    }

    // Detect subset: "3x3 - OLL - Dot Case"
    if (currentCase) {
      const subsetMatch = line.match(/^\d+x\d+\s*-\s*.+\s*-\s*(.+)$/);
      if (subsetMatch) {
        currentCase.subset = subsetMatch[1].trim();
        continue;
      }
    }

    // Detect setup
    if (currentCase) {
      const setupMatch = line.match(/^Setup:\s*(.+)$/i);
      if (setupMatch) {
        currentCase.setup = setupMatch[1].trim();
        continue;
      }
    }

    // Detect algorithm + votes + moves on same line
    if (currentCase) {
      const algWithMeta = line.match(/^(.+?)\s*\|\s*(?:Community\s+)?Votes:\s*(\d+)\s*\|\s*(?:Moves|Movecount):\s*(\d+)/i);
      if (algWithMeta && looksLikeAlgorithm(algWithMeta[1].trim())) {
        currentCase.algorithms.push({
          notation: algWithMeta[1].trim(),
          votes: parseInt(algWithMeta[2], 10),
          moveCount: parseInt(algWithMeta[3], 10),
        });
        continue;
      }

      // Standalone algorithm line
      if (looksLikeAlgorithm(line)) {
        // Peek ahead for votes/moves
        let votes = 0;
        let moveCount = 0;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const vMatch = lines[j].match(/Community\s+Votes:\s*(\d+)/i);
          if (vMatch) votes = parseInt(vMatch[1], 10);
          const mMatch = lines[j].match(/Movecount:\s*(\d+)\s*ETM/i);
          if (mMatch) moveCount = parseInt(mMatch[1], 10);
          // Stop if we hit another algorithm-like line or case name
          if (looksLikeAlgorithm(lines[j]) && j > i + 1) break;
        }
        currentCase.algorithms.push({
          notation: line,
          votes,
          moveCount: moveCount || countMoves(line),
        });
      }
    }
  }

  // Push final case
  if (currentCase && currentCase.algorithms.length > 0) {
    cases.push(currentCase);
  }

  return cases;
}

// ---------------------------------------------------------------------------
// Parse individual case page via cheerio DOM traversal
// ---------------------------------------------------------------------------

/**
 * Parse a single case page. These pages have a more predictable structure:
 * - Page title or h3 with the case name
 * - Setup info
 * - Multiple algorithms listed with h4 tags or in the text
 * - Each algorithm has votes and movecount metadata
 */
function parseCasePage(html: string, setDef: SetDefinition): ParsedCase | null {
  const $ = cheerio.load(html);

  // --- Primary: Use div.singlealgorithm (same structure as set pages) ---
  const algContainers = $('div.singlealgorithm');
  if (algContainers.length > 0) {
    // Individual case page usually has a single singlealgorithm container
    const $el = $(algContainers[0]);
    const caseName = $el.attr('data-alg') || $el.find('h2 a').first().text().trim();
    const subset = $el.attr('data-subgroup') || '';

    let setup = '';
    const setupEl = $el.find('.setup-case');
    if (setupEl.length > 0) {
      setup = setupEl.text().trim().replace(/^setup:\s*/i, '');
    }

    const algs: ParsedAlgorithm[] = [];
    $el.find('li.list-group-item').each((_, li) => {
      const $li = $(li);
      let notation = $li.find('.formatted-alg').text().trim();
      if (!notation) {
        const cubedbEl = $li.find('[data-alg]');
        if (cubedbEl.length > 0) notation = cubedbEl.attr('data-alg') || '';
      }
      if (!notation) return;

      let votes = 0;
      let moveCount = 0;
      const details = $li.find('.alg-details');
      if (details.length > 0) {
        const detailText = details.text();
        const votesMatch = detailText.match(/Community\s+Votes:\s*(-?\d+)/i);
        if (votesMatch) votes = parseInt(votesMatch[1], 10);
        const movesMatch = detailText.match(/(\d+)\s*ETM/i);
        if (movesMatch) moveCount = parseInt(movesMatch[1], 10);
      }

      algs.push({ notation, votes, moveCount: moveCount || countMoves(notation) });
    });

    if (algs.length === 0) {
      $el.find('.formatted-alg').each((_, fEl) => {
        const notation = $(fEl).text().trim();
        if (notation) algs.push({ notation, votes: 0, moveCount: countMoves(notation) });
      });
    }

    if (caseName) return { name: caseName, subset, setup, algorithms: algs };
  }

  // --- Fallback: Legacy parsing ---
  $('script, style, noscript').remove();

  let caseName = '';
  let subset = '';
  let setup = '';
  const algs: ParsedAlgorithm[] = [];

  // Try h2 first, then h3, then page title
  const h2s = $('h2');
  h2s.each((_, el) => {
    const h2 = $(el);
    const link = h2.find('a');
    if (link.length > 0 && !caseName) {
      caseName = link.text().trim().replace(/^\[|\]$/g, '').trim();
    }
  });

  if (!caseName) {
    const h3s = $('h3');
    h3s.each((_, el) => {
      const txt = $(el).text().trim().replace(/^\[|\]$/g, '').trim();
      if (txt && txt.length < 60 && txt !== 'Filter:' && !caseName) caseName = txt;
    });
  }

  if (!caseName) {
    const title = $('title').text().trim();
    const titleMatch = title.match(/^(.+?)\s*[-|]/);
    if (titleMatch) caseName = titleMatch[1].trim();
    else caseName = title;
  }

  if (!caseName) return null;

  // Subset
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    const parts = text.split(' - ').map((s) => s.trim());
    if (parts.length >= 3 && !subset) subset = parts.slice(2).join(' - ');
  });

  // Setup + algorithms from body text
  const bodyText = $('body').text();
  const setupMatch = bodyText.match(/Setup:\s*([^\n]+)/i);
  if (setupMatch) {
    setup = setupMatch[1].trim()
      .replace(/Community\s+Votes.*$/i, '')
      .replace(/Movecount.*$/i, '')
      .trim();
  }

  const textAlgs = parseAlgorithmsFromText(bodyText);
  algs.push(...textAlgs);

  if (!caseName && algs.length === 0) return null;
  return { name: caseName, subset, setup, algorithms: algs };
}

// ---------------------------------------------------------------------------
// Convert ParsedCase[] to Algorithm[]
// ---------------------------------------------------------------------------

function casesToAlgorithms(cases: ParsedCase[], setDef: SetDefinition): Algorithm[] {
  const algorithms: Algorithm[] = [];
  const seenIds = new Set<string>();

  for (const c of cases) {
    if (c.algorithms.length === 0) continue;

    // Sort algorithms by votes (descending) so the most popular is primary
    const sortedAlgs = [...c.algorithms].sort((a, b) => b.votes - a.votes);
    const primary = sortedAlgs[0];
    const alternatives: AlgorithmAlternative[] = sortedAlgs.slice(1).map((alt) => ({
      notation: alt.notation,
      moveCount: alt.moveCount,
      votes: alt.votes || undefined,
    }));

    let id = sanitizeId(`${setDef.name}-${c.name}`);
    // Ensure unique IDs
    if (seenIds.has(id)) {
      let suffix = 2;
      while (seenIds.has(`${id}-${suffix}`)) suffix++;
      id = `${id}-${suffix}`;
    }
    seenIds.add(id);

    algorithms.push({
      id,
      name: c.name,
      set: setDef.name,
      subset: c.subset,
      puzzle: setDef.puzzle,
      notation: primary.notation,
      alternatives,
      moveCount: primary.moveCount,
      setup: c.setup,
      votes: primary.votes,
      source: 'speedcubedb',
    });
  }

  return algorithms;
}

// ---------------------------------------------------------------------------
// Scrape a single set page (main page approach - parse directly)
// ---------------------------------------------------------------------------

async function scrapeMainPage(
  setDef: SetDefinition
): Promise<{ cases: ParsedCase[]; caseLinks: string[] }> {
  const url = `https://speedcubedb.com/a/${setDef.path}`;
  console.log(`    Fetching main page: ${url}`);

  const html = await fetchPage(url);
  if (!html) {
    console.log(`    FAILED to fetch main page`);
    return { cases: [], caseLinks: [] };
  }

  console.log(`    Received ${html.length} bytes`);

  // Parse cases directly from the main page
  const cases = parseTextContent(html, setDef);
  const casesWithAlgs = cases.filter((c) => c.algorithms.length > 0);
  console.log(`    Parsed ${cases.length} cases from main page (${casesWithAlgs.length} with algorithms)`);

  // Extract individual case links for follow-up
  const caseLinks = extractCaseLinks(html, setDef);
  console.log(`    Found ${caseLinks.length} individual case links`);

  return { cases, caseLinks };
}

// ---------------------------------------------------------------------------
// Scrape individual case pages
// ---------------------------------------------------------------------------

async function scrapeIndividualCases(
  caseUrls: string[],
  setDef: SetDefinition,
  maxCases: number
): Promise<ParsedCase[]> {
  const allCases: ParsedCase[] = [];
  const toFetch = caseUrls.slice(0, maxCases);

  console.log(`    Fetching ${toFetch.length} individual case pages (max ${maxCases})...`);

  for (let i = 0; i < toFetch.length; i++) {
    const url = toFetch[i];
    const shortUrl = url.replace('https://speedcubedb.com', '');
    console.log(`      [${i + 1}/${toFetch.length}] ${shortUrl}`);

    await delay(CASE_PAGE_DELAY_MS);
    const html = await fetchPage(url);
    if (!html) {
      console.log(`        FAILED`);
      continue;
    }

    const parsed = parseCasePage(html, setDef);
    if (parsed && (parsed.algorithms.length > 0 || parsed.name)) {
      allCases.push(parsed);
      const algCount = parsed.algorithms.length;
      const topVotes = parsed.algorithms.length > 0
        ? Math.max(...parsed.algorithms.map((a) => a.votes))
        : 0;
      console.log(`        OK: "${parsed.name}" - ${algCount} algs, top votes: ${topVotes}`);
    } else {
      console.log(`        No data parsed from case page`);
    }
  }

  return allCases;
}

// ---------------------------------------------------------------------------
// Scrape sub-pages (for sets like OLLCP, VLS that are split)
// ---------------------------------------------------------------------------

async function scrapeSubPages(
  subPaths: string[],
  setDef: SetDefinition,
  maxCases: number
): Promise<ParsedCase[]> {
  const allCases: ParsedCase[] = [];
  let totalFetched = 0;

  console.log(`    Set has ${subPaths.length} sub-pages`);

  for (let sp = 0; sp < subPaths.length; sp++) {
    if (totalFetched >= maxCases) {
      console.log(`    Reached max cases limit (${maxCases}), stopping sub-page fetches`);
      break;
    }

    const subUrl = `https://speedcubedb.com/a/${subPaths[sp]}`;
    const shortUrl = subUrl.replace('https://speedcubedb.com', '');
    console.log(`    Sub-page [${sp + 1}/${subPaths.length}]: ${shortUrl}`);

    await delay(SET_DELAY_MS);
    const html = await fetchPage(subUrl);
    if (!html) {
      console.log(`      FAILED to fetch sub-page`);
      continue;
    }

    // Parse cases from this sub-page
    const subCases = parseTextContent(html, setDef);
    const casesWithAlgs = subCases.filter((c) => c.algorithms.length > 0);
    console.log(`      Found ${subCases.length} cases (${casesWithAlgs.length} with algorithms)`);

    // If the sub-page itself has cases with algorithms, use them
    if (casesWithAlgs.length > 0) {
      allCases.push(...casesWithAlgs);
      totalFetched += casesWithAlgs.length;
    } else {
      // Try extracting individual case links from this sub-page
      const subCaseLinks = extractCaseLinks(html, {
        ...setDef,
        path: subPaths[sp],
      });
      console.log(`      Found ${subCaseLinks.length} case links on sub-page`);

      if (subCaseLinks.length > 0) {
        const remaining = maxCases - totalFetched;
        const individualCases = await scrapeIndividualCases(
          subCaseLinks,
          setDef,
          Math.min(subCaseLinks.length, remaining)
        );
        allCases.push(...individualCases);
        totalFetched += individualCases.length;
      }
    }
  }

  return allCases;
}

// ---------------------------------------------------------------------------
// Scrape a single algorithm set (main entry point per set)
// ---------------------------------------------------------------------------

async function scrapeSet(setDef: SetDefinition): Promise<AlgorithmSet | null> {
  const fileId = setDef.fileId || sanitizeId(setDef.name);

  // ----- Handle sub-page sets (OLLCP, VLS) -----
  if (setDef.subPages && setDef.subPages.length > 0) {
    console.log(`    Set uses sub-pages approach (${setDef.subPages.length} sub-pages)`);
    const maxCases = setDef.maxCases || 500;
    const cases = await scrapeSubPages(setDef.subPages, setDef, maxCases);
    const algorithms = casesToAlgorithms(cases, setDef);

    console.log(`    Total: ${algorithms.length} algorithms from sub-pages`);

    return {
      id: fileId,
      name: setDef.name,
      puzzle: setDef.puzzle,
      description: setDef.description,
      category: setDef.category,
      caseCount: algorithms.length,
      algorithms,
    };
  }

  // ----- Standard approach: main page + individual case pages -----
  const { cases: mainPageCases, caseLinks } = await scrapeMainPage(setDef);
  const mainCasesWithAlgs = mainPageCases.filter((c) => c.algorithms.length > 0);

  let finalCases: ParsedCase[];

  // Decide strategy based on what the main page gave us
  // Deduplicate caseLinks (space vs underscore versions point to same case)
  const uniqueCaseLinks = new Set(caseLinks.map((l) => l.replace(/_/g, ' '))).size;

  if (mainCasesWithAlgs.length > 0 && (caseLinks.length === 0 || mainCasesWithAlgs.length >= uniqueCaseLinks)) {
    // Main page already has all cases with algorithms — skip individual fetches
    console.log(`    Main page has all data (${mainCasesWithAlgs.length} cases with algs, ${uniqueCaseLinks} case links). Skipping individual pages.`);
    finalCases = mainCasesWithAlgs;
  } else if (caseLinks.length > 0 && mainCasesWithAlgs.length === 0) {
    // Main page has no algorithms — must fetch individual pages
    const maxCases = setDef.maxCases || 200;
    console.log(`    Main page has 0 algs. Fetching ${Math.min(caseLinks.length, maxCases)} individual case pages...`);
    const individualCases = await scrapeIndividualCases(caseLinks, setDef, maxCases);
    finalCases = individualCases.length > 0 ? individualCases : mainCasesWithAlgs;
  } else if (caseLinks.length > 0) {
    // Main page has some but not all cases — fetch individual pages for more
    const maxCases = setDef.maxCases || 200;
    console.log(`    Main page has ${mainCasesWithAlgs.length}/${uniqueCaseLinks} cases. Fetching individual pages...`);
    const individualCases = await scrapeIndividualCases(caseLinks, setDef, maxCases);

    if (individualCases.length > mainCasesWithAlgs.length) {
      console.log(`    Using individual case data (${individualCases.length} > ${mainCasesWithAlgs.length} main page cases)`);
      finalCases = individualCases;
    } else {
      console.log(`    Using main page data (${mainCasesWithAlgs.length} cases, individual pages got ${individualCases.length})`);
      finalCases = mainCasesWithAlgs;
    }
  } else {
    // No case links found, and possibly no cases with algs from main page
    // Try the main page cases (some might have algs from text parsing)
    finalCases = mainCasesWithAlgs;

    if (finalCases.length === 0) {
      console.log(`    WARNING: No algorithms found from any approach`);
    }
  }

  const algorithms = casesToAlgorithms(finalCases, setDef);

  if (algorithms.length === 0) {
    console.log(`    WARNING: 0 algorithms after parsing`);
  }

  return {
    id: fileId,
    name: setDef.name,
    puzzle: setDef.puzzle,
    description: setDef.description,
    category: setDef.category,
    caseCount: algorithms.length,
    algorithms,
  };
}

// ---------------------------------------------------------------------------
// Write set to disk (with protection for curated data)
// ---------------------------------------------------------------------------

function writeSetFile(set: AlgorithmSet): void {
  const filename = `${set.id}.json`;
  const filepath = resolve(ALGORITHMS_DIR, filename);

  const existingCount = getExistingAlgorithmCount(set.id);

  if (existingCount > 0 && set.algorithms.length < existingCount) {
    console.log(
      `    SKIP write for ${filename}: existing has ${existingCount} algs, ` +
        `scraped only ${set.algorithms.length}. Not overwriting better data.`
    );
    return;
  }

  if (existingCount > 0) {
    console.log(
      `    OVERWRITE ${filename}: existing ${existingCount} algs -> scraped ${set.algorithms.length} (MORE).`
    );
  }

  writeFileSync(filepath, JSON.stringify(set, null, 2), 'utf-8');
  console.log(`    Wrote ${filepath} (${set.algorithms.length} algorithms)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // CLI: --only cls,fruf,zbll-u,...  (filter by fileId)
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const onlyIds = onlyArg ? onlyArg.replace('--only=', '').split(',').map((s) => s.trim()) : null;

  let setsToScrape = SETS;
  if (onlyIds) {
    setsToScrape = SETS.filter((s) => {
      const fid = s.fileId || sanitizeId(s.name);
      return onlyIds.includes(fid);
    });
    if (setsToScrape.length === 0) {
      console.error('No sets matched --only filter. Available fileIds:');
      for (const s of SETS) console.error(`  ${s.fileId || sanitizeId(s.name)}`);
      process.exit(1);
    }
  }

  console.log('=============================================');
  console.log('  SpeedCubeDB Scraper v4 (DOM-based parsing)');
  console.log('=============================================');
  console.log(`Output directory: ${ALGORITHMS_DIR}`);
  console.log(`Sets to scrape:  ${setsToScrape.length}${onlyIds ? ` (filtered: ${onlyIds.join(', ')})` : ''}`);
  console.log(`Delays:          ${CASE_PAGE_DELAY_MS}ms between case pages, ${SET_DELAY_MS}ms between sets`);
  console.log('');

  // Show existing file status
  console.log('--- Existing algorithm files ---');
  let existingTotal = 0;
  for (const setDef of setsToScrape) {
    const fileId = setDef.fileId || sanitizeId(setDef.name);
    const count = getExistingAlgorithmCount(fileId);
    if (count > 0) {
      console.log(`  ${fileId}.json: ${count} algorithms (protected unless we scrape more)`);
      existingTotal += count;
    }
  }
  if (existingTotal === 0) {
    console.log('  (none found)');
  }
  console.log('');

  let totalAlgorithms = 0;
  let setsWithData = 0;
  let setsEmpty = 0;
  let setsSkipped = 0;

  const startTime = Date.now();

  for (let i = 0; i < setsToScrape.length; i++) {
    const setDef = setsToScrape[i];
    const fileId = setDef.fileId || sanitizeId(setDef.name);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  [${i + 1}/${setsToScrape.length}] ${setDef.name} (${setDef.puzzle}) -> ${fileId}.json`);
    console.log(`${'='.repeat(60)}`);

    try {
      const result = await scrapeSet(setDef);

      if (result) {
        if (result.algorithms.length > 0) {
          setsWithData++;
          totalAlgorithms += result.algorithms.length;
          console.log(`    SUCCESS: ${result.algorithms.length} algorithms`);

          // Log a sample
          const sample = result.algorithms[0];
          console.log(`    Sample: "${sample.name}" -> ${sample.notation.substring(0, 50)}${sample.notation.length > 50 ? '...' : ''}`);
        } else {
          setsEmpty++;
          console.log(`    EMPTY: no algorithms found`);
        }

        // Check whether to write or skip
        const existingCount = getExistingAlgorithmCount(result.id);
        if (result.algorithms.length === 0 && existingCount > 0) {
          console.log(
            `    SKIP: existing file has ${existingCount} algs, not overwriting with empty result.`
          );
          setsSkipped++;
        } else if (result.algorithms.length > 0) {
          writeSetFile(result);
        }
      } else {
        setsEmpty++;
        console.log(`    FAILED: could not fetch or parse`);
      }
    } catch (err) {
      setsEmpty++;
      console.error(`    ERROR scraping ${setDef.name}:`, (err as Error).message);
    }

    // Polite delay between sets
    if (i < setsToScrape.length - 1) {
      await delay(SET_DELAY_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${'='.repeat(60)}`);
  console.log('  Scraping Complete');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total sets:        ${setsToScrape.length}`);
  console.log(`  With data:         ${setsWithData}`);
  console.log(`  Empty/failed:      ${setsEmpty}`);
  console.log(`  Skipped (protect): ${setsSkipped}`);
  console.log(`  Total algorithms:  ${totalAlgorithms}`);
  console.log(`  Time elapsed:      ${elapsed}s`);
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
