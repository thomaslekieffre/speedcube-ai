import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { stats } from '@/data/metadata';

const navLinks = [
  { to: '/algorithms', key: 'nav.algorithms' },
  { to: '/methods', key: 'nav.methods' },
  { to: '/hardware', key: 'nav.hardware' },
  { to: '/records', key: 'nav.records' },
  { to: '/tips', key: 'nav.tips' },
  { to: '/glossary', key: 'nav.glossary' },
  { to: '/learning', key: 'nav.learning' },
];

export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="border-t-2 border-primary/15 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">SpeedCube AI</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Nav */}
          <div>
            <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">{t('footer.navigation')}</h3>
            <nav className="space-y-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">{t('footer.stats')}</h3>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>{stats.totalAlgorithms.toLocaleString()} {t('footer.algorithms')}</p>
              <p>{stats.totalAlgorithmSets} {t('footer.sets')}</p>
              <p>{stats.totalMethods} {t('footer.methods')}</p>
              <p>{stats.totalCubes} {t('footer.cubes')}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] mt-6 pt-6 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            {t('footer.built')}
          </p>
        </div>
      </div>
    </footer>
  );
}
