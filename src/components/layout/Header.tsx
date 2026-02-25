import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router';
import { Search, Command, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useCommandPalette } from '@/hooks/useCommandPalette';

const segmentKeys: Record<string, string> = {
  algorithms: 'nav.algorithms',
  methods: 'nav.methods',
  hardware: 'nav.hardware',
  records: 'nav.records',
  tips: 'nav.tips',
  glossary: 'nav.glossary',
  learning: 'nav.learning',
};

function formatSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Cache for resolved labels from dynamic data lookups
const labelCache = new Map<string, string>();

export function Header() {
  const location = useLocation();
  const { t } = useTranslation('common');
  const { open } = useCommandPalette();
  const [dynamicLabels, setDynamicLabels] = useState<Map<string, string>>(labelCache);

  const pathParts = location.pathname.split('/').filter(Boolean);

  // Dynamically resolve detail page slugs (algorithm sets, methods)
  useEffect(() => {
    const slugsToResolve: { slug: string; parent: string }[] = [];
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const parent = i > 0 ? pathParts[i - 1] : undefined;
      if (!segmentKeys[part] && parent && !labelCache.has(`${parent}/${part}`)) {
        slugsToResolve.push({ slug: part, parent });
      }
    }

    if (slugsToResolve.length === 0) return;

    import('@/data').then((data) => {
      const newLabels = new Map(labelCache);
      for (const { slug, parent } of slugsToResolve) {
        const key = `${parent}/${slug}`;
        if (parent === 'algorithms') {
          const set = data.getAlgorithmSet(slug);
          if (set) { newLabels.set(key, set.name); labelCache.set(key, set.name); }
        } else if (parent === 'methods') {
          const method = data.getMethod(slug);
          if (method) { newLabels.set(key, method.name); labelCache.set(key, method.name); }
        }
      }
      setDynamicLabels(new Map(newLabels));
    });
  }, [location.pathname]);

  // Build breadcrumbs
  const breadcrumbs = pathParts.map((part, i) => {
    const parent = i > 0 ? pathParts[i - 1] : undefined;
    let label: string;
    if (segmentKeys[part]) {
      label = t(segmentKeys[part]);
    } else if (parent && dynamicLabels.has(`${parent}/${part}`)) {
      label = dynamicLabels.get(`${parent}/${part}`)!;
    } else {
      label = formatSlug(part);
    }
    const to = '/' + pathParts.slice(0, i + 1).join('/');
    return { label, to };
  });

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-surface">
      <div className="flex items-center justify-between px-6 h-14">
        <nav className="flex items-center gap-1.5 min-w-0 text-sm">
          <Link to="/" className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0">{t('nav.home')}</Link>
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={crumb.to} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/25 shrink-0" />
                {isLast ? (
                  <span className="font-semibold text-foreground truncate">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="text-muted-foreground/50 hover:text-foreground transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Search trigger — opens command palette */}
          <button
            onClick={open}
            className="hidden sm:flex items-center gap-2 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-overlay)] pl-3 pr-2.5 py-1.5 text-xs text-muted-foreground/40 hover:border-[var(--color-overlay-intense)] hover:bg-[var(--color-overlay-hover)] transition-all cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{t('search.placeholder')}</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-overlay)] font-mono flex items-center gap-0.5">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
