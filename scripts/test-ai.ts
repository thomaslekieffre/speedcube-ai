/**
 * Comprehensive AI Chat Test Suite
 * Run: npx tsx scripts/test-ai.ts
 *
 * Tests algorithm formatting, language, conciseness, accuracy, edge cases.
 */
import fs from 'fs';
import path from 'path';

// Load .env
const envFile = fs.readFileSync(path.resolve('.env'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const API_KEY = process.env.VITE_OPENROUTER_API_KEY;
if (!API_KEY) { console.error('Missing VITE_OPENROUTER_API_KEY in .env'); process.exit(1); }

const MODELS = [
  'arcee-ai/trinity-large-preview:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'upstage/solar-pro-3:free',
];

const SYSTEM_PROMPT_FR = `Tu es SpeedCube AI, expert speedcubing. Réponds en FRANÇAIS.

RÈGLE ABSOLUE — HORS-SUJET:
Tu ne parles QUE de speedcubing (cubes, algorithmes, méthodes, hardware, compétitions WCA, records, techniques).
Si la question ne concerne PAS le speedcubing, réponds UNIQUEMENT: "Je suis spécialisé en speedcubing. Pose-moi une question sur les cubes, algorithmes ou méthodes !"
N'essaie JAMAIS de relier un sujet hors-sujet au speedcubing. Pas de blagues, pas de code, pas de géographie, pas de maths.

RÈGLES:
- Utilise UNIQUEMENT les données [DATA]. Cite noms, prix, notations, temps exacts.
- MAXIMUM 5 lignes. Sois direct et concis. NE LISTE PAS tout, choisis les éléments les plus pertinents.
- Format: **gras** pour les termes clés, \`backticks\` pour TOUTES les notations d'algorithmes (ex: \`R U R' U'\`), - pour les listes courtes.
- IMPORTANT: Mets TOUJOURS les notations cube entre backticks, jamais entre parenthèses.
- Données insuffisantes → dis-le en une phrase.`;

const SYSTEM_PROMPT_EN = `You are SpeedCube AI, speedcubing expert. Answer in ENGLISH.

ABSOLUTE RULE — OFF-TOPIC:
You ONLY talk about speedcubing (cubes, algorithms, methods, hardware, WCA competitions, records, techniques).
If the question is NOT about speedcubing, respond ONLY: "I specialize in speedcubing. Ask me about cubes, algorithms, or methods!"
NEVER try to connect an off-topic subject to speedcubing. No jokes, no code, no geography, no math.

RULES:
- Use ONLY [DATA]. Cite exact names, prices, notations, times.
- MAXIMUM 5 lines. Be direct and concise. DON'T list everything, pick the most relevant items.
- Format: **bold** for key terms, \`backticks\` for ALL algorithm notations (e.g. \`R U R' U'\`), - for short lists.
- IMPORTANT: ALWAYS wrap cube notations in backticks, never in parentheses.
- Data doesn't cover it → say so in one sentence.`;

// ---- Minimal context data (just enough for testing) ----
const CONTEXT = `RECORDS: 3x3 3.13s(Max Park)/4.48s(Max Park) | 2x2 0.43s(Teodor Zajder)/0.95s(Zayn Khanani) | 4x4 16.79s(Max Park)/19.64s(Max Park) | 3x3 OH 6.20s(Max Park)/8.40s(Max Park) | 3x3 BLD 14.51s(Tommy Cherry)/17.07s(Tommy Cherry)
ALGOS(4277): 3x3[OLL,PLL,F2L,COLL,CMLL,COLL,CPLL,EPLL,EOLL,OCLL,VLS,VHLS,WV,SV,OLLCP,ZBLL-T,ZBLL-U,ZBLL-L,ZBLL-H,ZBLL-Pi,ZBLL-S,ZBLL-AS,AntiPLL,CSP,SBLS,ELL,CLS,FRUF,EO4A,Beginner Last Layer] 2x2[CLL,EG1,EG-2,OLL,PBL,LEG-1,TCLL+,TCLL-,LS-1,LS-2,LS-3,LS-4,LS-5,LS-6,LS-7,LS-8,LS-9] Pyraminx[L3E,L4E,ML4E,TL4E-B,TL4E-R,L5E-Bad,KL5E,BL5E,L5E-HT,L5E-YY,Top First,Master] Megaminx[Mega OLL,Mega PLL,Mega CO,Mega CP,Mega EO,Mega EP] 4x4[OLL Parity,PLL Parity] SQ1[SQ1 CS,SQ1 CO,SQ1 EO,SQ1 CP,SQ1 EP,SQ1 Parity,SQ1 Lin PLL] Skewb[Sarah,Sarah's Advanced] 5x5[L2E,L2C] 6x6[L2E,L2C]
METHODS(76): beginner[LBL,Beginner] intermediate[CFOP-4LLL,Keyhole,Ortega,LBL 2x2] advanced[CFOP,Roux,ZZ,Petrus,CFOP-2LLL,Mehta,FreeFOP,CEOR,LEOR] expert[ZB,Nautilus,SSC,Briggs]
CUBES(975): MoYu(187),QiYi(134),GAN(98),YJ(72),DaYan(59),ShengShou(52),CuberSpeed(40),YuXin(38),X-Man Design(32),Cyclone Boys(28) | 3x3:458 $2.99-65.00 2x2:125 $2.99-36.99 4x4:102 $5.99-61.00
LUBES(31): Cubicle Labs Silk(Cubicle),Cubicle Labs DNM-37(Cubicle),Cubicle Labs Mystic(Cubicle),Weight 5(Cubicle),Lunar(SpeedCubeShop),Martian(SpeedCubeShop),Stardust(SpeedCubeShop),Angstrom Dignitas(Cubicle),Angstrom Gravitas(Cubicle)
PATHS(15): Sub-60→sub-1:00,Sub-30→sub-0:30,Sub-20→sub-0:20,Sub-10→sub-0:10
TIPS(55) GLOSSARY(170)

[ALGORITHM-SET] OLL (3x3)
OLL | 3x3 | 57 cases
Orientation of the Last Layer — orient all last-layer pieces in one step.
  OLL 1 (Dot): R U2 R2' F R F' U2 R' F R F' (11 ETM)
  OLL 2 (Dot): r U r' U2 r U2 R' U2 R U' r' (11 ETM)
  Sune: R U R' U R U2 R' (7 ETM)
  Anti-Sune: R U2 R' U' R U' R' (7 ETM)
  OLL 21 (H): R U2 R' U' R U R' U' R U' R' (11 ETM)

[ALGORITHM-SET] PLL (3x3)
PLL | 3x3 | 21 cases
Permutation of the Last Layer — permute all last-layer pieces in one step.
  T-Perm: R U R' U' R' F R2 U' R' U' R U R' F' (14 ETM)
  Y-Perm: F R U' R' U' R U R' F' R U R' U' R' F R F' (18 ETM)
  Ua-Perm: R U' R U R U R U' R' U' R2 (11 ETM)
  Ub-Perm: R2 U R U R' U' R' U' R' U R' (11 ETM)
  Jb-Perm: R U R' F' R U R' U' R' F R2 U' R' (13 ETM)

[ALGORITHM-SET] F2L (3x3)
F2L | 3x3 | 41 cases
First Two Layers — pair corners and edges to fill the first two layers simultaneously.
  F2L 1: U R U' R' (4 ETM)
  F2L 2: y' U' R' U R (4 ETM)

[ALGORITHM-SET] CLL (2x2)
CLL | 2x2 | 42 cases

[METHOD] CFOP
CFOP | advanced | ~55 moves
Cross, F2L, OLL, PLL — the most popular speedcubing method.
  1. Cross: Solve the first layer edges
  2. F2L: Pair corners and edges for the first two layers
  3. OLL: Orient the last layer (57 algorithms)
  4. PLL: Permute the last layer (21 algorithms)
Pros: Fast, well-documented, huge algorithm library
Cons: Many algorithms to learn (78 total), less intuitive
Users: Feliks Zemdegs, Max Park, Tymon Kolasinski

[METHOD] Roux
Roux | advanced | ~48 moves
Block-building method using M-slice moves, fewer algorithms needed.
  1. First Block: Build a 1x2x3 block on the left
  2. Second Block: Build a 1x2x3 block on the right
  3. CMLL: Orient and permute corners of the last layer (42 algorithms)
  4. LSE: Solve last six edges using M and U moves
Pros: Low move count, intuitive, ergonomic M moves
Cons: Harder lookahead, fewer resources than CFOP
Users: Kian Mansour, Sean Patrick Villanueva

[METHOD] ZZ
ZZ | advanced | ~45 moves
EO-first method — all edge orientation solved first, enabling efficient F2L.
  1. EOLine: Orient all edges and solve the DF and DB edges
  2. ZZF2L: Solve first two layers (R, U, L moves only)
  3. ZBLL/OCLL+PLL: Solve last layer
Pros: Very ergonomic (no rotations), efficient
Cons: Hard EOLine step, steep learning curve

[HARDWARE] GAN 14 MagLev Pro
GAN 14 MagLev Pro | GAN | 3x3 | $65.00 | flagship | ★4.6
MagLev, Core magnets, UV coating, Smart tracking

[HARDWARE] MoYu WeiLong WRM V10
MoYu WeiLong WRM V10 | MoYu | 3x3 | $28.99 | flagship | ★4.7
MagLev, UV coating, Core magnets

[HARDWARE] QiYi MS 3x3 M
QiYi MS 3x3 M | QiYi | 3x3 | $8.99 | budget | ★4.3
Magnetic, Frosted surface

[TIP] Cross Planning
Cross Planning | beginner
Plan the entire cross during inspection. Practice solving cross blindfolded.
- Identify edge positions and colors during the 15-second inspection
- Plan all 4 moves before starting
- Practice cross-only solves blindfolded`;

// ---- Client-side off-topic filter (mirrors src/lib/ai.ts) ----
const CUBING_KEYWORDS = /\b(cubes?|rubik|speed ?cub|3x3|2x2|4x4|5x5|6x6|7x7|megaminx|pyraminx|skewb|sq[- ]?1|square[- ]?1|oll|pll|f2l|cfop|roux|zz|petrus|mehta|fridrich|coll|cmll|zbll|wv|vls|cls|eg[- ]?[12]|cll|ell|zbls|vhls|winter variation|cross|last layer|first look|beginner|lbl|layer by layer|ortega|varasano|jperms?|alg|algos?|algorithms?|notation|scramble|solve|timer|inspection|dnf|dns|ao[0-9]|pb|wca|comp[eé]tition|gan|moyu|qiyi|dayan|yj|tornado|wrm|rs3m|tornado|mgc|magnets?|magn[eé]t|lubrifi|lube|setup|tensioning|corner ?cut|fingertrick|look ?ahead|tps|turns? per|blind|bld|fmc|oh|one[ -]?handed|feet|multi[ -]?bld|clock|xcross|slot|edge|corner|insert|trigger|sune|anti[ -]?sune|sexy move|r u r|backtick|sticker|speedcubedb|thecubicle|speedcubeshop|jperm|cubeskills|cyoubx|stabmat|stackmat|g[123]|t[ -]?perm|[rufldb][2']?\s[rufldb][2']?)\b/i;
const OFF_TOPIC_PATTERNS = [
  /\b(python|javascript|java|code|script|function|program|html|css|react|api|database|sql|loop|variable|class|import)\b/i,
  /\b(capitale|capital|pays|country|continent|president|population|montagne|mountain|river|rivi[eè]re|ocean|ville|city|planet|planète)\b/i,
  /\b(calcul|calculate|intégrale|integral|dérivée|derivative|équation|equation|racine carrée|square root|factori[sz]|logarithm|trigonometry)\b/i,
  /\b(blague|joke|histoire|story|raconte|tell me a|po[eè]me|poem|chanson|song|recette|recipe|riddle|devinette)\b/i,
  /\b(m[ée]decin|doctor|symptom|diagnos|avocat|lawyer|invest|bourse|stock|crypto|bitcoin)\b/i,
];

function isOffTopic(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 5) return false;
  if (CUBING_KEYWORDS.test(clean)) return false;
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(clean)) return true;
  }
  return false;
}

