import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const cycle: Record<string, 'light' | 'dark' | 'system'> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = icons[theme];

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(cycle[theme])}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <Icon className="h-4 w-4" />
      </motion.div>
    </motion.button>
  );
}
