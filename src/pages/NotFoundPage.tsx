import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {/* Animated cube */}
      <motion.div
        className="relative w-24 h-24 mb-8"
        animate={{ rotateY: 360, rotateX: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{ perspective: 400, transformStyle: 'preserve-3d' }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20" style={{ transform: 'translateZ(48px)' }} />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10" style={{ transform: 'translateZ(-48px)' }} />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/10" style={{ transform: 'rotateY(90deg) translateZ(48px)' }} />
      </motion.div>

      <motion.h1
        className="text-6xl font-bold gradient-text mb-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        404
      </motion.h1>

      <motion.p
        className="text-muted-foreground text-sm mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {t('notFound.message')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link to="/">
          <Button>
            <Home className="h-4 w-4" />
            {t('notFound.backHome')}
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
