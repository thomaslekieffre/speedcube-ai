import { algorithmSets, methods, tips, glossary, learningPaths, cubes, lubes, records } from '@/data';

interface SearchChunk {
  type: 'algorithm-set' | 'algorithm' | 'method' | 'tip' | 'glossary' | 'learning-path' | 'hardware' | 'record';
  title: string;
  content: string;
  score: number;
}

export type Topic = 'hardware' | 'methods' | 'algorithms' | 'records' | 'tips' | 'learning' | 'glossary' | 'general';

const topicSignals: Record<Topic, string[]> = {
  hardware: ['cube', 'speedcube', 'hardware', 'lube', 'lubricant', 'magnet', 'maglev', 'price', 'prix', 'budget', 'flagship', 'premium', 'brand', 'marque', 'acheter', 'cher', 'gan', 'moyu', 'qiyi', 'yj', 'dayan', 'xmd', 'tornado', 'weilong', 'tengyun', 'rs3m', 'valk', 'tier', 'dollar', 'euro'],
  methods: ['method', 'methode', 'cfop', 'roux', 'zz', 'petrus', 'fridrich', 'steps', 'solve', 'resoudre', 'resolution'],
  algorithms: ['algorithm', 'algo', 'oll', 'pll', 'f2l', 'coll', 'cmll', 'zbll', 'cll', 'eoll', 'ocll', 'epll', 'cpll', 'notation', 'etm'],
  records: ['record', 'wca', 'world', 'fastest', 'single', 'average', 'competition'],
  tips: ['tip', 'astuce', 'conseil', 'fingertrick', 'lookahead', 'practice', 'improve', 'progresser', 'ameliorer'],
  learning: ['learn', 'apprendre', 'path', 'milestone', 'beginner', 'debutant', 'debuter', 'commencer', 'sub-', 'passer sub'],
  glossary: ['definition', 'terme', 'glossary', 'glossaire', 'signifie', 'quoi'],
  general: [],
};

