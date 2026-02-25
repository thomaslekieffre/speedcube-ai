import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: 'primary' | 'accent' | null;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, glow = null, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-card shadow-card',
        hover && 'transition-all duration-300 hover:border-[var(--color-border-hover)] hover:shadow-hover hover:-translate-y-0.5',
        glow === 'primary' && 'shadow-glow-primary border-primary/20',
        glow === 'accent' && 'shadow-glow-accent border-accent/20',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 pb-0', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-foreground tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground mt-1 leading-relaxed', className)} {...props} />;
}
