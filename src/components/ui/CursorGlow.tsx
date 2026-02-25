import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';
import { useCommandPalette } from '@/hooks/useCommandPalette';

export function CursorGlow() {
  const [isDesktop, setIsDesktop] = useState(false);
  const { resolved } = useTheme();
  const { isOpen } = useCommandPalette();
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 15 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [isDesktop, mouseX, mouseY]);

  if (!isDesktop || isOpen) return null;

  const color = resolved === 'dark' ? 'rgba(249,115,22,0.06)' : 'rgba(234,88,12,0.04)';

  return (
    <motion.div
      className="fixed pointer-events-none z-[9999] w-[400px] h-[400px] rounded-full"
      style={{
        x: springX,
        y: springY,
        translateX: '-50%',
        translateY: '-50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
    />
  );
}
