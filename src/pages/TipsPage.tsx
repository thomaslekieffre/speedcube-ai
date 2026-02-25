import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Badge, AnimatedCounter } from '@/components/ui';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { tips } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { cn } from '@/lib/utils';

const levelColors: Record<string, 'accent' | 'primary' | 'warning'> = {
  beginner: 'accent',
  intermediate: 'primary',
  advanced: 'warning',
};

const levelAccent: Record<string, { bar: string; iconBg: string; iconText: string }> = {
  beginner: { bar: 'border-l-accent/50', iconBg: 'bg-accent/10', iconText: 'text-accent' },
  intermediate: { bar: 'border-l-primary/50', iconBg: 'bg-primary/10', iconText: 'text-primary' },
  advanced: { bar: 'border-l-warning/50', iconBg: 'bg-warning/10', iconText: 'text-warning' },
};

export default function TipsPage() {
  const { t } = useTranslation(['tips', 'common']);
  const { localizeTip } = useLocalizedData();
  const [level, setLevel] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const levels = ['All', 'beginner', 'intermediate', 'advanced'];

  const filtered = useMemo(() => {
    return tips
      .filter((tip) => level === 'All' || tip.level === level)
      .map(localizeTip);
  }, [level, localizeTip]);

  return (
    <div className="space-y-5 relative">
      {/* Decorative */}
      <div className="absolute -top-2 right-2 w-16 h-16 border border-amber-400/[0.06] rounded-xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
      <div className="absolute top-8 right-16 w-1.5 h-1.5 bg-primary/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <AnimatedCounter value={filtered.length} className="text-3xl font-black tracking-tight gradient-text-animated" />
            <span className="text-sm text-muted-foreground">{t('common:filters.all')}</span>
          </div>
          <div className="w-8 h-0.5 gradient-line mt-2" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {levels.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize cursor-pointer',
                level === l
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
              )}
            >
              {l === 'All' ? t('common:filters.all') : t(`common:levels.${l}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((tip) => {
          const accent = levelAccent[tip.level] || levelAccent.beginner;
          const isOpen = expandedId === tip.id;

          return (
            <motion.div
              key={tip.id}
              whileHover={!isOpen ? { y: -2 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Card className={cn('border-l-[3px] overflow-hidden', accent.bar)}>
                <CardContent>
                  <div
                    className="cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : tip.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-xl shrink-0', accent.iconBg)}>
                        <Lightbulb className={cn('h-4 w-4', accent.iconText)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-foreground">{tip.title}</h3>
                          <Badge variant={levelColors[tip.level]}>{t(`common:levels.${tip.level}`)}</Badge>
                          <Badge variant="outline">{tip.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground/30 shrink-0 transition-transform duration-200',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 ml-11 space-y-4 border-t border-[var(--color-border)] pt-4">
                          <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                            {tip.content}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-medium text-foreground uppercase tracking-wider mb-2">{t('keyPoints')}</h4>
                            <ul className="space-y-1.5">
                              {tip.keyPoints.map((point, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', accent.iconBg.replace('/10', '/40'))} />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
