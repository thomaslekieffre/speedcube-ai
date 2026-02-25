import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2, RotateCcw, Maximize2, Minimize2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CubeHardware } from '@/types';

// Lazy-load AI module and data to avoid pulling 3.3MB data bundle into Layout
let _ai: typeof import('@/lib/ai') | null = null;
async function getAI() {
  if (!_ai) _ai = await import('@/lib/ai');
  return _ai;
}

let _cubes: CubeHardware[] | null = null;
async function getCubes() {
  if (!_cubes) {
    const data = await import('@/data');
    _cubes = data.cubes;
  }
  return _cubes;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// --- Algo detection: find cube notations like R U R' U' in backtick code blocks ---

const ALGO_PATTERN = /^[RUFDLBMESrufdbxyz\s2'()]+$/;
const MIN_ALGO_LENGTH = 5;

function isAlgorithm(text: string): boolean {
  const clean = text.trim();
  if (clean.length < MIN_ALGO_LENGTH) return false;
  // Must have at least 2 moves (letters)
  const moves = clean.match(/[RUFDLBMESrufdblxyz]/gi);
  if (!moves || moves.length < 2) return false;
  return ALGO_PATTERN.test(clean);
}

// --- Detect cube image from AI response ---

async function findCubeImage(text: string): Promise<{ name: string; image: string } | null> {
  const cubeList = await getCubes();
  const lower = text.toLowerCase();
  for (const cube of cubeList) {
    if (cube.image && lower.includes(cube.name.toLowerCase())) {
      return { name: cube.name, image: cube.image };
    }
  }
  return null;
}

// --- Safe Markdown renderer (no dangerouslySetInnerHTML) ---

// Detect algorithms in parentheses within plain text: "Sune (R U R' U R U2 R')"
const PAREN_ALGO_RE = /\(([RUFDLBMESrufdbxyz\s2'()]+)\)/g;

function PlainTextWithAlgos({ text, onPlayAlgo, keyStart }: { text: string; onPlayAlgo?: (algo: string) => void; keyStart: number }) {
  if (!onPlayAlgo) return <span key={keyStart}>{text}</span>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = keyStart;
  let match: RegExpExecArray | null;
  PAREN_ALGO_RE.lastIndex = 0;

  while ((match = PAREN_ALGO_RE.exec(text)) !== null) {
    const inner = match[1].trim();
    if (!isAlgorithm(inner)) continue;

    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <button
        key={key++}
        onClick={() => onPlayAlgo(inner)}
        className="inline-flex items-center gap-1 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors group"
        title="Play algorithm"
      >
        {inner}
        <Play className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return <span key={keyStart}>{text}</span>;
  if (lastIndex < text.length) parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return <>{parts}</>;
}

function InlineFormatted({ text, onPlayAlgo }: { text: string; onPlayAlgo?: (algo: string) => void }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldIdx = remaining.indexOf('**');
    const codeIdx = remaining.indexOf('`');

    if (boldIdx === -1 && codeIdx === -1) {
      parts.push(<PlainTextWithAlgos key={key} text={remaining} onPlayAlgo={onPlayAlgo} keyStart={key * 100} />);
      break;
    }

    const nextBold = boldIdx === -1 ? Infinity : boldIdx;
    const nextCode = codeIdx === -1 ? Infinity : codeIdx;

    if (nextBold < nextCode) {
      if (boldIdx > 0) parts.push(<PlainTextWithAlgos key={key++} text={remaining.slice(0, boldIdx)} onPlayAlgo={onPlayAlgo} keyStart={key * 100} />);
      const endBold = remaining.indexOf('**', boldIdx + 2);
      if (endBold === -1) {
        parts.push(<PlainTextWithAlgos key={key++} text={remaining.slice(boldIdx)} onPlayAlgo={onPlayAlgo} keyStart={key * 100} />);
        break;
      }
      parts.push(<strong key={key++}>{remaining.slice(boldIdx + 2, endBold)}</strong>);
      remaining = remaining.slice(endBold + 2);
    } else {
      if (codeIdx > 0) parts.push(<PlainTextWithAlgos key={key++} text={remaining.slice(0, codeIdx)} onPlayAlgo={onPlayAlgo} keyStart={key * 100} />);
      const endCode = remaining.indexOf('`', codeIdx + 1);
      if (endCode === -1) {
        parts.push(<PlainTextWithAlgos key={key++} text={remaining.slice(codeIdx)} onPlayAlgo={onPlayAlgo} keyStart={key * 100} />);
        break;
      }
      const codeContent = remaining.slice(codeIdx + 1, endCode);

      // If it looks like an algorithm, make it clickable
      if (isAlgorithm(codeContent) && onPlayAlgo) {
        parts.push(
          <button
            key={key++}
            onClick={() => onPlayAlgo(codeContent)}
            className="inline-flex items-center gap-1 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono cursor-pointer transition-colors group"
            title="Play algorithm"
          >
            {codeContent}
            <Play className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
          </button>
        );
      } else {
        parts.push(
          <code key={key++} className="text-[11px] bg-[var(--color-overlay)] px-1 py-0.5 rounded font-mono">
            {codeContent}
          </code>
        );
      }
      remaining = remaining.slice(endCode + 1);
    }
  }

  return <>{parts}</>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) =>
    line.split('|').slice(1, -1).map(cell => cell.trim());

  const header = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="overflow-x-auto my-1.5">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="text-left px-2 py-1 border-b border-[var(--color-border)] font-semibold text-foreground/80">
                <InlineFormatted text={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)]/50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 text-foreground/70">
                  <InlineFormatted text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownText({ text, onPlayAlgo }: { text: string; onPlayAlgo?: (algo: string) => void }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    // Detect markdown table
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1]?.trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />);
      continue;
    }

    // #### Header
    const h4Match = line.match(/^####\s+(.+)/);
    if (h4Match) {
      elements.push(
        <div key={i} className="text-[11px] font-semibold text-foreground/80 pt-1">
          <InlineFormatted text={h4Match[1]} onPlayAlgo={onPlayAlgo} />
        </div>
      );
      i++;
      continue;
    }

    // ### Header
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      elements.push(
        <div key={i} className="text-xs font-bold text-foreground pt-1.5">
          <InlineFormatted text={h3Match[1]} onPlayAlgo={onPlayAlgo} />
        </div>
      );
      i++;
      continue;
    }

    // ## Header
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      elements.push(
        <div key={i} className="text-[13px] font-bold text-foreground pt-2">
          <InlineFormatted text={h2Match[1]} onPlayAlgo={onPlayAlgo} />
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex gap-1.5 ml-1 text-xs leading-relaxed">
          <span className="text-primary/50 shrink-0 mt-0.5 font-medium">{numberedMatch[1]}.</span>
          <span><InlineFormatted text={numberedMatch[2]} onPlayAlgo={onPlayAlgo} /></span>
        </div>
      );
      i++;
      continue;
    }

    // Bullet points
    const isBullet = /^[\-\*]\s/.test(line.trim());
    const content = isBullet ? line.trim().replace(/^[\-\*]\s/, '') : line;

    elements.push(
      <div key={i} className={cn('text-xs leading-relaxed', isBullet && 'flex gap-1.5 ml-1')}>
        {isBullet && <span className="text-primary/50 shrink-0 mt-0.5">&#8226;</span>}
        <span><InlineFormatted text={content} onPlayAlgo={onPlayAlgo} /></span>
      </div>
    );
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}

// --- Inline TwistyPlayer for chat (handles WebGL init timing) ---

function ChatTwistyPlayer({ algorithm }: { algorithm: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const [{ TwistyPlayer: TP }, { Alg }] = await Promise.all([
          import('cubing/twisty'),
          import('cubing/alg'),
        ]);
        if (cancelled) return;

        if (playerRef.current) {
          playerRef.current.remove();
          playerRef.current = null;
        }

        const setupAlg = new Alg(algorithm).invert().toString();

        const player = new TP({
          puzzle: '3x3x3',
          alg: algorithm,
          experimentalSetupAlg: setupAlg,
          hintFacelets: 'floating',
          background: 'none',
          controlPanel: 'bottom-row',
          visualization: '3D',
          tempoScale: 1.5,
        });

        player.style.width = '100%';
        player.style.height = '100%';
        player.style.display = 'block';

        container.appendChild(player);
        playerRef.current = player;

        // Auto-play after a short delay for the 3D scene to initialize
        setTimeout(() => {
          if (!cancelled && player.controller) {
            player.controller.animationController.play();
          }
        }, 300);
      } catch (e) {
        console.warn('TwistyPlayer failed:', e);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
    };
  }, [algorithm]);

  return <div ref={containerRef} style={{ width: '100%', height: 260 }} />;
}

