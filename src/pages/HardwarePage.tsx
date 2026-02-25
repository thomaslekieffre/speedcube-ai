import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, Badge, Input } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Monitor, Droplets, Star, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cubes, lubes } from '@/data';
import { useLocalizedData } from '@/hooks/useLocalizedData';
import { HardwareDetailModal } from '@/components/hardware/HardwareDetailModal';
import { cn } from '@/lib/utils';
import type { CubeHardware, Lube } from '@/types';

const PAGE_SIZE = 24;

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

type SortOption = 'priceAsc' | 'priceDesc' | 'nameAz' | 'newest';

function parsePrice(price: string): number {
  const num = parseFloat(price.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function sortItems<T extends { name: string; price: string }>(items: T[], sort: SortOption, getYear?: (item: T) => number): T[] {
  const sorted = [...items];
  switch (sort) {
    case 'priceAsc':
      return sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    case 'priceDesc':
      return sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    case 'nameAz':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':
      if (getYear) return sorted.sort((a, b) => getYear(b) - getYear(a));
      return sorted;
    default:
      return sorted;
  }
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
        active
          ? 'bg-primary text-white'
          : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
      )}
    >
      {label}
    </button>
  );
}

function Select({ value, onChange, children, className }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full px-3 py-1.5 pr-7 text-xs font-medium rounded-lg bg-card text-foreground border border-border/50 hover:border-border cursor-pointer transition-colors focus:outline-none focus:border-primary/30"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default function HardwarePage() {
  const { t } = useTranslation(['hardware', 'common']);
  const { localizeLube } = useLocalizedData();

  // Shared state
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [selectedItem, setSelectedItem] = useState<CubeHardware | Lube | null>(null);

  // Cube filters
  const [puzzleFilter, setPuzzleFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [magneticFilter, setMagneticFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [smartFilter, setSmartFilter] = useState<'all' | 'yes'>('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [cubeVisible, setCubeVisible] = useState(PAGE_SIZE);

  // Mobile filter drawer
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Lube filters
  const [lubeTypeFilter, setLubeTypeFilter] = useState('all');
  const [lubeViscosityFilter, setLubeViscosityFilter] = useState('all');
  const [lubeBrandFilter, setLubeBrandFilter] = useState('all');
  const [lubeVisible, setLubeVisible] = useState(PAGE_SIZE);

  // Derived data
  const puzzleTypes = useMemo(() => ['All', ...new Set(cubes.map((c) => c.puzzle))], []);
  const cubeBrands = useMemo(() => [...new Set(cubes.map((c) => c.brand))].sort(), []);
  const cubeYears = useMemo(() => [...new Set(cubes.map((c) => c.releaseYear))].sort((a, b) => b - a), []);
  const lubeBrands = useMemo(() => [...new Set(lubes.map((l) => l.brand))].sort(), []);

  const localizedLubes = useMemo(() => lubes.map(localizeLube), [localizeLube]);

  const filteredCubes = useMemo(() => {
    const filtered = cubes.filter((c) => {
      if (puzzleFilter !== 'All' && c.puzzle !== puzzleFilter) return false;
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false;
      if (brandFilter !== 'all' && c.brand !== brandFilter) return false;
      if (magneticFilter === 'yes' && !c.magnetic) return false;
      if (magneticFilter === 'no' && c.magnetic) return false;
      if (smartFilter === 'yes' && !c.smartCube) return false;
      if (yearFilter !== 'all' && c.releaseYear !== Number(yearFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return sortItems(filtered, sort, (c) => c.releaseYear);
  }, [search, puzzleFilter, tierFilter, brandFilter, magneticFilter, smartFilter, yearFilter, sort]);

  const filteredLubes = useMemo(() => {
    const filtered = localizedLubes.filter((l) => {
      if (lubeTypeFilter !== 'all' && l.type !== lubeTypeFilter) return false;
      if (lubeViscosityFilter !== 'all' && l.viscosity !== lubeViscosityFilter) return false;
      if (lubeBrandFilter !== 'all' && l.brand !== lubeBrandFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.brand.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return sortItems(filtered, sort);
  }, [localizedLubes, search, lubeTypeFilter, lubeViscosityFilter, lubeBrandFilter, sort]);

  // Reset visible count when cube filters change
  const resetCubeVisible = useCallback(() => setCubeVisible(PAGE_SIZE), []);
  const resetLubeVisible = useCallback(() => setLubeVisible(PAGE_SIZE), []);

  // Wrap filter setters to also reset pagination
  const setCubeFilter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); resetCubeVisible(); };
  const setLubeFilter = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); resetLubeVisible(); };

  const visibleCubes = filteredCubes.slice(0, cubeVisible);
  const visibleLubes = filteredLubes.slice(0, lubeVisible);
  const cubesRemaining = filteredCubes.length - cubeVisible;
  const lubesRemaining = filteredLubes.length - lubeVisible;

  return (
    <div className="space-y-5 relative">
      {/* Decorative */}
      <div className="absolute -top-4 right-0 w-20 h-20 border border-warning/[0.05] rounded-xl rotate-12 pointer-events-none max-sm:hidden animate-float-geo" />
      <div className="absolute top-12 right-16 w-1.5 h-1.5 bg-primary/20 rounded-full pointer-events-none animate-pulse-dot max-sm:hidden" />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          icon
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetCubeVisible(); resetLubeVisible(); }}
          className="sm:w-56"
        />
        <Select value={sort} onChange={(v) => setSort(v as SortOption)} className="w-36">
          <option value="newest">{t('sort.newest')}</option>
          <option value="priceAsc">{t('sort.priceAsc')}</option>
          <option value="priceDesc">{t('sort.priceDesc')}</option>
          <option value="nameAz">{t('sort.nameAz')}</option>
        </Select>
      </div>

      <Tabs defaultValue="cubes">
        <TabsList>
          <TabsTrigger value="cubes">{t('cubes')} ({filteredCubes.length})</TabsTrigger>
          <TabsTrigger value="lubes">{t('lubes')} ({filteredLubes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="cubes">
          {/* Puzzle filter */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {puzzleTypes.map((p) => (
              <FilterChip
                key={p}
                label={p === 'All' ? t('common:filters.all') : p}
                active={puzzleFilter === p}
                onClick={() => setCubeFilter(setPuzzleFilter)(p)}
              />
            ))}
          </div>

          {/* Mobile: toggle button + count */}
          <div className="flex items-center justify-between sm:hidden mb-3">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
                filtersOpen
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('common:filters.refine')}
            </button>
            <span className="text-xs text-muted-foreground">
              {t('showing', { visible: visibleCubes.length, total: filteredCubes.length })}
            </span>
          </div>

          {/* Secondary filters — always visible on desktop, collapsible on mobile */}
          <div className={cn(
            'flex flex-wrap items-center gap-2 mb-4',
            'max-sm:flex-col max-sm:items-stretch max-sm:gap-2',
            !filtersOpen && 'max-sm:hidden',
          )}>
            <Select value={tierFilter} onChange={setCubeFilter(setTierFilter)} className="w-40 max-sm:w-full">
              <option value="all">{t('filters.allTiers')}</option>
              {(['flagship', 'mid', 'budget'] as const).map((tier) => (
                <option key={tier} value={tier}>{t(`tiers.${tier}`)}</option>
              ))}
            </Select>

            <Select value={brandFilter} onChange={setCubeFilter(setBrandFilter)} className="w-40 max-sm:w-full">
              <option value="all">{t('filters.allBrands')}</option>
              {cubeBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>

            <Select value={yearFilter} onChange={setCubeFilter(setYearFilter)} className="w-36 max-sm:w-full">
              <option value="all">{t('filters.allYears')}</option>
              {cubeYears.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </Select>

            <Select value={magneticFilter} onChange={(v) => setCubeFilter(setMagneticFilter)(v as 'all' | 'yes' | 'no')} className="w-40 max-sm:w-full">
              <option value="all">{t('filters.allMagnetic')}</option>
              <option value="yes">{t('filters.magnetic')}</option>
              <option value="no">{t('filters.nonMagnetic')}</option>
            </Select>

            <FilterChip
              label={t('filters.smartCube')}
              active={smartFilter === 'yes'}
              onClick={() => setCubeFilter(setSmartFilter)(smartFilter === 'yes' ? 'all' : 'yes')}
            />

            <span className="text-xs text-muted-foreground ml-auto max-sm:hidden">
              {t('showing', { visible: visibleCubes.length, total: filteredCubes.length })}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleCubes.map((cube) => (
              <motion.div
                key={cube.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                  <Card hover className="h-full cursor-pointer" onClick={() => setSelectedItem(cube)}>
                    {cube.image && (
                      <div className="aspect-square overflow-hidden rounded-t-[var(--radius-base)] bg-[var(--color-overlay)]">
                        <img src={cube.image} alt={cube.name} className="w-full h-full object-contain" loading="lazy" />
                      </div>
                    )}
                    <CardContent>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          {!cube.image && (
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Monitor className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground">{cube.name}</h3>
                            <p className="text-[11px] text-muted-foreground/60">{cube.brand} · {cube.releaseYear}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-accent shrink-0">{cube.price}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <Badge variant={tierColors[cube.tier] || 'primary'}>{t(`tiers.${cube.tier}`)}</Badge>
                        <Badge variant="outline">{cube.puzzle}</Badge>
                        {cube.magnetic && <Badge variant="outline">Magnetic</Badge>}
                        {cube.smartCube && <Badge variant="warning">{t('smart')}</Badge>}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {cube.features.map((f) => (
                          <span key={f} className="text-[10px] text-muted-foreground/60 bg-[var(--color-overlay)] px-2 py-0.5 rounded">
                            {f}
                          </span>
                        ))}
                      </div>

                      {cube.rating && (
                        <div className="flex items-center gap-1 mt-2.5">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs text-foreground/80">
                            {cube.rating}{cube.reviewCount ? ` (${cube.reviewCount})` : ''}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </motion.div>
            ))}
          </div>

          {/* Load more */}
          {cubesRemaining > 0 && (
            <div className="flex justify-center mt-6">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setCubeVisible((v) => v + PAGE_SIZE)}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 text-primary hover:from-primary/20 hover:to-accent/20 cursor-pointer transition-all duration-300"
              >
                {t('loadMore', { count: cubesRemaining })}
              </motion.button>
            </div>
          )}

          {filteredCubes.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">{t('common:search.noResults')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="lubes">
          {/* Mobile: toggle button + count */}
          <div className="flex items-center justify-between sm:hidden mb-3">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors',
                filtersOpen
                  ? 'bg-primary text-white'
                  : 'bg-[var(--color-overlay)] text-muted-foreground hover:text-foreground',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('common:filters.refine')}
            </button>
            <span className="text-xs text-muted-foreground">
              {t('showing', { visible: visibleLubes.length, total: filteredLubes.length })}
            </span>
          </div>

          {/* Lube filters — always visible on desktop, collapsible on mobile */}
          <div className={cn(
            'flex flex-wrap items-center gap-2 mb-4',
            'max-sm:flex-col max-sm:items-stretch max-sm:gap-2',
            !filtersOpen && 'max-sm:hidden',
          )}>
            <Select value={lubeTypeFilter} onChange={setLubeFilter(setLubeTypeFilter)} className="w-40 max-sm:w-full">
              <option value="all">{t('filters.allTypes')}</option>
              {(['silicone', 'water-based', 'hybrid'] as const).map((type) => (
                <option key={type} value={type}>{t(`types.${type}`)}</option>
              ))}
            </Select>

            <Select value={lubeViscosityFilter} onChange={setLubeFilter(setLubeViscosityFilter)} className="w-40 max-sm:w-full">
              <option value="all">{t('filters.allViscosities')}</option>
              {(['light', 'medium', 'heavy'] as const).map((v) => (
                <option key={v} value={v}>{t(`viscosities.${v}`)}</option>
              ))}
            </Select>

            <Select value={lubeBrandFilter} onChange={setLubeFilter(setLubeBrandFilter)} className="w-40 max-sm:w-full">
              <option value="all">{t('filters.allBrands')}</option>
              {lubeBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>

            <span className="text-xs text-muted-foreground ml-auto max-sm:hidden">
              {t('showing', { visible: visibleLubes.length, total: filteredLubes.length })}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleLubes.map((lube) => (
              <motion.div
                key={lube.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                  <Card hover className="h-full cursor-pointer" onClick={() => setSelectedItem(lube)}>
                    {lube.image && (
                      <div className="aspect-square overflow-hidden rounded-t-[var(--radius-base)] bg-[var(--color-overlay)]">
                        <img src={lube.image} alt={lube.name} className="w-full h-full object-contain" loading="lazy" />
                      </div>
                    )}
                    <CardContent>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          {!lube.image && (
                            <div className="p-1.5 rounded-lg bg-accent/10">
                              <Droplets className="h-3.5 w-3.5 text-accent" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground">{lube.name}</h3>
                            <p className="text-[11px] text-muted-foreground/60">{lube.brand}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-accent shrink-0">{lube.price}</span>
                      </div>

                      <div className="flex gap-1.5 mb-3 flex-wrap">
                        <Badge variant={typeColors[lube.type] || 'primary'}>{t(`types.${lube.type}`)}</Badge>
                        <Badge variant="outline">{t(`viscosities.${lube.viscosity}`)}</Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">{lube.description}</p>

                      <div>
                        <h4 className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mb-1.5">
                          {t('bestFor')}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {lube.bestFor.map((b) => (
                            <span key={b} className="text-[10px] text-muted-foreground/60 bg-[var(--color-overlay)] px-2 py-0.5 rounded">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>

                      {lube.rating && (
                        <div className="flex items-center gap-1 mt-2.5">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="text-xs text-foreground/80">
                            {lube.rating}{lube.reviewCount ? ` (${lube.reviewCount})` : ''}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </motion.div>
            ))}
          </div>

          {/* Load more */}
          {lubesRemaining > 0 && (
            <div className="flex justify-center mt-6">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setLubeVisible((v) => v + PAGE_SIZE)}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 text-primary hover:from-primary/20 hover:to-accent/20 cursor-pointer transition-all duration-300"
              >
                {t('loadMore', { count: lubesRemaining })}
              </motion.button>
            </div>
          )}

          {filteredLubes.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">{t('common:search.noResults')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <HardwareDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
