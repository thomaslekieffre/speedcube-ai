import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Card, Badge, AnimatedCounter } from '@/components/ui';
import { Link } from 'react-router';
import { Target, Clock, Boxes, ChevronDown } from 'lucide-react';
import { learningPaths, getAlgorithmSet } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { cn } from '@/lib/utils';

/* ── Color schemes per difficulty ────────────────────────────── */

const schemes = {
  accent: {
    badge: 'accent' as const,
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
    left: 'border-l-accent/50',
    dot: 'bg-accent',
    stepBg: 'bg-accent/15',
    stepBorder: 'border-accent/20',
    stepText: 'text-accent',
    linkBg: 'bg-accent/10',
    linkText: 'text-accent',
  },
  primary: {
    badge: 'primary' as const,
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
    left: 'border-l-primary/50',
    dot: 'bg-primary',
    stepBg: 'bg-primary/15',
    stepBorder: 'border-primary/20',
    stepText: 'text-primary',
    linkBg: 'bg-primary/10',
    linkText: 'text-primary',
  },
  warning: {
    badge: 'warning' as const,
    iconBg: 'bg-warning/10',
    iconText: 'text-warning',
    left: 'border-l-warning/50',
    dot: 'bg-warning',
    stepBg: 'bg-warning/15',
    stepBorder: 'border-warning/20',
    stepText: 'text-warning',
    linkBg: 'bg-warning/10',
    linkText: 'text-warning',
  },
  destructive: {
    badge: 'destructive' as const,
    iconBg: 'bg-destructive/10',
    iconText: 'text-destructive',
    left: 'border-l-destructive/50',
    dot: 'bg-destructive',
    stepBg: 'bg-destructive/15',
    stepBorder: 'border-destructive/20',
    stepText: 'text-destructive',
    linkBg: 'bg-destructive/10',
    linkText: 'text-destructive',
  },
} as const;

const targetToScheme: Record<string, keyof typeof schemes> = {
  'sub-60': 'accent',
  'sub-30': 'primary',
  'sub-20': 'warning',
  'sub-10': 'destructive',
};

function getScheme(target: string) {
  return schemes[targetToScheme[target] || 'primary'];
}

/* ── Puzzle categories ───────────────────────────────────────── */

type FilterKey = 'all' | '3x3' | '2x2' | 'specialty';

const pathCategory: Record<string, FilterKey> = {
  'sub-60': '3x3',
  'sub-30': '3x3',
  'sub-20': '3x3',
  'sub-10': '3x3',
  '2x2-mastery': '2x2',
  'one-handed': 'specialty',
  'blind-solving': 'specialty',
  'big-cubes': 'specialty',
};

const filterKeys: FilterKey[] = ['all', '3x3', '2x2', 'specialty'];

/* ── Algo set link resolver ──────────────────────────────────── */

function resolveAlgoSet(name: string): { id: string; name: string } | null {
  const set = getAlgorithmSet(name.toLowerCase().replace(/\s+/g, '-'));
  if (set) return { id: set.id, name: set.name };
  // Try by display name match (getAlgorithmSet also does case-insensitive name match)
  const byName = getAlgorithmSet(name);
  if (byName) return { id: byName.id, name: byName.name };
  return null;
}

/* ── Page ────────────────────────────────────────────────────── */