// --- Inline algo preview wrapper ---

function AlgoPreview({ algo, onClose }: { algo: string; onClose: () => void }) {
  return (
    <div className="mt-2 mb-4 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-overlay)]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]/50">
        <code className="text-[10px] font-mono text-foreground/70 truncate flex-1">{algo}</code>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer ml-2"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <ChatTwistyPlayer algorithm={algo} />
    </div>
  );
}

// --- Hardware image preview ---

function CubeImagePreview({ name, image }: { name: string; image: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-[var(--color-overlay)] border border-[var(--color-border)]/50">
      <img src={image} alt={name} className="w-12 h-12 object-contain rounded" loading="lazy" />
      <span className="text-[10px] text-muted-foreground/60">{name}</span>
    </div>
  );
}

// --- Contextual suggestions ---

function getSuggestions(pathname: string, t: (key: string) => string): string[] {
  if (pathname.includes('/algorithms')) {
    return [t('chat.sugAlgo1'), t('chat.sugAlgo2'), t('chat.sugAlgo3')];
  }
  if (pathname.includes('/methods')) {
    return [t('chat.sugMethod1'), t('chat.sugMethod2'), t('chat.sugMethod3')];
  }
  if (pathname.includes('/hardware')) {
    return [t('chat.sugHw1'), t('chat.sugHw2'), t('chat.sugHw3')];
  }
  if (pathname.includes('/tips') || pathname.includes('/learning')) {
    return [t('chat.sugTip1'), t('chat.sugTip2'), t('chat.sugTip3')];
  }
  return [t('chat.suggestion1'), t('chat.suggestion2'), t('chat.suggestion3')];
}

