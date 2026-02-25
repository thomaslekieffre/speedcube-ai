import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, Check, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { TwistyPlayer } from '@/components/ui/TwistyPlayer';
import { getCubingPuzzle, getStickering } from '@/lib/puzzleMap';
import type { Algorithm } from '@/types';

interface AlgorithmDetailModalProps {
  algo: Algorithm | null;
  onClose: () => void;
}

export function AlgorithmDetailModal({ algo, onClose }: AlgorithmDetailModalProps) {
  const { t } = useTranslation(['algorithms', 'common']);
  const [copied, setCopied] = useState(false);
  const [activeAlg, setActiveAlg] = useState<string | null>(null);
  const [playerKey, setPlayerKey] = useState(0);

  if (!algo) return null;

  const displayAlg = activeAlg ?? algo.notation;
  const cubingPuzzle = getCubingPuzzle(algo.puzzle);
  const stickering = getStickering(algo.set, algo.subset);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayAlg);
    setCopied(true);
    toast.success(t('common:actions.copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReplay = () => {
    setPlayerKey((k) => k + 1);
  };

  const handleSelectAlt = (notation: string) => {
    setActiveAlg(notation);
  };

  return (
    <Modal open onClose={() => { setActiveAlg(null); onClose(); }} mobileFullscreen>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="pr-8">
          <h2 className="text-base font-bold text-foreground">{algo.name}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="primary">{algo.puzzle}</Badge>
            <Badge variant="outline">{t('common:badges.etm', { count: algo.moveCount })}</Badge>
            {algo.subset && (
              <span className="text-[11px] text-muted-foreground">{algo.subset}</span>
            )}
          </div>
        </div>

        {/* 3D Player */}
        <div className="rounded-xl border border-border overflow-hidden bg-[var(--color-overlay)]">
          <TwistyPlayer
            key={playerKey}
            algorithm={displayAlg}
            puzzle={cubingPuzzle}
            setupAlg={algo.setup}
            stickering={stickering}
            className="w-full aspect-square max-h-[300px] max-sm:max-h-[250px]"
          />
        </div>

        {/* Main notation */}
        <div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-[var(--color-overlay)] border border-[var(--color-overlay-muted)] px-3 py-2.5 rounded-lg text-foreground/90 overflow-x-auto">
              {displayAlg}
            </code>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-all shrink-0 cursor-pointer"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div key="check" initial={{ rotate: -180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Copy className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleReplay}
              className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-all shrink-0 cursor-pointer"
              title={t('replay')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </motion.button>
          </div>

          {algo.setup && (
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              {t('setup')}: <span className="font-mono text-muted-foreground">{algo.setup}</span>
            </p>
          )}
        </div>

        {/* Alternatives */}
        {algo.alternatives.length > 0 && (
          <div>
            <p className="text-[11px] text-muted-foreground/60 mb-2">{t('selectToPlay')}</p>
            <div className="space-y-1.5">
              {/* Primary algo as first clickable option */}
              <button
                onClick={() => setActiveAlg(null)}
                className={`w-full flex items-center gap-2 text-[11px] text-left rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer border ${
                  activeAlg === null
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-transparent hover:bg-[var(--color-overlay)]'
                }`}
              >
                <code className="font-mono text-foreground/80 flex-1 overflow-x-auto">{algo.notation}</code>
                <span className="text-muted-foreground/50 shrink-0">{algo.moveCount}</span>
                {algo.votes != null && algo.votes > 0 && (
                  <span className="text-muted-foreground/40 shrink-0">{algo.votes}v</span>
                )}
              </button>
              {algo.alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectAlt(alt.notation)}
                  className={`w-full flex items-center gap-2 text-[11px] text-left rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer border ${
                    activeAlg === alt.notation
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover:bg-[var(--color-overlay)]'
                  }`}
                >
                  <code className="font-mono text-foreground/80 flex-1 overflow-x-auto">{alt.notation}</code>
                  <span className="text-muted-foreground/50 shrink-0">{alt.moveCount}</span>
                  {alt.votes != null && alt.votes > 0 && (
                    <span className="text-muted-foreground/40 shrink-0">{alt.votes}v</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
