/**
 * Import Pyraminx algorithm sets from the community Google Sheet
 * Source: https://docs.google.com/spreadsheets/d/12FH8MswpdBJxLJ_Eu_gopoxTCySPk9H_o7_yjN8_ECw
 *
 * Sets imported: ML4E, TL4E-B, TL4E-R, L5E-Bad, KL5E, BL5E, L5E-HT, L5E-YY, Top First, Master Pyraminx
 *
 * Usage: npx tsx scripts/import-pyraminx-algs.ts
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALGORITHMS_DIR = resolve(__dirname, '../src/data/algorithms');
const SHEET_ID = '12FH8MswpdBJxLJ_Eu_gopoxTCySPk9H_o7_yjN8_ECw';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Algorithm {
  id: string;
  name: string;
  set: string;
  subset: string;
  puzzle: string;
  notation: string;
  alternatives: { notation: string; moveCount: number }[];
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

interface Section {
  prefix: string;       // e.g., "KL5E-R" — prepended to subset names
  subsetCol: number;    // which column contains subset names
  algCols: number[];    // which columns contain algorithms
}

interface TabConfig {
  id: string;
  name: string;
  gid: string;
  puzzle: string;
  category: string;
  description: string;
  skipRows: number;     // header rows to skip (after row 0 = set name)
  sections: Section[];
}

/* ------------------------------------------------------------------ */
/*  Tab configurations                                                 */
/* ------------------------------------------------------------------ */