// --- Main component ---

export function ChatAssistant() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessages, setLastFailedMessages] = useState<ChatMessage[] | null>(null);
  const [activeAlgo, setActiveAlgo] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [configured, setConfigured] = useState(true);
  const suggestions = getSuggestions(location.pathname, t);

  // Lazy check API configuration
  useEffect(() => {
    getAI().then((ai) => setConfigured(ai.isConfigured()));
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamText, activeAlgo, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Keyboard shortcut: Ctrl+Shift+K to toggle chat, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        if (activeAlgo) {
          setActiveAlgo(null);
        } else if (expanded) {
          setExpanded(false);
        } else {
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, expanded, activeAlgo]);

  const handlePlayAlgo = useCallback((algo: string) => {
    setActiveAlgo(prev => prev === algo ? null : algo);
  }, []);

  const sendMessages = async (messagesToSend: ChatMessage[]) => {
    setError(null);
    setLastFailedMessages(null);
    setStreaming(true);
    setStreamText('');
    setActiveAlgo(null);

    try {
      const ai = await getAI();
      const reply = await ai.chat(messagesToSend, (partial) => {
        setStreamText(partial);
      });
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setStreamText('');
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unknown error';
      const isQuota = raw.includes('429') || raw.includes('quota');
      setError(isQuota
        ? t('chat.quotaError')
        : raw.length > 200 ? raw.slice(0, 200) + '...' : raw
      );
      setLastFailedMessages(messagesToSend);
    } finally {
      setStreaming(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await sendMessages(newMessages);
  };

  const handleRetry = () => {
    if (lastFailedMessages) {
      sendMessages(lastFailedMessages);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamText('');
    setError(null);
    setLastFailedMessages(null);
    setActiveAlgo(null);
  };

  // Check last assistant message for a cube image (async)
  const [cubeImage, setCubeImage] = useState<{ name: string; image: string } | null>(null);
  const lastAssistantContent = messages.filter(m => m.role === 'assistant').pop()?.content;

  useEffect(() => {
    if (!lastAssistantContent) { setCubeImage(null); return; }
    findCubeImage(lastAssistantContent).then(setCubeImage);
  }, [lastAssistantContent]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl shadow-lg cursor-pointer transition-all duration-300',
          open
            ? 'bg-[var(--color-card)] border border-[var(--color-border)] text-muted-foreground hover:text-foreground'
            : 'bg-gradient-to-br from-primary to-accent text-white hover:shadow-glow-primary',
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Ctrl+Shift+K"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
              <MessageCircle className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'fixed z-50 flex flex-col bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-hover overflow-hidden transition-all duration-300',
              expanded
                ? 'inset-4 sm:inset-6 lg:inset-10 bottom-4 sm:bottom-6 lg:bottom-10 w-auto h-auto max-w-none max-h-none'
                : 'bottom-20 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-8rem)]',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">{t('chat.title')}</h3>
                  <p className="text-[10px] text-muted-foreground/60">{t('chat.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-foreground hover:bg-[var(--color-overlay)] transition-all cursor-pointer"
                  title={expanded ? 'Minimize' : 'Maximize'}
                >
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                    title={t('chat.clear')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {!configured && (
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning">
                  {t('chat.noApiKey')}
                </div>
              )}

              {messages.length === 0 && configured && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary/40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/70">{t('chat.welcome')}</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1 max-w-[240px]">{t('chat.welcomeDesc')}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        className="px-2.5 py-1 text-[10px] rounded-lg bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  <div
                    className={cn(
                      'px-3.5 py-2.5 rounded-2xl',
                      expanded ? 'max-w-[70%]' : 'max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-[var(--color-overlay)] text-foreground rounded-bl-md',
                    )}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownText text={msg.content} onPlayAlgo={handlePlayAlgo} />
                    )}
                  </div>

                  {/* Cube image for last assistant message */}
                  {msg.role === 'assistant' && i === messages.length - 1 && cubeImage && (
                    <CubeImagePreview name={cubeImage.name} image={cubeImage.image} />
                  )}
                </div>
              ))}

              {/* Streaming response */}
              {streaming && streamText && (
                <div className="flex justify-start">
                  <div className={cn(
                    'px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[var(--color-overlay)] text-foreground',
                    expanded ? 'max-w-[70%]' : 'max-w-[85%]',
                  )}>
                    <MarkdownText text={streamText} />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {streaming && !streamText && (
                <div className="flex justify-start">
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[var(--color-overlay)]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Inline algo visualizer */}
              {activeAlgo && (
                <AlgoPreview algo={activeAlgo} onClose={() => setActiveAlgo(null)} />
              )}

              {error && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">{error}</p>
                  {lastFailedMessages && (
                    <button
                      onClick={handleRetry}
                      disabled={streaming}
                      className="mt-2 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t('chat.retry')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--color-border)]">
              <div className={cn('flex items-end gap-2', expanded && 'max-w-3xl mx-auto')}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder')}
                  disabled={!configured || streaming}
                  rows={1}
                  className="flex-1 resize-none bg-[var(--color-overlay)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-colors disabled:opacity-50"
                  style={{ maxHeight: expanded ? '120px' : '80px' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, expanded ? 120 : 80) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming || !configured}
                  className={cn(
                    'p-2.5 rounded-xl transition-all cursor-pointer shrink-0',
                    input.trim() && !streaming
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-[var(--color-overlay)] text-muted-foreground/30',
                  )}
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground/30 mt-1.5 text-center">
                {t('chat.disclaimer')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
