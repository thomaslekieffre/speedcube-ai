import { useParams, Link } from 'react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Badge } from '@/components/ui';
import { Accordion, AccordionItem } from '@/components/ui';
import { AnimatedSection, AnimatedItem } from '@/components/ui/AnimatedSection';
import { ArrowLeft, Check, X, User, Boxes } from 'lucide-react';
import { getMethod } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';

export default function MethodDetailPage() {
  const { t } = useTranslation(['methods', 'common']);
  const { localizeMethod } = useLocalizedData();
  const { methodId } = useParams<{ methodId: string }>();
  const rawMethod = getMethod(methodId || '');
  const method = useMemo(() => rawMethod ? localizeMethod(rawMethod) : null, [rawMethod, localizeMethod]);

  if (!method) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground mb-4">{t('notFound')}</p>
        <Link to="/methods" className="text-xs text-primary hover:text-primary-hover transition-colors">&larr; {t('backToMethods')}</Link>
      </div>
    );
  }

  return (
    <AnimatedSection className="space-y-6 relative">
      {/* Decorative */}
      <div className="absolute -top-2 right-4 w-16 h-16 border border-accent/[0.05] rounded-xl -rotate-6 pointer-events-none max-sm:hidden animate-float-geo" style={{ '--float-rotate': '-6deg' } as React.CSSProperties} />
      <div className="absolute top-8 right-20 w-1.5 h-1.5 bg-primary/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />

      <AnimatedItem>
        <div className="flex items-center gap-3">
          <Link to="/methods" className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-all">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">{method.name}</h1>
              <Badge variant="primary">{t(`common:levels.${method.difficulty}`)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{method.description}</p>
            {method.creator && (
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                {t('createdBy', { creator: method.creator })} {method.yearCreated && `(${method.yearCreated})`}
              </p>
            )}
          </div>
        </div>
      </AnimatedItem>

      {/* Steps */}
      <AnimatedItem>
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold text-foreground mb-3">{t('steps')}</h2>
            <Accordion>
              {method.steps.map((step, i) => (
                <AccordionItem key={i} title={`${i + 1}. ${step.name}`} defaultOpen={i === 0}>
                  <div className="space-y-3 pl-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    {step.moveCountRange && (
                      <Badge variant="outline">{step.moveCountRange}</Badge>
                    )}
                    {step.algorithmSets && step.algorithmSets.length > 0 && (
                      <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-[11px] text-muted-foreground/50">{t('relatedSets')}:</span>
                        {step.algorithmSets.map((s) => (
                          <Link key={s} to={`/algorithms/${s.toLowerCase().replace(/\s+/g, '-')}`}>
                            <Badge variant="primary" className="cursor-pointer hover:bg-primary/20 transition-colors">{s}</Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                    {step.tips && step.tips.length > 0 && (
                      <ul className="space-y-1">
                        {step.tips.map((tip, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary/60 mt-0.5">&bull;</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </AnimatedItem>

      {/* Pros & Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatedItem direction="left">
          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-accent mb-3">{t('pros')}</h2>
              <ul className="space-y-2">
                {method.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    {pro}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </AnimatedItem>
        <AnimatedItem direction="right">
          <Card>
            <CardContent>
              <h2 className="text-sm font-semibold text-destructive mb-3">{t('cons')}</h2>
              <ul className="space-y-2">
                {method.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    {con}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </AnimatedItem>
      </div>

      {/* Notable Users & Related Sets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {method.notableUsers.length > 0 && (
          <AnimatedItem>
            <Card>
              <CardContent>
                <h2 className="text-sm font-semibold text-foreground mb-3">{t('notableUsers')}</h2>
                <div className="flex flex-wrap gap-2">
                  {method.notableUsers.map((user) => (
                    <div key={user} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-overlay-muted)] border border-[var(--color-border)] text-xs text-foreground/80">
                      <User className="h-3 w-3 text-muted-foreground/50" />
                      {user}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AnimatedItem>
        )}
        {method.relatedSets.length > 0 && (
          <AnimatedItem>
            <Card>
              <CardContent>
                <h2 className="text-sm font-semibold text-foreground mb-3">{t('relatedSets')}</h2>
                <div className="flex flex-wrap gap-2">
                  {method.relatedSets.map((set) => (
                    <Link key={set} to={`/algorithms/${set.toLowerCase().replace(/\s+/g, '-')}`}>
                      <Badge variant="primary" className="cursor-pointer hover:bg-primary/20 transition-colors">
                        <Boxes className="h-3 w-3 mr-1" />
                        {set}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AnimatedItem>
        )}
      </div>
    </AnimatedSection>
  );
}
