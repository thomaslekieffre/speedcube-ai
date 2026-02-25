/**
 * Import 2x2 algorithm sets from the "Best 2x2 Algs" Google Sheet
 * Source: https://docs.google.com/spreadsheets/d/1OFXakCV85Mp2zsQBXMxiMX9a506JeAcLnUXZr8FgXAY
 *
 * Sets imported: LEG-1, TCLL+, TCLL-, LS-1 through LS-9
 *
 * Usage: npx tsx scripts/import-best2x2algs.ts
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALGORITHMS_DIR = resolve(__dirname, '../src/data/algorithms');
const SHEET_ID = '1OFXakCV85Mp2zsQBXMxiMX9a506JeAcLnUXZr8FgXAY';

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
  alternatives: { notation: string; moveCount: number; votes?: number }[];
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

interface TabConfig {
  id: string;
  name: string;
  gid: string;
  puzzle: string;
  category: string;
  description: string;
  algColumns: [number, number]; // [start, end] inclusive
  skipHeaderRows: number;
}

/* ------------------------------------------------------------------ */
/*  Tab configurations                                                 */
/* ------------------------------------------------------------------ */

const TABS: TabConfig[] = [
  {
    id: 'leg-1',
    name: 'LEG-1',
    gid: '646850830',
    puzzle: '2x2',
    category: 'last-layer',
    description:
      'Left EG-1 - Solves the last layer when a 1x1x2 bar is held on the left side. An EG-1 variant providing different algorithm angles for advanced 2x2 solving.',
    algColumns: [1, 6],
    skipHeaderRows: 0,
  },
  {
    id: 'tcll-plus',
    name: 'TCLL+',
    gid: '1927166195',
    puzzle: '2x2',
    category: 'last-layer',
    description:
      'Twisty CLL+ - CLL cases where one corner is twisted clockwise. Solves both the CLL case and the corner twist simultaneously.',
    algColumns: [1, 6],
    skipHeaderRows: 1,
  },
  {
    id: 'tcll-minus',
    name: 'TCLL-',
    gid: '707433540',
    puzzle: '2x2',
    category: 'last-layer',
    description:
      'Twisty CLL- - CLL cases where one corner is twisted counter-clockwise. Mirrors TCLL+ for the opposite twist direction.',
    algColumns: [1, 6],
    skipHeaderRows: 0,
  },
  // LS-1 through LS-9
  ...[
    { n: 1, gid: '427089004' },
    { n: 2, gid: '1193413342' },
    { n: 3, gid: '1505707149' },
    { n: 4, gid: '816303503' },
    { n: 5, gid: '12525672' },
    { n: 6, gid: '119154880' },
    { n: 7, gid: '2139172144' },
    { n: 8, gid: '1321080943' },
    { n: 9, gid: '909400475' },
  ].map(({ n, gid }): TabConfig => ({
    id: `ls-${n}`,
    name: `LS-${n}`,
    gid,
    puzzle: '2x2',
    category: 'last-layer',
    description: `Last Slot ${n} - One-look last-slot algorithms for 2x2. Solves the last slot while orienting and permuting the remaining corners in one step.`,
    algColumns: [1, 6],
    skipHeaderRows: 1,
  })),
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
  const cleaned = notation.replace(/[()[\]]/g, '');
  return cleaned
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 0).length;
}

function normalizeNotation(raw: string): string {
  return raw
    .replace(/\u00B4/g, "'") // acute accent → apostrophe
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u2032/g, "'") // prime symbol
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

function sanitizeId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isAlgorithm(val: string): boolean {
  // Must contain at least one cube move (R, U, F, L, D, B) and be longer than 2 chars
  return val.length > 2 && /[RUFLDB]/.test(val);
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
  const [colStart, colEnd] = config.algColumns;

  const algorithms: Algorithm[] = [];
  let currentSubset = '';
  let caseNum = 0;

  // Skip first line (set name) + any extra header rows
  const startLine = 1 + config.skipHeaderRows;

  for (let i = startLine; i < lines.length; i++) {
    const fields = parseCSVRow(lines[i]);
    const col0 = (fields[0] || '').trim();

    // Subset header: non-empty col 0 with all algorithm columns empty
    if (col0) {
      const algColumnsEmpty = fields
        .slice(colStart, colEnd + 1)
        .every((f) => !normalizeNotation(f || '') || !isAlgorithm(normalizeNotation(f || '')));
      if (algColumnsEmpty) {
        currentSubset = col0;
        caseNum = 0;
        continue;
      }
    }

    // Extract algorithms from columns
    const algs: string[] = [];
    for (let c = colStart; c <= Math.min(colEnd, fields.length - 1); c++) {
      const val = normalizeNotation(fields[c] || '');
      if (isAlgorithm(val)) algs.push(val);
    }

    if (algs.length === 0) continue;

    caseNum++;
    const primary = algs[0];
    const alternatives = algs.slice(1).map((a) => ({
      notation: a,
      moveCount: countMoves(a),
    }));

    const subId = sanitizeId(currentSubset || 'general');
    algorithms.push({
      id: `${config.id}-${subId}-${caseNum}`,
      name: `${config.name} ${currentSubset || 'Case'} ${caseNum}`,
      set: config.name,
      subset: currentSubset,
      puzzle: config.puzzle,
      notation: primary,
      alternatives,
      moveCount: countMoves(primary),
      setup: '',
      votes: 0,
      source: 'best2x2algs',
    });
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

      const outPath = resolve(ALGORITHMS_DIR, `${tab.id}.json`);
      writeFileSync(outPath, JSON.stringify(set, null, 2));

      const algsWithAlts = set.algorithms.reduce(
        (s, a) => s + 1 + a.alternatives.length,
        0,
      );
      totalCases += set.algorithms.length;
      totalAlgs += algsWithAlts;

      console.log(
        ` ${set.algorithms.length} cases, ${algsWithAlts} algorithms → ${tab.id}.json`,
      );
    } catch (err) {
      console.error(` FAILED: ${err}`);
    }
  }

  console.log(`\nTotal: ${totalCases} cases, ${totalAlgs} algorithms`);
  console.log('Run: npx tsx scripts/generate-knowledge.ts');
}

main().catch(console.error);