// ---- API call with model fallback ----
async function callAI(prompt: string, lang: 'fr' | 'en' = 'fr'): Promise<string> {
  // Client-side filter — same as production
  if (isOffTopic(prompt)) {
    return lang === 'fr'
      ? 'Je suis spécialisé en speedcubing. Pose-moi une question sur les cubes, algorithmes ou méthodes !'
      : 'I specialize in speedcubing. Ask me about cubes, algorithms, or methods!';
  }

  const systemPrompt = lang === 'fr' ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN;
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `[DATA]\n${CONTEXT}\n[/DATA]\n\n${prompt}` },
  ];

  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': 'https://speedcube-ai.test',
          'X-Title': 'SpeedCube AI Test',
        },
        body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.2 }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || '';
      if (content) return content;
    } catch { continue; }
  }
  return '[API_FAILED]';
}

// ---- Test definitions ----
interface Test {
  id: string;
  category: string;
  prompt: string;
  lang: 'fr' | 'en';
  checks: {
    keywords?: string[];        // At least one must appear
    algoBackticks?: boolean;    // If response has algo notation, must be in backticks
    noParenAlgos?: boolean;     // No algo notation in parentheses
    maxLines?: number;          // Max output lines
    langCheck?: 'fr' | 'en';   // Response must be in this language
    mustContain?: string[];     // ALL must appear (case-insensitive)
    mustNotContain?: string[];  // NONE should appear
  };
}

