import { searchKnowledge, getCategorySummaries, detectTopics, type Topic } from './knowledgeSearch';

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

const FREE_MODELS = [
  'arcee-ai/trinity-large-preview:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'upstage/solar-pro-3:free',
];

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) throw new Error('VITE_OPENROUTER_API_KEY not set');
  return key;
}

export function isConfigured(): boolean {
  return !!import.meta.env.VITE_OPENROUTER_API_KEY;
}

// --- Client-side off-topic filter (catches obvious non-speedcubing questions before API call) ---

// Speedcubing keywords — if ANY of these appear, the question is on-topic
const CUBING_KEYWORDS = /\b(cubes?|rubik|speed ?cub|3x3|2x2|4x4|5x5|6x6|7x7|megaminx|pyraminx|skewb|sq[- ]?1|square[- ]?1|oll|pll|f2l|cfop|roux|zz|petrus|mehta|fridrich|coll|cmll|zbll|wv|vls|cls|eg[- ]?[12]|cll|ell|zbls|vhls|winter variation|cross|last layer|first look|beginner|lbl|layer by layer|ortega|varasano|jperms?|alg|algos?|algorithms?|notation|scramble|solve|timer|inspection|dnf|dns|ao[0-9]|pb|wca|comp[eé]tition|gan|moyu|qiyi|dayan|yj|tornado|wrm|rs3m|tornado|mgc|magnets?|magn[eé]t|lubrifi|lube|setup|tensioning|corner ?cut|fingertrick|look ?ahead|tps|turns? per|blind|bld|fmc|oh|one[ -]?handed|feet|multi[ -]?bld|clock|xcross|slot|edge|corner|insert|trigger|sune|anti[ -]?sune|sexy move|r u r|backtick|sticker|speedcubedb|thecubicle|speedcubeshop|jperm|cubeskills|cyoubx|stabmat|stackmat|g[123]|t[ -]?perm|[rufldb][2']?\s[rufldb][2']?)\b/i;

// Off-topic patterns — if ALL words match these categories and NO cubing keyword is found
const OFF_TOPIC_PATTERNS = [
  // Programming / code
  /\b(python|javascript|java|code|script|function|program|html|css|react|api|database|sql|loop|variable|class|import)\b/i,
  // Geography / general knowledge
  /\b(capitale|capital|pays|country|continent|president|population|montagne|mountain|river|rivi[eè]re|ocean|ville|city|planet|planète)\b/i,
  // Math (not related to cubing)
  /\b(calcul|calculate|intégrale|integral|dérivée|derivative|équation|equation|racine carrée|square root|factori[sz]|logarithm|trigonometry)\b/i,
  // Jokes / stories / creative
  /\b(blague|joke|histoire|story|raconte|tell me a|po[eè]me|poem|chanson|song|recette|recipe|riddle|devinette)\b/i,
  // Medical / legal / finance
  /\b(m[ée]decin|doctor|symptom|diagnos|avocat|lawyer|invest|bourse|stock|crypto|bitcoin)\b/i,
];

const OFF_TOPIC_RESPONSE_FR = 'Je suis spécialisé en speedcubing. Pose-moi une question sur les cubes, algorithmes ou méthodes !';
const OFF_TOPIC_RESPONSE_EN = 'I specialize in speedcubing. Ask me about cubes, algorithms, or methods!';

function isOffTopic(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 5) return false;

  // If any cubing keyword is present → on-topic
  if (CUBING_KEYWORDS.test(clean)) return false;

  // Check if the question matches off-topic patterns
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(clean)) return true;
  }

  return false;
}

function isRetryableError(message: string): boolean {
  return (
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('rate') ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('503') ||
    message.includes('unavailable')
  );
}

// Category summaries are pre-compiled and cached
let _summaries: string | null = null;
function getSummaries(): string {
  if (!_summaries) _summaries = getCategorySummaries();
  return _summaries;
}

