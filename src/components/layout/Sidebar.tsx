import { useState } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import {
  Home,
  BookOpen,
  Monitor,
  Trophy,
  Lightbulb,
  BookA,
  GraduationCap,
  ChevronLeft,
  Menu,
  Boxes,
  X,
  Command,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoIcon } from '@/components/ui/Logo';
import { useCommandPalette } from '@/hooks/useCommandPalette';

const exploreItems = [
  { to: '/', icon: Home, key: 'nav.dashboard' },
  { to: '/algorithms', icon: Boxes, key: 'nav.algorithms' },
  { to: '/methods', icon: BookOpen, key: 'nav.methods' },
  { to: '/hardware', icon: Monitor, key: 'nav.hardware' },
];

const resourceItems = [
  { to: '/records', icon: Trophy, key: 'nav.records' },
  { to: '/tips', icon: Lightbulb, key: 'nav.tips' },
  { to: '/glossary', icon: BookA, key: 'nav.glossary' },
  { to: '/learning', icon: GraduationCap, key: 'nav.learning' },
];

export function Sidebar() {
  const { t } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dragX = useMotionValue(0);
  const backdropOpacity = useTransform(dragX, [-256, 0], [0, 0.6]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) {
      setMobileOpen(false);
    }
    dragX.set(0);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-[var(--color-border)] text-foreground cursor-pointer hover:bg-[var(--color-overlay-hover)] transition-colors"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-40 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            style={{ opacity: backdropOpacity }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen border-r border-[var(--color-border)] bg-surface/95 backdrop-blur-sm transition-all duration-300',
          'max-lg:hidden',
          collapsed ? 'lg:w-[68px]' : 'lg:w-60',
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={false}
          onClose={() => {}}
          t={t}
        />
      </aside>

      {/* Mobile sidebar — swipeable */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            className="lg:hidden fixed top-0 left-0 z-40 h-screen w-64 border-r border-[var(--color-border)] bg-surface"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: -256, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ x: dragX }}
          >
            <SidebarContent
              collapsed={false}
              setCollapsed={() => {}}
              isMobile
              onClose={() => setMobileOpen(false)}
              t={t}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

function NavItem({
  item,
  collapsed,
  isMobile,
  onClose,
  t,
}: {
  item: { to: string; icon: React.ComponentType<{ className?: string }>; key: string };
  collapsed: boolean;
  isMobile: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      onClick={onClose}
      title={collapsed && !isMobile ? t(item.key) : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group relative',
          isActive
            ? 'bg-primary/[0.08] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-primary')} />
          <span className={cn(collapsed && !isMobile && 'hidden')}>{t(item.key)}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({
  collapsed,
  setCollapsed,
  isMobile,
  onClose,
  t,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isMobile: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const { open } = useCommandPalette();

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Subtle gradient wash on sidebar background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center justify-between h-14 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center shadow-sm shadow-primary/20">
              <LogoIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-extrabold tracking-tight gradient-text leading-tight">SpeedCube</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/40 leading-tight">AI</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center mx-auto shadow-sm shadow-primary/20">
            <LogoIcon className="h-5 w-5 text-primary" />
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-all cursor-pointer"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
          </button>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--color-overlay-hover)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Gradient separator */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

      {/* Nav sections */}
      <nav className="relative flex-1 p-2 mt-2 overflow-y-auto">
        {/* Explore section */}
        {!collapsed && (
          <div className="px-3 mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/50">
              {t('sidebar.explore')}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-primary/10 to-transparent" />
          </div>
        )}
        <div className="space-y-0.5">
          {exploreItems.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} isMobile={isMobile} onClose={onClose} t={t} />
          ))}
        </div>

        {/* Separator */}
        <div className="mx-3 my-3 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

        {/* Resources section */}
        {!collapsed && (
          <div className="px-3 mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent/50">
              {t('sidebar.resources')}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-accent/10 to-transparent" />
          </div>
        )}
        <div className="space-y-0.5">
          {resourceItems.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} isMobile={isMobile} onClose={onClose} t={t} />
          ))}
        </div>
      </nav>

      {/* Bottom: search hint */}
      <div className="relative mx-4 mb-2 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
      <div className="relative p-2">
        <button
          onClick={open}
          className={cn(
            'flex items-center w-full rounded-xl text-[12px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-primary/[0.05] cursor-pointer transition-all duration-200',
            collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2.5',
          )}
          title={collapsed && !isMobile ? t('sidebar.quickSearch') : undefined}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{t('sidebar.quickSearch')}</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-overlay)] font-mono flex items-center gap-0.5">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