const tests: Test[] = [
  // ---- ALGO FORMATTING (critical) ----
  { id: 'AF1', category: 'Algo Format', prompt: "C'est quoi le T-Perm ?", lang: 'fr',
    checks: { algoBackticks: true, noParenAlgos: true, keywords: ['T-Perm', 'PLL'] } },
  { id: 'AF2', category: 'Algo Format', prompt: 'Donne-moi le Sune', lang: 'fr',
    checks: { algoBackticks: true, noParenAlgos: true, keywords: ['Sune', "R U R'"] } },
  { id: 'AF3', category: 'Algo Format', prompt: "Quels sont les cas OLL les plus importants ?", lang: 'fr',
    checks: { algoBackticks: true, noParenAlgos: true, keywords: ['OLL'] } },
  { id: 'AF4', category: 'Algo Format', prompt: 'Show me the Ua-Perm algorithm', lang: 'en',
    checks: { algoBackticks: true, noParenAlgos: true, keywords: ['Ua-Perm'] } },
  { id: 'AF5', category: 'Algo Format', prompt: 'Anti-Sune notation ?', lang: 'fr',
    checks: { algoBackticks: true, noParenAlgos: true, keywords: ["R U2 R'"] } },

  // ---- PRECISE / FACTUAL ----
  { id: 'PF1', category: 'Precise', prompt: 'Record du monde 3x3 single ?', lang: 'fr',
    checks: { mustContain: ['3.13', 'Max Park'] } },
  { id: 'PF2', category: 'Precise', prompt: 'World record 2x2 single?', lang: 'en',
    checks: { mustContain: ['0.43', 'Teodor'], langCheck: 'en' } },
  { id: 'PF3', category: 'Precise', prompt: 'Combien de cas en OLL ?', lang: 'fr',
    checks: { mustContain: ['57'] } },
  { id: 'PF4', category: 'Precise', prompt: 'Combien de cas en PLL ?', lang: 'fr',
    checks: { mustContain: ['21'] } },
  { id: 'PF5', category: 'Precise', prompt: 'How many F2L cases?', lang: 'en',
    checks: { mustContain: ['41'], langCheck: 'en' } },
  { id: 'PF6', category: 'Precise', prompt: 'Prix du GAN 14 MagLev Pro ?', lang: 'fr',
    checks: { mustContain: ['65'] } },
  { id: 'PF7', category: 'Precise', prompt: 'Record 3x3 OH single ?', lang: 'fr',
    checks: { mustContain: ['6.20', 'Max Park'] } },

  // ---- OPEN QUESTIONS ----
  { id: 'OQ1', category: 'Open', prompt: 'CFOP vs Roux, lequel choisir ?', lang: 'fr',
    checks: { keywords: ['CFOP', 'Roux'], maxLines: 8 } },
  { id: 'OQ2', category: 'Open', prompt: "Comment progresser en speedcubing ?", lang: 'fr',
    checks: { keywords: ['F2L', 'cross', 'croix', 'lookahead', 'practice', 'pratique'], maxLines: 8 } },
  { id: 'OQ3', category: 'Open', prompt: 'What is the best method for beginners?', lang: 'en',
    checks: { keywords: ['CFOP', 'LBL', 'beginner', 'Beginner'], langCheck: 'en', maxLines: 8 } },
  { id: 'OQ4', category: 'Open', prompt: 'Quel lube choisir ?', lang: 'fr',
    checks: { keywords: ['Silk', 'DNM', 'Weight', 'Lunar', 'lube', 'lubrifiant'], maxLines: 8 } },

  // ---- BEGINNER ----
  { id: 'BG1', category: 'Beginner', prompt: 'Je débute, par où commencer ?', lang: 'fr',
    checks: { keywords: ['LBL', 'croix', 'cross', 'F2L', 'débutant', 'beginner', 'commencer'], maxLines: 8 } },
  { id: 'BG2', category: 'Beginner', prompt: 'Meilleur cube pour débuter ?', lang: 'fr',
    checks: { keywords: ['QiYi', 'RS3M', 'budget', 'MoYu'], maxLines: 8 } },
  { id: 'BG3', category: 'Beginner', prompt: "C'est quoi le F2L ?", lang: 'fr',
    checks: { mustContain: ['F2L'], keywords: ['pair', 'paire', 'coin', 'arête', 'edge', 'corner', 'couche', 'layer'] } },

  // ---- ADVANCED / NICHE ----
  { id: 'AD1', category: 'Advanced', prompt: "Combien d'algos en ZBLL ?", lang: 'fr',
    checks: { keywords: ['ZBLL'] } },
  { id: 'AD2', category: 'Advanced', prompt: 'Explique la méthode ZZ', lang: 'fr',
    checks: { mustContain: ['ZZ'], keywords: ['EO', 'edge', 'arête', 'EOLine'] } },
  { id: 'AD3', category: 'Advanced', prompt: 'CLL pour le 2x2 ?', lang: 'fr',
    checks: { mustContain: ['CLL', '42'] } },
  { id: 'AD4', category: 'Advanced', prompt: 'Difference between CFOP 4LLL and full CFOP?', lang: 'en',
    checks: { keywords: ['4LLL', '2-look', 'OLL', 'PLL', '78', '57', '21'], langCheck: 'en' } },
  { id: 'AD5', category: 'Advanced', prompt: 'Algos pour le Square-1 ?', lang: 'fr',
    checks: { keywords: ['SQ1', 'Square-1', 'CS', 'CP', 'EP', 'Parity'] } },
  { id: 'AD6', category: 'Advanced', prompt: 'Sets dispo pour le Pyraminx ?', lang: 'fr',
    checks: { keywords: ['L3E', 'L4E', 'ML4E', 'Pyraminx', 'Top First'] } },
  { id: 'AD7', category: 'Advanced', prompt: 'Mehta method overview', lang: 'en',
    checks: { keywords: ['Mehta'], langCheck: 'en' } },

  // ---- HARDWARE ----
  { id: 'HW1', category: 'Hardware', prompt: 'Meilleur cube 3x3 flagship ?', lang: 'fr',
    checks: { keywords: ['GAN', 'MoYu', 'WeiLong', 'flagship'] } },
  { id: 'HW2', category: 'Hardware', prompt: 'Cube 3x3 pas cher ?', lang: 'fr',
    checks: { keywords: ['QiYi', 'budget', 'RS3M', '$'], maxLines: 8 } },
  { id: 'HW3', category: 'Hardware', prompt: 'Flagship vs budget cube?', lang: 'en',
    checks: { keywords: ['flagship', 'budget', 'GAN', 'QiYi', 'MoYu'], langCheck: 'en' } },
  { id: 'HW4', category: 'Hardware', prompt: 'Quelle est la différence entre les lubes Silk et DNM-37 ?', lang: 'fr',
    checks: { keywords: ['Silk', 'DNM'] } },

  // ---- LANGUAGE ----
  { id: 'LG1', category: 'Language', prompt: 'Salut ! Quels sont les meilleurs algos PLL ?', lang: 'fr',
    checks: { langCheck: 'fr', keywords: ['PLL'] } },
  { id: 'LG2', category: 'Language', prompt: 'How many cubes are in the database?', lang: 'en',
    checks: { langCheck: 'en', keywords: ['975'] } },
  { id: 'LG3', category: 'Language', prompt: 'What is the Roux method?', lang: 'en',
    checks: { langCheck: 'en', keywords: ['Roux', 'block'] } },

  // ---- CONCISENESS ----
  { id: 'CC1', category: 'Concise', prompt: "Explique-moi TOUT sur le CFOP", lang: 'fr',
    checks: { maxLines: 8 } },
  { id: 'CC2', category: 'Concise', prompt: 'List all PLL algorithms', lang: 'en',
    checks: { maxLines: 8 } },
  { id: 'CC3', category: 'Concise', prompt: "Donne-moi tous les records du monde", lang: 'fr',
    checks: { maxLines: 8 } },

  // ---- OFF-TOPIC (caught by client-side filter before API call) ----
  { id: 'OT1', category: 'Off-topic', prompt: "Quelle est la capitale de la France ?", lang: 'fr',
    checks: { keywords: ['spécialisé', 'speedcubing'], mustNotContain: ['Paris'] } },
  { id: 'OT2', category: 'Off-topic', prompt: 'Write me a Python script', lang: 'en',
    checks: { keywords: ['specialize', 'speedcubing'], mustNotContain: ['def ', 'import ', 'print('] } },
  { id: 'OT3', category: 'Off-topic', prompt: 'Raconte-moi une blague', lang: 'fr',
    checks: { keywords: ['spécialisé', 'speedcubing'] } },

  // ---- EDGE CASES ----
  { id: 'EC1', category: 'Edge', prompt: 'oll', lang: 'fr',
    checks: { keywords: ['OLL', '57'] } },
  { id: 'EC2', category: 'Edge', prompt: 'pll t perm', lang: 'fr',
    checks: { algoBackticks: true, keywords: ['T-Perm'] } },
  { id: 'EC3', category: 'Edge', prompt: '???', lang: 'fr',
    checks: {} },
  { id: 'EC4', category: 'Edge', prompt: 'sub 20 tips', lang: 'fr',
    checks: { keywords: ['sub', 'F2L', 'cross', 'croix', 'lookahead', 'Sub-20'] } },
];

