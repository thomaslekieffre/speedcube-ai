import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-overlay-hover)]', className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-overlay-strong)] to-transparent animate-shimmer" />
    </div>
  );
}