function normalize(text: string): string {
  return text
    .replace(/[×✕✖]/g, 'x')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[€$£]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectTopics(text: string): Topic[] {
  const lower = normalize(text).toLowerCase();
  const scores: [Topic, number][] = [];
  for (const [topic, signals] of Object.entries(topicSignals) as [Topic, string[]][]) {
    if (topic === 'general') continue;
    let score = 0;
    for (const signal of signals) {
      if (lower.includes(signal)) score++;
    }
    if (score > 0) scores.push([topic, score]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  return scores.filter(([, s]) => s > 0).map(([t]) => t);
}

const synonyms: Record<string, string[]> = {
  'cube': ['cube', '3x3', 'speedcube', 'hardware'],
  'speedcube': ['cube', '3x3', 'speedcube'],
  'lubrifiant': ['lube', 'lubricant'], 'lube': ['lube', 'lubricant'],
  'methode': ['method'], 'méthode': ['method'],
  'algorithme': ['algorithm'], 'algo': ['algorithm'], 'algos': ['algorithm'],
  'cfop': ['cfop', 'fridrich', 'f2l', 'oll', 'pll'],
  'roux': ['roux', 'cmll', 'lse'], 'zz': ['zz', 'eoline', 'zbll'],
  'f2l': ['f2l', 'pair'],
  'oll': ['oll', 'orient', 'eoll', 'ocll'],
  'pll': ['pll', 'permut', 'epll', 'cpll'],
  'cll': ['cll', '2x2'], 'eg': ['eg', 'eg1', 'eg2', '2x2'],
  'eoll': ['eoll', 'oll', 'cross'], 'ocll': ['ocll', 'oll'],
  'epll': ['epll', 'pll'], 'cpll': ['cpll', 'pll'],
  '2x2': ['2x2', 'pocket'], '4x4': ['4x4'], '5x5': ['5x5'], '6x6': ['6x6'],
  'pyraminx': ['pyraminx'], 'megaminx': ['megaminx'],
  'skewb': ['skewb'], 'square-1': ['square-1', 'sq1'], 'sq1': ['square-1', 'sq1'],
  'astuce': ['tip'], 'conseil': ['tip'],
  'apprendre': ['learn', 'beginner'], 'débuter': ['beginner'], 'debuter': ['beginner'],
  'débutant': ['beginner'], 'debutant': ['beginner'],
  'progresser': ['improve', 'progress'], 'passer': ['improve', 'sub'],
  'améliorer': ['improve'], 'ameliorer': ['improve'],
  'rapide': ['fast', 'speed'], 'meilleur': ['best', 'top'], 'meilleurs': ['best', 'top'],
  'record': ['record', 'wca'], 'records': ['record', 'wca'],
  'résoudre': ['solve', 'method'], 'resoudre': ['solve', 'method'],
  'croix': ['cross', 'eoll'], 'coins': ['corner'], 'coin': ['corner'],
  'arêtes': ['edge'], 'aretes': ['edge'], 'couche': ['layer'],
  'aveugle': ['blind', 'bld'], 'wca': ['wca', 'record'],
  'matériel': ['hardware', 'cube'], 'materiel': ['hardware', 'cube'],
  'aimants': ['magnet'], 'magnétique': ['magnet'],
  'prix': ['price', 'budget'], 'budget': ['budget', 'cheap'],
  'flagship': ['flagship', 'premium'], 'maglev': ['maglev', 'magnet'],
  'chrono': ['timer'], 'timer': ['timer'], 'moyenne': ['average'],
  'sub': ['sub', 'target'], 'commencer': ['beginner', 'learn'],
};

function tokenize(text: string): string[] {
  const normalized = normalize(text);
  const raw = normalized.toLowerCase().split(/[\s,.'"\/()[\]{}\-_:;!?]+/).filter(t => t.length > 1);
  const expanded: string[] = [...raw];
  for (const token of raw) {
    const syns = synonyms[token];
    if (syns) expanded.push(...syns);
  }
  return [...new Set(expanded)];
}

function scoreMatch(tokens: string[], target: string): number {
  const lower = target.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) {
      score += token.length > 3 ? 2 : 1;
      if (new RegExp(`\\b${token}\\b`, 'i').test(target)) score += 1;
    }
  }
  return score;
}

// ============================================================
// Pre-compiled category summaries — built once, cached forever.
// These are compact enough to always fit in context (~2K chars total).
// ============================================================

let _categorySummaries: string | null = null;

export function getCategorySummaries(): string {
  if (_categorySummaries) return _categorySummaries;

  const totalAlgos = algorithmSets.reduce((sum, s) => sum + s.algorithms.length, 0);
  const parts: string[] = [];

  // Records — ALL (17 entries, ~50 chars each = ~850 chars)
  parts.push('RECORDS: ' + records.map(r =>
    `${r.event} ${r.single.time}(${r.single.holder})/${r.average.time}(${r.average.holder})`
  ).join(' | '));

  // Algo sets by puzzle — names only
  const byPuzzle: Record<string, string[]> = {};
  for (const s of algorithmSets) {
    if (!byPuzzle[s.puzzle]) byPuzzle[s.puzzle] = [];
    byPuzzle[s.puzzle].push(s.name);
  }
  parts.push(`ALGOS(${totalAlgos}): ` + Object.entries(byPuzzle).map(([p, s]) => `${p}[${s.join(',')}]`).join(' '));

  // Methods by difficulty
  const byDiff: Record<string, string[]> = {};
  for (const m of methods) {
    if (!byDiff[m.difficulty]) byDiff[m.difficulty] = [];
    byDiff[m.difficulty].push(m.name);
  }
  parts.push(`METHODS(${methods.length}): ` + Object.entries(byDiff).map(([d, m]) => `${d}[${m.join(',')}]`).join(' '));

  // Cubes — brands with counts + price ranges per puzzle
  const brandCount: Record<string, number> = {};
  const puzzlePrices: Record<string, { min: number; max: number; count: number }> = {};
  for (const c of cubes) {
    brandCount[c.brand] = (brandCount[c.brand] || 0) + 1;
    const price = parseFloat(c.price.replace(/[^0-9.]/g, '')) || 0;
    if (!puzzlePrices[c.puzzle]) puzzlePrices[c.puzzle] = { min: price, max: price, count: 0 };
    puzzlePrices[c.puzzle].min = Math.min(puzzlePrices[c.puzzle].min, price);
    puzzlePrices[c.puzzle].max = Math.max(puzzlePrices[c.puzzle].max, price);
    puzzlePrices[c.puzzle].count++;
  }
  const topBrands = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([b, n]) => `${b}(${n})`);
  const priceRanges = Object.entries(puzzlePrices).map(([p, d]) => `${p}:${d.count} $${d.min}-${d.max}`);
  parts.push(`CUBES(${cubes.length}): ${topBrands.join(',')} | ${priceRanges.join(' ')}`);

  // Lubes — all names
  parts.push(`LUBES(${lubes.length}): ${lubes.map(l => `${l.name}(${l.brand})`).join(',')}`);

  // Paths
  parts.push(`PATHS(${learningPaths.length}): ${learningPaths.map(p => `${p.name}→${p.target}`).join(',')}`);

  // Tips + glossary
  parts.push(`TIPS(${tips.length}) GLOSSARY(${glossary.length})`);

  _categorySummaries = parts.join('\n');
  return _categorySummaries;
}

// ============================================================
// Search — returns detailed data matching the query + topics
// ============================================================

export function searchKnowledge(query: string, maxChunks = 12, activeTopics: Topic[] = []): string {
  const tokens = tokenize(query);
  if (tokens.length === 0 && activeTopics.length === 0) return '';

  const chunks: SearchChunk[] = [];
  const includedAlgoSets = new Set<string>();
  const hasTopic = (t: Topic) => activeTopics.includes(t);

  // --- Topic injection ---

  if (hasTopic('records')) {
    for (const r of records) {
      chunks.push({
        type: 'record', title: r.event, score: 50,
        content: `${r.event}: Single ${r.single.time} by ${r.single.holder} (${r.single.nationality}, ${r.single.date}) | Avg ${r.average.time} by ${r.average.holder} (${r.average.nationality}, ${r.average.date})`,
      });
    }
  }

  if (hasTopic('hardware')) {
    // Filter by puzzle if mentioned, limit to 12
    const puzzleToken = tokens.find(t => ['2x2', '3x3', '4x4', '5x5', 'pyraminx', 'megaminx', 'skewb', 'square-1'].includes(t));
    let pool = [...cubes];
    if (puzzleToken) pool = pool.filter(c => c.puzzle.toLowerCase().includes(puzzleToken));
    pool = pool.filter(c => c.rating).sort((a, b) => b.rating! - a.rating!).slice(0, 12);
    for (const c of pool) {
      chunks.push({
        type: 'hardware', title: c.name, score: 40 + (c.rating || 0),
        content: `${c.name} | ${c.brand} | ${c.puzzle} | ${c.price} | ${c.tier}${c.rating ? ` | ★${c.rating}` : ''}\n${c.features.join(', ')}`,
      });
    }
  }

  // --- Keyword search ---

  for (const set of algorithmSets) {
    const text = `${set.name} ${set.puzzle} ${set.description} ${set.category}`;
    const score = scoreMatch(tokens, text) + (hasTopic('algorithms') ? 3 : 0);
    if (score > (hasTopic('algorithms') ? 2 : 0)) {
      const algoList = set.algorithms.slice(0, 5).map(a => `  ${a.name}: ${a.notation} (${a.moveCount} ETM)`).join('\n');
      chunks.push({
        type: 'algorithm-set', title: `${set.name} (${set.puzzle})`, score: score + 2,
        content: `${set.name} | ${set.puzzle} | ${set.algorithms.length} cases\n${set.description}\n${algoList}${set.algorithms.length > 5 ? `\n  +${set.algorithms.length - 5} more` : ''}`,
      });
      includedAlgoSets.add(set.name);
    }
  }

  for (const set of algorithmSets) {
    if (includedAlgoSets.has(set.name)) continue;
    for (const algo of set.algorithms) {
      const s = scoreMatch(tokens, `${algo.name} ${algo.notation} ${algo.subset || ''} ${set.name}`);
      if (s > 1) {
        chunks.push({
          type: 'algorithm', title: `${algo.name} (${set.name})`, score: s,
          content: `${algo.name} | ${set.name} | ${set.puzzle}\n${algo.notation} (${algo.moveCount} ETM)${algo.alternatives.length ? `\nAlts: ${algo.alternatives.slice(0, 2).map(a => a.notation).join(' | ')}` : ''}`,
        });
      }
    }
  }

  for (const method of methods) {
    const text = `${method.name} ${method.description} ${method.difficulty} ${method.pros.join(' ')} ${method.cons.join(' ')} ${method.steps.map(s => s.name).join(' ')}`;
    const score = scoreMatch(tokens, text) + (hasTopic('methods') ? 3 : 0);
    if (score > 0) {
      const steps = method.steps.map((s, i) => `  ${i + 1}. ${s.name}: ${s.description}`).join('\n');
      chunks.push({
        type: 'method', title: method.name, score: score + 1,
        content: `${method.name} | ${method.difficulty}${method.avgMoveCount ? ` | ~${method.avgMoveCount} moves` : ''}\n${method.description}\n${steps}\nPros: ${method.pros.join(', ')}\nCons: ${method.cons.join(', ')}${method.notableUsers.length ? `\nUsers: ${method.notableUsers.join(', ')}` : ''}`,
      });
    }
  }

  for (const tip of tips) {
    const text = `${tip.title} ${tip.description} ${tip.content} ${tip.keyPoints.join(' ')} ${tip.category} ${tip.level}`;
    const score = scoreMatch(tokens, text) + (hasTopic('tips') ? 2 : 0);
    if (score > 0) {
      chunks.push({
        type: 'tip', title: tip.title, score: score + 1,
        content: `${tip.title} | ${tip.level}\n${tip.description}\n${tip.keyPoints.map(p => `- ${p}`).join('\n')}`,
      });
    }
  }

  for (const term of glossary) {
    const s = scoreMatch(tokens, `${term.term} ${term.definition} ${term.category}`);
    if (s > 0) {
      chunks.push({
        type: 'glossary', title: term.term, score: s,
        content: `${term.term}: ${term.definition}${term.relatedTerms ? ` (→ ${term.relatedTerms.join(', ')})` : ''}`,
      });
    }
  }

  for (const path of learningPaths) {
    const text = `${path.name} ${path.target} ${path.description} ${path.milestones.map(m => `${m.name} ${m.description} ${m.skills.join(' ')}`).join(' ')}`;
    const score = scoreMatch(tokens, text) + (hasTopic('learning') ? 3 : 0);
    if (score > 0) {
      const milestones = path.milestones.map(m => `  ${m.name} (${m.target}, ~${m.estimatedTime}): ${m.skills.join(', ')}`).join('\n');
      chunks.push({
        type: 'learning-path', title: path.name, score: score + 1,
        content: `${path.name} → ${path.target}\n${path.description}\n${milestones}`,
      });
    }
  }

  if (!hasTopic('hardware')) {
    for (const cube of cubes) {
      const s = scoreMatch(tokens, `${cube.name} ${cube.brand} ${cube.puzzle} ${cube.features.join(' ')} ${cube.tier}`);
      if (s > 0) {
        chunks.push({
          type: 'hardware', title: cube.name, score: s,
          content: `${cube.name} | ${cube.brand} | ${cube.puzzle} | ${cube.price} | ${cube.tier}${cube.rating ? ` | ★${cube.rating}` : ''}\n${cube.features.join(', ')}`,
        });
      }
    }
  }

  for (const lube of lubes) {
    const s = scoreMatch(tokens, `${lube.name} ${lube.brand} ${lube.description} ${lube.bestFor.join(' ')} ${lube.type} ${lube.viscosity}`);
    if (s > 0) {
      chunks.push({
        type: 'hardware', title: lube.name, score: s + (hasTopic('hardware') ? 2 : 0),
        content: `${lube.name} | ${lube.brand} | ${lube.type} ${lube.viscosity} | ${lube.price}\n${lube.bestFor.join(', ')}`,
      });
    }
  }

  if (!hasTopic('records')) {
    for (const r of records) {
      const s = scoreMatch(tokens, `${r.event} ${r.single.holder} ${r.average.holder} record world`);
      if (s > 0) {
        chunks.push({
          type: 'record', title: r.event, score: s,
          content: `${r.event}: Single ${r.single.time} (${r.single.holder}) | Avg ${r.average.time} (${r.average.holder})`,
        });
      }
    }
  }

  chunks.sort((a, b) => b.score - a.score);
  return chunks.slice(0, maxChunks).map(c => `[${c.type.toUpperCase()}] ${c.title}\n${c.content}`).join('\n\n');
}
