import { useTranslation } from 'react-i18next';
import { Monitor, Droplets } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui';
import type { CubeHardware, Lube } from '@/types';

const tierColors: Record<string, 'accent' | 'primary' | 'warning'> = {
  flagship: 'accent',
  mid: 'primary',
  budget: 'warning',
};

const typeColors: Record<string, 'primary' | 'accent' | 'warning'> = {
  silicone: 'primary',
  'water-based': 'accent',
  hybrid: 'warning',
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-warning">
      {'★'.repeat(full)}
      {half && '½'}
      {'☆'.repeat(empty)}
    </span>
  );
}

function CubeDetail({ cube }: { cube: CubeHardware }) {
  const { t } = useTranslation('hardware');
  return (
    <div className="space-y-4">
      {/* Image */}
      {cube.image && (
        <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-[var(--color-overlay)]">
          <img src={cube.image} alt={cube.name} className="w-full h-full object-contain" />
        </div>
      )}

      <div className={cube.image ? 'px-5 pb-5 space-y-4' : 'p-5 space-y-4'}>
      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        {!cube.image && (
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground leading-tight">{cube.name}</h2>
          <p className="text-sm text-muted-foreground">{cube.brand} · {cube.releaseYear}</p>
        </div>
        <span className="text-lg font-bold text-accent shrink-0 ml-auto">{cube.price}</span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={tierColors[cube.tier] || 'primary'}>{t(`tiers.${cube.tier}`)}</Badge>
        <Badge variant="outline">{cube.puzzle}</Badge>
        {cube.magnetic && <Badge variant="outline">Magnetic</Badge>}
        {cube.smartCube && <Badge variant="warning">{t('smart')}</Badge>}
      </div>

      {/* Features */}
      {cube.features.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">
            {t('detail.features')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {cube.features.map((f) => (
              <span key={f} className="text-xs text-muted-foreground bg-[var(--color-overlay)] px-2.5 py-1 rounded-lg">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rating & Reviews */}
      {cube.rating ? (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <StarRating rating={cube.rating} />
            <span className="text-sm font-medium text-foreground">{cube.rating}/5</span>
            {cube.reviewCount && (
              <span className="text-xs text-muted-foreground">
                ({t('detail.reviews', { count: cube.reviewCount })})
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground/60 italic">{t('detail.noReviews')}</p>
        </div>
      )}
      </div>
    </div>
  );
}

function LubeDetail({ lube }: { lube: Lube }) {
  const { t } = useTranslation('hardware');
  return (
    <div className="space-y-4">
      {/* Image */}
      {lube.image && (
        <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-[var(--color-overlay)]">
          <img src={lube.image} alt={lube.name} className="w-full h-full object-contain" />
        </div>
      )}

      <div className={lube.image ? 'px-5 pb-5 space-y-4' : 'p-5 space-y-4'}>
      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        {!lube.image && (
          <div className="p-2 rounded-lg bg-accent/10 shrink-0">
            <Droplets className="h-5 w-5 text-accent" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground leading-tight">{lube.name}</h2>
          <p className="text-sm text-muted-foreground">{lube.brand}</p>
        </div>
        <span className="text-lg font-bold text-accent shrink-0 ml-auto">{lube.price}</span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={typeColors[lube.type] || 'primary'}>{t(`types.${lube.type}`)}</Badge>
        <Badge variant="outline">{t(`viscosities.${lube.viscosity}`)}</Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">{lube.description}</p>

      {/* Best for */}
      {lube.bestFor.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-widest mb-2">
            {t('bestFor')}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {lube.bestFor.map((b) => (
              <span key={b} className="text-xs text-muted-foreground bg-[var(--color-overlay)] px-2.5 py-1 rounded-lg">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rating & Reviews */}
      {lube.rating ? (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <StarRating rating={lube.rating} />
            <span className="text-sm font-medium text-foreground">{lube.rating}/5</span>
            {lube.reviewCount && (
              <span className="text-xs text-muted-foreground">
                ({t('detail.reviews', { count: lube.reviewCount })})
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground/60 italic">{t('detail.noReviews')}</p>
        </div>
      )}
      </div>
    </div>
  );
}

interface Props {
  item: CubeHardware | Lube | null;
  onClose: () => void;
}

function isCube(item: CubeHardware | Lube): item is CubeHardware {
  return 'puzzle' in item;
}

export function HardwareDetailModal({ item, onClose }: Props) {
  return (
    <Modal open={!!item} onClose={onClose}>
      {item && (isCube(item) ? <CubeDetail cube={item} /> : <LubeDetail lube={item} />)}
    </Modal>
  );
}