// ---- Check helpers ----
const ALGO_PAREN_RE = /\(([RUFDLBMESrufdbxyz][RUFDLBMESrufdbxyz\s2'()]{4,})\)/g;
const ALGO_BACKTICK_RE = /`([^`]+)`/g;
const ALGO_CHARS_RE = /^[RUFDLBMESrufdbxyz\s2'()]+$/;

function hasAlgoInParens(text: string): boolean {
  let match;
  ALGO_PAREN_RE.lastIndex = 0;
  while ((match = ALGO_PAREN_RE.exec(text)) !== null) {
    if (ALGO_CHARS_RE.test(match[1].trim())) return true;
  }
  return false;
}

function hasAlgoInBackticks(text: string): boolean {
  let match;
  ALGO_BACKTICK_RE.lastIndex = 0;
  while ((match = ALGO_BACKTICK_RE.exec(text)) !== null) {
    if (ALGO_CHARS_RE.test(match[1].trim()) && match[1].trim().length >= 5) return true;
  }
  return false;
}

function isFrench(text: string): boolean {
  return /[àâéèêëïîôùûüçæœ]|\b(est|sont|les|des|une|pour|dans|avec|pas|qui|que)\b/i.test(text);
}

function isEnglish(text: string): boolean {
  return /\b(the|is|are|for|with|not|this|that|can|will|from)\b/i.test(text);
}

// ---- Run tests ----
async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  SpeedCube AI Test Suite — ${tests.length} tests`);
  console.log(`${'='.repeat(70)}\n`);

  let passed = 0, warned = 0, failed = 0;
  const issues: string[] = [];

  for (const t of tests) {
    process.stdout.write(`  [${t.id}] ${t.category.padEnd(12)} ${t.prompt.slice(0, 45).padEnd(47)}`);

    const response = await callAI(t.prompt, t.lang);

    if (response === '[API_FAILED]') {
      console.log('⚠ API_FAILED');
      warned++;
      issues.push(`${t.id}: API failed`);
      continue;
    }

    const lines = response.split('\n').filter(l => l.trim()).length;
    const problems: string[] = [];
    const warnings: string[] = [];

    // Check: algo in backticks
    if (t.checks.algoBackticks) {
      const hasBacktickAlgo = hasAlgoInBackticks(response);
      // Only fail if response seems to contain algo notation but not in backticks
      const rawAlgoPattern = /[RUFDLB][RUFDLB\s2']{4,}/;
      if (!hasBacktickAlgo && rawAlgoPattern.test(response)) {
        problems.push('ALGO NOT IN BACKTICKS');
      }
    }

    // Check: no algo in parentheses
    if (t.checks.noParenAlgos && hasAlgoInParens(response)) {
      problems.push('ALGO IN PARENTHESES');
    }

    // Check: max lines
    if (t.checks.maxLines && lines > t.checks.maxLines) {
      warnings.push(`${lines} lines (max ${t.checks.maxLines})`);
    }

    // Check: keywords (at least one)
    if (t.checks.keywords && t.checks.keywords.length > 0) {
      const lower = response.toLowerCase();
      const found = t.checks.keywords.some(kw => lower.includes(kw.toLowerCase()));
      if (!found) problems.push(`MISSING keywords: ${t.checks.keywords.join('|')}`);
    }

    // Check: mustContain (all required)
    if (t.checks.mustContain) {
      const lower = response.toLowerCase();
      const missing = t.checks.mustContain.filter(kw => !lower.includes(kw.toLowerCase()));
      if (missing.length > 0) problems.push(`MISSING: ${missing.join(', ')}`);
    }

    // Check: mustNotContain
    if (t.checks.mustNotContain) {
      const lower = response.toLowerCase();
      const found = t.checks.mustNotContain.filter(kw => lower.includes(kw.toLowerCase()));
      if (found.length > 0) problems.push(`UNWANTED: ${found.join(', ')}`);
    }

    // Check: language
    if (t.checks.langCheck === 'fr' && !isFrench(response) && isEnglish(response)) {
      warnings.push('LANG: expected FR, got EN');
    }
    if (t.checks.langCheck === 'en' && !isEnglish(response) && isFrench(response)) {
      warnings.push('LANG: expected EN, got FR');
    }

    // Result
    if (problems.length > 0) {
      console.log(`✗ ${problems.join(' | ')}`);
      failed++;
      issues.push(`${t.id}: ${problems.join(' | ')}\n     "${response.slice(0, 120)}..."`);
    } else if (warnings.length > 0) {
      console.log(`⚠ ${warnings.join(' | ')}`);
      warned++;
    } else {
      console.log('✓');
      passed++;
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 2500));
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  RESULTS: ${passed} passed, ${warned} warnings, ${failed} failed / ${tests.length} total`);
  console.log(`${'='.repeat(70)}`);

  if (issues.length > 0) {
    console.log('\n  ISSUES:');
    for (const issue of issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log('');
}

runTests();
