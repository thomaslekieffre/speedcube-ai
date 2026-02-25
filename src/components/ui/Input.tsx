import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon = false, ...props }, ref) => (
    <div className="relative">
      {icon && (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      )}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-overlay)] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:bg-[var(--color-overlay-hover)] focus:ring-[3px] focus:ring-primary/10 transition-all duration-150',
          icon && 'pl-9',
          className
        )}
        {...props}
      />
    </div>
  )
);
Input.displayName = 'Input';
