import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Card, CardContent, Badge, Input, AnimatedCounter } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { algorithmSets } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';

const puzzleTypes = ['All', '3x3', '2x2', '4x4', '5x5', '6x6', 'Pyraminx', 'Skewb', 'Square-1', 'Megaminx'];

export default function AlgorithmsPage() {
  const { t } = useTranslation(['algorithms', 'common']);
  const { localizeSet } = useLocalizedData();
  const [search, setSearch] = useState('');
  const [puzzle, setPuzzle] = useState('All');

  const filtered = useMemo(() => {
    return algorithmSets
      .map(localizeSet)
      .filter((set) => {
        const matchesPuzzle = puzzle === 'All' || set.puzzle.toLowerCase() === puzzle.toLowerCase();
        const matchesSearch = !search ||
          set.name.toLowerCase().includes(search.toLowerCase()) ||
          set.description.toLowerCase().includes(search.toLowerCase());
        return matchesPuzzle && matchesSearch;
      });
  }, [search, puzzle, localizeSet]);

  const totalAlgos = filtered.reduce((sum, s) => sum + s.algorithms.length, 0);

  return (
    <div className="space-y-6 relative">
      {/* Decorative geometric elements */}
      <div className="absolute -top-4 right-0 w-24 h-24 border border-primary/[0.04] rounded-2xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
      <div className="absolute top-16 right-20 w-1.5 h-1.5 bg-accent/25 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <AnimatedCounter value={totalAlgos} className="text-3xl font-black tracking-tight gradient-text-animated" />
            <span className="text-sm text-muted-foreground">{t('algosCount', { count: totalAlgos })} · {t('setsCount', { count: filtered.length })}</span>
          </div>
          <div className="w-8 h-0.5 gradient-line mt-2" />
        </div>
        <Input
          icon
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-56"
        />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {puzzleTypes.map((p) => (
          <button
            key={p}
            onClick={() => setPuzzle(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              puzzle === p
                ? 'bg-primary text-white'
                : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]'
            }`}
          >
            {p === 'All' ? t('common:filters.all') : p}
          </button>
        ))}
      </div>

      <LayoutGroup>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((set) => (
              <motion.div
                key={set.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link to={`/algorithms/${set.id}`}>
                  <Card hover className="h-full group overflow-hidden">
                    <div className={`h-0.5 gradient-line opacity-60`} />
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">{set.name}</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0 ml-2" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{set.puzzle}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{set.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="primary">{t('common:badges.cases', { count: set.algorithms.length })}</Badge>
                        <Badge variant="outline">{set.category}</Badge>
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
          <p className="text-sm text-muted-foreground">{t('noResults')}</p>
        </div>
      )}
    </div>
  );
}