// Detect user language from text (and conversation context)
function detectLanguage(text: string, conversationText?: string): 'fr' | 'en' {
  const frPattern = /[àâéèêëïîôùûüçæœ]|(\b(je|tu|il|elle|nous|vous|ils|quel|quoi|comment|pour|avec|dans|des|les|une|est|sont|pas|quels|quelle|moi|mon|mes|ton|tes|combien|meilleur|cube|salut|bonjour)\b)/i;
  // Check current message first
  if (frPattern.test(text)) return 'fr';
  // Check explicit English markers
  const enPattern = /\b(how|what|who|which|explain|the|please|could|should|would|give|show|best|tell)\b/i;
  if (enPattern.test(text)) return 'en';
  // Ambiguous (e.g. "CFOP vs Roux") — check conversation history for language hints
  if (conversationText && frPattern.test(conversationText)) return 'fr';
  // Default to French (primary user language)
  return 'fr';
}

async function callModel(
  model: string,
  apiKey: string,
  messages: { role: string; content: string }[],
  onChunk?: (text: string) => void,
): Promise<string> {
  const body = {
    model,
    messages,
    max_tokens: 300,
    temperature: 0.2,
    stream: !!onChunk,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SpeedCube AI',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`[${res.status}] ${errText.slice(0, 300)}`);
    }

    if (onChunk && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta) {
              full += delta;
              onChunk(full);
            }
          } catch {
            // skip
          }
        }
      }
      return full || '...';
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

export async function chat(
  messages: ChatMessage[],
  onChunk?: (text: string) => void,
): Promise<string> {
  // Client-side off-topic filter — instant response, no API call
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  if (isOffTopic(lastUserMsg)) {
    const lang = detectLanguage(lastUserMsg);
    const response = lang === 'fr' ? OFF_TOPIC_RESPONSE_FR : OFF_TOPIC_RESPONSE_EN;
    if (onChunk) onChunk(response);
    return response;
  }

  const apiKey = getApiKey();

  // Detect topics from full conversation (user + assistant messages)
  const conversationText = messages.slice(-8).map(m => m.content).join(' ');
  const activeTopics: Topic[] = detectTopics(conversationText);

  // Search with topic awareness — cap at 6 chunks to limit context
  const recentMsgs = messages.slice(-6).map(m => m.content).join(' ');
  const searchResults = recentMsgs ? searchKnowledge(recentMsgs, 6, activeTopics) : '';

  // Pre-compiled summaries (always present, ~2K chars)
  const summaries = getSummaries();

  // Detect user language → use language-specific system prompt
  const lang = detectLanguage(lastUserMsg, conversationText);

  // Build messages
  const apiMessages: { role: string; content: string }[] = [
    { role: 'system', content: lang === 'fr' ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN },
  ];

  // History (last 4 messages = 2 exchanges)
  const history = messages.slice(-4).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Inject: compact summaries + detailed search into last user message
  const lastIdx = history.length - 1;
  if (lastIdx >= 0 && history[lastIdx].role === 'user') {
    const dataParts = [summaries];
    if (searchResults) dataParts.push(searchResults);

    // Cap total data to ~15K chars to avoid overwhelming the model
    let dataStr = dataParts.join('\n\n');
    if (dataStr.length > 15000) {
      dataStr = dataStr.slice(0, 15000) + '\n[... truncated]';
    }

    history[lastIdx] = {
      role: 'user',
      content: `[DATA]\n${dataStr}\n[/DATA]\n\n${history[lastIdx].content}`,
    };
  }

  apiMessages.push(...history);

  // Try models (with empty-response fallback)
  let lastError: Error | null = null;
  for (const model of FREE_MODELS) {
    try {
      const result = await callModel(model, apiKey, apiMessages, onChunk);
      if (!result && !onChunk) continue; // empty non-stream response → try next model
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isRetryableError(lastError.message)) throw lastError;
    }
  }
  throw lastError || new Error('All models failed');
}