const TABS: TabConfig[] = [
  {
    id: 'pyra-ml4e',
    name: 'ML4E',
    gid: '160261728',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Modified Last 4 Edges for Pyraminx. An optimized variant of L4E with Right Slot and Left Slot approaches.',
    skipRows: 1, // row 0 is header
    sections: [{ prefix: '', subsetCol: 0, algCols: [2, 3] }],
  },
  {
    id: 'pyra-tl4e-b',
    name: 'TL4E-B',
    gid: '1227860985',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Twisted Last 4 Edges (Bottom) for Pyraminx. L4E cases with a twisted bottom tip, covering both + and - orientations.',
    skipRows: 2, // rows 0-1 are headers
    sections: [
      { prefix: '+', subsetCol: 0, algCols: [2] },
      { prefix: '-', subsetCol: 0, algCols: [4] },
    ],
  },
  {
    id: 'pyra-tl4e-r',
    name: 'TL4E-R',
    gid: '539837078',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Twisted Last 4 Edges (Right) for Pyraminx. L4E cases with a twisted right tip, covering bar positions and both orientations.',
    skipRows: 2,
    sections: [
      { prefix: '+', subsetCol: 0, algCols: [2, 3] },
      { prefix: '-', subsetCol: 0, algCols: [5, 6] },
    ],
  },
  {
    id: 'pyra-l5e-bad',
    name: 'L5E Bad Layers',
    gid: '1993627059',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Last 5 Edges (Bad Layers) for Pyraminx. Advanced L5E cases with Nutella, Peanut, Krish, and 2-Flip subsets.',
    skipRows: 0,
    sections: [
      { prefix: 'Nutella', subsetCol: 0, algCols: [2, 3] },
      { prefix: 'Peanut', subsetCol: 4, algCols: [6, 7] },
      { prefix: 'Left Krish', subsetCol: 8, algCols: [10, 11] },
      { prefix: 'Right Krish', subsetCol: 12, algCols: [14, 15] },
      { prefix: '2-Flip', subsetCol: 16, algCols: [18, 19] },
    ],
  },
  {
    id: 'pyra-kl5e',
    name: 'KL5E',
    gid: '301632143',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Krish Last 5 Edges for Pyraminx. An advanced L5E recognition and solving method with separate R and L variants.',
    skipRows: 3, // rows 0-2 are headers
    sections: [
      { prefix: 'R', subsetCol: 0, algCols: [2, 3, 4] },
      { prefix: 'L', subsetCol: 5, algCols: [7, 8, 9] },
    ],
  },
  {
    id: 'pyra-bl5e',
    name: 'BL5E',
    gid: '1702968841',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Bheem Last 5 Edges for Pyraminx. An alternative L5E method with R and L variants.',
    skipRows: 3,
    sections: [
      { prefix: 'R', subsetCol: 0, algCols: [2, 3, 4] },
      { prefix: 'L', subsetCol: 5, algCols: [7, 8, 9] },
    ],
  },
  {
    id: 'pyra-l5e-ht',
    name: 'L5E Heads/Tails',
    gid: '812949111',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Last 5 Edges Heads/Tails for Pyraminx. L5E cases categorized by Heads and Tails patterns.',
    skipRows: 0,
    sections: [
      { prefix: 'Heads', subsetCol: 0, algCols: [2, 3, 4] },
      { prefix: 'Tails', subsetCol: 5, algCols: [7, 8, 9] },
    ],
  },
  {
    id: 'pyra-l5e-yy',
    name: 'L5E Yin/Yang',
    gid: '1414926259',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Last 5 Edges Yin/Yang for Pyraminx. L5E cases categorized by Yin and Yang patterns.',
    skipRows: 0,
    sections: [
      { prefix: 'Yin', subsetCol: 0, algCols: [2, 3, 4] },
      { prefix: 'Yang', subsetCol: 5, algCols: [7, 8, 9] },
    ],
  },
  {
    id: 'pyra-top-first',
    name: 'Top First',
    gid: '145207804',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Top First method for Pyraminx. Solves the top tip first with various techniques including 1-Flip, Nutella, WO, Oka, Bell, Jelly, and more.',
    skipRows: 0,
    // TopFirst has horizontal sections: each 3 cols wide (name, empty, alg)
    sections: [
      { prefix: '1-Flip', subsetCol: 0, algCols: [2] },
      { prefix: 'Nutella', subsetCol: 3, algCols: [5] },
      { prefix: 'WO', subsetCol: 6, algCols: [8] },
      { prefix: 'Oka', subsetCol: 9, algCols: [11] },
      { prefix: 'Bell', subsetCol: 12, algCols: [14] },
      { prefix: 'Jelly', subsetCol: 15, algCols: [17] },
      { prefix: 'Double Oka', subsetCol: 18, algCols: [20] },
      { prefix: 'SUS', subsetCol: 21, algCols: [23] },
      { prefix: 'Anti-SUS', subsetCol: 24, algCols: [26] },
      { prefix: '2-Flip', subsetCol: 27, algCols: [29] },
    ],
  },
  {
    id: 'master-pyraminx',
    name: 'Master Pyraminx',
    gid: '1712969328',
    puzzle: 'Pyraminx',
    category: 'last-layer',
    description: 'Algorithms for the Master Pyraminx (4-layer Pyraminx). Layer-by-layer approach with inner layer and edge algorithms.',
    skipRows: 0,
    sections: [{ prefix: '', subsetCol: 0, algCols: [4] }],
  },
];

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (inQuotes) {
      if (line[i] === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (line[i] === '"') {
        inQuotes = false;
      } else {
        current += line[i];
      }
    } else {
      if (line[i] === '"') {
        inQuotes = true;
      } else if (line[i] === ',') {
        fields.push(current);
        current = '';
      } else {
        current += line[i];
      }
    }
  }
  fields.push(current);
  return fields;
}

function countMoves(notation: string): number {
  if (!notation?.trim()) return 0;
  // Remove brackets, parentheses, and fingertrick annotations like [r], [l'], [u]
  const cleaned = notation
    .replace(/\[[^\]]*\]/g, '') // remove [r], [l'], [u'], [b] etc
    .replace(/[()]/g, '');
  return cleaned
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 0).length;
}

function normalizeNotation(raw: string): string {
  return raw
    .replace(/\u00B4/g, "'")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2032/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isPyraminxAlgorithm(val: string): boolean {
  if (val.length < 3) return false;
  // Remove bracket annotations like [r], [l'], [u], [b']
  const stripped = val.replace(/\[[^\]]*\]/g, '').trim();
  if (!stripped) return false;
  // Split into tokens
  const tokens = stripped.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length < 2) return false; // algorithms have at least 2 moves
  // A move token matches: R, U', R2, Rw, Rw', S, H, x', y2, etc.
  // Max ~4 chars, starts with a move letter, followed by optional w, 2, '
  const moveTokens = tokens.filter((t) =>
    /^[URFLDBSHxyz]w?2?'?$/.test(t),
  );
  // At least 60% of tokens should be valid moves
  return moveTokens.length >= tokens.length * 0.6 && moveTokens.length >= 2;
}

