/**
 * Validate and merge all scraped/curated data, then generate
 * src/data/index.ts with proper TypeScript imports and exports.
 *
 * Usage: npx tsx scripts/generate-knowledge.ts
 *
 * This script:
 * 1. Reads all algorithm JSON files from src/data/algorithms/
 * 2. Reads methods, hardware, records, glossary, tips, learning-paths
 * 3. Validates data integrity
 * 4. Generates src/data/index.ts with typed re-exports
 * 5. Prints summary statistics
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(PROJECT_ROOT, 'src/data');
const ALGORITHMS_DIR = resolve(DATA_DIR, 'algorithms');
const METHODS_DIR = resolve(DATA_DIR, 'methods');
const HARDWARE_DIR = resolve(DATA_DIR, 'hardware');
const OUTPUT_FILE = resolve(DATA_DIR, 'index.ts');

// ---------------------------------------------------------------------------
// Types (matching src/types/index.ts)
// ---------------------------------------------------------------------------

interface Algorithm {
  id: string;
  name: string;
  set: string;
  subset?: string;
  puzzle: string;
  notation: string;
  alternatives: { notation: string; moveCount: number }[];
  moveCount: number;
  setup?: string;
  votes?: number;
  source: string;
}

interface AlgorithmSet {
  id: string;
  name: string;
  puzzle: string;
  description: string;
  caseCount: number;
  category: string;
  algorithms: Algorithm[];
}

interface Method {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  steps: { name: string; description: string; algorithmSets?: string[] }[];
  pros: string[];
  cons: string[];
  notableUsers: string[];
  relatedSets: string[];
}

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
}

interface Tip {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  content: string;
  keyPoints: string[];
}

interface LearningPath {
  id: string;
  name: string;
  target: string;
  description: string;
  milestones: { name: string; target: string; algorithmSets: string[] }[];
}

interface RecordEntry {
  time: string;
  holder: string;
  nationality: string;
  competition: string;
  date: string;
}

interface WCARecord {
  event: string;
  eventId: string;
  single: RecordEntry;
  average: RecordEntry;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

const issues: ValidationIssue[] = [];

function error(msg: string): void {
  issues.push({ severity: 'error', message: msg });
}

function warn(msg: string): void {
  issues.push({ severity: 'warning', message: msg });
}

// ---------------------------------------------------------------------------
// Read JSON helper
// ---------------------------------------------------------------------------

function readJson<T>(filepath: string): T | null {
  if (!existsSync(filepath)) {
    return null;
  }
  try {
    const raw = readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    error(`Failed to parse ${filepath}: ${(err as Error).message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Discover files
// ---------------------------------------------------------------------------

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

// ---------------------------------------------------------------------------
// Camel-case helper for variable names
// ---------------------------------------------------------------------------

function fileToVarName(filename: string, prefix: string): string {
  const base = basename(filename, '.json');
  // Convert kebab-case / spaces to camelCase
  const camel = base
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-zA-Z]/, '_$&');
  return `${camel}${prefix}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('=== Knowledge Base Generator ===\n');

  // -----------------------------------------------------------------------
  // 1. Discover and read all data files
  // -----------------------------------------------------------------------

  // Algorithm sets
  const algFiles = listJsonFiles(ALGORITHMS_DIR);
  const algorithmSets: AlgorithmSet[] = [];
  for (const file of algFiles) {
    const data = readJson<AlgorithmSet>(resolve(ALGORITHMS_DIR, file));
    if (data) {
      algorithmSets.push(data);
    }
  }
  console.log(`Algorithm sets: ${algorithmSets.length} files found (${algFiles.join(', ')})`);

  // Methods
  const methodFiles = listJsonFiles(METHODS_DIR);
  const methods: Method[] = [];
  for (const file of methodFiles) {
    const data = readJson<Method>(resolve(METHODS_DIR, file));
    if (data) {
      methods.push(data);
    }
  }
  console.log(`Methods: ${methods.length} files found (${methodFiles.join(', ')})`);

  // Hardware
  const cubes = readJson<unknown[]>(resolve(HARDWARE_DIR, 'cubes.json'));
  const lubes = readJson<unknown[]>(resolve(HARDWARE_DIR, 'lubes.json'));
  console.log(`Hardware: cubes=${cubes?.length ?? 0}, lubes=${lubes?.length ?? 0}`);

  // Records
  const records = readJson<WCARecord[]>(resolve(DATA_DIR, 'records.json'));
  console.log(`Records: ${records?.length ?? 0} events`);

  // Glossary
  const glossary = readJson<GlossaryTerm[]>(resolve(DATA_DIR, 'glossary.json'));
  console.log(`Glossary: ${glossary?.length ?? 0} terms`);

  // Tips
  const tips = readJson<Tip[]>(resolve(DATA_DIR, 'tips.json'));
  console.log(`Tips: ${tips?.length ?? 0} entries`);

  // Learning paths
  const learningPaths = readJson<LearningPath[]>(resolve(DATA_DIR, 'learning-paths.json'));
  console.log(`Learning paths: ${learningPaths?.length ?? 0} paths`);

  // -----------------------------------------------------------------------
  // 2. Validate data integrity
  // -----------------------------------------------------------------------

  console.log('\n--- Validation ---');

  // Check algorithm sets
  const algSetIds = new Set(algorithmSets.map((s) => s.id));
  const algSetNames = new Set(algorithmSets.map((s) => s.name));

  for (const set of algorithmSets) {
    if (!set.id) error(`Algorithm set missing id: ${JSON.stringify(set).substring(0, 80)}`);
    if (!set.name) error(`Algorithm set ${set.id} missing name`);
    if (!set.puzzle) error(`Algorithm set ${set.id} missing puzzle`);
    if (!set.description) warn(`Algorithm set ${set.id} missing description`);
    if (!set.category) warn(`Algorithm set ${set.id} missing category`);

    if (set.algorithms.length === 0) {
      warn(`Algorithm set ${set.id} (${set.name}) has 0 algorithms`);
    }

    if (set.caseCount !== set.algorithms.length) {
      warn(`Algorithm set ${set.id}: caseCount (${set.caseCount}) does not match algorithms.length (${set.algorithms.length})`);
    }

    // Validate individual algorithms
    for (const alg of set.algorithms) {
      if (!alg.id) error(`Algorithm in ${set.id} missing id`);
      if (!alg.notation && set.algorithms.length > 0) {
        warn(`Algorithm ${alg.id} in ${set.id} has empty notation`);
      }
    }
  }

  // Validate methods reference valid algorithm sets
  for (const method of methods) {
    if (!method.id) error(`Method missing id`);
    if (!method.name) error(`Method ${method.id} missing name`);
    if (method.steps.length === 0) warn(`Method ${method.id} has no steps`);

    for (const step of method.steps) {
      if (step.algorithmSets) {
        for (const setRef of step.algorithmSets) {
          // Check if referenced set exists (by name or id)
          if (!algSetIds.has(setRef.toLowerCase()) && !algSetNames.has(setRef)) {
            warn(`Method ${method.id} step "${step.name}" references unknown algorithm set "${setRef}"`);
          }
        }
      }
    }

    for (const setRef of method.relatedSets) {
      if (!algSetIds.has(setRef.toLowerCase()) && !algSetNames.has(setRef)) {
        warn(`Method ${method.id} relatedSets references unknown set "${setRef}"`);
      }
    }
  }

  // Validate learning paths reference valid algorithm sets
  if (learningPaths) {
    for (const path of learningPaths) {
      if (!path.id) error(`Learning path missing id`);
      for (const milestone of path.milestones) {
        for (const setRef of milestone.algorithmSets) {
          if (setRef && !algSetIds.has(setRef.toLowerCase()) && !algSetNames.has(setRef)) {
            warn(`Learning path ${path.id} milestone "${milestone.name}" references unknown set "${setRef}"`);
          }
        }
      }
    }
  }

  // Validate records
  if (records) {
    for (const rec of records) {
      if (!rec.eventId) error(`Record missing eventId`);
      if (!rec.event) error(`Record ${rec.eventId} missing event name`);
      if (!rec.single.time && !rec.average.time) {
        warn(`Record ${rec.eventId} has no times at all`);
      }
    }
  }

  // Required files
  if (!records) warn('records.json not found - run scrape:wca first');
  if (!glossary) warn('glossary.json not found');
  if (!tips) warn('tips.json not found');
  if (!learningPaths) warn('learning-paths.json not found');
  if (!cubes) warn('hardware/cubes.json not found');
  if (!lubes) warn('hardware/lubes.json not found');

  // Print issues
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (errors.length > 0) {
    console.log(`\n  ERRORS (${errors.length}):`);
    for (const e of errors) console.log(`    [ERROR] ${e.message}`);
  }
  if (warnings.length > 0) {
    console.log(`\n  WARNINGS (${warnings.length}):`);
    for (const w of warnings) console.log(`    [WARN]  ${w.message}`);
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log('  All validations passed!');
  }

  // -----------------------------------------------------------------------
  // 3. Generate src/data/index.ts
  // -----------------------------------------------------------------------

  console.log('\n--- Generating index.ts ---');

  const importLines: string[] = [];
  const algVarNames: string[] = [];
  const methodVarNames: string[] = [];

  // Type import
  importLines.push(
    "import type { AlgorithmSet, Method, CubeHardware, Lube, WCARecord, GlossaryTerm, Tip, LearningPath } from '@/types';\n"
  );

  // Algorithm set imports
  if (algFiles.length > 0) {
    importLines.push('// Algorithm sets');
    for (const file of algFiles) {
      const varName = fileToVarName(file, 'Data');
      algVarNames.push(varName);
      importLines.push(`import ${varName} from './algorithms/${file}';`);
    }
    importLines.push('');
  }

  // Method imports
  if (methodFiles.length > 0) {
    importLines.push('// Methods');
    for (const file of methodFiles) {
      const varName = fileToVarName(file, 'Data');
      methodVarNames.push(varName);
      importLines.push(`import ${varName} from './methods/${file}';`);
    }
    importLines.push('');
  }

  // Other data imports
  importLines.push('// Other data');
  if (cubes) importLines.push("import cubesData from './hardware/cubes.json';");
  if (lubes) importLines.push("import lubesData from './hardware/lubes.json';");
  if (records) importLines.push("import recordsData from './records.json';");
  if (glossary) importLines.push("import glossaryData from './glossary.json';");
  if (tips) importLines.push("import tipsData from './tips.json';");
  if (learningPaths) importLines.push("import learningPathsData from './learning-paths.json';");
  importLines.push('');

  // Exports
  const exportLines: string[] = [];

  if (algVarNames.length > 0) {
    exportLines.push(`export const algorithmSets: AlgorithmSet[] = [${algVarNames.join(', ')}] as AlgorithmSet[];`);
  } else {
    exportLines.push('export const algorithmSets: AlgorithmSet[] = [];');
  }

  if (methodVarNames.length > 0) {
    exportLines.push(`export const methods: Method[] = [${methodVarNames.join(', ')}] as Method[];`);
  } else {
    exportLines.push('export const methods: Method[] = [];');
  }

  if (cubes) {
    exportLines.push('export const cubes: CubeHardware[] = cubesData as CubeHardware[];');
  } else {
    exportLines.push('export const cubes: CubeHardware[] = [];');
  }

  if (lubes) {
    exportLines.push('export const lubes: Lube[] = lubesData as Lube[];');
  } else {
    exportLines.push('export const lubes: Lube[] = [];');
  }

  if (records) {
    exportLines.push('export const records: WCARecord[] = recordsData as WCARecord[];');
  } else {
    exportLines.push('export const records: WCARecord[] = [];');
  }

  if (glossary) {
    exportLines.push('export const glossary: GlossaryTerm[] = glossaryData as GlossaryTerm[];');
  } else {
    exportLines.push('export const glossary: GlossaryTerm[] = [];');
  }

  if (tips) {
    exportLines.push('export const tips: Tip[] = tipsData as Tip[];');
  } else {
    exportLines.push('export const tips: Tip[] = [];');
  }

  if (learningPaths) {
    exportLines.push('export const learningPaths: LearningPath[] = learningPathsData as LearningPath[];');
  } else {
    exportLines.push('export const learningPaths: LearningPath[] = [];');
  }

  // Helper exports
  const helperLines = [
    '',
    '// Helper functions',
    'export function getAlgorithmSet(id: string): AlgorithmSet | undefined {',
    '  return algorithmSets.find((s) => s.id === id || s.name.toLowerCase() === id.toLowerCase());',
    '}',
    '',
    'export function getMethod(id: string): Method | undefined {',
    '  return methods.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase());',
    '}',
    '',
    'export function getAlgorithmsByPuzzle(puzzle: string): AlgorithmSet[] {',
    '  return algorithmSets.filter((s) => s.puzzle === puzzle);',
    '}',
    '',
    'export function searchAlgorithms(query: string): AlgorithmSet[] {',
    '  const q = query.toLowerCase();',
    '  return algorithmSets.filter(',
    '    (s) => s.name.toLowerCase().includes(q) ||',
    '           s.description.toLowerCase().includes(q) ||',
    '           s.puzzle.toLowerCase().includes(q)',
    '  );',
    '}',
    '',
    '// Statistics',
    `export const stats = {`,
    `  totalAlgorithmSets: algorithmSets.length,`,
    `  totalAlgorithms: algorithmSets.reduce((sum, s) => sum + s.algorithms.length, 0),`,
    `  totalMethods: methods.length,`,
    `  totalCubes: cubes.length,`,
    `  totalLubes: lubes.length,`,
    `  totalRecords: records.length,`,
    `  totalGlossaryTerms: glossary.length,`,
    `  totalTips: tips.length,`,
    `  totalLearningPaths: learningPaths.length,`,
    '} as const;',
  ];

  // Assemble file
  const fileContent = [
    '/**',
    ' * Auto-generated data index - DO NOT EDIT MANUALLY',
    ` * Generated at: ${new Date().toISOString()}`,
    ` * Run: npx tsx scripts/generate-knowledge.ts`,
    ' */',
    '',
    ...importLines,
    ...exportLines,
    ...helperLines,
    '',
  ].join('\n');

  writeFileSync(OUTPUT_FILE, fileContent, 'utf-8');
  console.log(`Wrote ${OUTPUT_FILE}`);

  // -----------------------------------------------------------------------
  // 4b. Generate metadata.ts (lightweight stats for Dashboard/Footer)
  // -----------------------------------------------------------------------

  const totalAlgsForMeta = algorithmSets.reduce((sum: number, s: any) => sum + s.algorithms.length, 0);
  const featuredIds = ['oll', 'pll', 'f2l', 'coll', 'cmll', 'cll'];
  const featured = featuredIds
    .map(id => algorithmSets.find((s: any) => s.id === id))
    .filter(Boolean)
    .map((s: any) => `  { id: '${s.id}', name: '${s.name}', puzzle: '${s.puzzle}', description: '${s.description.replace(/'/g, "\\'")}', algorithmCount: ${s.algorithms.length} },`);

  const metadataContent = [
    '/**',
    ' * Auto-generated lightweight metadata - DO NOT EDIT MANUALLY',
    ` * Generated at: ${new Date().toISOString()}`,
    ` * Run: npx tsx scripts/generate-knowledge.ts`,
    ' */',
    '',
    'export const stats = {',
    `  totalAlgorithmSets: ${algorithmSets.length},`,
    `  totalAlgorithms: ${totalAlgsForMeta},`,
    `  totalMethods: ${methods.length},`,
    `  totalCubes: ${cubes?.length ?? 0},`,
    `  totalLubes: ${lubes?.length ?? 0},`,
    `  totalRecords: ${records?.length ?? 0},`,
    `  totalGlossaryTerms: ${glossary?.length ?? 0},`,
    `  totalTips: ${tips?.length ?? 0},`,
    `  totalLearningPaths: ${learningPaths?.length ?? 0},`,
    '} as const;',
    '',
    'export interface FeaturedSetSummary {',
    '  id: string;',
    '  name: string;',
    '  puzzle: string;',
    '  description: string;',
    '  algorithmCount: number;',
    '}',
    '',
    'export const featuredSets: FeaturedSetSummary[] = [',
    ...featured,
    '];',
    '',
  ].join('\n');

  const METADATA_FILE = resolve(DATA_DIR, 'metadata.ts');
  writeFileSync(METADATA_FILE, metadataContent, 'utf-8');
  console.log(`Wrote ${METADATA_FILE}`);

  // -----------------------------------------------------------------------
  // 4. Print statistics
  // -----------------------------------------------------------------------

  const totalAlgs = algorithmSets.reduce((sum, s) => sum + s.algorithms.length, 0);
  const puzzles = new Set(algorithmSets.map((s) => s.puzzle));
  const nonEmptySets = algorithmSets.filter((s) => s.algorithms.length > 0);
  const emptySets = algorithmSets.filter((s) => s.algorithms.length === 0);

  console.log('\n=== Knowledge Base Statistics ===');
  console.log(`  Algorithm sets:    ${algorithmSets.length} total (${nonEmptySets.length} with data, ${emptySets.length} empty)`);
  console.log(`  Total algorithms:  ${totalAlgs}`);
  console.log(`  Puzzles covered:   ${[...puzzles].join(', ') || 'none'}`);
  console.log(`  Methods:           ${methods.length}`);
  console.log(`  Hardware (cubes):  ${cubes?.length ?? 0}`);
  console.log(`  Hardware (lubes):  ${lubes?.length ?? 0}`);
  console.log(`  WCA records:       ${records?.length ?? 0} events`);
  console.log(`  Glossary terms:    ${glossary?.length ?? 0}`);
  console.log(`  Tips:              ${tips?.length ?? 0}`);
  console.log(`  Learning paths:    ${learningPaths?.length ?? 0}`);
  console.log('');

  // Per-set breakdown
  if (algorithmSets.length > 0) {
    console.log('  --- Algorithm Sets Breakdown ---');
    for (const set of algorithmSets) {
      const algCount = set.algorithms.length.toString().padStart(5);
      const status = set.algorithms.length > 0 ? 'OK' : 'EMPTY';
      console.log(`    ${set.name.padEnd(20)} ${set.puzzle.padEnd(10)} ${algCount} algs  [${status}]`);
    }
  }

  // Final status
  console.log('');
  if (errors.length > 0) {
    console.log(`RESULT: ${errors.length} error(s) found - review issues above`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`RESULT: Generated with ${warnings.length} warning(s)`);
  } else {
    console.log('RESULT: All data validated and index generated successfully!');
  }
}

main();
