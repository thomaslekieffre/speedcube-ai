import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, Badge, AnimatedCounter } from '@/components/ui';
import { AnimatedSection, AnimatedItem } from '@/components/ui/AnimatedSection';
import { Boxes, BookOpen, Trophy, Monitor, Lightbulb, GraduationCap, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { stats, featuredSets } from '@/data/metadata';
import { cn } from '@/lib/utils';

const quickLinkIcons = {
  algorithms: { icon: Boxes, color: 'text-primary', bg: 'bg-primary/[0.06]', hoverBg: 'group-hover:bg-primary/[0.10]', accentBar: 'bg-primary' },
  methods: { icon: BookOpen, color: 'text-accent', bg: 'bg-accent/[0.06]', hoverBg: 'group-hover:bg-accent/[0.10]', accentBar: 'bg-accent' },
  hardware: { icon: Monitor, color: 'text-warning', bg: 'bg-warning/[0.06]', hoverBg: 'group-hover:bg-warning/[0.10]', accentBar: 'bg-warning' },
  records: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/[0.06]', hoverBg: 'group-hover:bg-yellow-400/[0.10]', accentBar: 'bg-yellow-400' },
  tips: { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-400/[0.06]', hoverBg: 'group-hover:bg-amber-400/[0.10]', accentBar: 'bg-amber-400' },
  learning: { icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-400/[0.06]', hoverBg: 'group-hover:bg-cyan-400/[0.10]', accentBar: 'bg-cyan-400' },
} as const;

const quickLinkRoutes: (keyof typeof quickLinkIcons)[] = ['algorithms', 'methods', 'hardware', 'records', 'tips', 'learning'];

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);

  const statItems = [
    { key: 'algorithms', value: stats.totalAlgorithms, icon: Zap, color: 'text-primary', glow: 'shadow-primary/5' },
    { key: 'methods', value: stats.totalMethods, icon: TrendingUp, color: 'text-accent', glow: 'shadow-accent/5' },
    { key: 'wcaEvents', value: stats.totalRecords, icon: Trophy, color: 'text-warning', glow: 'shadow-warning/5' },
    { key: 'cubes', value: stats.totalCubes, icon: Monitor, color: 'text-emerald-400', glow: 'shadow-emerald-400/5' },
  ];

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-8 sm:pt-14 pb-4">
        {/* Decorative elements */}
        <div className="absolute -top-2 right-4 w-36 h-36 border border-primary/[0.07] rounded-2xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
        <div className="absolute top-24 right-24 w-20 h-20 bg-accent/[0.04] rounded-xl -rotate-6 pointer-events-none max-sm:hidden animate-float-geo" style={{ '--float-rotate': '-6deg', animationDelay: '2s' } as React.CSSProperties} />
        <div className="absolute bottom-8 right-1/3 w-2 h-2 bg-primary/20 rounded-full pointer-events-none animate-pulse-dot" />
        <div className="absolute top-16 right-1/4 w-1.5 h-1.5 bg-accent/25 rounded-full pointer-events-none max-sm:hidden animate-pulse-dot" style={{ animationDelay: '1.5s' }} />
        {/* Large blurred gradient orb */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-2xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.06] border border-primary/10">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />
            <span className="text-xs font-semibold text-primary tracking-wide">{t('hero.badge')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08]">
            {t('hero.title')}
          </h1>

          <div className="w-16 h-1 gradient-line rounded-full" />

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
            {t('hero.description')}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/algorithms"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white text-sm font-bold hover:shadow-glow-primary transition-all duration-300"
            >
              {t('hero.browseAlgorithms')}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/learning"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-foreground text-sm font-bold hover:bg-[var(--color-overlay-hover)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all duration-200"
            >
              {t('hero.startLearning')}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <AnimatedSection className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <AnimatedItem key={stat.key}>
              <div className="relative p-5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden group hover:border-[var(--color-border-hover)] transition-all duration-300">
                {/* Background icon watermark */}
                <Icon className={cn('absolute -bottom-2 -right-2 h-16 w-16 opacity-[0.03]', stat.color)} />
                <div className="relative">
                  <AnimatedCounter
                    value={stat.value}
                    className={cn('text-3xl sm:text-4xl font-black tracking-tighter', stat.color)}
                  />
                  <p className="text-xs text-muted-foreground font-medium mt-1.5 flex items-center gap-1.5">
                    <Icon className={cn('h-3 w-3', stat.color)} />
                    {t(`stats.${stat.key}`)}
                  </p>
                </div>
              </div>
            </AnimatedItem>
          );
        })}
      </AnimatedSection>

      {/* ── Quick Links ───────────────────────────────────────── */}
      <AnimatedSection>
        <AnimatedItem>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-extrabold text-foreground">{t('explore')}</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent" />
          </div>
        </AnimatedItem>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinkRoutes.map((key) => {
            const cfg = quickLinkIcons[key];
            const Icon = cfg.icon;
            return (
              <AnimatedItem key={key}>
                <Link to={`/${key}`} className="group block">
                  <motion.div
                    whileHover={{ y: -3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={cn(
                      'relative p-5 rounded-xl border border-[var(--color-border)] transition-all duration-300 overflow-hidden',
                      cfg.bg, cfg.hoverBg,
                    )}
                  >
                    {/* Top accent line */}
                    <div className={cn('absolute top-0 left-0 right-0 h-0.5 opacity-40', cfg.accentBar)} />
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('p-2 rounded-lg', cfg.bg)}>
                        <Icon className={cn('h-5 w-5 icon-hover-bounce', cfg.color)} />
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 group-hover:translate-x-0.5 transition-all duration-300" />
                    </div>
                    <h3 className="text-[15px] font-bold text-foreground animated-underline">{t(`quickLinks.${key}.label`)}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{t(`quickLinks.${key}.desc`)}</p>
                  </motion.div>
                </Link>
              </AnimatedItem>
            );
          })}
        </div>
      </AnimatedSection>

      {/* ── Featured Algorithm Sets ────────────────────────────── */}
      {featuredSets.length > 0 && (
        <AnimatedSection>
          <AnimatedItem>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-foreground">{t('featured')}</h2>
                <div className="h-px w-12 bg-gradient-to-r from-[var(--color-border)] to-transparent max-sm:hidden" />
              </div>
              <Link to="/algorithms" className="group text-sm text-primary hover:text-primary-hover transition-colors flex items-center gap-1.5 font-medium">
                {t('common:actions.viewAll')}
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </AnimatedItem>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredSets.map((set) => (
              <AnimatedItem key={set.id}>
                <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                <Link to={`/algorithms/${set.id}`}>
                  <Card hover className="h-full group overflow-hidden">
                    <div className="h-0.5 gradient-line opacity-60" />
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="primary">{set.puzzle}</Badge>
                        <span className="text-2xl font-black text-primary/10 group-hover:text-primary/25 transition-colors tabular-nums">
                          {set.algorithmCount}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">{set.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{set.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground/50">
                          {t('common:badges.cases', { count: set.algorithmCount })}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary/50 transition-all duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </motion.div>
              </AnimatedItem>
            ))}
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