/* ------------------------------------------------------------------ */
/*  Fetcher                                                            */
/* ------------------------------------------------------------------ */

async function fetchCSV(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch gid=${gid}: ${res.status}`);
  return res.text();
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

function parseTab(csv: string, config: TabConfig): AlgorithmSet {
  const lines = csv.split('\n').filter((l) => l.trim());
  const algorithms: Algorithm[] = [];

  // Track current subset per section
  const currentSubset: Record<number, string> = {};

  // Track case numbers per section
  const caseNums: Record<string, number> = {};

  for (let i = config.skipRows; i < lines.length; i++) {
    const fields = parseCSVRow(lines[i]);

    for (const section of config.sections) {
      const subCol = (fields[section.subsetCol] || '').trim();

      // Check if this row has a subset name for this section
      if (subCol && !isPyraminxAlgorithm(normalizeNotation(subCol))) {
        // Check if algorithm columns for this section are all empty
        const hasAlgs = section.algCols.some((c) => {
          const val = normalizeNotation(fields[c] || '');
          return val && isPyraminxAlgorithm(val);
        });

        if (!hasAlgs) {
          // Pure subset header row
          currentSubset[section.subsetCol] = subCol;
          continue;
        } else {
          // Row has both a name in subsetCol AND algorithms
          // Treat the name as a subset update
          currentSubset[section.subsetCol] = subCol;
        }
      }

      // Extract algorithms from this section's columns
      const algs: string[] = [];
      for (const c of section.algCols) {
        const val = normalizeNotation(fields[c] || '');
        if (val && isPyraminxAlgorithm(val)) algs.push(val);
      }

      if (algs.length === 0) continue;

      const subset = currentSubset[section.subsetCol] || '';
      const fullSubset = section.prefix
        ? subset
          ? `${section.prefix} - ${subset}`
          : section.prefix
        : subset;

      const sectionKey = `${section.prefix}|${fullSubset}`;
      caseNums[sectionKey] = (caseNums[sectionKey] || 0) + 1;
      const caseNum = caseNums[sectionKey];

      const primary = algs[0];
      const alternatives = algs.slice(1).map((a) => ({
        notation: a,
        moveCount: countMoves(a),
      }));

      const subId = sanitizeId(fullSubset || 'general');
      algorithms.push({
        id: `${config.id}-${subId}-${caseNum}`,
        name: `${config.name} ${fullSubset || 'Case'} ${caseNum}`,
        set: config.name,
        subset: fullSubset,
        puzzle: config.puzzle,
        notation: primary,
        alternatives,
        moveCount: countMoves(primary),
        setup: '',
        votes: 0,
        source: 'pyraminx-sheet',
      });
    }
  }

  return {
    id: config.id,
    name: config.name,
    puzzle: config.puzzle,
    description: config.description,
    category: config.category,
    caseCount: algorithms.length,
    algorithms,
  };
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  let totalCases = 0;
  let totalAlgs = 0;

  for (const tab of TABS) {
    process.stdout.write(`Fetching ${tab.name} (gid=${tab.gid})...`);

    try {
      const csv = await fetchCSV(tab.gid);
      const set = parseTab(csv, tab);

      if (set.algorithms.length === 0) {
        console.log(' NO ALGORITHMS FOUND (check config)');
        continue;
      }

      const outPath = resolve(ALGORITHMS_DIR, `${tab.id}.json`);
      writeFileSync(outPath, JSON.stringify(set, null, 2));

      const algsWithAlts = set.algorithms.reduce(
        (s, a) => s + 1 + a.alternatives.length,
        0,
      );
      totalCases += set.algorithms.length;
      totalAlgs += algsWithAlts;

      const subsets = [...new Set(set.algorithms.map((a) => a.subset))];
      console.log(
        ` ${set.algorithms.length} cases, ${algsWithAlts} algs (${subsets.length} subsets) → ${tab.id}.json`,
      );
    } catch (err) {
      console.error(` FAILED: ${err}`);
    }
  }

  console.log(`\nTotal: ${totalCases} cases, ${totalAlgs} algorithms`);
  console.log('Run: npx tsx scripts/generate-knowledge.ts');
}

main().catch(console.error);
