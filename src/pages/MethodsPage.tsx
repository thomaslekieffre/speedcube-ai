import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Card, CardContent, Badge, Input, AnimatedCounter } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { methods } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { cn } from '@/lib/utils';

const difficultyColors: Record<string, 'accent' | 'primary' | 'warning' | 'destructive'> = {
  beginner: 'accent',
  intermediate: 'primary',
  advanced: 'warning',
  expert: 'destructive',
};

const difficultyAccent: Record<string, string> = {
  beginner: 'bg-accent',
  intermediate: 'bg-primary',
  advanced: 'bg-warning',
  expert: 'bg-destructive',
};

/* ── Puzzle mapping for every method ─────────────────────────── */

const methodPuzzle: Record<string, string> = {
  'cfop': '3x3', 'roux': '3x3', 'zz': '3x3', 'petrus': '3x3',
  'freefop': '3x3', 'heise': '3x3', 'zb': '3x3', 'mehta': '3x3',
  'nautilus': '3x3', 'ceor': '3x3', 'leor': '3x3', 'lmcf': '3x3',
  'columns-first': '3x3', 'briggs': '3x3', 'ssc': '3x3', 'belt': '3x3',
  '8355': '3x3', 'beginner': '3x3', 'lbl': '3x3',
  'apb': '3x3', 'waterman': '3x3', 'snyder': '3x3',
  'hawaiian-kociemba': '3x3', 'yruru': '3x3',
  'cfop-4lll': '3x3', 'cfop-2lll': '3x3', 'keyhole': '3x3',
  'soap': '2x2', 'hd-method': '2x2',
  'nutella': 'Pyraminx', 'wo': 'Pyraminx',
  'balint': 'Megaminx', 'yu-dahyun': 'Megaminx',
  'bencisco': 'Other', 'jq-method': 'Square-1',
  'ranzha': 'Skewb',
  'alyz': 'Clock', 'linear': 'Clock',
  'turbo': 'BLD',
  'ortega': '2x2', 'cll-method': '2x2',
  'eg-method': '2x2', 'guimond': '2x2', 'lbl-2x2': '2x2',
  'keyhole-pyra': 'Pyraminx', 'l4e-method': 'Pyraminx', 'oka': 'Pyraminx',
  'v-first': 'Pyraminx', 'top-first': 'Pyraminx', 'bell': 'Pyraminx',
  'one-flip': 'Pyraminx',
  'sarah-beginner': 'Skewb', 'sarah-intermediate': 'Skewb',
  'sarah-advanced-method': 'Skewb', 'monkeydude': 'Skewb',
  'lbl-mega': 'Megaminx', 'westlund': 'Megaminx',
  'vandenbergh': 'Square-1', 'lin-method': 'Square-1', 'screw': 'Square-1',
  'flip-clock': 'Clock', 'pochmann-clock': 'Clock',
  'simultaneous': 'Clock', 'seven-simul': 'Clock',
  'old-pochmann': 'BLD', 'm2-r2': 'BLD', '3-style': 'BLD',
  'orozco': 'BLD', 'bh': 'BLD', 'r2': 'BLD',
  'fmc-blockbuilding': 'FMC', 'fmc-niss': 'FMC',
  'domino-reduction': 'FMC', 'human-thistlethwaite': 'FMC',
  'reduction': '4x4+', 'yau': '4x4+', 'hoya': '4x4+',
  'meyer': '4x4+', 'yau5': '4x4+',
};

const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

export default function MethodsPage() {
  const { t } = useTranslation(['methods', 'common']);
  const { localizeMethod } = useLocalizedData();
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [puzzle, setPuzzle] = useState<string>('all');

  const localized = useMemo(() => methods.map(localizeMethod), [localizeMethod]);

  const puzzleTypes = useMemo(() => {
    const types = new Set(methods.map((m) => methodPuzzle[m.id] || '3x3'));
    return Array.from(types).sort();
  }, []);

  const filtered = useMemo(() => {
    return localized.filter((m) => {
      const matchesDifficulty = difficulty === 'all' || m.difficulty === difficulty;
      const matchesPuzzle = puzzle === 'all' || (methodPuzzle[m.id] || '3x3') === puzzle;
      const matchesSearch = !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      return matchesDifficulty && matchesPuzzle && matchesSearch;
    });
  }, [localized, difficulty, puzzle, search]);

  return (
    <div className="space-y-5 relative">
      {/* Decorative geometric elements */}
      <div className="absolute -top-4 right-4 w-20 h-20 border border-accent/[0.05] rounded-xl -rotate-6 pointer-events-none max-sm:hidden animate-float-geo" style={{ '--float-rotate': '-6deg' } as React.CSSProperties} />
      <div className="absolute top-12 right-24 w-2 h-2 bg-primary/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <AnimatedCounter value={filtered.length} className="text-3xl font-black tracking-tight gradient-text-animated" />
            <span className="text-sm text-muted-foreground">{t('count', { count: filtered.length })}</span>
          </div>
          <div className="w-8 h-0.5 gradient-line mt-2" />
        </div>
        <Input
          icon
          placeholder={t('searchPlaceholder', { defaultValue: 'Search...' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-56"
        />
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setDifficulty('all')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
            difficulty === 'all'
              ? 'bg-primary text-white'
              : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
          )}
        >
          {t('common:levels.all')}
        </button>
        {difficulties.map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
              difficulty === d
                ? 'bg-primary text-white'
                : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
            )}
          >
            {t(`common:levels.${d}`)}
          </button>
        ))}
      </div>

      {/* Puzzle filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setPuzzle('all')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
            puzzle === 'all'
              ? 'bg-primary text-white'
              : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
          )}
        >
          {t('common:filters.all')}
        </button>
        {puzzleTypes.map((p) => (
          <button
            key={p}
            onClick={() => setPuzzle(p)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
              puzzle === p
                ? 'bg-primary text-white'
                : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Grid */}
      <LayoutGroup>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((method) => (
              <motion.div
                key={method.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <Link to={`/methods/${method.id}`}>
                    <Card hover className="h-full group overflow-hidden">
                      <div className="h-0.5 gradient-line opacity-50" />
                      <CardContent>
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground">{method.name}</h3>
                            {method.creator && (
                              <p className="text-xs text-muted-foreground/60">{t('by', { creator: method.creator, year: method.yearCreated })}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline">{methodPuzzle[method.id] || '3x3'}</Badge>
                            <Badge variant={difficultyColors[method.difficulty] || 'primary'}>
                              {t(`common:levels.${method.difficulty}`)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{method.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{t('common:badges.steps', { count: method.steps.length })}</Badge>
                            {method.avgMoveCount && (
                              <Badge variant="outline">{t('movesLabel', { val: method.avgMoveCount })}</Badge>
                            )}
                          </div>
                          <span className="flex items-center gap-1 text-[11px] text-primary/60 group-hover:text-primary transition-colors">
                            {t('common:actions.details')}
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">{t('common:search.noResults')}</p>
        </div>
      )}
    </div>
  );
}
