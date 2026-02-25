/**
 * Debug: shows exactly what the AI receives.
 * Run: npx tsx scripts/debug-ai-context.ts "ta question"
 */
import { pathToFileURL } from 'url';
import path from 'path';

const dataPath = pathToFileURL(path.resolve('src/data/index.js')).href;
const { algorithmSets, methods, tips, glossary, learningPaths, cubes, lubes, records } = await import(dataPath);

function normalize(t: string) { return t.replace(/[×✕✖]/g, 'x').replace(/[€$£]/g, ' ').trim(); }

const topicSignals: Record<string, string[]> = {
  hardware: ['cube', 'speedcube', 'hardware', 'lube', 'magnet', 'prix', 'budget', 'flagship', 'premium', 'marque', 'acheter', 'cher', 'gan', 'moyu', 'qiyi'],
  methods: ['method', 'methode', 'cfop', 'roux', 'zz', 'petrus', 'fridrich', 'solve', 'resoudre'],
  algorithms: ['algorithm', 'algo', 'oll', 'pll', 'f2l', 'coll', 'cmll', 'zbll', 'cll', 'eoll', 'ocll', 'notation', 'etm', 'set'],
  records: ['record', 'wca', 'world', 'fastest', 'single', 'average'],
  tips: ['tip', 'astuce', 'conseil', 'fingertrick', 'lookahead', 'progresser'],
  learning: ['learn', 'apprendre', 'beginner', 'debutant', 'debuter', 'commencer', 'sub'],
};

function detectTopics(text: string) {
  const lower = normalize(text).toLowerCase();
  return Object.entries(topicSignals)
    .map(([topic, signals]) => [topic, signals.filter(s => lower.includes(s)).length] as [string, number])
    .filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

// Build summaries
const A = algorithmSets as any[], M = methods as any[], C = cubes as any[], L = lubes as any[];
const R = records as any[], T = tips as any[], G = glossary as any[], P = learningPaths as any[];
const totalAlgos = A.reduce((s: number, x: any) => s + x.algorithms.length, 0);
const parts: string[] = [];

parts.push('RECORDS: ' + R.map((r: any) =>
  `${r.event} ${r.single.time}(${r.single.holder})/${r.average.time || 'N/A'}(${r.average.holder || 'N/A'})`
).join(' | '));

const byPuzzle: Record<string, string[]> = {};
for (const s of A) { if (!byPuzzle[s.puzzle]) byPuzzle[s.puzzle] = []; byPuzzle[s.puzzle].push(s.name); }
parts.push(`ALGOS(${totalAlgos}): ` + Object.entries(byPuzzle).map(([p, s]) => `${p}[${s.join(',')}]`).join(' '));

const byDiff: Record<string, string[]> = {};
for (const m of M) { if (!byDiff[m.difficulty]) byDiff[m.difficulty] = []; byDiff[m.difficulty].push(m.name); }
parts.push(`METHODS(${M.length}): ` + Object.entries(byDiff).map(([d, m]) => `${d}[${m.join(',')}]`).join(' '));

const bc: Record<string, number> = {};
const pp: Record<string, { min: number; max: number; count: number }> = {};
for (const c of C) {
  bc[c.brand] = (bc[c.brand] || 0) + 1;
  const pr = parseFloat(c.price.replace(/[^0-9.]/g, '')) || 0;
  if (!pp[c.puzzle]) pp[c.puzzle] = { min: pr, max: pr, count: 0 };
  pp[c.puzzle].min = Math.min(pp[c.puzzle].min, pr);
  pp[c.puzzle].max = Math.max(pp[c.puzzle].max, pr);
  pp[c.puzzle].count++;
}
parts.push(`CUBES(${C.length}): ${Object.entries(bc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([b, n]) => `${b}(${n})`).join(',')} | ${Object.entries(pp).map(([p, d]) => `${p}:${d.count} $${d.min}-${d.max}`).join(' ')}`);
parts.push(`LUBES(${L.length}): ${L.map((l: any) => `${l.name}(${l.brand})`).join(',')}`);
parts.push(`PATHS(${P.length}): ${P.map((p: any) => `${p.name}→${p.target}`).join(',')}`);
parts.push(`TIPS(${T.length}) GLOSSARY(${G.length})`);

const summaries = parts.join('\n');
const query = process.argv[2] || 'quel cube 3x3 pour débuter ?';
const topics = detectTopics(query);

console.log('=== QUERY: ' + query);
console.log('=== TOPICS: ' + (topics.join(', ') || '(none)'));
console.log('\n--- SUMMARIES (toujours envoyé au modèle) ---\n');
console.log(summaries);
console.log(`\n--- ${summaries.length} chars (~${Math.round(summaries.length / 4)} tokens) ---`);