export default function LearningPage() {
  const { t } = useTranslation(['learning', 'common']);
  const { localizeLearningPath } = useLocalizedData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  const localizedPaths = useMemo(() => learningPaths.map(localizeLearningPath), [localizeLearningPath]);

  const filteredPaths = useMemo(() => {
    if (filter === 'all') return localizedPaths;
    return localizedPaths.filter((p) => pathCategory[p.id] === filter);
  }, [localizedPaths, filter]);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5 relative">
      {/* Decorative */}
      <div className="absolute -top-2 right-4 w-24 h-24 border border-accent/[0.04] rounded-xl -rotate-6 pointer-events-none max-sm:hidden animate-float-geo" style={{ '--float-rotate': '-6deg' } as React.CSSProperties} />
      <div className="absolute top-16 right-20 w-1.5 h-1.5 bg-primary/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />
      <div>
        <div className="flex items-baseline gap-3">
          <AnimatedCounter value={localizedPaths.length} className="text-3xl font-black tracking-tight gradient-text-animated" />
          <span className="text-sm text-muted-foreground">{t('pathCount', { count: localizedPaths.length })}</span>
        </div>
        <div className="w-8 h-0.5 gradient-line mt-2" />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {filterKeys.map((key) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setExpandedId(null); }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
              filter === key
                ? 'bg-primary text-white'
                : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
            )}
          >
            {key === 'all' ? t('common:filters.all') : t(`filters.${key}`)}
          </button>
        ))}
      </div>

      {/* Path cards */}
      <LayoutGroup>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredPaths.map((path) => {
              const c = getScheme(path.target);
              const isOpen = expandedId === path.id;

              return (
                <motion.div
                  key={path.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={!isOpen ? { y: -3 } : undefined}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <Card className={cn('border-l-[3px] overflow-hidden', c.left)}>
                {/* Header — always visible */}
                <button
                  onClick={() => toggle(path.id)}
                  className="w-full text-left cursor-pointer p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn('p-2.5 rounded-xl shrink-0', c.iconBg)}>
                      <Target className={cn('h-5 w-5', c.iconText)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <h3 className="text-[15px] font-semibold text-foreground">{path.name}</h3>
                        <Badge variant={c.badge}>{path.target}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                        {path.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Milestone dots */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        {path.milestones.map((_, i) => (
                          <div key={i} className={cn('w-1.5 h-1.5 rounded-full opacity-50', c.dot)} />
                        ))}
                        <span className="text-[10px] text-muted-foreground/40 ml-0.5 tabular-nums">
                          {path.milestones.length}
                        </span>
                      </div>

                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground/30 transition-transform duration-200',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </div>
                  </div>
                </button>

                {/* Expandable milestones */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="border-t border-[var(--color-border)] pt-5 space-y-0">
                          {path.milestones.map((milestone, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06 }}
                              className="relative flex gap-4 pb-5 last:pb-0"
                            >
                              {/* Step indicator */}
                              <div className="flex flex-col items-center">
                                <div
                                  className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 border',
                                    c.stepBg,
                                    c.stepBorder,
                                  )}
                                >
                                  <span className={cn('text-xs font-bold', c.stepText)}>{i + 1}</span>
                                </div>
                                {i < path.milestones.length - 1 && (
                                  <div className="w-px flex-1 bg-[var(--color-border)] mt-1" />
                                )}
                              </div>

                              {/* Milestone content */}
                              <div className="flex-1 -mt-0.5">
                                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                  <h4 className="text-sm font-semibold text-foreground">{milestone.name}</h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={c.badge}>{milestone.target}</Badge>
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                      <Clock className="h-3 w-3" />
                                      {milestone.estimatedTime}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
                                  {milestone.description}
                                </p>

                                <div className="space-y-2.5">
                                  <div>
                                    <h4 className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1.5">
                                      {t('skills')}
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                      {milestone.skills.map((skill) => (
                                        <span
                                          key={skill}
                                          className="text-[10px] bg-[var(--color-overlay-muted)] text-muted-foreground px-2 py-0.5 rounded"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {milestone.algorithmSets.length > 0 && (
                                    <div>
                                      <h4 className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1.5">
                                        {t('algoSets')}
                                      </h4>
                                      <div className="flex flex-wrap gap-1">
                                        {milestone.algorithmSets.map((setName) => {
                                          const resolved = resolveAlgoSet(setName);
                                          if (resolved) {
                                            return (
                                              <Link
                                                key={setName}
                                                to={`/algorithms/${resolved.id}`}
                                                className={cn(
                                                  'text-[10px] px-2 py-0.5 rounded hover:opacity-80 transition-opacity',
                                                  c.linkBg,
                                                  c.linkText,
                                                )}
                                              >
                                                <Boxes className="h-3 w-3 inline mr-1" />
                                                {resolved.name}
                                              </Link>
                                            );
                                          }
                                          return (
                                            <span
                                              key={setName}
                                              className="text-[10px] bg-[var(--color-overlay-muted)] text-muted-foreground px-2 py-0.5 rounded"
                                            >
                                              <Boxes className="h-3 w-3 inline mr-1" />
                                              {setName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {/* Empty state */}
      {filteredPaths.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">{t('common:search.noResults')}</p>
        </div>
      )}
    </div>
  );
}
