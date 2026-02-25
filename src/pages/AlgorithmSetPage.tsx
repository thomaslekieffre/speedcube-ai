import { useParams, Link } from 'react-router';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, Badge, Input, AnimatedCounter } from '@/components/ui';
import { AlgorithmDetailModal } from '@/components/AlgorithmDetailModal';
import { ArrowLeft, Copy, Check, ChevronDown } from 'lucide-react';
import { getAlgorithmSet } from '@/data';
import { cn } from '@/lib/utils';
import type { Algorithm } from '@/types';

const puzzleAccent: Record<string, { bar: string; badge: 'primary' | 'accent' | 'warning' }> = {
  '3x3': { bar: 'bg-primary', badge: 'primary' },
  '2x2': { bar: 'bg-accent', badge: 'accent' },
  '4x4': { bar: 'bg-warning', badge: 'warning' },
  '5x5': { bar: 'bg-orange-400', badge: 'warning' },
  '6x6': { bar: 'bg-yellow-400', badge: 'warning' },
  'Pyraminx': { bar: 'bg-emerald-400', badge: 'accent' },
  'Skewb': { bar: 'bg-cyan-400', badge: 'accent' },
  'Square-1': { bar: 'bg-pink-400', badge: 'primary' },
  'Megaminx': { bar: 'bg-blue-400', badge: 'accent' },
};

function AlgorithmCard({ algo, accent, onClick }: { algo: Algorithm; accent: string; onClick: () => void }) {
  const { t } = useTranslation(['algorithms', 'common']);
  const [copied, setCopied] = useState(false);
  const [showAlts, setShowAlts] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(algo.notation);
    setCopied(true);
    toast.success(t('common:actions.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className="overflow-hidden group cursor-pointer" onClick={onClick}>
        {/* Colored top accent bar */}
        <div className={cn('h-0.5 w-full opacity-50', accent)} />

        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{algo.name}</h3>
            <Badge variant="outline">{t('common:badges.etm', { count: algo.moveCount })}</Badge>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-[var(--color-overlay)] border border-[var(--color-border)] px-3 py-2.5 rounded-lg text-foreground/90 overflow-x-auto leading-relaxed">
              {algo.notation}
            </code>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e: React.MouseEvent) => handleCopy(e)}
              className="p-2 rounded-lg text-muted-foreground/30 hover:text-primary hover:bg-primary/[0.06] transition-all shrink-0 cursor-pointer"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Check className="h-3.5 w-3.5 text-success" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {algo.setup && (
            <p className="text-[11px] text-muted-foreground/60 mt-2">
              {t('setup')}: <span className="font-mono text-muted-foreground">{algo.setup}</span>
            </p>
          )}

          {algo.alternatives.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              <button
                onClick={(e) => { e.stopPropagation(); setShowAlts(!showAlts); }}
                className="text-[11px] text-primary/70 hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', showAlts && 'rotate-180')} />
                {algo.alternatives.length > 1
                  ? t('alternatives_plural', { count: algo.alternatives.length })
                  : t('alternatives', { count: algo.alternatives.length })}
              </button>
              <AnimatePresence>
                {showAlts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5">
                      {algo.alternatives.map((alt, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <code className="font-mono bg-[var(--color-overlay-subtle)] border border-[var(--color-border)] px-2 py-1.5 rounded-md text-muted-foreground flex-1 overflow-x-auto">
                            {alt.notation}
                          </code>
                          <span className="text-muted-foreground/40 text-[10px] shrink-0 tabular-nums">{alt.moveCount} ETM</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AlgorithmSetPage() {
  const { t } = useTranslation(['algorithms', 'common']);
  const { setId } = useParams<{ setId: string }>();
  const [search, setSearch] = useState('');
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm | null>(null);
  const set = getAlgorithmSet(setId || '');

  const filtered = useMemo(() => {
    if (!set) return [];
    if (!search) return set.algorithms;
    return set.algorithms.filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.notation.toLowerCase().includes(search.toLowerCase()) ||
        (a.subset || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [set, search]);

  if (!set) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground mb-4">{t('notFound')}</p>
        <Link to="/algorithms" className="text-xs text-primary hover:text-primary-hover transition-colors">
          &larr; {t('backToAlgorithms')}
        </Link>
      </div>
    );
  }

  const subsets = [...new Set(set.algorithms.map((a) => a.subset).filter(Boolean))];
  const accent = puzzleAccent[set.puzzle] || puzzleAccent['3x3'];

  return (
    <div className="space-y-5 relative">
      {/* Decorative */}
      <div className="absolute -top-2 right-0 w-20 h-20 border border-primary/[0.04] rounded-xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
      <div className="absolute top-10 right-16 w-1.5 h-1.5 bg-accent/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/algorithms" className="p-2.5 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-all">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">{set.name}</h1>
            <Badge variant={accent.badge}>{set.puzzle}</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{set.description}</p>
        </div>
      </div>

      {/* Stats + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <AnimatedCounter value={filtered.length} className="text-3xl font-black tracking-tight gradient-text-animated" />
            <span className="text-sm text-muted-foreground">{t('common:badges.cases', { count: filtered.length })}</span>
          </div>
          <div className={cn('w-8 h-0.5 mt-1.5 rounded-full opacity-60', accent.bar)} />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-end">
          <Input
            icon
            placeholder={t('searchInSet', { count: set.algorithms.length })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          {subsets.length > 0 && (
            <Badge variant="outline">{t('common:badges.subsets', { count: subsets.length })}</Badge>
          )}
        </div>
      </div>

      {/* Algorithm grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((algo) => (
          <AlgorithmCard key={algo.id} algo={algo} accent={accent.bar} onClick={() => setSelectedAlgo(algo)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">{t('noAlgosResults', { query: search })}</p>
        </div>
      )}

      <AlgorithmDetailModal algo={selectedAlgo} onClose={() => setSelectedAlgo(null)} />
    </div>
  );
}
