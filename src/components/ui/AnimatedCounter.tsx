import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

// Track which values have already been animated across mounts
const animatedValues = new Set<string>();

export function AnimatedCounter({
  value,
  duration,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const key = `counter-${value}`;
  const alreadySeen = animatedValues.has(key);
  const [display, setDisplay] = useState(alreadySeen ? value.toLocaleString() : '0');
  const hasRun = useRef(alreadySeen);

  // Adaptive duration: small values need more time per step to be visible
  const effectiveDuration = duration ?? (
    value <= 10 ? Math.max(0.8, value * 0.15)
    : value <= 50 ? 1.2
    : value <= 200 ? 1.6
    : 2
  );

  useEffect(() => {
    if (hasRun.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return;
        hasRun.current = true;
        animatedValues.add(key);
        observer.disconnect();

        const ctrl = animate(0, value, {
          duration: effectiveDuration,
          // Gentler easing for small values so each step is visible
          ease: value <= 20 ? [0.2, 0, 0.2, 1] : [0.32, 0.72, 0, 1],
          onUpdate(v) {
            setDisplay(Math.round(v).toLocaleString());
          },
        });

        return () => ctrl.stop();
      },
      { threshold: 0.1 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, effectiveDuration, key]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
