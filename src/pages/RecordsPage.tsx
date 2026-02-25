import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Input, AnimatedCounter } from '@/components/ui';
import { AnimatedSection, AnimatedItem } from '@/components/ui/AnimatedSection';
import { Trophy } from 'lucide-react';
import { records } from '@/data';

export default function RecordsPage() {
  const { t } = useTranslation(['records', 'common']);
  const [search, setSearch] = useState('');

  const filtered = records.filter((r) =>
    !search ||
    r.event.toLowerCase().includes(search.toLowerCase()) ||
    r.single.holder.toLowerCase().includes(search.toLowerCase()) ||
    r.average.holder.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 relative">
      {/* Decorative */}
      <div className="absolute -top-2 right-0 w-16 h-16 border border-warning/[0.06] rounded-xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
      <div className="absolute top-10 right-12 w-1.5 h-1.5 bg-accent/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <AnimatedCounter value={records.length} className="text-3xl font-black tracking-tight gradient-text-animated" />
            <span className="text-sm text-muted-foreground">{t('count', { count: records.length })}</span>
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

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-primary/15">
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">{t('event')}</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">{t('single')}</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">{t('holder')}</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">{t('average')}</th>
                  <th className="text-left px-4 py-3 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">{t('holder')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record, i) => (
                  <tr key={record.eventId} className="border-b border-[var(--color-overlay)] last:border-0 hover:bg-[var(--color-overlay-subtle)] transition-colors animate-row" style={{ animationDelay: `${i * 0.03}s` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-warning" />
                        <span className="font-medium text-foreground">{record.event}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-accent font-semibold">{record.single.time}</td>
                    <td className="px-4 py-3">
                      <span className="text-foreground/80">{record.single.holder}</span>
                      <span className="text-muted-foreground/40 text-[10px] ml-1">({record.single.nationality})</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-primary font-semibold">{record.average.time}</td>
                    <td className="px-4 py-3">
                      <span className="text-foreground/80">{record.average.holder}</span>
                      <span className="text-muted-foreground/40 text-[10px] ml-1">({record.average.nationality})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile cards */}
      <AnimatedSection className="md:hidden space-y-3">
        {filtered.map((record) => (
          <AnimatedItem key={record.eventId}>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-3.5 w-3.5 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">{record.event}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">{t('single')}</p>
                    <p className="font-mono text-accent font-semibold text-sm">{record.single.time}</p>
                    <p className="text-xs text-foreground/70">{record.single.holder}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-1">{t('average')}</p>
                    <p className="font-mono text-primary font-semibold text-sm">{record.average.time}</p>
                    <p className="text-xs text-foreground/70">{record.average.holder}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedItem>
        ))}
      </AnimatedSection>
    </div>
  );
}
