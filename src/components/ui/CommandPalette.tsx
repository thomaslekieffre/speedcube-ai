import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Boxes, BookOpen, Monitor, Trophy, BookA, Lightbulb, GraduationCap, Hash, X } from 'lucide-react';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, { icon: typeof Boxes; color: string; labelKey: string }> = {
  algorithm: { icon: Boxes, color: 'text-primary', labelKey: 'search.types.algo' },
  method: { icon: BookOpen, color: 'text-accent', labelKey: 'search.types.method' },
  hardware: { icon: Monitor, color: 'text-warning', labelKey: 'search.types.hardware' },
  record: { icon: Trophy, color: 'text-destructive', labelKey: 'search.types.record' },
  glossary: { icon: BookA, color: 'text-amber-400', labelKey: 'search.types.term' },
  tip: { icon: Lightbulb, color: 'text-warning', labelKey: 'search.types.tip' },
};

const pageKeys = [
  { navKey: 'nav.dashboard', url: '/', icon: Hash },
  { navKey: 'nav.algorithms', url: '/algorithms', icon: Boxes },
  { navKey: 'nav.methods', url: '/methods', icon: BookOpen },
  { navKey: 'nav.hardware', url: '/hardware', icon: Monitor },
  { navKey: 'nav.records', url: '/records', icon: Trophy },
  { navKey: 'nav.tips', url: '/tips', icon: Lightbulb },
  { navKey: 'nav.glossary', url: '/glossary', icon: BookA },
  { navKey: 'nav.learning', url: '/learning', icon: GraduationCap },
];

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const { query, setQuery, results } = useSearch();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  const pages = useMemo(() =>
    pageKeys.map((p) => ({ ...p, name: t(p.navKey) })),
    [t],
  );

  const filteredPages = useMemo(() => {
    if (!query) return pages;
    return pages.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, pages]);

  const allItems = useMemo(() => {
    const items: { type: 'page' | 'result'; name: string; description: string; url: string; icon: typeof Boxes; color: string }[] = [];

    if (filteredPages.length > 0 && query.length < 2) {
      for (const p of filteredPages) {
        items.push({ type: 'page', name: p.name, description: '', url: p.url, icon: p.icon, color: 'text-muted-foreground' });
      }
    }

    for (const r of results) {
      const cfg = typeIcons[r.type] || { icon: Hash, color: 'text-muted-foreground', labelKey: r.type };
      items.push({ type: 'result', name: r.title, description: r.description, url: r.url, icon: cfg.icon, color: cfg.color });
    }

    return items;
  }, [filteredPages, results, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, setQuery]);

  const go = (url: string) => {
    navigate(url);
    close();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && allItems[selected]) {
      go(allItems[selected].url);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.div
            className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="w-full max-w-lg mx-4 rounded-xl border border-[var(--color-border)] bg-surface shadow-[0_25px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="flex items-center gap-3 px-4 border-b border-[var(--color-border)]">
                <Search className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('search.commandPlaceholder')}
                  className="flex-1 bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="p-1 text-muted-foreground/40 hover:text-foreground cursor-pointer">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-overlay)] text-muted-foreground/40 font-mono">ESC</kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-1.5">
                {allItems.length === 0 && query.length >= 2 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-8">{t('search.noResults')}</p>
                )}

                {query.length < 2 && allItems.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider font-medium px-3 py-1.5">{t('search.pages')}</p>
                )}

                {query.length >= 2 && results.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider font-medium px-3 py-1.5">{t('search.results')}</p>
                )}

                {allItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${item.url}-${i}`}
                      onClick={() => go(item.url)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 cursor-pointer group hover:bg-[var(--color-overlay-hover)]',
                        selected === i ? 'bg-[var(--color-overlay-hover)]' : '',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', item.color)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">{item.name}</span>
                        {item.description && (
                          <span className="text-[11px] text-muted-foreground/50 truncate block">{item.description}</span>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
