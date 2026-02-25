import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Badge, Input, AnimatedCounter } from '@/components/ui';
import { glossary } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';

const categories = ['All', 'notation', 'competition', 'technique', 'hardware', 'method', 'general'];

export default function GlossaryPage() {
  const { t } = useTranslation(['glossary', 'common']);
  const { localizeGlossary } = useLocalizedData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    return glossary
      .map(localizeGlossary)
      .filter((term) => {
        const matchesCategory = category === 'All' || term.category === category;
        const matchesSearch = !search ||
          term.term.toLowerCase().includes(search.toLowerCase()) ||
          term.definition.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [search, category, localizeGlossary]);

  const letters = [...new Set(filtered.map((t) => t.term[0].toUpperCase()))].sort();

  return (
    <div className="space-y-5 relative">
      {/* Decorative */}
      <div className="absolute -top-4 right-0 w-20 h-20 border border-primary/[0.04] rounded-2xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
      <div className="absolute top-14 right-16 w-2 h-2 bg-accent/15 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          icon
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-56"
        />
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize cursor-pointer ${
                category === c
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]'
              }`}
            >
              {t(`categories.${c === 'All' ? 'all' : c}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-3">
          <AnimatedCounter value={filtered.length} className="text-3xl font-black tracking-tight gradient-text-animated" />
          <span className="text-sm text-muted-foreground">{t('count', { count: filtered.length })}</span>
        </div>
        <div className="w-8 h-0.5 gradient-line mt-2" />
      </div>

      {/* Letter jump — inline on mobile, floating on desktop */}
      <div className="flex gap-0.5 flex-wrap lg:hidden">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[11px] font-medium text-muted-foreground/50 hover:text-primary hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          >
            {letter}
          </a>
        ))}
      </div>

      {/* Floating letter nav — desktop only */}
      <div className="hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-0.5 py-2 px-1 rounded-xl bg-surface/80 backdrop-blur-sm border border-[var(--color-border)]/50 shadow-sm">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#letter-${letter}`}
            className="w-6 h-5 flex items-center justify-center rounded text-[10px] font-semibold text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all duration-150"
          >
            {letter}
          </a>
        ))}
      </div>

      <div className="space-y-6 lg:mr-12">
        {letters.map((letter) => {
          const termsForLetter = filtered.filter((t) => t.term[0].toUpperCase() === letter);
          return (
            <div key={letter} id={`letter-${letter}`}>
              <h2 className="sticky top-14 bg-background py-2 z-10 mb-2 flex items-center gap-3">
                <span className="text-2xl font-black text-primary/20">{letter}</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </h2>
              <div className="space-y-2">
                {termsForLetter.map((term) => (
                  <Card key={term.id}>
                    <CardContent className="py-3.5">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{term.term}</h3>
                        <Badge variant="outline">{term.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{term.definition}</p>
                      {term.relatedTerms && term.relatedTerms.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                          <span className="text-[10px] text-muted-foreground/40">{t('related')}</span>
                          {term.relatedTerms.map((rt) => (
                            <span key={rt} className="text-[11px] text-primary/60">{rt}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
